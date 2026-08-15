import { describe, expect, it } from 'vitest';
import { ratePassword } from './password-strength';

describe('password strength', () => {
  it('says nothing about an empty field', () => {
    expect(ratePassword('')).toEqual({ score: 0, label: '', hint: null });
  });

  it('names the shortfall when the password is too short', () => {
    const result = ratePassword('kalit');
    expect(result.score).toBe(0);
    expect(result.hint).toMatch(/8/);
  });

  it('rates a long passphrase above a short password with every character class', () => {
    // The common instinct is that symbols matter most. Length matters more, and
    // the meter has to say so or it teaches the wrong habit.
    const passphrase = ratePassword('mening uzun parolim');
    const fiddly = ratePassword('Parol1!x');
    expect(passphrase.score).toBeGreaterThan(fiddly.score);
  });

  it('refuses to call a password strong when it contains the person’s own name', () => {
    const result = ratePassword('AzizaKarimova2011', ['Aziza Karimova', 'aziza@maktab.uz']);
    expect(result.score).toBe(0);
    expect(result.hint).toMatch(/ismingiz/i);
  });

  it('catches the email local part, not just the whole address', () => {
    expect(ratePassword('sarvar9417-parol', ['sarvar9417']).score).toBe(0);
  });

  it('ignores personal values too short to be meaningful', () => {
    // A two-letter name would match almost everything and make the check useless.
    expect(ratePassword('mening uzun parolim', ['Ali']).score).toBeGreaterThan(0);
  });

  it('offers one suggestion at a time, and none once the password is good', () => {
    expect(ratePassword('kalitso1').hint).toMatch(/uzunroq/i);
    expect(ratePassword('mening juda uzun parolim 2026').hint).toBeNull();
  });

  it('never scores a valid password at zero, so the meter is not confusing', () => {
    expect(ratePassword('kalitsoz').score).toBeGreaterThanOrEqual(1);
  });
});
