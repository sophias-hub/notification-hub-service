package com.sophias.hub.notification;

/**
 * Thrown when the Notification Hub API returns a non-success HTTP status,
 * or when the client cannot complete the request.
 * The message often includes the stable API code, such as {@code TEMPLATE_NOT_FOUND},
 * along with a brief hint for how to fix the problem.
 */
public class NotificationHubException extends RuntimeException {
  private final int statusCode;

  /**
   * Creates an exception for a failed API or transport call.
   *
   * @param message a plain-language explanation, often including an API {@code code} and how-to-fix hint
   * @param statusCode reports the HTTP status from the API, or {@code 0} when no response was received
   */
  public NotificationHubException(String message, int statusCode) {
    super(message);
    this.statusCode = statusCode;
  }

  /**
   * Reports the HTTP status from the API, or {@code 0} if the request never got a response.
   */
  public int getStatusCode() {
    return statusCode;
  }
}
