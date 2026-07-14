package com.sophias.hub.notification;

/**
 * A stored receipt for one send attempt.
 *
 * <strong>NOTE:</strong> You can look records up after calling <a href="https://sophias-hub.github.io/docs-api/#/Send/SendNotification"><code>POST /api/v1/send</code></a> to see who was contacted
 * and whether delivery finished.
 */
public class DeliveryRecord {
  /**
   * Identifies this delivery record.
   *
   * <strong>NOTE:</strong> This value originally came from <a href="https://sophias-hub.github.io/docs-api/#/Send/SendNotification"><code>POST /api/v1/send</code></a>.
   */
  private String recordId;
  /** Identifies the address, phone number, or token that was targeted. */
  private String recipient;
  /** Reports which channel was used for this send: {@code email}, {@code sms}, or {@code push}. */
  private String channel;
  /** Identifies the template that was rendered for this send. */
  private String templateId;
  /**
   * Reports the current delivery state: {@code queued}, {@code delivered}, or {@code failed}.
   */
  private String status;
  /** Reports when the send was accepted, as an ISO-8601 timestamp in UTC. */
  private String processedAt;

  /** Reports the unique delivery record id. */
  public String getRecordId() {
    return recordId;
  }

  public void setRecordId(String recordId) {
    this.recordId = recordId;
  }

  /** Reports who was targeted by this send. */
  public String getRecipient() {
    return recipient;
  }

  public void setRecipient(String recipient) {
    this.recipient = recipient;
  }

  /** Reports the channel used for this send. */
  public String getChannel() {
    return channel;
  }

  public void setChannel(String channel) {
    this.channel = channel;
  }

  /** Reports the template id that drove this send. */
  public String getTemplateId() {
    return templateId;
  }

  public void setTemplateId(String templateId) {
    this.templateId = templateId;
  }

  /** Reports where this send sits in the delivery lifecycle. */
  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  /** Reports when the send was accepted, in UTC. */
  public String getProcessedAt() {
    return processedAt;
  }

  public void setProcessedAt(String processedAt) {
    this.processedAt = processedAt;
  }
}
