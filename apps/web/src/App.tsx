import { useState } from 'react';
import { LoginPage, type SessionUser } from './features/auth/LoginPage';
import { QuestionBankPage } from './features/questions/QuestionBankPage';

/**
 * Shell for the login page only. Everything else in the product is a later
 * task; this exists so `docker compose up` gives a working sign-in against the
 * seeded owner, teacher and student accounts.
 */
export function App() {
  const [user, setUser] = useState<SessionUser | null>(null);

  if (!user) return <LoginPage onSignedIn={setUser} />;

  return user.role === 'student' ? (
    <p className="p-8">Savollar banki o‘qituvchilar uchun.</p>
  ) : (
    <QuestionBankPage fullName={user.fullName} role={user.role} />
  );
}
