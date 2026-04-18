import { describe, it, expect } from 'vitest';
import { parseTokensFromHash } from '../parseTokens';

describe('parseTokensFromHash', () => {
  it('extracts access_token and refresh_token from a hash', () => {
    const r = parseTokensFromHash('#access_token=abc&refresh_token=def&type=signup');
    expect(r).toEqual({ accessToken: 'abc', refreshToken: 'def' });
  });

  it('returns null when access_token is missing', () => {
    expect(parseTokensFromHash('#refresh_token=def')).toBeNull();
  });

  it('returns null when refresh_token is missing', () => {
    expect(parseTokensFromHash('#access_token=abc')).toBeNull();
  });

  it('returns null for an empty hash', () => {
    expect(parseTokensFromHash('')).toBeNull();
  });

  it('returns null when the hash does not start with #', () => {
    expect(parseTokensFromHash('access_token=abc&refresh_token=def')).toBeNull();
  });

  it('URL-decodes token values', () => {
    const r = parseTokensFromHash('#access_token=a%2Fb%3Dc&refresh_token=d%26e');
    expect(r).toEqual({ accessToken: 'a/b=c', refreshToken: 'd&e' });
  });
});
