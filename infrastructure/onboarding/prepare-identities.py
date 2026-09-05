#!/usr/bin/env python3
"""Operator-only disposable Keycloak DEV identities; no provider configuration changes."""
import importlib.util
import json
import os
from pathlib import Path
import secrets
import sys
import uuid
root = Path(os.environ['SAMMA_ONBOARDING_VALIDATION_DIR'])
manifest = root / 'users.json'
spec = importlib.util.spec_from_file_location('bootstrap', Path(__file__).parents[1] / 'auth/keycloak-bootstrap.py')
bootstrap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bootstrap)
_, token = bootstrap.admin_token()
if sys.argv[1:] == ['cleanup']:
    for user in json.loads(manifest.read_text()):
        bootstrap.request('DELETE', '/admin/realms/samma/users/' + user['providerSubject'], token=token)
    manifest.unlink()
    print('PASS disposable provider identities removed')
else:
    fd = os.open(manifest, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    users = []
    with os.fdopen(fd, 'w') as out:
        for label in ['person', 'company', 'unverified']:
            email = 'onboarding-' + uuid.uuid4().hex[:12] + '@example.test'
            password = secrets.token_urlsafe(32)
            bootstrap.request('POST', '/admin/realms/samma/users', {'username': email, 'email': email, 'emailVerified': label != 'unverified', 'enabled': True,
                'firstName': 'Synthetic', 'lastName': 'Onboarding', 'requiredActions': [],
                'credentials': [{'type': 'password', 'value': password, 'temporary': False}]}, token)
            user = bootstrap.request('GET', '/admin/realms/samma/users?exact=true&username=' + email, token=token)[0]
            users.append({'label': label, 'email': email, 'password': password, 'providerSubject': user['id'], 'provider': bootstrap.ISSUER})
            out.seek(0); json.dump(users, out); out.truncate(); out.flush()
    print('PASS disposable provider identities created; no SAMMA pre-links or credentials displayed')
