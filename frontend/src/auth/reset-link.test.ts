import { describe, expect, it } from 'vitest';
import { readResetToken } from './reset-link';

describe('reading the reset token from a link', () => {
  it('reads the query string the backend actually builds', () => {
    expect(readResetToken({ search: '?token=abc123', hash: '' })).toBe('abc123');
  });

  it('reads it from the hash, for a deployment that routes there', () => {
    expect(readResetToken({ search: '', hash: '#/reset-password?token=abc123' })).toBe('abc123');
  });

  it('handles the hash form without a leading slash', () => {
    expect(readResetToken({ search: '', hash: '#reset-password?token=abc123' })).toBe('abc123');
  });

  it('keeps base64url tokens intact', () => {
    // randomBytes(32).toString('base64url') yields - and _; a decoder that
    // mangled them would fail the reset with no visible cause.
    const token = 'a-B_c1234567890-_abcDEFghiJKL';
    expect(readResetToken({ search: `?token=${token}`, hash: '' })).toBe(token);
  });

  it('prefers the query string when both are somehow present', () => {
    expect(readResetToken({ search: '?token=from-query', hash: '#/x?token=from-hash' })).toBe('from-query');
  });

  it('returns null when there is no token, rather than an empty string', () => {
    // The submit button is disabled on null; an empty string would enable it and
    // send a request that can only fail.
    expect(readResetToken({ search: '', hash: '' })).toBeNull();
    expect(readResetToken({ search: '?other=1', hash: '#/reset-password' })).toBeNull();
    expect(readResetToken({ search: '?token=', hash: '' })).toBeNull();
    expect(readResetToken({ search: '', hash: '#/reset-password?token=' })).toBeNull();
  });

  it('survives a location with neither field set', () => {
    expect(readResetToken({})).toBeNull();
  });
});
