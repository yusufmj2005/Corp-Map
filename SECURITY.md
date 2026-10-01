# Security Policy

## Supported versions

Security fixes are applied to the latest release on the `main` branch.

## Reporting a vulnerability

Please **do not** report security vulnerabilities in public issues.

Instead, report them privately through GitHub's
[security advisory form](https://github.com/yusufmj2005/Corp-Map/security/advisories/new).
Include:

- a description of the issue and its impact
- steps to reproduce it, or a proof of concept
- any suggested fix, if you have one

You'll get an acknowledgement as soon as possible. Valid reports will be fixed and credited in the release notes, unless you'd prefer to stay anonymous.

## API keys

CorpMap's `ANTHROPIC_API_KEY` is read only by the Express server and is never sent to the browser. `.env` files are gitignored. If you ever accidentally commit a key, revoke it immediately in the [Anthropic Console](https://console.anthropic.com/settings/keys).
