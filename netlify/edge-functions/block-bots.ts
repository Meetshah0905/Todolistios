import type { Context } from '@netlify/edge-functions';

// Short list of common AI / scraping bots to block from /api/*
const BLOCKED_BOTS = [
  'gptbot',
  'claudebot',
  'ccbot',
  'bytespider',
  'bytespider-image',
  'awsbot',
  'imagesiftbot',
];

export default async function blockBots(request: Request, context: Context) {
  const ua = request.headers.get('user-agent')?.toLowerCase() ?? '';

  const isBlocked = BLOCKED_BOTS.some((bot) => ua.includes(bot));

  if (isBlocked) {
    return new Response('Access denied', {
      status: 403, // you can change to 401 if preferred
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  // Let other traffic through to the underlying function / static content
  return context.next();
}

// Only apply to /api/* paths
export const config = {
  path: '/api/*',
};


