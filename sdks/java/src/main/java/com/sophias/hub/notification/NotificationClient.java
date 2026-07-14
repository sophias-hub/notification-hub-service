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
 * Every call sends your key in the {@code X-API-Key} header. The demo key is {@code secure-token-123}.
 *
 * <pre>{@code
 * NotificationClient client = new NotificationClient("secure-token-123", "http://localhost:3000");
 * }</pre>
 */
public class NotificationClient {
  private static final ObjectMapper MAPPER = new ObjectMapper();

  private final String apiKey;
  private final String baseUrl;
  private final HttpClient httpClient;

  /**
   * Creates a client that talks to {@code http://localhost:3000}.
   *
   * @param apiKey specifies the secret placed in the {@code X-API-Key} header on every request
   */
  public NotificationClient(String apiKey) {
    this(apiKey, "http://localhost:3000");
  }

  /**
   * Creates a client pointed at a Notification Hub base URL.
   *
   * @param apiKey specifies the secret placed in the {@code X-API-Key} header on every request
   * @param baseUrl sets the service origin; trailing slashes are stripped
   */
  public NotificationClient(String apiKey, String baseUrl) {
    this.apiKey = Objects.requireNonNull(apiKey, "apiKey");
    String normalized = Objects.requireNonNull(baseUrl, "baseUrl").replaceAll("/+$", "");
    this.baseUrl = normalized;
    this.httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .build();
  }

  /**
   * Returns every template currently in the catalog, including seeded examples and any templates created at runtime.
   *
   * <strong>NOTE:</strong> Calls <a href="https://sophias-hub.github.io/docs-api/#/Templates/GetTemplates"><code>GET /api/v1/templates</code></a>.
   *
   * @throws NotificationHubException with message containing {@code UNAUTHORIZED} when the {@code X-API-Key} header
   *     is missing or invalid; send header {@code X-API-Key} with a valid key and retry
   */
  public List<NotificationTemplate> getTemplates() {
    return readList(request("GET", "/api/v1/templates", null), new TypeReference<>() {}, "Failed to fetch templates");
  }

  /**
   * Looks up a single template by its {@code id} and returns the full template definition.
   *
   * @param id selects which template to retrieve (for example, {@code welcome-email})
   * @throws NotificationHubException with message containing {@code TEMPLATE_NOT_FOUND} when no template matched
   *     this {@code id}
   *
   * <strong>NOTE:</strong> Calls <a href="https://sophias-hub.github.io/docs-api/#/Templates/GetTemplate"><code>GET /api/v1/templates/{id}</code></a>. List templates with <a href="https://sophias-hub.github.io/docs-api/#/Templates/GetTemplates"><code>GET /api/v1/templates</code></a>,
   * confirm the spelling, or create the template before retrying.
   */
  public NotificationTemplate getTemplate(String id) {
    return read(request("GET", "/api/v1/templates/" + enc(id), null), NotificationTemplate.class, "Failed to get template");
  }

  /**
   * Adds a new template to the catalog and returns the created object (including a service-assigned {@code id}).
   *
   * @throws NotificationHubException the message may contain:
   *     {@code UNAUTHORIZED} — send header {@code X-API-Key} with a valid key and retry;
   *     {@code MISSING_FIELDS} — include {@code name} and {@code channel}, then retry;
   *     {@code INVALID_CHANNEL} — use only {@code email}, {@code sms}, or {@code push}, then retry;
   *     {@code INVALID_TEMPLATE_BODY} — use a non-empty {@code name}, then retry
   *
   * <strong>NOTE:</strong> Calls <a href="https://sophias-hub.github.io/docs-api/#/Templates/CreateTemplate"><code>POST /api/v1/templates</code></a> ({@code 201}).
   * Do not send {@code id}; the service assigns one. Any {@code id} on the input object is omitted from the request body.
   */
  public NotificationTemplate createTemplate(NotificationTemplate template) {
    Map<String, Object> body = new java.util.LinkedHashMap<>();
    body.put("name", template.getName());
    body.put("channel", template.getChannel());
    if (template.getSubject() != null) {
      body.put("subject", template.getSubject());
    }
    if (template.getBody() != null) {
      body.put("body", template.getBody());
    }
    return read(request("POST", "/api/v1/templates", body), NotificationTemplate.class, "Failed to create template");
  }

  /**
   * Replaces the {@code name}, {@code channel}, and optional content of an existing template with the values you
   * provide.
   *
   * @param id selects which existing template to replace
   * @throws NotificationHubException the message may contain:
   *     {@code TEMPLATE_NOT_FOUND} — list templates with <a href="https://sophias-hub.github.io/docs-api/#/Templates/GetTemplates"><code>GET /api/v1/templates</code></a> and confirm the id before
   *     retrying;
   *     {@code MISSING_FIELDS} — include {@code name} and {@code channel} in the body, then retry;
   *     {@code INVALID_CHANNEL} — use only {@code email}, {@code sms}, or {@code push}, then retry
   *
   * <strong>NOTE:</strong> Calls <a href="https://sophias-hub.github.io/docs-api/#/Templates/UpdateTemplate"><code>PUT /api/v1/templates/{id}</code></a>.
   */
  public NotificationTemplate updateTemplate(String id, Map<String, Object> body) {
    return read(request("PUT", "/api/v1/templates/" + enc(id), body), NotificationTemplate.class, "Failed to update template");
  }

  /**
   * Updates only the template fields included in the request body and leaves everything else unchanged.
   *
   * @param id selects which existing template to change
   * @param patch supplies only the fields to change; omitted fields stay as they are
   * @throws NotificationHubException the message may contain:
   *     {@code TEMPLATE_NOT_FOUND} — list templates with <a href="https://sophias-hub.github.io/docs-api/#/Templates/GetTemplates"><code>GET /api/v1/templates</code></a> and confirm the id before
   *     retrying;
   *     {@code INVALID_TEMPLATE_BODY} — correct the field shown in {@code details} (for example an empty {@code name}
   *     or unsupported {@code channel}) and retry
   *
   * <strong>NOTE:</strong> Calls <a href="https://sophias-hub.github.io/docs-api/#/Templates/PatchTemplate"><code>PATCH /api/v1/templates/{id}</code></a>.
   */
  public NotificationTemplate patchTemplate(String id, Map<String, Object> patch) {
    return read(request("PATCH", "/api/v1/templates/" + enc(id), patch), NotificationTemplate.class, "Failed to patch template");
  }

  /**
   * Deletes a template from the catalog.
   *
   * @param id selects which template to remove
   * @throws NotificationHubException the message may contain:
   *     {@code TEMPLATE_NOT_FOUND} — it may already be deleted; list templates to confirm;
   *     {@code TEMPLATE_IN_USE} — delivery records still reference this template; delete or wait out those records
   *     under <a href="https://sophias-hub.github.io/docs-api/#/Records/ListRecords"><code>GET /api/v1/records</code></a>, then retry the template delete
   *
   * <strong>NOTE:</strong> Calls <a href="https://sophias-hub.github.io/docs-api/#/Templates/DeleteTemplate"><code>DELETE /api/v1/templates/{id}</code></a> ({@code 204}).
   */
  public void deleteTemplate(String id) {
    ensureOk(request("DELETE", "/api/v1/templates/" + enc(id), null), "Failed to delete template");
  }

  /**
   * Accepts a notification send, creates a delivery record, and returns the new {@code recordId}.
   *
   * @param recipient specifies who should receive the notification
   * @param channel defines which channel to deliver on: {@code email}, {@code sms}, or {@code push}
   * @param templateId selects which catalog template to render and send
   * @param templateData supplies key/value pairs that fill {@code {{placeholders}}} in the template {@code subject}
   *     and {@code body}; may be {@code null}
   * @throws NotificationHubException the message may contain:
   *     {@code MISSING_FIELDS} — include {@code recipient}, {@code channel}, and {@code templateId}, then retry;
   *     {@code CHANNEL_OPTED_OUT} — check preferences with <a href="https://sophias-hub.github.io/docs-api/#/Preferences/GetPreferences"><code>GET /api/v1/preferences/{recipient}</code></a>, allow the
   *     channel with {@code PUT}/{@code PATCH}, or choose a different channel;
   *     {@code TEMPLATE_NOT_FOUND} — list templates with <a href="https://sophias-hub.github.io/docs-api/#/Templates/GetTemplates"><code>GET /api/v1/templates</code></a> or create the template before
   *     sending;
   *     {@code INVALID_CHANNEL} — use only {@code email}, {@code sms}, or {@code push}, then retry;
   *     {@code RATE_LIMITED} — wait for the seconds in {@code details.retryAfterSeconds} (and honor {@code Retry-After}),
   *     then retry
   *
   * <strong>NOTE:</strong> Calls <a href="https://sophias-hub.github.io/docs-api/#/Send/SendNotification"><code>POST /api/v1/send</code></a>. Before accepting the request, the service checks
   * preferences, that the template exists, that the channel is valid, and that you are within the send rate limit.
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
    return read(request("POST", "/api/v1/send", payload), NotificationResponse.class, "Failed to send notification");
  }

  /**
   * @deprecated Prefer {@link #sendNotification(String, String, String, Map)}.
   * Convenience wrapper that sends through the seeded template for {@code channel}
   * ({@code welcome-email}, {@code otp-sms}, or {@code payment-push}) with common
   * placeholder keys set to {@code rawMessage}.
   */
  @Deprecated
  public NotificationResponse send(String recipient, String channel, String rawMessage) {
    String templateId =
        "sms".equals(channel) ? "otp-sms" : "push".equals(channel) ? "payment-push" : "welcome-email";
    return sendNotification(
        recipient,
        channel,
        templateId,
        Map.of("body", rawMessage, "name", rawMessage, "code", rawMessage, "amount", rawMessage));
  }

  /**
   * Returns one delivery record so you can inspect status and related send details.
   *
   * @param recordId selects which record to retrieve (the id returned by <a href="https://sophias-hub.github.io/docs-api/#/Send/SendNotification"><code>POST /api/v1/send</code></a>, for example
   *     {@code rec-abc123xyz})
   * @throws NotificationHubException with message containing {@code RECORD_NOT_FOUND} when no delivery record matched
   *     this {@code recordId}
   *
   * <strong>NOTE:</strong> Calls <a href="https://sophias-hub.github.io/docs-api/#/Records/GetRecord"><code>GET /api/v1/records/{recordId}</code></a>. Confirm the id from the send response, or
   * list records with <a href="https://sophias-hub.github.io/docs-api/#/Records/ListRecords"><code>GET /api/v1/records</code></a>.
   */
  public DeliveryRecord getRecord(String recordId) {
    return read(request("GET", "/api/v1/records/" + enc(recordId), null), DeliveryRecord.class, "Failed to get record");
  }

  /**
   * Lists delivery records that were created by earlier <a href="https://sophias-hub.github.io/docs-api/#/Send/SendNotification"><code>POST /api/v1/send</code></a> calls.
   *
   * @param recipient limits results to this exact recipient when provided; pass {@code null} or a blank string to omit
   * @param status limits results to this lifecycle state when provided ({@code queued}, {@code delivered}, or
   *     {@code failed}); pass {@code null} or a blank string to omit
   *
   * <strong>NOTE:</strong> Calls <a href="https://sophias-hub.github.io/docs-api/#/Records/ListRecords"><code>GET /api/v1/records</code></a>. You can narrow the list by {@code recipient}, by
   * {@code status}, or by both.
   */
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

  /**
   * Removes a delivery record from the in-memory store.
   *
   * @param recordId selects which record to delete
   * @throws NotificationHubException with message containing {@code RECORD_NOT_FOUND} when no delivery record matched
   *     this {@code recordId}
   *
   * <strong>NOTE:</strong> Calls <a href="https://sophias-hub.github.io/docs-api/#/Records/DeleteRecord"><code>DELETE /api/v1/records/{recordId}</code></a> ({@code 204}). It may already be deleted;
   * list records to confirm.
   */
  public void deleteRecord(String recordId) {
    ensureOk(request("DELETE", "/api/v1/records/" + enc(recordId), null), "Failed to delete record");
  }

  /**
   * Returns the channel preferences for a recipient.
   *
   * @param recipient selects whose preferences to read; URL-encode special characters if needed
   *
   * <strong>NOTE:</strong> Calls <a href="https://sophias-hub.github.io/docs-api/#/Preferences/GetPreferences"><code>GET /api/v1/preferences/{recipient}</code></a>. If you have never saved preferences
   * for them, every channel defaults to allowed ({@code true}).
   */
  public Preferences getPreferences(String recipient) {
    return read(request("GET", "/api/v1/preferences/" + enc(recipient), null), Preferences.class, "Failed to get preferences");
  }

  /**
   * Replaces all three channel preference flags for the recipient with the values in the request body.
   *
   * @param recipient selects whose preferences to overwrite
   * @throws NotificationHubException with message containing {@code MISSING_FIELDS} when required preference flags
   *     were omitted
   *
   * <strong>NOTE:</strong> Calls <a href="https://sophias-hub.github.io/docs-api/#/Preferences/SetPreferences"><code>PUT /api/v1/preferences/{recipient}</code></a>. Include boolean {@code email},
   * {@code sms}, and {@code push}, then retry.
   */
  public Preferences setPreferences(String recipient, boolean email, boolean sms, boolean push) {
    Map<String, Object> body = Map.of("email", email, "sms", sms, "push", push);
    return read(request("PUT", "/api/v1/preferences/" + enc(recipient), body), Preferences.class, "Failed to set preferences");
  }

  /**
   * Changes only the preference flags included in the request body and leaves the others unchanged.
   *
   * @param recipient selects whose preferences to adjust
   * @param patch supplies only the flags to change; omitted channels stay as they are
   * @throws NotificationHubException with message containing {@code INVALID_TEMPLATE_BODY} when a preference value
   *     was not a boolean
   *
   * <strong>NOTE:</strong> Calls <a href="https://sophias-hub.github.io/docs-api/#/Preferences/PatchPreferences"><code>PATCH /api/v1/preferences/{recipient}</code></a>. Send only {@code true} or
   * {@code false} for {@code email}, {@code sms}, and/or {@code push}, then retry.
   */
  public Preferences patchPreferences(String recipient, Map<String, Boolean> patch) {
    return read(request("PATCH", "/api/v1/preferences/" + enc(recipient), patch), Preferences.class, "Failed to patch preferences");
  }

  /**
   * Clears any stored preferences for the recipient so the defaults apply again (all channels allowed).
   *
   * @param recipient selects whose stored preferences should be removed
   *
   * <strong>NOTE:</strong> Calls <a href="https://sophias-hub.github.io/docs-api/#/Preferences/ResetPreferences"><code>DELETE /api/v1/preferences/{recipient}</code></a>.
   */
  public Preferences resetPreferences(String recipient) {
    return read(request("DELETE", "/api/v1/preferences/" + enc(recipient), null), Preferences.class, "Failed to reset preferences");
  }

  /**
   * Turns off one channel for a recipient by setting that channel's preference to {@code false}.
   *
   * @param recipient specifies which person or device to update
   * @param channel selects the channel to turn off
   * @throws NotificationHubException the message may contain:
   *     {@code MISSING_FIELDS} — include {@code recipient} and {@code channel}, then retry;
   *     {@code INVALID_CHANNEL} — use only {@code email}, {@code sms}, or {@code push}, then retry
   *
   * <strong>NOTE:</strong> Calls <a href="https://sophias-hub.github.io/docs-api/#/Preferences/Unsubscribe"><code>POST /api/v1/unsubscribe</code></a>.
   */
  public Preferences unsubscribe(String recipient, String channel) {
    return read(
        request("POST", "/api/v1/unsubscribe", Map.of("recipient", recipient, "channel", channel)),
        Preferences.class,
        "Failed to unsubscribe"
    );
  }

  /**
   * Registers a webhook URL so the mock can associate later <a href="https://sophias-hub.github.io/docs-api/#/Send/SendNotification"><code>POST /api/v1/send</code></a> calls with that endpoint.
   *
   * @param url specifies the callback URL to register; it must start with {@code http://} or {@code https://}
   * @param events selects which event names to subscribe to, or {@code null} to use the server default
   *     {@code ["record.delivered"]}
   * @throws NotificationHubException the message may contain:
   *     {@code MISSING_FIELDS} — provide an {@code http://} or {@code https://} callback URL, then retry;
   *     {@code INVALID_TEMPLATE_BODY} — correct {@code url} to a valid {@code http://} or {@code https://} address
   *     and retry
   *
   * <strong>NOTE:</strong> Calls <a href="https://sophias-hub.github.io/docs-api/#/Webhooks/CreateWebhook"><code>POST /api/v1/webhooks</code></a> ({@code 201}). The service records fake delivery
   * attempts for practice; it does not call the URL.
   */
  public Webhook createWebhook(String url, List<String> events) {
    Map<String, Object> body = new HashMap<>();
    body.put("url", url);
    if (events != null) {
      body.put("events", events);
    }
    return read(request("POST", "/api/v1/webhooks", body), Webhook.class, "Failed to create webhook");
  }

  /**
   * Returns every webhook that is currently registered in the in-memory store.
   *
   * <strong>NOTE:</strong> Calls <a href="https://sophias-hub.github.io/docs-api/#/Webhooks/ListWebhooks"><code>GET /api/v1/webhooks</code></a>.
   */
  public List<Webhook> listWebhooks() {
    return readList(request("GET", "/api/v1/webhooks", null), new TypeReference<>() {}, "Failed to list webhooks");
  }

  /**
   * Looks up one registered webhook by its {@code id}.
   *
   * @param id selects which webhook to retrieve (for example, {@code wh-abc123})
   * @throws NotificationHubException with message containing {@code WEBHOOK_NOT_FOUND} when no webhook matched this
   *     {@code id}
   *
   * <strong>NOTE:</strong> Calls <a href="https://sophias-hub.github.io/docs-api/#/Webhooks/GetWebhook"><code>GET /api/v1/webhooks/{id}</code></a>. List webhooks with <a href="https://sophias-hub.github.io/docs-api/#/Webhooks/ListWebhooks"><code>GET /api/v1/webhooks</code></a>,
   * or create one before looking it up.
   */
  public Webhook getWebhook(String id) {
    return read(request("GET", "/api/v1/webhooks/" + enc(id), null), Webhook.class, "Failed to get webhook");
  }

  /**
   * Removes a webhook registration from the in-memory store.
   *
   * @param id selects which webhook to delete
   * @throws NotificationHubException with message containing {@code WEBHOOK_NOT_FOUND} when no webhook matched this
   *     {@code id}
   *
   * <strong>NOTE:</strong> Calls <a href="https://sophias-hub.github.io/docs-api/#/Webhooks/DeleteWebhook"><code>DELETE /api/v1/webhooks/{id}</code></a> ({@code 204}). It may already be deleted;
   * list webhooks to confirm.
   */
  public void deleteWebhook(String id) {
    ensureOk(request("DELETE", "/api/v1/webhooks/" + enc(id), null), "Failed to delete webhook");
  }

  /**
   * Returns the simulated webhook delivery attempts that were recorded after recent <a href="https://sophias-hub.github.io/docs-api/#/Send/SendNotification"><code>POST /api/v1/send</code></a> calls.
   *
   * <strong>NOTE:</strong> Calls <a href="https://sophias-hub.github.io/docs-api/#/Webhooks/ListWebhookDeliveries"><code>GET /api/v1/webhooks/deliveries</code></a>.
   */
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
