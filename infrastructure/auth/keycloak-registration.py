#!/usr/bin/env python3
"""Operator-only mail/public-registration configuration; never mount into SAMMA web."""
import importlib.util
import json
import os
from pathlib import Path
import smtplib
import ssl
import sys
from uuid import uuid4

spec = importlib.util.spec_from_file_location('bootstrap', Path(__file__).with_name('keycloak-bootstrap.py'))
kc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(kc)

def configure(stage):
    if stage not in ('smtp', 'enable'):
        raise RuntimeError('Use smtp, then enable after the provider rate-limit gate has been tested.')
    env = dict(line.split('=', 1) for line in kc.private_read(Path('/etc/samma-dev/smtp.env')).splitlines()
               if '=' in line and not line.startswith('#'))
    if not env.get('SMTP_PASSWORD') or env.get('SMTP_PORT') != '465' or env.get('SMTP_SSL') != 'true':
        raise RuntimeError('Private implicit-TLS SMTP settings are incomplete.')
    # Never disable certificate verification or use plaintext authentication.
    with smtplib.SMTP_SSL(env['SMTP_HOST'], 465, context=ssl.create_default_context(), timeout=20) as server:
        server.login(env['SMTP_USERNAME'], env['SMTP_PASSWORD'])
    _, token = kc.admin_token()
    realm = kc.request('GET', '/admin/realms/samma', token=token)
    clients = kc.request('GET', '/admin/realms/samma/clients?clientId=samma-web', token=token)
    origins = {'https://dev.samma.co.za', 'https://samma.co.za'}
    if len(clients) != 1 or set(clients[0]['redirectUris']) != {o + '/api/auth/callback/keycloak' for o in origins}:
        raise RuntimeError('Exact DEV/RC callback allow-list required.')
    client = clients[0]
    if set(client['webOrigins']) != origins or set(client['attributes']['post.logout.redirect.uris'].split('##')) != {o + '/' for o in origins}:
        raise RuntimeError('Exact origins and logout destinations required.')
    backup = Path('/etc/samma-dev') / ('auth-registration-before-' + uuid4().hex + '.json')
    fd = os.open(backup, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(fd, 'w') as output:
        json.dump({'realm': realm, 'client': client}, output)
    patch = {'displayName': 'SAMMA', 'smtpServer': {
        'host': env['SMTP_HOST'], 'port': '465', 'ssl': 'true', 'starttls': 'false', 'auth': 'true',
        'from': env['SMTP_FROM'], 'fromDisplayName': 'SAMMA',
        'user': env['SMTP_USERNAME'], 'password': env['SMTP_PASSWORD'],
    }}
    if stage == 'enable':
        if os.environ.get('SAMMA_AUTH_RATE_LIMIT_VERIFIED') != 'true':
            raise RuntimeError('Test the deployed provider proxy rate-limit gate before enabling public mail flows.')
        patch.update({
            'registrationAllowed': True, 'registrationEmailAsUsername': True, 'loginWithEmailAllowed': True,
            'duplicateEmailsAllowed': False, 'verifyEmail': True, 'resetPasswordAllowed': True,
            'editUsernameAllowed': False,
            'passwordPolicy': 'length(12) and notUsername(undefined) and notEmail(undefined) and passwordBlacklist(samma-common.txt)',
            'accessCodeLifespanUserAction': 900, 'actionTokenGeneratedByUserLifespan': 900,
            'bruteForceProtected': True, 'permanentLockout': False, 'failureFactor': 5,
            'waitIncrementSeconds': 60, 'maxFailureWaitSeconds': 900,
        })
    kc.request('PUT', '/admin/realms/samma', patch, token)
    current = kc.request('GET', '/admin/realms/samma', token=token)
    for key, value in patch.items():
        if key != 'smtpServer' and current.get(key) != value:
            raise RuntimeError('Provider configuration read-back mismatch.')
    if current.get('smtpServer', {}).get('host') != env['SMTP_HOST']:
        raise RuntimeError('Provider SMTP read-back mismatch.')
    print('PASS: provider ' + stage + ' settings saved and read back. Private backup preserved; no secrets displayed.')

if __name__ == '__main__':
    try:
        configure(sys.argv[1] if len(sys.argv) == 2 else '')
    except Exception as error:
        print(str(error) if isinstance(error, RuntimeError) else 'Provider setup failed (' + type(error).__name__ + '); details suppressed.', file=sys.stderr)
        sys.exit(1)
