# Notification Hub SDK (Python)

Thin HTTP client for the Notification Hub API.

## Requirements

- Python 3.10+

## Install (local)

```bash
cd sdks/python
pip install -e .
```

## Construct the client

```python
from notification_hub import NotificationClient

client = NotificationClient("secure-token-123", "http://localhost:3000")
```

Auth header: `X-API-Key`. Demo key: `secure-token-123`.

Uses the Python standard library only (`urllib`).

## Docs

- Guided happy path (Antora hub): https://sophias-hub.github.io/docs/
- Generated SDK reference: https://sophias-hub.github.io/docs-sdk/python/
