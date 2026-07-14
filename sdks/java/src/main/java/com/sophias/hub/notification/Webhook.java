package com.sophias.hub.notification;

import java.util.List;

/**
 * A registered webhook endpoint.
 * This mock service stores the registration and invents delivery attempts; it does not make real outbound HTTP calls.
 */
public class Webhook {
  /** Identifies this webhook (for example, {@code wh-abc123}). */
  private String id;
  /**
   * Specifies the callback address your system would listen on.
   *
   * <strong>NOTE:</strong> It must be an {@code http://} or {@code https://} URL.
   */
  private String url;
  /**
   * Lists the event names this webhook is interested in.
   *
   * <strong>NOTE:</strong> If you omit {@code events} when creating a webhook with
   * <a href="https://sophias-hub.github.io/docs-api/#/Webhooks/CreateWebhook"><code>POST /api/v1/webhooks</code></a>, the service defaults to {@code ["record.delivered"]}.
   */
  private List<String> events;
  /** Reports when the webhook was registered, as an ISO-8601 timestamp in UTC. */
  private String createdAt;

  /** Reports the unique webhook id. */
  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  /** Reports the registered callback URL. */
  public String getUrl() {
    return url;
  }

  public void setUrl(String url) {
    this.url = url;
  }

  /** Reports the event names this webhook is interested in. */
  public List<String> getEvents() {
    return events;
  }

  public void setEvents(List<String> events) {
    this.events = events;
  }

  /** Reports when the webhook was registered, in UTC. */
  public String getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(String createdAt) {
    this.createdAt = createdAt;
  }
}
