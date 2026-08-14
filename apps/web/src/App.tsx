import { useState } from 'react';
import { LoginPage, type SessionUser } from './features/auth/LoginPage';

/**
 * Shell for the login page only. Everything else in the product is a later
 * task; this exists so `docker compose up` gives a working sign-in against the
 * seeded owner, teacher and student accounts.
 */
export function App() {
  const [user, setUser] = useState<SessionUser | null>(null);

  if (!user) return <LoginPage onSignedIn={setUser} />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-sm space-y-2 rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Salom, {user.fullName}</h1>
        <p className="text-sm text-slate-500">
          Rol: {user.role}. Qolgan ekranlar keyingi vazifalarda quriladi.
        </p>
      </section>
    </main>
  );
}
