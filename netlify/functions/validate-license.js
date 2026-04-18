const crypto = require('crypto');

function generateLicenseKey(email, paymentIntentId) {
  const secret = process.env.LICENSE_SECRET;
  const payload = `${email}:${paymentIntentId}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return hmac.slice(0, 16).toUpperCase().match(/.{4}/g).join('-');
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

  // Look up the payment intent for this email via Stripe
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

  try {
    const sessions = await stripe.checkout.sessions.list({
      limit: 10,
    });

    // Find a completed session that matches this email
    const match = sessions.data.find(
      s => s.customer_details?.email?.toLowerCase() === email.toLowerCase()
        && s.payment_status === 'paid'
    );

    if (!match) {
      return { statusCode: 200, headers, body: JSON.stringify({ valid: false }) };
    }

    const expected = generateLicenseKey(email, match.payment_intent);
    const valid = expected === licenseKey.toUpperCase().trim();

    return { statusCode: 200, headers, body: JSON.stringify({ valid }) };
  } catch (err) {
    console.error('Stripe lookup error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Validation failed' }) };
  }
};
