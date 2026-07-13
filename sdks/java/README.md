# Notification Hub SDK (Java)

Thin HTTP client for the Notification Hub API. Mirrors the TypeScript `NotificationClient`.

## Requirements

- Java 17+
- Maven 3.9+

## Install (local)

```bash
cd sdks/java
mvn -q install
```

Maven coordinates: `com.sophias.hub:notification-hub-sdk:0.1.0`

## Quick start

```java
import com.sophias.hub.notification.NotificationClient;
import com.sophias.hub.notification.NotificationResponse;
import java.util.Map;

NotificationClient client = new NotificationClient("secure-token-123", "http://localhost:3000");

var templates = client.getTemplates();

NotificationResponse response = client.sendNotification(
    "user@example.com",
    "email",
    "welcome-email",
    Map.of("name", "Sophia")
);

System.out.println(response.getRecordId());
```

## Smoke example

With the API running locally:

```bash
cd sdks/java
mvn -q test-compile exec:java
# or with custom key / URL:
mvn -q test-compile exec:java -Dexec.args="secure-token-123 http://localhost:3000"
```

## Docs

Javadoc is generated into `docs/sdk/java/` with a modern theme overlay (`src/main/javadoc/modern-theme.css`).

```bash
# from notification-hub-service/
npm run docs:sdk:java
open docs/sdk/java/index.html
```

Published at: https://sophias-hub.github.io/docs-sdk/java/

| Method | HTTP |
| --- | --- |
| `getTemplates()` | `GET /api/v1/templates` |
| `sendNotification(...)` | `POST /api/v1/send` |
| `send(...)` (deprecated) | wraps `sendNotification` with `legacy-raw-template` |

Auth header: `X-API-Key`
