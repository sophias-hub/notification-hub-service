package com.sophias.hub.notification;

/**
 * Successful send response from {@code POST /api/v1/send}.
 */
public class NotificationResponse {
  private String status;
  private String messageId;
  private String processedAt;

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getMessageId() {
    return messageId;
  }

  public void setMessageId(String messageId) {
    this.messageId = messageId;
  }

  public String getProcessedAt() {
    return processedAt;
  }

  public void setProcessedAt(String processedAt) {
    this.processedAt = processedAt;
  }

  @Override
  public String toString() {
    return "NotificationResponse{status='%s', messageId='%s', processedAt='%s'}"
        .formatted(status, messageId, processedAt);
  }
}
