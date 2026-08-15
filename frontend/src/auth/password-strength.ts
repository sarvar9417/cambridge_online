export interface PasswordStrength {
  /** 0–4. Drives the meter and gates the submit button at the low end. */
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  /** The single most useful next step, not a list of every rule. */
  hint: string | null;
}

/**
 * Rates a password for the person choosing it.
 *
 * The server's only rule is eight characters, which is a floor rather than
 * advice. This tells the student what would actually make their password
 * better, one suggestion at a time -- a wall of red rules gets ignored, and the
 * common failure here is not a missing symbol but a short password.
 *
 * Length dominates on purpose: `Parol1!` satisfies every character class and is
 * worse than `mening uzun parolim`.
 */
export function ratePassword(password: string, personal: string[] = []): PasswordStrength {
  if (!password) return { score: 0, label: '', hint: null };

  // Compared with punctuation and spacing removed, because "AzizaKarimova2011"
  // is the shape people actually build from their own name -- a check that only
  // matched "aziza karimova" would miss the common case entirely. Each word is
  // also checked on its own, since a surname alone is no better a secret.
  const squash = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const squashed = squash(password);
  const needles = personal
    .flatMap((value) => [value, ...value.split(/[\s@._-]+/)])
    .map(squash)
    .filter((value) => value.length >= 4);
  const echoesPersonal = needles.some(
    (value) => squashed.includes(value) || value.includes(squashed),
  );

  if (echoesPersonal) {
    return { score: 0, label: 'Juda oson', hint: 'Ismingiz yoki emailingizni parolda ishlatmang.' };
  }
  if (password.length < 8) {
    return { score: 0, label: 'Juda qisqa', hint: 'Kamida 8 ta belgi kerak.' };
  }

  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length;
  const lengthPoints = password.length >= 16 ? 3 : password.length >= 12 ? 2 : password.length >= 10 ? 1 : 0;
  const raw = Math.min(4, lengthPoints + Math.max(0, classes - 1));
  const score = Math.max(1, raw) as PasswordStrength['score'];

  const hint = password.length < 12
    ? 'Uzunroq parol kuchliroq — bir nechta so‘zdan iborat ibora eng yaxshisi.'
    : classes < 2
      ? 'Raqam yoki bosh harf qo‘shsangiz yanada kuchliroq bo‘ladi.'
      : null;

  return {
    score,
    label: ['Juda oson', 'Zaif', 'O‘rtacha', 'Yaxshi', 'Kuchli'][score]!,
    hint,
  };
}
