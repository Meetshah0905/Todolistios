import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

export const config = {
  rateLimit: {
    // 60 requests per 60 seconds per IP for this function
    window: '60s',
    limit: 60,
    key: 'ip',

    // To show a friendly HTML page instead of JSON 429,
    // uncomment the lines below and create rate_limited.html at the site root.
    // action: 'rewrite',
    // redirect: '/rate_limited.html',
  },
};

const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  // Optional: restrict HTTP methods
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  // --- API key protection (for "private" endpoints) ---
  // Frontend should send:  x-api-key: <YOUR_KEY>
  const providedKey =
    event.headers['x-api-key'] ??
    event.headers['X-Api-Key'] ??
    event.multiValueHeaders?.['x-api-key']?.[0];

  const expectedKey = process.env.MY_API_KEY;

  if (!expectedKey) {
    // Fail closed if env var is not configured
    console.error('MY_API_KEY is not set in environment variables');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server misconfiguration' }),
    };
  }

  if (!providedKey || providedKey !== expectedKey) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  // --- Example safe logic (replace with your own) ---
  const now = new Date().toISOString();

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      message: 'Protected Netlify Function is working',
      timestamp: now,
    }),
  };
};

export { handler as default };


