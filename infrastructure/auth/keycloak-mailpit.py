#!/usr/bin/env python3
"""Operator-only shared NUC realm SMTP switch; never run/mount in SAMMA web."""
import importlib.util
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
from uuid import uuid4

spec = importlib.util.spec_from_file_location('bootstrap', Path(__file__).with_name('keycloak-bootstrap.py'))
kc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(kc)

SMTP = {
    'host': 'samma-mailpit', 'port': '1025', 'ssl': 'false',
    'starttls': 'false', 'auth': 'false', 'from': 'no-reply@samma.co.za',
    'fromDisplayName': 'SAMMA',
}


def main():
    if sys.argv[1:] != ['apply'] or socket.gethostname() != 'MCNUCEM':
        raise RuntimeError('Use apply only on the approved NUC MCNUCEM.')
    containers = json.loads(subprocess.check_output([
        'docker', 'inspect', 'samma-mailpit', 'samma-keycloak',
        'samma-dev-web', 'juanity-app',
    ]))
    mailpit, keycloak, dev, rc = containers
    if mailpit['State'].get('Health', {}).get('Status') != 'healthy':
        raise RuntimeError('Mailpit must be healthy before switching mail.')
    if mailpit['HostConfig']['PortBindings'] != {
        '8025/tcp': [{'HostIp': '192.168.1.152', 'HostPort': '8025'}]
    }:
        raise RuntimeError('Expected LAN-only UI and unpublished SMTP.')
    if (set(mailpit['NetworkSettings']['Networks']) != {'samma-auth-private', 'samma-mailpit-inbox'}
            or 'samma-auth-private' not in keycloak['NetworkSettings']['Networks']):
        raise RuntimeError('Unexpected Mailpit/Keycloak network boundary.')
    for app in (dev, rc):
        if 'SAMMA_OIDC_ISSUER=' + kc.ISSUER not in app['Config']['Env']:
            raise RuntimeError('Expected the approved shared NUC issuer.')
    # The real SMTP credential file is preserved, never written or displayed.
    kc.private_read(Path('/etc/samma-dev/smtp.env'))
    _, token = kc.admin_token()
    before = kc.request('GET', '/admin/realms/samma', token=token)
    for flag in ('registrationAllowed', 'verifyEmail', 'resetPasswordAllowed'):
        if before.get(flag) is not True:
            raise RuntimeError('Registration, verification and recovery must already be enabled.')
    backup = Path('/etc/samma-dev') / ('mailpit-before-' + uuid4().hex + '.json')
    fd = os.open(backup, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(fd, 'w') as output:
        json.dump(before, output)
    kc.request('PUT', '/admin/realms/samma', {'smtpServer': SMTP}, token)
    after = kc.request('GET', '/admin/realms/samma', token=token)
    if after.get('smtpServer') != SMTP:
        raise RuntimeError('SMTP read-back mismatch; inspect privately before continuing.')
    if {k: v for k, v in before.items() if k != 'smtpServer'} != {
        k: v for k, v in after.items() if k != 'smtpServer'
    }:
        raise RuntimeError('Non-SMTP realm settings changed; inspect privately.')
    print('PASS: shared NUC realm uses Mailpit; all non-SMTP realm settings unchanged. Private backup saved.')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(str(error) if isinstance(error, RuntimeError) else
              'NUC mail switch failed (' + type(error).__name__ + '); details suppressed.', file=sys.stderr)
        sys.exit(1)
