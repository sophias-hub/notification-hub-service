The **Notification Hub SDK** provides a type-safe client for integrating central notifications into your server applications. It streamlines delivery tracking and asset rendering for email, SMS, and push notifications.

## Installation

```bash
npm install notification-hub-service
```

## Quick Start

### 1. Initialize the Client

```typescript
import { NotificationClient } from 'notification-hub-service';

const client = new NotificationClient('secure-token-123', 'http://localhost:3000');
```

### 2. Fetch Templates

```typescript
const templates = await client.getTemplates();
console.log(templates);
```

### 3. Send a Notification

```typescript
const response = await client.sendNotification(
  'user@example.com',
  'email',
  'welcome-email',
  { name: 'Sophia' }
);

console.log(`Success! Record ID: ${response.recordId}`);
```

## Integration & Running Instructions

### 1. Environment Setup
Ensure your project is configured to support ES Modules (ESM). Your `package.json` must include:

```json
{
  "type": "module"
}
```

### 2. Execution Methods

Use `tsx` to execute TypeScript files instantly without a manual compilation step:

```bash
# Install execution runner
npm install --save-dev tsx

# Run your script
npx tsx sdks/typescript/test-client.ts
```
