package com.sophias.hub.notification;

/**
 * A simulated attempt to notify a webhook after a send.
 * These rows exist so you can practice reading delivery history; no real HTTP request is made.
 */
public class WebhookDelivery {
  /** Identifies this delivery attempt. */
  private String id;
  /** Identifies the webhook that this attempt belongs to. */
  private String webhookId;
  /** Identifies the send record that triggered the attempt. */
  private String recordId;
  /**
   * Reports whether the simulated attempt is treated as {@code delivered} or {@code failed}.
   */
  private String status;
  /** Reports when the attempt was recorded, as an ISO-8601 timestamp in UTC. */
  private String attemptedAt;

  /** Reports the unique delivery-attempt id. */
  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  /** Reports the parent webhook id. */
  public String getWebhookId() {
    return webhookId;
  }

  public void setWebhookId(String webhookId) {
    this.webhookId = webhookId;
  }

  /** Reports the related send record id. */
  public String getRecordId() {
    return recordId;
  }

  public void setRecordId(String recordId) {
    this.recordId = recordId;
  }

  /** Reports whether the simulated attempt succeeded or failed. */
  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  /** Reports when the attempt was recorded, in UTC. */
  public String getAttemptedAt() {
    return attemptedAt;
  }

  public void setAttemptedAt(String attemptedAt) {
    this.attemptedAt = attemptedAt;
  }
}
