const crypto = require('crypto');

function generateLicenseKey(email, paymentIntentId) {
  const secret = process.env.LICENSE_SECRET;
  const payload = `${email}:${paymentIntentId}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return hmac.slice(0, 16).toUpperCase().match(/.{4}/g).join('-');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { licenseKey, email } = body;

  if (!licenseKey || !email) {
    return { statusCode: 400, headers, body: JSON.stringify({ valid: false, error: 'Missing fields' }) };
  }

  if (!isValidEmail(email)) {
    return { statusCode: 400, headers, body: JSON.stringify({ valid: false, error: 'Invalid email' }) };
  }

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedKey = licenseKey.toUpperCase().trim();

  try {
    // Find customer by email to scope the session search correctly
    const customers = await stripe.customers.list({ email: normalizedEmail, limit: 5 });

    if (!customers.data.length) {
      return { statusCode: 200, headers, body: JSON.stringify({ valid: false }) };
    }

    // Search sessions for each matching customer
    let match = null;
    for (const customer of customers.data) {
      const sessions = await stripe.checkout.sessions.list({
        customer: customer.id,
        limit: 10,
      });
      match = sessions.data.find(s => s.payment_status === 'paid' && s.payment_intent);
      if (match) break;
    }

    if (!match) {
      return { statusCode: 200, headers, body: JSON.stringify({ valid: false }) };
    }

    const expected = generateLicenseKey(normalizedEmail, match.payment_intent);
    const valid = timingSafeEqual(expected, normalizedKey);

    return { statusCode: 200, headers, body: JSON.stringify({ valid }) };
  } catch (err) {
    console.error('Stripe lookup error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Validation failed' }) };
  }
};
