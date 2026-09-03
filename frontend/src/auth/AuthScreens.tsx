import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError, api, type User } from '../lib/api';
import { ThemeToggle } from '../components/ThemeToggle';
import { ratePassword } from './password-strength';
import { readResetToken } from './reset-link';
import './auth.css';

export type AuthView = 'login' | 'register' | 'forgot' | 'reset' | 'submitted' | 'blocked' | 'verify';

interface Session { accessToken: string; user: User }

/** Statuses the login endpoint refuses with, each needing its own screen. */
const BLOCKED_CODES = new Set(['account_pending', 'account_rejected', 'account_suspended', 'email_unverified']);

function useAutoFocus<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => { if (active) ref.current?.focus(); }, [active]);
  return ref;
}

function Field({ label, hint, error, children }: {
  label: string; hint?: ReactNode; error?: string; children: ReactNode;
}) {
  return (
    <label className={`auth-field${error ? ' is-invalid' : ''}`}>
      <span className="auth-field-label">{label}</span>
      {children}
      {error ? <span className="auth-field-error" role="alert">{error}</span>
        : hint ? <span className="auth-field-hint">{hint}</span> : null}
    </label>
  );
}

function PasswordField({ label, name, value, onChange, autoComplete, personal, showMeter }: {
  label: string; name: string; value: string; onChange: (value: string) => void;
  autoComplete: string; personal?: string[]; showMeter?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const strength = useMemo(() => ratePassword(value, personal ?? []), [value, personal]);

  return (
    <div className="auth-field">
      <span className="auth-field-label">{label}</span>
      <div className="auth-password">
        <input
          name={name} value={value} onChange={(event) => onChange(event.target.value)}
          type={revealed ? 'text' : 'password'} autoComplete={autoComplete} minLength={8} required
        />
        <button
          type="button" className="auth-reveal" onClick={() => setRevealed((current) => !current)}
          aria-pressed={revealed} aria-label={revealed ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
        >
          {revealed ? '🙈' : '👁'}
        </button>
      </div>
      {showMeter && value ? (
        <div className="auth-strength" data-score={strength.score}>
          <div className="auth-strength-track" aria-hidden="true">
            {[0, 1, 2, 3].map((index) => (
              <span key={index} className={index < strength.score ? 'is-filled' : ''} />
            ))}
          </div>
          <span className="auth-strength-label">{strength.label}</span>
          {strength.hint ? <span className="auth-field-hint">{strength.hint}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Everything a signed-out visitor can reach.
 *
 * One component rather than a route tree: the whole surface is five short forms
 * that share a frame, a palette and a set of transitions, and the app has no
 * router. The view is state here and a hash in the URL only where a link has to
 * be shareable -- the reset link from an email.
 */
export function AuthScreens({ onSignedIn }: { onSignedIn: (session: Session) => void | Promise<void> }) {
  const resetTokenFromUrl = useMemo(
    () => (typeof window === 'undefined' ? null : readResetToken(window.location)),
    [],
  );
  // Both links carry ?token=; the path is what tells them apart.
  const isVerifyLink = typeof window !== 'undefined'
    && /verify-email/.test(window.location.pathname + window.location.hash);

  const [view, setView] = useState<AuthView>(
    resetTokenFromUrl ? (isVerifyLink ? 'verify' : 'reset') : 'login',
  );
  const [error, setError] = useState<{ message: string; code?: string; detail?: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<{ code: string; message: string; detail?: string } | null>(null);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [note, setNote] = useState('');

  const go = (next: AuthView) => { setError(null); setNotice(null); setView(next); };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      if (cause instanceof ApiError && BLOCKED_CODES.has(cause.code)) {
        setBlocked({ code: cause.code, message: cause.message, detail: cause.detail });
        setView('blocked');
      } else if (cause instanceof ApiError) {
        setError({ message: cause.message, code: cause.code, detail: cause.detail });
      } else {
        setError({ message: cause instanceof Error ? cause.message : 'Amal bajarilmadi.' });
      }
    } finally {
      setBusy(false);
    }
  };

  const submitLogin = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const session = await api<Session>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });
      await onSignedIn(session);
    });
  };

  const submitRegister = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, username, password, note: note || undefined }),
      });
      setPassword('');
      setView('submitted');
    });
  };

  const submitForgot = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const result = await api<{ message: string; emailConfigured: boolean }>('/auth/password/forgot', {
        method: 'POST', body: JSON.stringify({ email }),
      });
      setNotice(result.message);
    });
  };

  const submitReset = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await api('/auth/password/reset', {
        method: 'POST', body: JSON.stringify({ token: resetTokenFromUrl, password }),
      });
      setPassword('');
      // The link is single-use; leaving it in the address bar invites a reload
      // that fails for no visible reason.
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname);
      }
      setNotice('Parol yangilandi. Endi yangi parol bilan kiring.');
      setView('login');
    });
  };

  const [verifyState, setVerifyState] = useState<'working' | 'done' | 'failed'>('working');
  useEffect(() => {
    if (view !== 'verify' || !resetTokenFromUrl) return;
    api('/auth/email/verify', { method: 'POST', body: JSON.stringify({ token: resetTokenFromUrl }) })
      .then(() => {
        setVerifyState('done');
        // The link is single use; leaving it in the bar invites a reload that
        // fails for no visible reason.
        window.history.replaceState(null, '', window.location.pathname);
      })
      .catch((cause) => {
        setVerifyState('failed');
        setError({ message: cause instanceof ApiError ? cause.message : 'Tasdiqlanmadi.' });
      });
  }, [view, resetTokenFromUrl]);

  const identifierRef = useAutoFocus<HTMLInputElement>(view === 'login');
  const nameRef = useAutoFocus<HTMLInputElement>(view === 'register');
  const emailRef = useAutoFocus<HTMLInputElement>(view === 'forgot');

  // A field-specific error belongs on the field, not in a banner above it.
  const fieldError = (field: 'email' | 'username') =>
    (field === 'email' && error?.code === 'email_taken') || (field === 'username' && error?.code === 'username_taken')
      ? error?.message : undefined;
  const bannerError = error && !['email_taken', 'username_taken'].includes(error.code ?? '') ? error : null;

  return (
    <main className="auth" data-view={view}>
      <div className="auth-aurora" aria-hidden="true">
        <span /><span /><span />
      </div>

      <header className="auth-topbar">
        <div className="auth-brand">
          <span className="auth-mark" aria-hidden="true" />
          <span>CamPath</span>
        </div>
        <ThemeToggle />
      </header>

      <section className="auth-card" key={view}>
        {view === 'login' && (
          <form onSubmit={submitLogin} noValidate={false}>
            <h1>Salom! <span className="auth-wave" aria-hidden="true">👋</span></h1>
            <p className="auth-sub">Cambridge 9618 — davom etamizmi?</p>
            {notice ? <p className="auth-notice" role="status">{notice}</p> : null}
            {bannerError ? <p className="auth-error" role="alert">{bannerError.message}</p> : null}

            <Field label="Login yoki email">
              <input
                ref={identifierRef} name="identifier" value={identifier} autoComplete="username" required
                onChange={(event) => setIdentifier(event.target.value)}
              />
            </Field>
            <PasswordField
              label="Parol" name="password" value={password} onChange={setPassword}
              autoComplete="current-password"
            />

            <button className="auth-submit" disabled={busy}>
              {busy ? 'Kirilmoqda…' : 'Kirish'} <span aria-hidden="true">→</span>
            </button>

            <div className="auth-links">
              <button type="button" className="auth-link" onClick={() => go('forgot')}>Parolni unutdingizmi?</button>
              <span className="auth-links-sep" aria-hidden="true">·</span>
              <button type="button" className="auth-link" onClick={() => go('register')}>Hisob yaratish</button>
            </div>
          </form>
        )}

        {view === 'register' && (
          <form onSubmit={submitRegister}>
            <h1>Ro‘yxatdan o‘tish</h1>
            <p className="auth-sub">
              Arizangizni o‘qituvchi ko‘rib chiqadi va sinfingizga biriktiradi.
            </p>
            {bannerError ? <p className="auth-error" role="alert">{bannerError.message}</p> : null}

            <Field label="To‘liq ism">
              <input
                ref={nameRef} name="fullName" value={fullName} autoComplete="name" required minLength={2}
                onChange={(event) => setFullName(event.target.value)}
              />
            </Field>
            <Field label="Email" error={fieldError('email')}
              hint="Parolni unutsangiz shu manzil orqali tiklaysiz.">
              <input
                name="email" type="email" value={email} autoComplete="email" required
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field label="Username" error={fieldError('username')}
              hint="Harflar, raqamlar va . _ - belgilari.">
              <input
                name="username" value={username} autoComplete="username" required
                minLength={3} pattern="[a-zA-Z0-9._\-]+"
                onChange={(event) => setUsername(event.target.value)}
              />
            </Field>
            <PasswordField
              label="Parol" name="password" value={password} onChange={setPassword}
              autoComplete="new-password" personal={[fullName, email, username]} showMeter
            />
            <Field label="Sinfingiz va guruhingiz"
              hint="Masalan: 11-A, 2-guruh. O‘qituvchi sizni to‘g‘ri sinfga biriktirishi uchun.">
              <input
                name="note" value={note} maxLength={300}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>

            <button className="auth-submit" disabled={busy}>
              {busy ? 'Yuborilmoqda…' : 'Ariza yuborish'} <span aria-hidden="true">→</span>
            </button>
            <div className="auth-links">
              <button type="button" className="auth-link" onClick={() => go('login')}>← Kirish sahifasiga qaytish</button>
            </div>
          </form>
        )}

        {view === 'forgot' && (
          <form onSubmit={submitForgot}>
            <h1>Parolni tiklash</h1>
            <p className="auth-sub">Ro‘yxatdan o‘tgan emailingizni kiriting.</p>
            {notice ? <p className="auth-notice" role="status">{notice}</p> : null}
            {bannerError ? <p className="auth-error" role="alert">{bannerError.message}</p> : null}

            <Field label="Email">
              <input
                ref={emailRef} name="email" type="email" value={email} autoComplete="email" required
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <button className="auth-submit" disabled={busy}>
              {busy ? 'Yuborilmoqda…' : 'Havola yuborish'} <span aria-hidden="true">→</span>
            </button>
            <p className="auth-fineprint">
              Email kelmasa, o‘qituvchingizdan bir martalik tiklash kodini so‘rashingiz mumkin.
            </p>
            <div className="auth-links">
              <button type="button" className="auth-link" onClick={() => go('login')}>← Kirish sahifasiga qaytish</button>
            </div>
          </form>
        )}

        {view === 'reset' && (
          <form onSubmit={submitReset}>
            <h1>Yangi parol</h1>
            <p className="auth-sub">Yangi parolni kiriting — barcha qurilmalardagi sessiyalar yopiladi.</p>
            {bannerError ? <p className="auth-error" role="alert">{bannerError.message}</p> : null}
            <PasswordField
              label="Yangi parol" name="password" value={password} onChange={setPassword}
              autoComplete="new-password" showMeter
            />
            <button className="auth-submit" disabled={busy || !resetTokenFromUrl}>
              {busy ? 'Saqlanmoqda…' : 'Parolni saqlash'} <span aria-hidden="true">→</span>
            </button>
            <div className="auth-links">
              <button type="button" className="auth-link" onClick={() => go('forgot')}>Yangi havola so‘rash</button>
            </div>
          </form>
        )}

        {view === 'submitted' && (
          <div className="auth-outcome">
            <div className="auth-outcome-icon auth-outcome-icon--ok" aria-hidden="true">✓</div>
            <h1>Emailingizni tekshiring</h1>
            <p className="auth-sub">
              Hisobingiz yaratildi. <strong>{email}</strong> manziliga tasdiqlash havolasi yuborildi —
              avval uni oching, so‘ng o‘qituvchi hisobingizni ko‘rib chiqadi.
            </p>
            <button className="auth-submit" onClick={() => go('login')}>Kirish sahifasiga</button>
          </div>
        )}

        {view === 'verify' && (
          <div className="auth-outcome">
            <div
              className={`auth-outcome-icon auth-outcome-icon--${verifyState === 'failed' ? 'stop' : verifyState === 'done' ? 'ok' : 'wait'}`}
              aria-hidden="true"
            >
              {verifyState === 'failed' ? '⚠' : verifyState === 'done' ? '✓' : '⏳'}
            </div>
            <h1>
              {verifyState === 'working' ? 'Tasdiqlanmoqda…'
                : verifyState === 'done' ? 'Email tasdiqlandi' : 'Tasdiqlanmadi'}
            </h1>
            <p className="auth-sub">
              {verifyState === 'done'
                ? 'Endi o‘qituvchi hisobingizni ko‘rib chiqadi. Tasdiqlangach kira olasiz.'
                : verifyState === 'failed'
                  ? (error?.message ?? 'Havola yaroqsiz yoki muddati tugagan.')
                  : 'Bir lahza…'}
            </p>
            {verifyState !== 'working' ? (
              <button className="auth-submit" onClick={() => go('login')}>Kirish sahifasiga</button>
            ) : null}
          </div>
        )}

        {view === 'blocked' && blocked && (
          <div className="auth-outcome">
            <div
              className={`auth-outcome-icon auth-outcome-icon--${blocked.code === 'account_pending' ? 'wait' : 'stop'}`}
              aria-hidden="true"
            >
              {blocked.code === 'account_pending' ? '⏳' : '⚠'}
            </div>
            <h1>
              {blocked.code === 'email_unverified' ? 'Emailni tasdiqlang'
                : blocked.code === 'account_pending' ? 'Tasdiqlash kutilmoqda' : 'Kirish yopiq'}
            </h1>
            <p className="auth-sub">{blocked.message}</p>
            {blocked.code === 'email_unverified' ? (
              <button
                type="button" className="auth-submit" disabled={busy}
                onClick={() => void run(async () => {
                  const result = await api<{ message: string }>('/auth/email/resend', {
                    method: 'POST', body: JSON.stringify({ email: identifier.includes('@') ? identifier : email }),
                  });
                  setNotice(result.message);
                  setBlocked(null);
                  setView('login');
                })}
              >
                Havolani qayta yuborish
              </button>
            ) : null}
            {/* The approver's own words. Without them there is nothing to act on. */}
            {blocked.detail ? <p className="auth-reason">“{blocked.detail}”</p> : null}
            <button className="auth-submit" onClick={() => { setBlocked(null); go('login'); }}>
              Ortga
            </button>
          </div>
        )}
      </section>

      <p className="auth-footer">Cambridge 9618 · AS &amp; A Level Computer Science</p>
    </main>
  );
}
