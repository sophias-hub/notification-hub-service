package com.sophias.hub.notification;

/**
 * Successful send response from {@code POST /api/v1/send}.
 */
public class NotificationResponse {
  private String status;
  private String recordId;
  private String processedAt;

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getRecordId() {
    return recordId;
  }

  public void setRecordId(String recordId) {
    this.recordId = recordId;
  }

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
