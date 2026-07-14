import { NotificationClient } from './client.js';

/**
 * Smoke test covering the learning-path flow.
 */
async function runTest() {
  console.log('🔌 Initializing Notification SDK client...');
  const client = new NotificationClient('secure-token-123', 'http://localhost:3000');

  try {
    console.log('\n--- Create template ---');
    const created = await client.createTemplate({
      name: 'SDK Demo',
      channel: 'email',
      body: 'Hello {{name}}',
    });
    console.log('✅ Created:', created.id);

    console.log('\n--- Retrieve template ---');
    const retrieved = await client.getTemplate(created.id);
    console.log('✅ Retrieved:', retrieved.name);

    console.log('\n--- Set preference ---');
    const prefs = await client.setPreferences('sdk@example.com', {
      email: true,
      sms: false,
      push: false,
    });
    console.log('✅ Preferences:', prefs);

    console.log('\n--- Send notification ---');
    const response = await client.sendNotification(
      'sdk@example.com',
      'email',
      created.id,
      { name: 'Alexander' }
    );
    console.log('✅ Sent:', response);

    console.log('\n--- Check record status ---');
    const record = await client.getRecord(response.recordId);
    console.log('✅ Status:', record.status);

    console.log('\n🎉 All SDK integration tests completed successfully!');
  } catch (error: unknown) {
    console.error('\n❌ An error occurred during SDK execution test:');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

runTest();
