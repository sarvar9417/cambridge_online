import { FormEvent, useState } from 'react';
import { api, ApiError, setAccessToken, type User } from '../../lib/api';

type Mode = 'login' | 'register';

interface AuthScreenProps {
  onSignedIn: (session: { accessToken: string; user: User }) => void;
}

export function AuthScreen({ onSignedIn }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [identifier, setIdentifier] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const session =
        mode === 'login'
          ? await api<{ accessToken: string; user: User }>('/auth/login', {
              method: 'POST',
              body: JSON.stringify({ identifier, password }),
            })
          : await api<{ accessToken: string; user: User }>('/auth/register', {
              method: 'POST',
              body: JSON.stringify({ fullName, email, password }),
            });
      setAccessToken(session.accessToken);
      onSignedIn(session);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'So‘rov bajarilmadi.');
    } finally {
      setBusy(false);
    }
  };

  const switchTo = (next: Mode) => {
    setMode(next);
    setError('');
  };

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={submit}>
        <h1>{mode === 'login' ? 'Tizimga kirish' : 'Ro‘yxatdan o‘tish'}</h1>

        {mode === 'login' ? (
          <label>
            Email yoki username
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
        ) : (
          <>
            <label>
              To‘liq ismingiz
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
                minLength={2}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
          </>
        )}

        <label>
          Parol
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={mode === 'login' ? 8 : 10}
            required
          />
          {mode === 'register' && <small>Kamida 10 ta belgi.</small>}
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={busy}>
          {busy ? 'Yuborilmoqda…' : mode === 'login' ? 'Kirish' : 'Ro‘yxatdan o‘tish'}
        </button>

        {mode === 'login' ? (
          <p className="auth-switch">
            Hisobingiz yo‘qmi?{' '}
            <button type="button" className="link" onClick={() => switchTo('register')}>
              Ro‘yxatdan o‘ting
            </button>
          </p>
        ) : (
          <>
            <p className="auth-note">
              Ro‘yxatdan o‘tgach o‘qituvchingiz sizni sinf va guruhga biriktiradi. Shundan keyin
              vazifalar va o‘quv materiallari ochiladi.
            </p>
            <p className="auth-switch">
              Hisobingiz bormi?{' '}
              <button type="button" className="link" onClick={() => switchTo('login')}>
                Kirish
              </button>
            </p>
          </>
        )}
      </form>
    </main>
  );
}

/** Shown to a signed-in student whose account has not been placed in a class yet. */
export function PendingApprovalScreen({
  user,
  onSignOut,
  onRecheck,
}: {
  user: User;
  onSignOut: () => void;
  onRecheck: () => void;
}) {
  return (
    <main className="auth">
      <section className="auth-card">
        <h1>Salom, {user.fullName}</h1>
        <p className="auth-note">
          Hisobingiz yaratildi va tasdiqlash navbatida. O‘qituvchingiz sizni sinf va guruhga
          biriktirgach, vazifalar, natijalar va o‘quv materiallari shu yerda paydo bo‘ladi.
        </p>
        <div className="row">
          <button type="button" onClick={onRecheck}>
            Holatni tekshirish
          </button>
          <button type="button" className="secondary" onClick={onSignOut}>
            Chiqish
          </button>
        </div>
      </section>
    </main>
  );
}
