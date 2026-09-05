#!/usr/bin/env python3
"""Provision disposable synthetic identities. Passwords stay in an operator-only file."""
import importlib.util
import json
import os
from pathlib import Path
import secrets
import uuid
spec = importlib.util.spec_from_file_location('bootstrap', Path(__file__).with_name('keycloak-bootstrap.py'))
bootstrap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bootstrap)
_, token = bootstrap.admin_token()
users = []
for verified in [True, False]:
    email = 'auth-validation-' + uuid.uuid4().hex[:12] + '@example.test'
    password = secrets.token_urlsafe(32)
    bootstrap.request('POST', '/admin/realms/samma/users', {'username': email, 'email': email, 'emailVerified': verified, 'enabled': True,
        'firstName': 'Synthetic', 'lastName': 'Validation', 'requiredActions': [],
        'credentials': [{'type': 'password', 'value': password, 'temporary': False}]}, token)
    user = bootstrap.request('GET', '/admin/realms/samma/users?exact=true&username=' + email, token=token)[0]
    users.append({'email': email, 'password': password, 'verified': verified, 'providerSubject': user['id'], 'provider': bootstrap.ISSUER})
for name, data in [('validation-users.json', users), ('validation-links.json', [{k:v for k,v in user.items() if k != 'password'} for user in users])]:
    fd = os.open('/etc/samma-dev/' + name, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(fd, 'w') as out: json.dump(data, out)
print('Disposable synthetic validation identities created; credentials not displayed.')
