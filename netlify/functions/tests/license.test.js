const crypto = require('crypto');

// Mirror the same function from stripe-webhook.js
function generateLicenseKey(email, paymentIntentId, secret) {
  const payload = `${email}:${paymentIntentId}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return hmac.slice(0, 16).toUpperCase().match(/.{4}/g).join('-');
}

const TEST_SECRET = 'test-license-secret';

function run(description, fn) {
  try {
    fn();
    console.log(`  ✅ ${description}`);
  } catch (err) {
    console.error(`  ❌ ${description}`);
    console.error(`     ${err.message}`);
    process.exitCode = 1;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log('\nLicense key generation');

run('produces XXXX-XXXX-XXXX-XXXX format', () => {
  const key = generateLicenseKey('user@example.com', 'pi_123', TEST_SECRET);
  assert(/^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/.test(key),
    `Key "${key}" does not match expected format`);
});

run('is deterministic — same inputs produce same key', () => {
  const a = generateLicenseKey('user@example.com', 'pi_123', TEST_SECRET);
  const b = generateLicenseKey('user@example.com', 'pi_123', TEST_SECRET);
  assert(a === b, `Expected "${a}" === "${b}"`);
});

run('different emails produce different keys', () => {
  const a = generateLicenseKey('alice@example.com', 'pi_123', TEST_SECRET);
  const b = generateLicenseKey('bob@example.com', 'pi_123', TEST_SECRET);
  assert(a !== b, 'Different emails should not produce the same key');
});

run('different payment IDs produce different keys', () => {
  const a = generateLicenseKey('user@example.com', 'pi_aaa', TEST_SECRET);
  const b = generateLicenseKey('user@example.com', 'pi_bbb', TEST_SECRET);
  assert(a !== b, 'Different payment IDs should not produce the same key');
});

run('different secrets produce different keys', () => {
  const a = generateLicenseKey('user@example.com', 'pi_123', 'secret-a');
  const b = generateLicenseKey('user@example.com', 'pi_123', 'secret-b');
  assert(a !== b, 'Different secrets should not produce the same key');
});

run('key is always 19 characters (XXXX-XXXX-XXXX-XXXX)', () => {
  const key = generateLicenseKey('user@example.com', 'pi_123', TEST_SECRET);
  assert(key.length === 19, `Expected length 19, got ${key.length}`);
});

console.log('\nValidation logic');

run('matching key validates correctly', () => {
  const email = 'buyer@example.com';
  const paymentId = 'pi_real123';
  const key = generateLicenseKey(email, paymentId, TEST_SECRET);
  const expected = generateLicenseKey(email, paymentId, TEST_SECRET);
  assert(expected === key, 'Key should match when inputs are identical');
});

run('tampered key is rejected', () => {
  const key = generateLicenseKey('buyer@example.com', 'pi_real123', TEST_SECRET);
  const tampered = key.replace(key[0], key[0] === 'A' ? 'B' : 'A');
  assert(tampered !== key, 'Tampered key should not match original');
});

run('wrong email is rejected', () => {
  const key = generateLicenseKey('buyer@example.com', 'pi_real123', TEST_SECRET);
  const wrongEmailKey = generateLicenseKey('other@example.com', 'pi_real123', TEST_SECRET);
  assert(key !== wrongEmailKey, 'Wrong email should produce different key');
});

console.log('');
