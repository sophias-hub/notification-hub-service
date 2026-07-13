package com.sophias.hub.notification;

/**
 * Fake webhook delivery attempt.
 */
public class WebhookDelivery {
  private String id;
  private String webhookId;
  private String recordId;
  private String status;
  private String attemptedAt;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getWebhookId() {
    return webhookId;
  }

  public void setWebhookId(String webhookId) {
    this.webhookId = webhookId;
  }

  public String getRecordId() {
    return recordId;
  }

  public void setRecordId(String recordId) {
    this.recordId = recordId;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getAttemptedAt() {
    return attemptedAt;
  }

  public void setAttemptedAt(String attemptedAt) {
    this.attemptedAt = attemptedAt;
  }
}
