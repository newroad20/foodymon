/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeAuthLinkError, parseAuthLink } from './authLink.ts';

test('parseAuthLink reads tokens from the fragment', () => {
  const r = parseAuthLink('exp://192.168.0.2:8081/--/#access_token=abc&refresh_token=def&type=signup');
  assert.deepEqual(r, { kind: 'session', accessToken: 'abc', refreshToken: 'def', recovery: false });
});

test('parseAuthLink reports errors from query or fragment', () => {
  const r = parseAuthLink(
    'foodymon://?error=access_denied#error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
  );
  assert.deepEqual(r, { kind: 'error', message: 'Email link is invalid or has expired' });
  assert.match(describeAuthLinkError('Email link is invalid or has expired'), /만료/);
});

test('parseAuthLink ignores unrelated links', () => {
  assert.deepEqual(parseAuthLink('foodymon://'), { kind: 'none' });
  assert.deepEqual(parseAuthLink('exp://host:8081/--/mypage?tab=1'), { kind: 'none' });
});

test('parseAuthLink marks password reset links', () => {
  const r = parseAuthLink('foodymon://#access_token=a&refresh_token=b&type=recovery');
  assert.deepEqual(r, { kind: 'session', accessToken: 'a', refreshToken: 'b', recovery: true });
});
