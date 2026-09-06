#!/usr/bin/env python3
"""Disposable provider mailbox checks. Fetch only messages to the exact generated test address."""
import base64
import email
from email.utils import getaddresses
import html
import importlib.util
import imaplib
import json
import os
from pathlib import Path
import re
import secrets
import ssl
import sys
import time
from urllib.parse import urlsplit, parse_qs, quote

spec = importlib.util.spec_from_file_location('bootstrap', Path(__file__).with_name('keycloak-bootstrap.py'))
kc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(kc)
ROOT = Path('/etc/samma-dev/auth-registration-validation')

def save(name, data):
    fd = os.open(ROOT / name, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(fd, 'w') as output:
        json.dump(data, output)

def manifest():
    data = json.loads(kc.private_read(ROOT / 'provider-mail.json'))
    if not re.fullmatch(r'no-reply\+auth-test-[a-f0-9]{24}@samma\.co\.za', data['email']):
        raise RuntimeError('Only the generated disposable mailbox tag is permitted.')
    return data

def prepare():
    ROOT.mkdir(mode=0o700, exist_ok=True)
    if (ROOT / 'provider-mail.json').exists():
        raise RuntimeError('Existing validation manifest preserved; clean up or review before another run.')
    data = {'email': 'no-reply+auth-test-' + secrets.token_hex(12) + '@samma.co.za',
            'oldPassword': secrets.token_urlsafe(24), 'newPassword': secrets.token_urlsafe(24)}
    _, token = kc.admin_token()
    kc.request('POST', '/admin/realms/samma/users', {
        'username': data['email'], 'email': data['email'], 'firstName': 'Synthetic', 'lastName': 'Mail Test',
        'enabled': True, 'emailVerified': False, 'attributes': {'samma-auth-test': ['registration-v1']},
        'credentials': [{'type': 'password', 'value': data['oldPassword'], 'temporary': False}],
    }, token)
    user = kc.request('GET', '/admin/realms/samma/users?exact=true&username=' + quote(data['email']), token=token)[0]
    data['userId'] = user['id']
    save('provider-mail.json', data)
    kc.request('PUT', '/admin/realms/samma/users/' + user['id'] + '/send-verify-email', token=token)
    print('Verification email requested for one disposable unverified provider identity; private manifest saved.')

def wait_link(kind):
    if kind not in ('verification', 'recovery'):
        raise RuntimeError('Expected verification or recovery.')
    data = manifest()
    env = dict(line.split('=', 1) for line in kc.private_read(Path('/etc/samma-dev/smtp.env')).splitlines()
               if '=' in line and not line.startswith('#'))
    expected_type = 'verify-email' if kind == 'verification' else 'reset-credentials'
    deadline = time.monotonic() + 45
    with imaplib.IMAP4_SSL(env['SMTP_HOST'], 993, ssl_context=ssl.create_default_context(), timeout=15) as mailbox:
        mailbox.login(env['SMTP_USERNAME'], env['SMTP_PASSWORD'])
        while time.monotonic() < deadline:
            # cPanel delivers plus-addressed mail into a folder named for the tag.
            # Select only that exact generated folder, falling back to INBOX on servers without this feature.
            tag = data['email'].split('+', 1)[1].split('@', 1)[0]
            status, _ = mailbox.select('INBOX.' + tag, readonly=True)
            if status != 'OK':
                mailbox.select('INBOX', readonly=True)
            status, found = mailbox.uid('search', None, 'HEADER', 'To', '"' + data['email'] + '"')
            if status != 'OK':
                raise RuntimeError('Mailbox search failed.')
            for uid in found[0].split():
                status, content = mailbox.uid('fetch', uid, '(BODY.PEEK[])')
                if status != 'OK':
                    continue
                for item in content:
                    if not isinstance(item, tuple):
                        continue
                    message = email.message_from_bytes(item[1])
                    if data['email'] not in [address for _, address in getaddresses(message.get_all('To', []))]:
                        continue
                    if ('no-reply@samma.co.za' not in [address for _, address in getaddresses(message.get_all('From', []))]):
                        continue
                    for part in message.walk():
                        if part.get_content_type() not in ('text/plain', 'text/html'):
                            continue
                        body = (part.get_payload(decode=True) or b'').decode(part.get_content_charset() or 'utf-8', errors='replace')
                        for link in re.findall(r'https://auth\.samma\.co\.za/realms/samma/login-actions/action-token\?[^\s<>"\']+', html.unescape(body)):
                            key = parse_qs(urlsplit(link).query).get('key', [''])[0]
                            try:
                                payload = key.split('.')[1]
                                claims = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))
                            except (ValueError, IndexError):
                                continue
                            # Filtering only; Keycloak, not this mailbox utility, verifies the token.
                            if claims.get('typ') != expected_type:
                                continue
                            save(kind + '.json', {'url': link, 'mailboxUid': uid.decode(), 'recipient': data['email'],
                                 'sammaBrandPresent': 'samma' in (body + str(message.get('From', ''))).lower()})
                            print('PASS: actual ' + kind + ' message retrieved from the tagged mailbox; link saved privately.')
                            return
            time.sleep(3)
    raise RuntimeError('Expected message not found in the actual test mailbox within 45 seconds.')

def check_or_cleanup(cleanup=False):
    data = manifest()
    _, token = kc.admin_token()
    path = '/admin/realms/samma/users/' + data['userId']
    user = kc.request('GET', path, token=token)
    # Keycloak's managed user profile may discard unregistered custom attributes.
    # Bind cleanup to the private creation manifest, exact random username/email and synthetic names.
    if (user.get('id') != data['userId'] or user.get('email') != data['email'] or user.get('username') != data['email']
            or user.get('firstName') != 'Synthetic' or user.get('lastName') != 'Mail Test'):
        raise RuntimeError('Disposable provider identity ownership mismatch.')
    if cleanup:
        kc.request('DELETE', path, token=token)
        print('Disposable provider identity removed; synthetic delivery evidence retained privately.')
    else:
        if not user.get('emailVerified'):
            raise RuntimeError('Provider has not accepted the email verification link.')
        print('PASS: provider confirms actual email verification; same provider subject retained.')

if __name__ == '__main__':
    try:
        action = sys.argv[1] if len(sys.argv) > 1 else ''
        if action == 'prepare': prepare()
        elif action == 'wait': wait_link(sys.argv[2])
        elif action == 'check': check_or_cleanup()
        elif action == 'cleanup': check_or_cleanup(True)
        else: raise RuntimeError('Use prepare, wait verification|recovery, check, or cleanup.')
    except Exception as error:
        print(str(error) if isinstance(error, RuntimeError) else 'Provider mail test failed (' + type(error).__name__ + '); details suppressed.', file=sys.stderr)
        sys.exit(1)
