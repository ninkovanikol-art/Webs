// Luxy — Exposes public config to the frontend (Stripe publishable key)
// STRIPE_PUBLISHABLE_KEY is safe to expose — it's the public key, not secret

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://ask-luxy.com',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600',
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      stripePk: process.env.STRIPE_PUBLISHABLE_KEY || '',
    }),
  };
};
