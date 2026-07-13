package com.sophias.hub.notification;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * HTTP client for the Notification Hub API.
 *
 * <pre>{@code
 * NotificationClient client = new NotificationClient("secure-token-123", "http://localhost:3000");
 * List<NotificationTemplate> templates = client.getTemplates();
 * }</pre>
 */
public class NotificationClient {
  private static final ObjectMapper MAPPER = new ObjectMapper();

  private final String apiKey;
  private final String baseUrl;
  private final HttpClient httpClient;

  public NotificationClient(String apiKey) {
    this(apiKey, "http://localhost:3000");
  }

  public NotificationClient(String apiKey, String baseUrl) {
    this.apiKey = Objects.requireNonNull(apiKey, "apiKey");
    String normalized = Objects.requireNonNull(baseUrl, "baseUrl").replaceAll("/+$", "");
    this.baseUrl = normalized;
    this.httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .build();
  }

  /** Fetches all available notification templates. */
  public List<NotificationTemplate> getTemplates() {
    return readList(request("GET", "/api/v1/templates", null), new TypeReference<>() {}, "Failed to fetch templates");
  }

  /** Retrieve one template by id. */
  public NotificationTemplate getTemplate(String id) {
    return read(request("GET", "/api/v1/templates/" + enc(id), null), NotificationTemplate.class, "Failed to get template");
  }

  /** Create a template. */
  public NotificationTemplate createTemplate(NotificationTemplate template) {
    return read(request("POST", "/api/v1/templates", template), NotificationTemplate.class, "Failed to create template");
  }

  /** Replace a template. */
  public NotificationTemplate updateTemplate(String id, Map<String, Object> body) {
    return read(request("PUT", "/api/v1/templates/" + enc(id), body), NotificationTemplate.class, "Failed to update template");
  }

  /** Partially update a template. */
  public NotificationTemplate patchTemplate(String id, Map<String, Object> patch) {
    return read(request("PATCH", "/api/v1/templates/" + enc(id), patch), NotificationTemplate.class, "Failed to patch template");
  }

  /** Delete a template. */
  public void deleteTemplate(String id) {
    ensureOk(request("DELETE", "/api/v1/templates/" + enc(id), null), "Failed to delete template");
  }

  /** Sends a template-driven notification. */
  public NotificationResponse sendNotification(
      String recipient,
      String channel,
      String templateId,
      Map<String, Object> templateData
  ) {
    Map<String, Object> payload = new HashMap<>();
    payload.put("recipient", recipient);
    payload.put("channel", channel);
    payload.put("templateId", templateId);
    payload.put("templateData", templateData == null ? Map.of() : templateData);
    return read(request("POST", "/api/v1/send", payload), NotificationResponse.class, "Failed to send notification");
  }

  /**
   * @deprecated Use {@link #sendNotification(String, String, String, Map)} instead.
   */
  @Deprecated
  public NotificationResponse send(String recipient, String channel, String rawMessage) {
    return sendNotification(recipient, channel, "legacy-raw-template", Map.of("body", rawMessage));
  }

  /** Retrieve a delivery record by id. */
  public DeliveryRecord getRecord(String recordId) {
    return read(request("GET", "/api/v1/records/" + enc(recordId), null), DeliveryRecord.class, "Failed to get record");
  }

  /** List delivery records with optional filters. */
  public List<DeliveryRecord> listRecords(String recipient, String status) {
    StringBuilder path = new StringBuilder("/api/v1/records");
    boolean first = true;
    if (recipient != null && !recipient.isBlank()) {
      path.append(first ? "?" : "&").append("recipient=").append(enc(recipient));
      first = false;
    }
    if (status != null && !status.isBlank()) {
      path.append(first ? "?" : "&").append("status=").append(enc(status));
    }
    return readList(request("GET", path.toString(), null), new TypeReference<>() {}, "Failed to list records");
  }

  /** Delete a delivery record. */
  public void deleteRecord(String recordId) {
    ensureOk(request("DELETE", "/api/v1/records/" + enc(recordId), null), "Failed to delete record");
  }

  /** Get preferences for a recipient. */
  public Preferences getPreferences(String recipient) {
    return read(request("GET", "/api/v1/preferences/" + enc(recipient), null), Preferences.class, "Failed to get preferences");
  }

  /** Replace preferences. */
  public Preferences setPreferences(String recipient, boolean email, boolean sms, boolean push) {
    Map<String, Object> body = Map.of("email", email, "sms", sms, "push", push);
    return read(request("PUT", "/api/v1/preferences/" + enc(recipient), body), Preferences.class, "Failed to set preferences");
  }

  /** Partially update preferences. */
  public Preferences patchPreferences(String recipient, Map<String, Boolean> patch) {
    return read(request("PATCH", "/api/v1/preferences/" + enc(recipient), patch), Preferences.class, "Failed to patch preferences");
  }

  /** Reset preferences to defaults. */
  public Preferences resetPreferences(String recipient) {
    return read(request("DELETE", "/api/v1/preferences/" + enc(recipient), null), Preferences.class, "Failed to reset preferences");
  }

  /** Opt out of a single channel. */
  public Preferences unsubscribe(String recipient, String channel) {
    return read(
        request("POST", "/api/v1/unsubscribe", Map.of("recipient", recipient, "channel", channel)),
        Preferences.class,
        "Failed to unsubscribe"
    );
  }

  /** Register a webhook. */
  public Webhook createWebhook(String url, List<String> events) {
    Map<String, Object> body = new HashMap<>();
    body.put("url", url);
    if (events != null) {
      body.put("events", events);
    }
    return read(request("POST", "/api/v1/webhooks", body), Webhook.class, "Failed to create webhook");
  }

  /** List webhooks. */
  public List<Webhook> listWebhooks() {
    return readList(request("GET", "/api/v1/webhooks", null), new TypeReference<>() {}, "Failed to list webhooks");
  }

  /** Get a webhook by id. */
  public Webhook getWebhook(String id) {
    return read(request("GET", "/api/v1/webhooks/" + enc(id), null), Webhook.class, "Failed to get webhook");
  }

  /** Delete a webhook. */
  public void deleteWebhook(String id) {
    ensureOk(request("DELETE", "/api/v1/webhooks/" + enc(id), null), "Failed to delete webhook");
  }

  /** List webhook delivery attempts. */
  public List<WebhookDelivery> listWebhookDeliveries() {
    return readList(request("GET", "/api/v1/webhooks/deliveries", null), new TypeReference<>() {}, "Failed to list deliveries");
  }

  private HttpResponse<String> request(String method, String path, Object body) {
    HttpRequest.Builder builder = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + path))
        .timeout(Duration.ofSeconds(30))
        .header("X-API-Key", apiKey)
        .header("Accept", "application/json");

    if (body != null) {
      String json;
      try {
        json = MAPPER.writeValueAsString(body);
      } catch (IOException e) {
        throw new NotificationHubException("Failed to serialize payload: " + e.getMessage(), 0);
      }
      builder.header("Content-Type", "application/json");
      builder.method(method, HttpRequest.BodyPublishers.ofString(json));
    } else if ("DELETE".equals(method)) {
      builder.DELETE();
    } else if ("GET".equals(method)) {
      builder.GET();
    } else {
      builder.method(method, HttpRequest.BodyPublishers.noBody());
    }

    return send(builder.build());
  }

  private HttpResponse<String> send(HttpRequest request) {
    try {
      return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new NotificationHubException("HTTP request interrupted: " + e.getMessage(), 0);
    } catch (IOException e) {
      throw new NotificationHubException("HTTP request failed: " + e.getMessage(), 0);
    }
  }

  private <T> T read(HttpResponse<String> response, Class<T> type, String prefix) {
    ensureOk(response, prefix);
    if (response.body() == null || response.body().isBlank()) {
      return null;
    }
    try {
      return MAPPER.readValue(response.body(), type);
    } catch (IOException e) {
      throw new NotificationHubException(prefix + " (parse): " + e.getMessage(), response.statusCode());
    }
  }

  private <T> List<T> readList(HttpResponse<String> response, TypeReference<List<T>> type, String prefix) {
    ensureOk(response, prefix);
    try {
      return MAPPER.readValue(response.body(), type);
    } catch (IOException e) {
      throw new NotificationHubException(prefix + " (parse): " + e.getMessage(), response.statusCode());
    }
  }

  private void ensureOk(HttpResponse<String> response, String prefix) {
    if (response.statusCode() >= 200 && response.statusCode() < 300) {
      return;
    }
    String message = response.body();
    try {
      JsonNode node = MAPPER.readTree(response.body());
      if (node.has("message")) {
        message = node.get("message").asText();
      }
      if (node.has("code")) {
        message = node.get("code").asText() + ": " + message;
      }
    } catch (IOException ignored) {
      // keep raw body
    }
    throw new NotificationHubException(prefix + ": " + response.statusCode() + " - " + message, response.statusCode());
  }

  private static String enc(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }
}
