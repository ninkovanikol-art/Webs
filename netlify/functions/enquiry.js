// Luxy — Lead capture function
// Logs enquiry data; can be extended to send email via SendGrid/Resend

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://ask-luxy.com',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  let data;
  try {
    data = JSON.parse(event.body || '{}');
    if (!data.email || !data.name) throw new Error('Missing required fields');
    // Basic sanitization
    ['name','email','phone','destination','location','special'].forEach(k => {
      if (data[k]) data[k] = String(data[k]).slice(0, 500).replace(/[<>"]/g, '');
    });
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  // Structured log — Netlify captures these, queryable in dashboard
  // In the future: send via Resend/SendGrid to hello@ask-luxy.com
  console.log(JSON.stringify({
    type: 'luxy_enquiry',
    ts: new Date().toISOString(),
    name: data.name,
    email: data.email,
    phone: data.phone || '',
    destination: data.destination,
    location: data.location,
    nights: data.nights,
    budget: data.budget,
    trip_type: data.tripType,
    special: data.special,
    scoring_score: data.score,
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, message: 'Enquiry received' }),
  };
};
