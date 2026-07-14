# Notification Hub SDK (TypeScript)

Thin HTTP client for the Notification Hub API.

## Install

```bash
npm install notification-hub-service
```

## Construct the client

```typescript
import { NotificationClient } from 'notification-hub-service';

const client = new NotificationClient('secure-token-123', 'http://localhost:3000');
```

Auth header: `X-API-Key`. Demo key: `secure-token-123`.

## Docs

- Guided happy path (Antora hub): https://sophias-hub.github.io/docs/
- Generated SDK reference: https://sophias-hub.github.io/docs-sdk/typescript/
