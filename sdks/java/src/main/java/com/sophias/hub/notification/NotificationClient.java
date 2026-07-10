package com.sophias.hub.notification;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
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

  /**
   * Fetches all available notification templates.
   */
  public List<NotificationTemplate> getTemplates() {
    HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/api/v1/templates"))
        .timeout(Duration.ofSeconds(30))
        .header("X-API-Key", apiKey)
        .header("Accept", "application/json")
        .GET()
        .build();

    HttpResponse<String> response = send(request);
    ensureOk(response, "Failed to fetch templates");
    try {
      return MAPPER.readValue(response.body(), new TypeReference<List<NotificationTemplate>>() {});
    } catch (IOException e) {
      throw new NotificationHubException("Failed to parse templates response: " + e.getMessage(), response.statusCode());
    }
  }

  /**
   * Sends a template-driven notification.
   */
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

    String body;
    try {
      body = MAPPER.writeValueAsString(payload);
    } catch (IOException e) {
      throw new NotificationHubException("Failed to serialize send payload: " + e.getMessage(), 0);
    }

    HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/api/v1/send"))
        .timeout(Duration.ofSeconds(30))
        .header("X-API-Key", apiKey)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(body))
        .build();

    HttpResponse<String> response = send(request);
    ensureOk(response, "Failed to send notification");
    try {
      return MAPPER.readValue(response.body(), NotificationResponse.class);
    } catch (IOException e) {
      throw new NotificationHubException("Failed to parse send response: " + e.getMessage(), response.statusCode());
    }
  }

  /**
   * @deprecated Use {@link #sendNotification(String, String, String, Map)} instead.
   */
  @Deprecated
  public NotificationResponse send(String recipient, String channel, String rawMessage) {
    return sendNotification(recipient, channel, "legacy-raw-template", Map.of("body", rawMessage));
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
    } catch (IOException ignored) {
      // keep raw body
    }
    throw new NotificationHubException(prefix + ": " + response.statusCode() + " - " + message, response.statusCode());
  }
}
