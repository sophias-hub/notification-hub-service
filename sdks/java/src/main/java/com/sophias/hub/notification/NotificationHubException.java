package com.sophias.hub.notification;

/**
 * Thrown when the Notification Hub API returns a non-success response.
 */
public class NotificationHubException extends RuntimeException {
  private final int statusCode;

  public NotificationHubException(String message, int statusCode) {
    super(message);
    this.statusCode = statusCode;
  }

  public int getStatusCode() {
    return statusCode;
  }
}
