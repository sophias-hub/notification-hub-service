package com.sophias.hub.notification;

import java.util.List;
import java.util.Map;

/**
 * Smoke example against a local or remote Notification Hub API.
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

    try {
      System.out.println("\n--- Test 1: Requesting Available Templates ---");
      List<NotificationTemplate> templates = client.getTemplates();
      System.out.println("Templates successfully received from API:");
      templates.forEach(System.out::println);

      System.out.println("\n--- Test 2: Dispatching Notification via SDK ---");
      NotificationResponse response = client.sendNotification(
          "alex@example.com",
          "email",
          "welcome-email",
          Map.of("name", "Alexander")
      );
      System.out.println("API successfully processed SDK request:");
      System.out.println(response);
      System.out.println("\nAll SDK integration tests completed successfully!");
    } catch (NotificationHubException e) {
      System.err.println("\nAn error occurred during SDK execution test:");
      System.err.println(e.getMessage());
      System.exit(1);
    }
  }
}
