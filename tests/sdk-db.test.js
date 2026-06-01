const assert = require('assert');
const { TazentDb } = require('../dashboard/src/lib/db.ts'); // Direct require will work because we are testing functions

// A simple mock environment to run TazentDb tests in vanilla Node
// We will test database helper methods and error grouping logic programmatically

async function testDatabase() {
  console.log('🧪 Starting Tazent Telemetry Test Suite...');

  // Reset database before starting
  TazentDb.reset();
  let runs = TazentDb.getRuns();
  assert.strictEqual(runs.length, 0, 'Database reset failed: should have 0 runs.');
  console.log('✓ Database reset validated.');

  // 1. Verify createRun
  const run1 = TazentDb.createRun({
    id: 'test-run-1',
    agentName: 'TestAgent-1',
    url: 'https://test.com'
  });
  
  assert.strictEqual(run1.id, 'test-run-1');
  assert.strictEqual(run1.agentName, 'TestAgent-1');
  assert.strictEqual(run1.status, 'running');
  assert.strictEqual(run1.steps.length, 0);
  console.log('✓ Run creation successfully validated.');

  // 2. Verify addActionStep
  const step = TazentDb.addActionStep('test-run-1', {
    actionType: 'click',
    target: '#submit-btn',
    status: 'success',
    duration: 120
  });

  assert.strictEqual(step.actionType, 'click');
  assert.strictEqual(step.target, '#submit-btn');
  assert.strictEqual(step.status, 'success');
  
  const updatedRun = TazentDb.getRunById('test-run-1');
  assert.strictEqual(updatedRun.steps.length, 1);
  assert.strictEqual(updatedRun.steps[0].id, 'test-run-1-step-1');
  console.log('✓ Action step tracking successfully validated.');

  // 3. Verify finishRun Success
  const successRun = TazentDb.finishRun('test-run-1', { status: 'success' });
  assert.strictEqual(successRun.status, 'success');
  assert.notStrictEqual(successRun.finishedAt, null);
  console.log('✓ Run successful finalization validated.');

  // 4. Verify Failure and Grouping
  TazentDb.createRun({
    id: 'test-run-2',
    agentName: 'TestAgent-2',
    url: 'https://checkout.com'
  });

  TazentDb.addActionStep('test-run-2', {
    actionType: 'click',
    target: '#pay-button',
    status: 'success',
    duration: 150
  });

  // Log error that maps to SELECTOR_MISSING
  TazentDb.finishRun('test-run-2', {
    status: 'failed',
    errorType: 'SELECTOR_MISSING',
    errorMessage: 'Unable to locate element #checkout-pay',
    errorStack: 'Error: Selector failed'
  });

  // Create another run that fails with the SAME signature to test grouping
  TazentDb.createRun({
    id: 'test-run-3',
    agentName: 'TestAgent-3',
    url: 'https://checkout.com'
  });

  TazentDb.addActionStep('test-run-3', {
    actionType: 'click',
    target: '#pay-button',
    status: 'success',
    duration: 180
  });

  TazentDb.finishRun('test-run-3', {
    status: 'failed',
    errorType: 'SELECTOR_MISSING',
    errorMessage: 'Unable to locate element #checkout-pay',
    errorStack: 'Error: Selector failed'
  });

  // Calculate error groups
  const groups = TazentDb.getErrorGroups();
  assert.strictEqual(groups.length, 1, 'Should group identical errors into 1 cluster.');
  assert.strictEqual(groups[0].errorType, 'SELECTOR_MISSING');
  assert.strictEqual(groups[0].affectedRunsCount, 2, 'Error group should count 2 affected runs.');
  assert.strictEqual(groups[0].runs.length, 2);
  console.log('✓ Dynamic Failure Clustering validated successfully!');

  // 5. Verify Heuristic Classifier
  const failedRun = TazentDb.getRunById('test-run-2');
  assert.ok(failedRun.failureSummary.includes('#checkout-pay'), 'Failure Summary should contain the targeted selector context.');
  console.log('✓ Heuristic failure classification verified.');

  console.log('\n==================================================');
  console.log('🎉 ALL TAZEENT TEST SUITE PASSES SUCCESSFULLY! (100%)');
  console.log('==================================================');
}

testDatabase().catch(err => {
  console.error('🔴 Test suite failed:', err);
  process.exit(1);
});
