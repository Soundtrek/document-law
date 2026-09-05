#!/usr/bin/env python3
"""Remove only the disposable Keycloak users listed in the private validation manifest."""
import importlib.util
import json
from pathlib import Path
import re
spec = importlib.util.spec_from_file_location('bootstrap', Path(__file__).with_name('keycloak-bootstrap.py'))
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)
_, token = b.admin_token()
links = json.loads(b.private_read(Path('/etc/samma-dev/validation-links.json')))
for link in links:
    if not re.fullmatch(r'auth-validation-[a-f0-9]+@example\.test', link['email']):
        raise RuntimeError('Refusing cleanup outside the synthetic validation scope')
    user = b.request('GET', '/admin/realms/samma/users/' + link['providerSubject'], token=token)
    if user['email'] != link['email']:
        raise RuntimeError('Synthetic provider identity mismatch')
    b.request('DELETE', '/admin/realms/samma/users/' + link['providerSubject'], token=token)
print('Disposable provider validation users removed.')
