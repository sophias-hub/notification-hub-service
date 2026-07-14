package com.sophias.hub.notification;

/**
 * Which channels a recipient is willing to receive.
 * If you have never set preferences for someone, every channel is treated as allowed ({@code true}).
 */
public class Preferences {
  /** Identifies the recipient these preferences belong to. */
  private String recipient;
  /**
   * Sets whether email is allowed.
   *
   * <strong>NOTE:</strong> When {@code false}, <a href="https://sophias-hub.github.io/docs-api/#/Send/SendNotification"><code>POST /api/v1/send</code></a> rejects email with {@code CHANNEL_OPTED_OUT}.
   */
  private boolean email;
  /**
   * Sets whether SMS is allowed.
   *
   * <strong>NOTE:</strong> When {@code false}, <a href="https://sophias-hub.github.io/docs-api/#/Send/SendNotification"><code>POST /api/v1/send</code></a> rejects SMS with {@code CHANNEL_OPTED_OUT}.
   */
  private boolean sms;
  /**
   * Sets whether push is allowed.
   *
   * <strong>NOTE:</strong> When {@code false}, <a href="https://sophias-hub.github.io/docs-api/#/Send/SendNotification"><code>POST /api/v1/send</code></a> rejects push with {@code CHANNEL_OPTED_OUT}.
   */
  private boolean push;

  /** Reports the recipient these preferences belong to. */
  public String getRecipient() {
    return recipient;
  }

  public void setRecipient(String recipient) {
    this.recipient = recipient;
  }

  /** Reports whether email is allowed for this recipient. */
  public boolean isEmail() {
    return email;
  }

  public void setEmail(boolean email) {
    this.email = email;
  }

  /** Reports whether SMS is allowed for this recipient. */
  public boolean isSms() {
    return sms;
  }

  public void setSms(boolean sms) {
    this.sms = sms;
  }

  /** Reports whether push is allowed for this recipient. */
  public boolean isPush() {
    return push;
  }

  public void setPush(boolean push) {
    this.push = push;
  }
}
