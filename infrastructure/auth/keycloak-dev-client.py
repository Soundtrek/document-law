#!/usr/bin/env python3
"""Provision the DEV-only OIDC client and assign its client login theme.

Operator-only: run on the approved `dev` checkout, never from an experiment or
RC checkout. Secrets and provider representations are written only to the
private operator directory and are never printed.
"""
import json
import os
from pathlib import Path
import secrets
import stat
import subprocess
import tempfile
from datetime import datetime, timezone

import importlib.util

spec = importlib.util.spec_from_file_location('bootstrap', Path(__file__).with_name('keycloak-bootstrap.py'))
kc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(kc)

ENV_PATH = Path('/etc/samma-dev/dev-web.env')
BACKUP_DIR = Path('/etc/samma-dev/backups')
DEV_CLIENT_ID = 'samma-dev-web'
DEV_ORIGIN = 'https://dev.samma.co.za'
CALLBACK = DEV_ORIGIN + '/api/auth/callback/keycloak'


def private_env():
    info = ENV_PATH.lstat()
    if not stat.S_ISREG(info.st_mode) or stat.S_IMODE(info.st_mode) != 0o600 or info.st_uid != os.getuid():
        raise RuntimeError('DEV runtime env has unsafe ownership/permissions')
    return ENV_PATH.read_text().splitlines()


def replace_env(lines, values):
    seen = set()
    output = []
    for line in lines:
        key = line.split('=', 1)[0] if '=' in line and not line.startswith('#') else None
        if key in values:
            output.append(key + '=' + values[key])
            seen.add(key)
        else:
            output.append(line)
    for key, value in values.items():
        if key not in seen:
            output.append(key + '=' + value)
    return '\n'.join(output) + '\n'


def write_private_env(content):
    fd, name = tempfile.mkstemp(prefix='.dev-web.env.', dir=str(ENV_PATH.parent), text=True)
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, 'w') as output:
            output.write(content)
        os.replace(name, ENV_PATH)
    except Exception:
        try:
            os.unlink(name)
        except FileNotFoundError:
            pass
        raise


def safe_client(client):
    return {key: client.get(key) for key in (
        'clientId', 'name', 'enabled', 'protocol', 'publicClient',
        'standardFlowEnabled', 'implicitFlowEnabled', 'directAccessGrantsEnabled',
        'serviceAccountsEnabled', 'redirectUris', 'webOrigins', 'attributes', 'loginTheme',
    )}


def main():
    branch = subprocess.check_output(
        ['git', '-C', str(Path(__file__).parents[2]), 'branch', '--show-current'], text=True
    ).strip()
    if branch != 'dev':
        raise RuntimeError('Live DEV Keycloak changes require the integrated dev branch')
    lines = private_env()
    values = dict(line.split('=', 1) for line in lines if '=' in line and not line.startswith('#'))
    if values.get('SAMMA_BASE_URL') != DEV_ORIGIN:
        raise RuntimeError('DEV runtime must target https://dev.samma.co.za')

    _, token = kc.admin_token()
    realm = kc.request('GET', '/admin/realms/samma', token=token)
    if realm.get('loginTheme') not in (None, ''):
        raise RuntimeError('Realm loginTheme is not unset; refusing to change shared authentication state')

    production = kc.request('GET', '/admin/realms/samma/clients?clientId=samma-web', token=token)
    if len(production) != 1:
        raise RuntimeError('Expected exactly one production samma-web client')
    dev = kc.request('GET', '/admin/realms/samma/clients?clientId=' + DEV_CLIENT_ID, token=token)
    if len(dev) > 1:
        raise RuntimeError('Expected at most one DEV client')

    BACKUP_DIR.mkdir(mode=0o700, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup = BACKUP_DIR / ('keycloak-dev-client-before-' + stamp + '.json')
    backup.write_text(json.dumps({'realm': {'realm': realm.get('realm'), 'loginTheme': realm.get('loginTheme')},
                                  'productionClient': safe_client(production[0]),
                                  'devClient': safe_client(dev[0]) if dev else None}, indent=2) + '\n')
    os.chmod(backup, 0o600)

    source = production[0]
    if dev:
        if values.get('SAMMA_OIDC_CLIENT_ID') != DEV_CLIENT_ID or not values.get('SAMMA_OIDC_CLIENT_SECRET'):
            raise RuntimeError('Existing DEV client requires the separate DEV runtime secret')
        client_secret = values['SAMMA_OIDC_CLIENT_SECRET']
    else:
        client_secret = secrets.token_urlsafe(32)
    representation = {
        'clientId': DEV_CLIENT_ID, 'name': 'SAMMA DEV', 'enabled': source.get('enabled', True),
        'protocol': 'openid-connect', 'publicClient': False, 'secret': client_secret,
        'standardFlowEnabled': source.get('standardFlowEnabled', True),
        'implicitFlowEnabled': False, 'directAccessGrantsEnabled': False,
        'serviceAccountsEnabled': False, 'redirectUris': [CALLBACK], 'webOrigins': [DEV_ORIGIN],
        'attributes': {
            'pkce.code.challenge.method': 'S256',
            'post.logout.redirect.uris': DEV_ORIGIN + '/',
            'login_theme': 'samma',
        },
    }
    if dev:
        kc.request('PUT', '/admin/realms/samma/clients/' + dev[0]['id'], representation, token=token)
    else:
        kc.request('POST', '/admin/realms/samma/clients', representation, token=token)
        dev = kc.request('GET', '/admin/realms/samma/clients?clientId=' + DEV_CLIENT_ID, token=token)
    after_realm = kc.request('GET', '/admin/realms/samma', token=token)
    after_production = kc.request('GET', '/admin/realms/samma/clients?clientId=samma-web', token=token)
    after_dev = kc.request('GET', '/admin/realms/samma/clients?clientId=' + DEV_CLIENT_ID, token=token)
    if after_realm.get('loginTheme') not in (None, '') or len(after_production) != 1:
        raise RuntimeError('Shared realm or production client read-back failed')
    if safe_client(after_production[0]) != safe_client(production[0]):
        raise RuntimeError('Production client changed; refusing successful completion')
    if len(after_dev) != 1 or after_dev[0].get('attributes', {}).get('login_theme') != 'samma' or \
            after_dev[0].get('redirectUris') != [CALLBACK] or after_dev[0].get('webOrigins') != [DEV_ORIGIN]:
        raise RuntimeError('DEV client read-back failed')
    write_private_env(replace_env(lines, {'SAMMA_OIDC_CLIENT_ID': DEV_CLIENT_ID,
                                          'SAMMA_OIDC_CLIENT_SECRET': client_secret}))
    print('PASS: samma-dev-web provisioned with DEV-only URLs and login theme samma. Private backup preserved; secret withheld.')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(str(error) if isinstance(error, RuntimeError) else 'DEV client setup failed; details suppressed.', file=__import__('sys').stderr)
        raise SystemExit(1)
