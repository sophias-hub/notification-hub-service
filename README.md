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

### Validate (prose + links)

| Command | What it does |
|---------|----------------|
| `npm run validate` | Lint all `*.md` with Vale and check links with Lychee |

**Prerequisites** (install once):

```bash
brew install vale lychee
```

On push to `main`, CI runs tests, builds docs, validates Markdown, and publishes to the `docs-sdk` and `docs-api` repos.

### Docs hub agent (Diátaxis PRs)

When product code merges to `main`, workflow `.github/workflows/docs-hub-agent.yml`:

1. Routes the change to Diátaxis pages in `sophias-hub/docs`
2. Asks Gemini to update those AsciiDoc files
3. Opens a PR labeled `generated-docs` (no auto-merge; skipped if nothing changed)

**Required Actions secrets** (repo Settings → Secrets):

| Secret | Purpose |
|--------|---------|
| `GEMINI_API_KEY` | Google AI Studio API key |
| `DOCS_HUB_TOKEN` | Fine-grained PAT with Contents + Pull requests write on `sophias-hub/docs` |

Also create the `generated-docs` label once on the docs hub repo.

Local dry-run (with a local clone of the docs hub):

```bash
export GEMINI_API_KEY=...
export DOCS_HUB_PATH=/path/to/docs
export COMMIT_SHA=$(git rev-parse HEAD)
export COMMIT_MSG=$(git log -1 --pretty=%s)
node scripts/docs-hub-agent.mjs
```

---

## Documentation

API and SDK reference docs are generated from this repo in CI and published to separate GitHub Pages sites:

- [API Reference](https://sophias-hub.github.io/docs-api/): Endpoints, headers, request/response formats (Swagger Try it out).
- [SDK Guide](https://sophias-hub.github.io/docs-sdk/): How to use the TypeScript client module.

### Interactive Swagger (Try it out)

The published Swagger UI sends Try it out requests to a public mock API. CI bakes that API origin into the site from the `PUBLIC_API_URL` repo variable. Authorize with API key `secure-token-123`.
