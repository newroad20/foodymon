/**
 * Reads the result of a Supabase email link (sign-up confirmation) that
 * reopened the app. Supabase puts tokens or an error in the URL fragment
 * (#access_token=...) and sometimes in the query string.
 */
export type AuthLinkResult =
  | { kind: 'session'; accessToken: string; refreshToken: string }
  | { kind: 'error'; message: string }
  | { kind: 'none' };

export function parseAuthLink(url: string): AuthLinkResult {
  const params = new Map<string, string>();
  const read = (part: string | undefined) => {
    if (!part) return;
    for (const pair of part.split('&')) {
      const [k, v = ''] = pair.split('=');
      if (k) params.set(decodeURIComponent(k), decodeURIComponent(v.replace(/\+/g, ' ')));
    }
  };
  const hashIndex = url.indexOf('#');
  const beforeHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const queryIndex = beforeHash.indexOf('?');
  read(queryIndex >= 0 ? beforeHash.slice(queryIndex + 1) : undefined);
  read(hashIndex >= 0 ? url.slice(hashIndex + 1) : undefined);

  const error = params.get('error_description') ?? params.get('error');
  if (error) return { kind: 'error', message: error };

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) return { kind: 'session', accessToken, refreshToken };
  return { kind: 'none' };
}

/** Korean message for the errors Supabase reports on email links. */
export function describeAuthLinkError(message: string): string {
  if (/expired|invalid/i.test(message)) {
    return '인증 링크가 만료되었거나 이미 사용되었어요. 이미 인증했다면 그대로 로그인해 주세요.';
  }
  return `이메일 인증을 완료하지 못했어요. (${message})`;
}
