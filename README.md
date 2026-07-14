# Notification Hub Service

> **Portfolio project.** This is a mock API service built with AI assistance to showcase the author's information architecture and technical writing skills. Not intended for production use.

A lightweight REST API that simulates a notification dispatch system—supporting email, SMS, and push channels. Built with Node.js, Express, TypeScript, and Docker.

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

## Local development scripts

Run these from the repo root after `npm install`.

### Run and test the API

| Command | What it does |
|---------|----------------|
| `npm start` | Start the API at `http://localhost:3000` |
| `npm test` | Run API integration tests (Jest + Supertest) |
| `npm run test:sdk` | Run the SDK sample client (API must be running) |

### Build docs locally

| Command | What it does | Output |
|---------|----------------|--------|
| `npm run docs:sdk` | Build SDK reference (TypeDoc) | `docs/sdk/` |
| `npm run docs:api` | Generate OpenAPI and start local Swagger UI | `http://localhost:8080/docs` |
| `npm run docs:api:site` | Build static Swagger UI site for publishing | `docs/api-site/` |
| `npm run docs:finalize` | Add provenance metadata and banner to built doc sites | `docs/sdk/`, `docs/api-site/` |

Open generated HTML locally, for example:

```bash
open docs/sdk/index.html
open docs/api-site/index.html
```

### Validate and pre-PR checks

| Command | What it does |
|---------|----------------|
| `npm run validate` | Checks: markdownlint, Vale, and Lychee (no API tests or docs builds) |
| `npm test` | API integration tests (Jest + Supertest) |
| `npm run pre-pr` | Local mirror of CI PR jobs (`validate` + `test-and-build-docs`); skips main-only publish |
| `npm run lint:md` | Markdown structure only (also included in `validate`) |

**Prerequisites** (install once):

```bash
brew install vale lychee
npm ci
```

Before opening a PR, run `npm run pre-pr`. On push to `main`, CI runs the same checks, builds docs, and publishes to the `docs-sdk` and `docs-api` repos.

---

## Documentation

API and SDK reference docs are generated from this repo in CI and published to separate GitHub Pages sites:

- [API Reference](https://sophias-hub.github.io/docs-api/): Endpoints, headers, request/response formats (Swagger Try it out).
- [SDK Guide](https://sophias-hub.github.io/docs-sdk/): How to use the TypeScript client module.
- [Guides hub](https://sophias-hub.github.io/docs/): Tutorials, how-tos, and explanations (Antora).

### Changelog and releases

Product changes (API, SDKs, generated reference docs) are recorded in **[CHANGELOG.md](./CHANGELOG.md)** ([Keep a Changelog](https://keepachangelog.com/)).

- Update `CHANGELOG.md` in the same PR as user-visible behavior changes.
- For notable versions, publish a matching [GitHub Release](https://github.com/sophias-hub/notification-hub-service/releases) from that changelog entry.
- Don't add changelogs in `docs-api` or `docs-sdk`; those repos are publish targets with build provenance only.

### Interactive Swagger (Try it out)

The published Swagger UI sends Try it out requests to a public mock API. CI bakes that API origin into the site from the `PUBLIC_API_URL` repo variable. Authorize with API key `secure-token-123`.
