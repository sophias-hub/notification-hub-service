import { NotificationClient } from './client.js';

/**
 * Main execution script to verify SDK functionality and API communication.
 */
async function runTest() {
  console.log('🔌 Initializing Notification SDK client...');
  
  // Instantiating the client with the valid key and local server address
  const client = new NotificationClient('secure-token-123', 'http://localhost:3000');

  try {
    // TEST 1: Fetching available templates
    console.log('\n--- Test 1: Requesting Available Templates ---');
    const templates = await client.getTemplates();
    console.log('✅ Templates successfully received from API:');
    console.dir(templates, { depth: null, colors: true });

    // TEST 2: Triggering a notification via SDK methods
    console.log('\n--- Test 2: Dispatching Notification via SDK ---');
    const response = await client.sendNotification(
      'alex@example.com',      // recipient
      'email',                 // channel
      'welcome-email',         // templateId
      { name: 'Alexander' }    // templateData
    );
    
    console.log('✅ API successfully processed SDK request:');
    console.dir(response, { depth: null, colors: true });
    console.log('\n🎉 All SDK integration tests completed successfully!');

  } catch (error: any) {
    console.error('\n❌ An error occurred during SDK execution test:');
    console.error(error.message);
  }
}

// Execute the test script
runTest();
