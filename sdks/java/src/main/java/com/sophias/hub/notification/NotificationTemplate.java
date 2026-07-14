package com.sophias.hub.notification;

/**
 * A reusable message definition stored in the template catalog.
 * Templates live only in memory for this mock service, so they disappear when the process restarts.
 */
public class NotificationTemplate {
  /**
   * Identifies the template in other API calls.
   *
   * <strong>NOTE:</strong> Assigned by the service when you create a template. Omit this field on create requests.
   */
  private String id;
  /** Names the template for UIs and operator tools. */
  private String name;
  /** Defines which delivery channel this template is written for: {@code email}, {@code sms}, or {@code push}. */
  private String channel;
  /**
   * Sets the subject line when the channel is {@code email}.
   *
   * <strong>NOTE:</strong> Other channels typically leave this empty.
   */
  private String subject;
  /**
   * Defines the message content that will be sent.
   *
   * <strong>NOTE:</strong> You can include placeholders such as {@code {{name}}}; they are filled from
   * {@code templateData} when you call <a href="https://sophias-hub.github.io/docs-api/#/Send/SendNotification"><code>POST /api/v1/send</code></a>.
   */
  private String body;

  /** Reports the unique template identifier. */
  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  /** Reports the human-readable template name. */
  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  /** Reports which delivery channel this template targets. */
  public String getChannel() {
    return channel;
  }

  public void setChannel(String channel) {
    this.channel = channel;
  }

  /** Reports the email subject line, or {@code null} when unused. */
  public String getSubject() {
    return subject;
  }

  public void setSubject(String subject) {
    this.subject = subject;
  }

  /** Reports the message body, which may include {@code {{placeholders}}}. */
  public String getBody() {
    return body;
  }

  public void setBody(String body) {
    this.body = body;
  }

  @Override
  public String toString() {
    return "NotificationTemplate{id='%s', name='%s', channel='%s'}".formatted(id, name, channel);
  }
}
