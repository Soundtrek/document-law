# Owner SMTP continuation — 2026-09-06

The owner supplied the dedicated username `no-reply@samma.co.za`, incoming/outgoing
hostname `mail.samma.co.za`, SMTP implicit TLS port 465, IMAP TLS port 993 and POP3
TLS port 995. They asked Codex to create the password file. Codex created
`/etc/samma-dev/smtp.env`, owned by philip with mode 0600, leaving the password
blank. The owner entered it privately and replied **done**, resuming the complete
auth/registration task and its original validation/merge boundaries.

No password or token is captured here. The original complete request remains in
[the auth registration prompt](2026-09-06-auth-registration-v1.md).
