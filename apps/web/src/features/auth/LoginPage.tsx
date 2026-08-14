import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { loginSchema } from '@campath/shared';
import { api, ApiError, setAccessToken } from '../../lib/api';

export interface SessionUser {
  id: string;
  fullName: string;
  role: 'owner' | 'teacher' | 'student';
  schoolId: string | null;
}

interface LoginPageProps {
  onSignedIn: (user: SessionUser) => void;
}

export function LoginPage({ onSignedIn }: LoginPageProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState('');

  const signIn = useMutation({
    mutationFn: async (input: { identifier: string; password: string }) => {
      // Validated with the same schema the API uses, so a malformed form never
      // costs a round trip or burns a rate-limit attempt.
      const parsed = loginSchema.safeParse(input);
      if (!parsed.success) throw new Error('Login va parolni tekshiring.');
      return api<{ accessToken: string; user: SessionUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      });
    },
    onSuccess: (session) => {
      setAccessToken(session.accessToken);
      onSignedIn(session.user);
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFieldError('');
    signIn.mutate({ identifier, password });
  };

  const message =
    fieldError ||
    (signIn.error instanceof ApiError
      ? signIn.error.message
      : signIn.error instanceof Error
        ? signIn.error.message
        : '');

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-5 rounded-lg border border-slate-200 bg-white p-8 shadow-sm"
      >
        <header className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">CamPath</h1>
          <p className="text-sm text-slate-500">Cambridge 9618 tayyorlov platformasi</p>
        </header>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Email yoki username</span>
          <input
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            autoComplete="username"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Parol</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            minLength={8}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
        </label>

        {message && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={signIn.isPending}
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {signIn.isPending ? 'Kirilmoqda…' : 'Kirish'}
        </button>
      </form>
    </main>
  );
}
