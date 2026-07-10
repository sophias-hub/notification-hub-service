# Notification Hub SDKs

Thin HTTP clients that share the same API surface across languages.

| Language | Path | Package | Docs |
| --- | --- | --- | --- |
| TypeScript | [`typescript/`](typescript/) | (TypeDoc) | https://sophias-hub.github.io/docs-sdk/typescript/ |
| Java | [`java/`](java/) | `com.sophias.hub:notification-hub-sdk` | https://sophias-hub.github.io/docs-sdk/java/ |
| Python | [`python/`](python/) | `notification-hub` | https://sophias-hub.github.io/docs-sdk/python/ |

Index: https://sophias-hub.github.io/docs-sdk/

Each language folder has a README and a smoke/example. Point the client at a running Notification Hub (`http://localhost:3000` by default) with a valid `X-API-Key`.

Local build (TS + Java + Python docs):

```bash
npm run docs:sdk
open docs/sdk/index.html
```
