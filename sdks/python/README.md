# Notification Hub SDK (Python)

Thin HTTP client for the Notification Hub API. Mirrors the TypeScript `NotificationClient`.

## Requirements

- Python 3.10+

## Install (local)

```bash
cd sdks/python
pip install -e .
```

## Quick start

```python
from notification_hub import NotificationClient

client = NotificationClient("secure-token-123", "http://localhost:3000")

templates = client.get_templates()

response = client.send_notification(
    "user@example.com",
    "email",
    "welcome-email",
    {"name": "Sophia"},
)

print(response.messageId)
```

## Smoke example

With the API running locally:

```bash
cd sdks/python
python examples/smoke_test.py
# or:
python examples/smoke_test.py secure-token-123 http://localhost:3000
```

## API surface

| Method | HTTP |
| --- | --- |
| `get_templates()` | `GET /api/v1/templates` |
| `send_notification(...)` | `POST /api/v1/send` |
| `send(...)` (deprecated) | wraps `send_notification` with `legacy-raw-template` |

Auth header: `X-API-Key`

Uses the Python standard library only (`urllib`).
