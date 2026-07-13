package com.sophias.hub.notification;

import java.util.Map;

/**
 * Smoke example covering the learning-path flow.
 *
 * <pre>
 * mvn -q test-compile exec:java
 * </pre>
 */
public final class SmokeTest {
  private SmokeTest() {}

  public static void main(String[] args) {
    String apiKey = args.length > 0 ? args[0] : "secure-token-123";
    String baseUrl = args.length > 1 ? args[1] : "http://localhost:3000";

    System.out.println("Initializing Notification SDK client...");
    NotificationClient client = new NotificationClient(apiKey, baseUrl);
    String templateId = "sdk-demo-" + System.currentTimeMillis();

    try {
      System.out.println("\n--- Create template ---");
      NotificationTemplate template = new NotificationTemplate();
      template.setId(templateId);
      template.setName("SDK Demo");
      template.setChannel("email");
      template.setBody("Hello {{name}}");
      NotificationTemplate created = client.createTemplate(template);
      System.out.println("Created: " + created.getId());

      System.out.println("\n--- Retrieve template ---");
      NotificationTemplate retrieved = client.getTemplate(created.getId());
      System.out.println("Retrieved: " + retrieved.getName());

      System.out.println("\n--- Set preference ---");
      Preferences prefs = client.setPreferences("sdk@example.com", true, false, false);
      System.out.println("Preferences email=" + prefs.isEmail());

      System.out.println("\n--- Send notification ---");
      NotificationResponse response = client.sendNotification(
          "sdk@example.com",
          "email",
          created.getId(),
          Map.of("name", "Alexander")
      );
      System.out.println("Sent: " + response);

      System.out.println("\n--- Check record status ---");
      DeliveryRecord record = client.getRecord(response.getRecordId());
      System.out.println("Status: " + record.getStatus());

      System.out.println("\nAll SDK integration tests completed successfully!");
    } catch (NotificationHubException e) {
      System.err.println("\nAn error occurred during SDK execution test:");
      System.err.println(e.getMessage());
      System.exit(1);
    }
  }
}
