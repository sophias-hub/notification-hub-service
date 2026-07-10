package com.sophias.hub.notification;

/**
 * Notification template returned by {@code GET /api/v1/templates}.
 */
public class NotificationTemplate {
  private String id;
  private String name;
  private String channel;

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

  @Override
  public String toString() {
    return "NotificationTemplate{id='%s', name='%s', channel='%s'}".formatted(id, name, channel);
  }
}
