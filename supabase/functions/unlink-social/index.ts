// Supabase Edge Function: before an account is deleted, disconnect it from Kakao and Apple.
// Secrets (Dashboard → Edge Functions → Secrets): KAKAO_ADMIN_KEY, APPLE_TEAM_ID, APPLE_KEY_ID,
// APPLE_PRIVATE_KEY (the .p8 file's text), APPLE_CLIENT_ID (com.foodymon.app).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { importPKCS8, SignJWT } from 'npm:jose@5';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const env = (k: string) => Deno.env.get(k) ?? '';

async function unlinkKakao(kakaoUserId: string): Promise<string> {
  const res = await fetch('https://kapi.kakao.com/v1/user/unlink', {
    method: 'POST',
    headers: { Authorization: `KakaoAK ${env('KAKAO_ADMIN_KEY')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ target_id_type: 'user_id', target_id: kakaoUserId }),
  });
  return res.ok ? 'unlinked' : `failed ${res.status}`;
}

// Apple wants the app's own token revoked: trade the fresh authorization code for a refresh token, then revoke it.
async function revokeApple(code: string): Promise<string> {
  const key = await importPKCS8(env('APPLE_PRIVATE_KEY').replace(/\\n/g, '\n'), 'ES256');
  const clientSecret = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: env('APPLE_KEY_ID') })
    .setIssuer(env('APPLE_TEAM_ID'))
    .setIssuedAt()
    .setExpirationTime('5m')
    .setAudience('https://appleid.apple.com')
    .setSubject(env('APPLE_CLIENT_ID'))
    .sign(key);
  const form = { client_id: env('APPLE_CLIENT_ID'), client_secret: clientSecret };
  const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...form, code, grant_type: 'authorization_code' }),
  });
  const token = await tokenRes.json().catch(() => ({}));
  if (!token.refresh_token) return `token failed ${tokenRes.status}`;
  const res = await fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...form, token: token.refresh_token, token_type_hint: 'refresh_token' }),
  });
  return res.ok ? 'revoked' : `revoke failed ${res.status}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  // Only the signed-in user can unlink their own account.
  const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return json({ error: 'unauthorized' }, 401);

  const { appleAuthorizationCode } = await req.json().catch(() => ({}));
  const result: Record<string, string> = {};
  for (const identity of data.user.identities ?? []) {
    try {
      if (identity.provider === 'kakao') {
        result.kakao = await unlinkKakao(String(identity.identity_data?.sub ?? identity.id));
      } else if (identity.provider === 'apple') {
        result.apple = appleAuthorizationCode ? await revokeApple(appleAuthorizationCode) : 'no code';
      }
    } catch (e) {
      result[identity.provider] = `error ${e instanceof Error ? e.message : e}`;
    }
  }
  return json(result);
});
