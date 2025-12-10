/**
 * Test Runner for Coin Pusher World
 * Runs all test suites and provides a comprehensive summary
 */

import { spawn } from 'child_process';

const tests = [
  { name: 'Comprehensive Tests', command: 'node', args: ['test-comprehensive.js'], count: 20 },
  { name: '8-Board Pyramid', command: 'node', args: ['test-8board-pyramid.js'], count: 11 },
  { name: 'UI Hitbox Tests', command: 'node', args: ['test-ui-hitbox.js'], count: 19 },
];

const results = {
  passed: 0,
  failed: 0,
  suites: [],
};

console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║   Coin Pusher World - Full Test Suite Runner         ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

function runTest(test) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const proc = spawn(test.command, test.args);

    let output = '';
    let hasError = false;

    proc.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data); // Stream output in real-time
    });

    proc.stderr.on('data', (data) => {
      output += data.toString();
      process.stderr.write(data);
      hasError = true;
    });

    proc.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const passed = code === 0;

      // Extract passed/failed counts from output if available
      const passedMatch = output.match(/✅ Passed: (\d+)/);
      const failedMatch = output.match(/❌ Failed: (\d+)/);

      const testsPassed = passedMatch ? parseInt(passedMatch[1]) : (passed ? test.count : 0);
      const testsFailed = failedMatch ? parseInt(failedMatch[1]) : (passed ? 0 : test.count);

      results.suites.push({
        name: test.name,
        passed: testsPassed,
        failed: testsFailed,
        duration,
        exitCode: code,
      });

      results.passed += testsPassed;
      results.failed += testsFailed;

      resolve();
    });
  });
}

async function runAllTests() {
  const startTime = Date.now();

  for (const test of tests) {
    await runTest(test);
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
  const totalTests = results.passed + results.failed;

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║                 FINAL TEST SUMMARY                    ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  results.suites.forEach((suite) => {
    const status = suite.failed === 0 ? '✅' : '❌';
    console.log(`${status} ${suite.name}: ${suite.passed}/${suite.passed + suite.failed} passed (${suite.duration}s)`);
  });

  console.log('\n' + '─'.repeat(55));
  console.log(`Total: ${results.passed}/${totalTests} tests passed`);
  console.log(`Duration: ${totalDuration}s`);

  if (results.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! 🎉\n');
    process.exit(0);
  } else {
    console.log(`\n❌ ${results.failed} tests failed\n`);
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
