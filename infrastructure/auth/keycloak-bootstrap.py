#!/usr/bin/env python3
"""Operator-only Keycloak provisioning. Never run/mount in the SAMMA web container."""
import json
import os
from pathlib import Path
import stat
import sys
import urllib.request
import urllib.parse
import urllib.error

SECRETS = Path('/etc/samma-dev/keycloak.env')
CREDENTIALS = Path('/etc/samma-dev/bootstrap-credentials.txt')
BASE = 'http://127.0.0.1:2021'
ISSUER = 'https://auth.samma.co.za/realms/samma'
OWNERS = [('phil@samma.co.za', 'Phil'), ('juanita@samma.co.za', 'Juanita')]

def private_read(path):
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or stat.S_IMODE(info.st_mode) != 0o600 or info.st_uid != os.getuid():
        raise RuntimeError('Private operator file has unsafe ownership/permissions')
    return path.read_text()

def request(method, path, data=None, token=None, form=False):
    headers = {'Content-Type': 'application/x-www-form-urlencoded' if form else 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    body = (urllib.parse.urlencode(data).encode() if form else json.dumps(data).encode()) if data is not None else None
    try:
        with urllib.request.urlopen(urllib.request.Request(BASE + path, data=body, headers=headers, method=method), timeout=30) as response:
            raw = response.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        # Never echo provider payloads or credentials.
        raise RuntimeError('Keycloak operation failed: HTTP ' + str(error.code)) from None

def admin_token():
    env = dict(line.split('=', 1) for line in private_read(SECRETS).splitlines() if '=' in line)
    token = request('POST', '/realms/master/protocol/openid-connect/token', {
        'client_id': 'admin-cli', 'grant_type': 'password',
        'username': env['KC_BOOTSTRAP_ADMIN_USERNAME'], 'password': env['KC_BOOTSTRAP_ADMIN_PASSWORD'],
    }, form=True)['access_token']
    return env, token

def main():
    content = private_read(CREDENTIALS)
    passwords = {}
    for email, _ in OWNERS:
        if content.count('Email: ' + email) != 1:
            raise RuntimeError('Expected exactly the two approved owner entries')
        block = content.split('Email: ' + email, 1)[1].split('Password manager item:', 1)[0]
        value = block.split('Temporary password:', 1)[1].strip()
        if not value:
            raise RuntimeError('Temporary passwords must be supplied manually before provisioning')
        passwords[email] = value
    env, token = admin_token()
    realms = request('GET', '/admin/realms', token=token)
    if not any(realm['realm'] == 'samma' for realm in realms):
        request('POST', '/admin/realms', {
            'realm': 'samma', 'enabled': True, 'displayName': 'SAMMA', 'sslRequired': 'external',
            'registrationAllowed': False, 'loginWithEmailAllowed': True, 'registrationEmailAsUsername': True,
            'duplicateEmailsAllowed': False, 'verifyEmail': True, 'resetPasswordAllowed': False,
            'editUsernameAllowed': False, 'rememberMe': False,
            'bruteForceProtected': True, 'permanentLockout': False, 'failureFactor': 5,
            'waitIncrementSeconds': 60, 'maxFailureWaitSeconds': 900,
            'accessTokenLifespan': 300, 'ssoSessionIdleTimeout': 1800, 'ssoSessionMaxLifespan': 3600,
            'eventsEnabled': True, 'eventsExpiration': 2592000, 'eventsListeners': [],
            'adminEventsEnabled': True, 'adminEventsDetailsEnabled': False,
        }, token)
    clients = request('GET', '/admin/realms/samma/clients?clientId=samma-web', token=token)
    if not clients:
        request('POST', '/admin/realms/samma/clients', {
            'clientId': 'samma-web', 'name': 'SAMMA', 'enabled': True, 'protocol': 'openid-connect',
            'publicClient': False, 'secret': env['SAMMA_OIDC_CLIENT_SECRET'],
            'standardFlowEnabled': True, 'implicitFlowEnabled': False,
            'directAccessGrantsEnabled': False, 'serviceAccountsEnabled': False,
            'redirectUris': ['https://samma.co.za/api/auth/callback/keycloak'],
            'webOrigins': ['https://samma.co.za'],
            'attributes': {'pkce.code.challenge.method': 'S256', 'post.logout.redirect.uris': 'https://samma.co.za/'},
        }, token)
    links = []
    for email, name in OWNERS:
        users = request('GET', '/admin/realms/samma/users?exact=true&username=' + urllib.parse.quote(email), token=token)
        if users:
            # Never reset a previously provisioned password or claim an arbitrary existing identity.
            user = users[0]
            if user.get('attributes', {}).get('samma-bootstrap') != ['initial-governance-v1'] or user.get('email') != email:
                raise RuntimeError('Existing provider identity is not an approved bootstrap identity')
        else:
            request('POST', '/admin/realms/samma/users', {
                'username': email, 'email': email, 'firstName': name, 'enabled': True,
                'emailVerified': True, 'requiredActions': ['UPDATE_PASSWORD'],
                'attributes': {'samma-bootstrap': ['initial-governance-v1']},
                'credentials': [{'type': 'password', 'value': passwords[email], 'temporary': True}],
            }, token)
            user = request('GET', '/admin/realms/samma/users?exact=true&username=' + urllib.parse.quote(email), token=token)[0]
        links.append({'email': email, 'displayName': name, 'provider': ISSUER, 'providerSubject': user['id']})
    target = Path('/etc/samma-dev/bootstrap-links.json')
    descriptor = os.open(target, os.O_CREAT | os.O_WRONLY | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, 'w') as output:
        json.dump(links, output)
    print('Two approved Keycloak identities provisioned; password replacement required. No credentials displayed.')

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(str(error) if isinstance(error, RuntimeError) else 'Bootstrap failed; inspect configuration without logging credentials.', file=sys.stderr)
        sys.exit(1)
