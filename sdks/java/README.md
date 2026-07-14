# Notification Hub SDK (Java)

Thin HTTP client for the Notification Hub API.

## Requirements

- Java 17+
- Maven 3.9+

## Install (local)

```bash
cd sdks/java
mvn -q install
```

Maven coordinates: `com.sophias.hub:notification-hub-sdk:0.1.0`

## Construct the client

```java
import com.sophias.hub.notification.NotificationClient;

NotificationClient client = new NotificationClient("secure-token-123", "http://localhost:3000");
```

Auth header: `X-API-Key`. Demo key: `secure-token-123`.

## Docs

- Guided happy path (Antora hub): https://sophias-hub.github.io/docs/
- Generated SDK reference: https://sophias-hub.github.io/docs-sdk/java/
