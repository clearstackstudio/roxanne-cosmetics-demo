import {
  AUTH_COOKIE,
  expectedToken,
  passcodeConfigured,
  passcodeMatches,
} from '@/lib/inventory-server';

export const dynamic = 'force-dynamic';

/**
 * POST { passcode } → sets the staff cookie for the inventory API.
 * The cookie carries an HMAC token, never the passcode itself.
 * Bryant sets INVENTORY_PASSCODE in the Vercel dashboard; the value
 * is never in the repo and never seen by the assistant.
 */
export async function POST(req: Request) {
  if (!passcodeConfigured()) {
    return Response.json({ error: 'passcode_not_configured' }, { status: 503 });
  }
  const body = (await req.json().catch(() => null)) as {
    passcode?: unknown;
  } | null;
  if (typeof body?.passcode !== 'string' || !passcodeMatches(body.passcode)) {
    return Response.json({ error: 'wrong_passcode' }, { status: 401 });
  }
  const res = Response.json({ ok: true });
  res.headers.append(
    'Set-Cookie',
    [
      `${AUTH_COOKIE}=${expectedToken()}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${60 * 60 * 24 * 30}`,
      ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
    ].join('; '),
  );
  return res;
}
