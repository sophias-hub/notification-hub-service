package com.sophias.hub.notification;

/**
 * Confirmation returned when a send is accepted.
 */
public class NotificationResponse {
  /**
   * Reports that the send was accepted. On HTTP {@code 200} this value is {@code success}.
   */
  private String status;
  /**
   * Identifies the delivery record created for this send (for example, {@code rec-abc123xyz}).
   *
   * <strong>NOTE:</strong> Use this value with <a href="https://sophias-hub.github.io/docs-api/#/Records/GetRecord"><code>GET /api/v1/records/{recordId}</code></a> to look up status later.
   */
  private String recordId;
  /** Reports when the service accepted the send, as an ISO-8601 timestamp in UTC. */
  private String processedAt;

  /** Reports whether the send was accepted (typically {@code success}). */
  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  /** Reports the delivery record id for follow-up lookups. */
  public String getRecordId() {
    return recordId;
  }

  public void setRecordId(String recordId) {
    this.recordId = recordId;
  }

  /** Reports when the send was accepted, in UTC. */
  public String getProcessedAt() {
    return processedAt;
  }

  public void setProcessedAt(String processedAt) {
    this.processedAt = processedAt;
  }

  @Override
  public String toString() {
    return "NotificationResponse{status='%s', recordId='%s', processedAt='%s'}"
        .formatted(status, recordId, processedAt);
  }
}
