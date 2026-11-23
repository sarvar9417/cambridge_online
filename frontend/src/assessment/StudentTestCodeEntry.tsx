import { useState, type FormEvent } from 'react';
import { navigate } from '../lib/router';
import './student-test-code-entry.css';

/**
 * Classroom tests use their own guest session: students need only the teacher's
 * six-digit code and their full name. They must not need a class assignment.
 */
export function StudentTestCodeEntry() {
  const [code, setCode] = useState('');
  const valid = /^\d{6}$/.test(code);

  function enter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid) return;
    navigate('/test/' + code);
  }

  return <section className="student-test-code" aria-label="Kod bilan testga kirish">
    <div className="student-test-code-copy">
      <span className="student-test-code-kicker">📝 KOD BILAN TEST</span>
      <h2>O‘qituvchi bergan kodni kiriting</h2>
      <p>6 xonali kodni yozing, ismingizni kiriting va testni boshlang. Sinf tanlash yoki yangi akkaunt kerak emas.</p>
    </div>
    <form className="student-test-code-form" onSubmit={enter}>
      <label htmlFor="classroom-test-pin">Test kodi</label>
      <div className="student-test-code-row">
        <input id="classroom-test-pin" aria-label="6 xonali test kodi"
          type="text" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}"
          maxLength={6} placeholder="000000" value={code}
          onChange={event=>setCode(event.target.value.replace(/\D/g,'').slice(0,6))} />
        <button type="submit" disabled={!valid}>Testga kirish →</button>
      </div>
      <small>Misol: o‘qituvchingiz ko‘rsatgan 6 xonali kod.</small>
    </form>
  </section>;
}
