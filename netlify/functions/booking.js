// Luxy — Stripe payment intent + booking reservation
// Creates a payment intent for the Luxy curation fee / deposit

const RATE_LIMIT = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = RATE_LIMIT.get(ip);
  if (!entry || now > entry.resetAt) { RATE_LIMIT.set(ip, { count: 1, resetAt: now + 60000 }); return true; }
  if (entry.count >= 5) return false; // max 5 booking attempts/min per IP
  entry.count++;
  return true;
}

function sanitize(val, max = 300) {
  if (typeof val !== 'string') return '';
  return val.slice(0, max).replace(/[<>"'`]/g, '');
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://ask-luxy.com',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const ip = event.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  if (!checkRateLimit(ip)) return { statusCode: 429, headers, body: JSON.stringify({ error: 'Too many requests' }) };

  if (!process.env.STRIPE_SECRET_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Payment service unavailable' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  const {
    name, email, phone,
    destination, hotel, location,
    nights, travelers, checkIn, checkOut,
    budget, tripType, special,
    addOns = [],
    depositAmount, // in cents (e.g. 20000 = 200€)
    lang = 'en',
  } = body;

  // Validate required fields
  if (!name || !email || !destination || !depositAmount) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
  }
  if (typeof depositAmount !== 'number' || depositAmount < 5000 || depositAmount > 500000) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid deposit amount' }) };
  }

  const isES = lang === 'es';

  try {
    // Create Stripe payment intent
    const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: String(depositAmount),
        currency: 'eur',
        automatic_payment_methods: JSON.stringify({ enabled: true }),
        description: `Luxy — ${sanitize(destination)} · ${sanitize(hotel)} · ${sanitize(name)}`,
        'metadata[name]': sanitize(name),
        'metadata[email]': sanitize(email),
        'metadata[phone]': sanitize(phone || ''),
        'metadata[destination]': sanitize(destination),
        'metadata[hotel]': sanitize(hotel),
        'metadata[location]': sanitize(location || ''),
        'metadata[check_in]': sanitize(checkIn || ''),
        'metadata[check_out]': sanitize(checkOut || ''),
        'metadata[nights]': String(nights || ''),
        'metadata[travelers]': String(travelers || ''),
        'metadata[trip_type]': sanitize(tripType || ''),
        'metadata[add_ons]': sanitize(addOns.join(', ')),
        'metadata[special]': sanitize(special || '').slice(0, 500),
        receipt_email: sanitize(email),
      }).toString(),
    });

    if (!stripeRes.ok) {
      const err = await stripeRes.json();
      throw new Error(err.error?.message || 'Stripe error');
    }

    const intent = await stripeRes.json();

    // Log booking attempt
    console.log(JSON.stringify({
      type: 'luxy_booking_intent',
      ts: new Date().toISOString(),
      name: sanitize(name),
      email: sanitize(email),
      destination: sanitize(destination),
      hotel: sanitize(hotel),
      nights,
      deposit_eur: depositAmount / 100,
      intent_id: intent.id,
      status: intent.status,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        clientSecret: intent.client_secret,
        intentId: intent.id,
        amount: depositAmount,
        message: isES
          ? `Reserva de ${sanitize(hotel)} — depósito de ${(depositAmount/100).toLocaleString('es-ES')}€`
          : `Booking deposit for ${sanitize(hotel)} — €${(depositAmount/100).toLocaleString('en-GB')}`,
      }),
    };
  } catch (err) {
    console.error('Booking error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: isES ? 'Error al procesar el pago. Inténtalo de nuevo.' : 'Payment error. Please try again.' }),
    };
  }
};
