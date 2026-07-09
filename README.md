# Notification Hub Service

> **Portfolio project.** This is a mock backend service built with AI assistance to showcase the author's information architecture and technical writing skills. Not intended for production use.

A lightweight REST API that simulates a notification dispatch system — supporting email, SMS, and push channels. Built with Node.js, Express, TypeScript, and Docker.

---

## Getting Started

**With Docker (recommended):**
```bash
docker-compose up --build
```

**Without Docker:**
```bash
npm install && npm start
```

The server runs on `http://localhost:3000`.

---

## Quick Test

```bash
curl -H "X-API-Key: secure-token-123" http://localhost:3000/api/v1/templates
```

Expected response:
```json
[
  { "id": "welcome-email", "name": "Welcome Email Template", "channel": "email" },
  { "id": "otp-sms", "name": "One-Time Password SMS", "channel": "sms" },
  { "id": "payment-push", "name": "Payment Success Push Notification", "channel": "push" }
]
```

---

## Documentation

- [API Reference](TBD) — Endpoints, headers, request/response formats.
- [SDK Guide](TBD) — How to use the TypeScript client module.