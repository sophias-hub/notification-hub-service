package com.sophias.hub.notification;

/**
 * Notification template returned by template endpoints.
 */
public class NotificationTemplate {
  private String id;
  private String name;
  private String channel;
  private String subject;
  private String body;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getChannel() {
    return channel;
  }

  public void setChannel(String channel) {
    this.channel = channel;
  }

  public String getSubject() {
    return subject;
  }

  public void setSubject(String subject) {
    this.subject = subject;
  }

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
