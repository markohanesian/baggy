const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');

function generateLicenseKey(email, paymentIntentId) {
  const secret = process.env.LICENSE_SECRET;
  const payload = `${email}:${paymentIntentId}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  // Format as XXXX-XXXX-XXXX-XXXX for readability
  return hmac.slice(0, 16).toUpperCase().match(/.{4}/g).join('-');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const email = session.customer_details?.email;
    const paymentIntentId = session.payment_intent;

    if (!email || !paymentIntentId) {
      return { statusCode: 400, body: 'Missing email or payment intent' };
    }

    const licenseKey = generateLicenseKey(email, paymentIntentId);

    // Send the license key email via Resend (or swap for SendGrid/Postmark)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Baggy <noreply@yourdomain.com>', // TODO: replace with your verified domain
        to: email,
        subject: 'Your Baggy Pro License Key',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2>Welcome to Baggy Pro 🎉</h2>
            <p>Thanks for your purchase! Here is your license key:</p>
            <div style="background:#1c1c20;color:#e1e1e6;font-family:monospace;font-size:18px;
                        letter-spacing:2px;padding:16px 24px;border-radius:8px;text-align:center;margin:24px 0">
              ${licenseKey}
            </div>
            <p>To activate Pro:</p>
            <ol>
              <li>Open the Baggy extension in Chrome</li>
              <li>Click <strong>Upgrade to Pro</strong></li>
              <li>Paste your key and click <strong>Activate</strong></li>
            </ol>
            <p>Your key is tied to this purchase and works across all your Chrome profiles.</p>
            <p>Questions? Reply to this email.</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      console.error('Failed to send license email:', await res.text());
      return { statusCode: 500, body: 'Failed to send license email' };
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
