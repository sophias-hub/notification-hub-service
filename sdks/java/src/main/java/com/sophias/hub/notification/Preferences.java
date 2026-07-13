package com.sophias.hub.notification;

/**
 * Channel opt-in preferences for a recipient.
 */
public class Preferences {
  private String recipient;
  private boolean email;
  private boolean sms;
  private boolean push;

  public String getRecipient() {
    return recipient;
  }

  public void setRecipient(String recipient) {
    this.recipient = recipient;
  }

  public boolean isEmail() {
    return email;
  }

  public void setEmail(boolean email) {
    this.email = email;
  }

  public boolean isSms() {
    return sms;
  }

  public void setSms(boolean sms) {
    this.sms = sms;
  }

  public boolean isPush() {
    return push;
  }

  public void setPush(boolean push) {
    this.push = push;
  }
}
