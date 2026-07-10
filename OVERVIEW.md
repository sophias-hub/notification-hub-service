# Notification Hub Service—Agent Overview

This repo is a small, portfolio-focused API service meant to be easy to understand, run, and document.

## What this service does

- Exposes a **mock Notification Hub REST API** (templates + “send” simulation).
- Protects endpoints with a simple **API key in the `X-API-Key` header**.
- Includes a **TypeScript SDK client** (`src/sdk/`) used to call the API.
- Generates API docs via **tsoa → Swagger spec**, and serves a local **Swagger UI sandbox**.

## Tech stack (as implemented)

- **Runtime**: Node.js + TypeScript (executed via `tsx`)
- **HTTP**: Express (ESM, `type: "module"`)
- **Docs**:
  - API: `tsoa spec` emits `docs/api/swagger.json`
  - UI: `scripts/swagger-docs.ts` serves Swagger UI at `/docs` on port `8080`
  - SDK: TypeDoc emits `docs/sdk`
- **Tests**: Jest + Supertest
- **Containers**: `Dockerfile`, `docker-compose.yml`

## Quickstart

### Run the API

- **Docker**:

  ```bash
  docker-compose up --build
  ```

- **Local**:

  ```bash
  npm install
  npm start
  ```

The API listens on `http://localhost:3000` by default (or `PORT` if set).

### Smoke test the API

```bash
curl -H "X-API-Key: secure-token-123" http://localhost:3000/api/v1/templates
```

### Run tests

```bash
npm test
```

### Run the SDK test client (requires API running)

```bash
npm run test:sdk
```

## API surface (current)

### Auth

- **Header**: `X-API-Key`
- **Valid value (hardcoded)**: `secure-token-123`
- **Where implemented**: `src/server.ts`

> Note: this is intentionally simplistic for portfolio/demo purposes.

### `GET /api/v1/templates`

- **Purpose**: Returns a fixed list of mock templates.
- **Response**: `200` JSON array of `{ id, name, channel }`
- **Where implemented**: `src/server.ts` (Express route), `src/controllers/notificationController.ts` (tsoa controller metadata)

### `POST /api/v1/send`

- **Purpose**: Accepts a request body and returns a synthetic `messageId`.
- **Request body**:
  - `recipient` (required)
  - `channel` (required)
  - `templateId` (required)
  - `templateData` (optional)
- **Responses**:
  - `200`: `{ status, messageId, processedAt }`
  - `400`: `{ error: "Bad Request", message: "Missing required fields: ..."}`
- **Where implemented**: `src/server.ts` (Express route), `src/controllers/notificationController.ts` (tsoa controller metadata)

## “How docs work” (API + SDK)

### API docs generation flow

1. `tsoa spec` reads:
   - entrypoint: `src/server.ts`
   - controllers: `src/controllers/**/*.ts`
   - config: `tsoa.json`
2. Output is written to `docs/api/swagger.json`
3. `scripts/swagger-docs.ts` starts a Swagger UI server at:
   - `http://localhost:8080/docs`

Run it with:

```bash
npm run docs:api
```

### SDK docs generation (TypeDoc)

- **Entry point**: `src/sdk/client.ts`
- **Readme**: `src/sdk/README.md`
- **Output**: `docs/sdk`

Run it with:

```bash
npm run docs:sdk
```

## Repo map (“where do I change X?”)

- **Add/change API behavior**: `src/server.ts`
- **Add/change OpenAPI docs metadata**: `src/controllers/notificationController.ts` and `tsoa.json`
- **Swagger UI sandbox server**: `scripts/swagger-docs.ts`
- **SDK behavior / request shaping**: `src/sdk/client.ts`
- **SDK usage examples**: `src/sdk/README.md`, `src/sdk/test-client.ts`
- **API tests**: `src/server.test.ts`
- **Docker runtime**: `Dockerfile`, `docker-compose.yml`

## Known quirks / gotchas (so agents don’t waste time)

- **Hardcoded API key**: the service currently uses `secure-token-123` directly in `src/server.ts`.
- **tsoa auth module path**: `tsoa.json` references `src/authentication.ts`, but that file isn't **currently present** in the repo. If you want tsoa-generated routes/auth integration, add/restore that module or update `tsoa.json` accordingly.
- **Generated artifacts**: `docs/api/swagger.json` and `docs/sdk/` are generated outputs and may not exist until you run the docs scripts.

## Common agent tasks (suggested)

- **Document the API**: base it on `src/server.ts` + `src/server.test.ts`, then align with tsoa/Swagger output.
- **Make auth configurable**: move the API key to an env var (and update tests + docs).
- **Add new endpoint**: implement route in `src/server.ts`, add tsoa controller metadata, add tests in `src/server.test.ts`, regenerate `docs/api/swagger.json`.

