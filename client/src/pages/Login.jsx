import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button, Card, Field, Input } from '../components/ui/index.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { errorMessage } from '../api/client';

export default function Login() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(form);
    } catch (err) {
      setError(errorMessage(err, 'Could not sign in'));
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <div className="w-10 h-1 bg-accent rounded mb-4" />
          <h1 className="text-xl font-bold tracking-tight">Expense Tracker</h1>
          <p className="text-sm text-text-muted mt-1">Sign in to see where your money went.</p>
        </div>

        <Card className="p-6">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Email">
              <Input type="email" autoComplete="email" required autoFocus value={form.email} onChange={set('email')} />
            </Field>
            <Field label="Password">
              <Input type="password" autoComplete="current-password" required value={form.password} onChange={set('password')} />
            </Field>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" variant="primary" loading={busy} className="h-10">Sign in</Button>
          </form>
        </Card>

        <p className="text-sm text-text-muted mt-4 text-center">
          No account? <Link to="/register" className="text-accent font-semibold hover:underline">Create one</Link>
        </p>
        <p className="text-xs text-text-faint mt-6 text-center">
          Demo: <span className="num">demo@example.com</span> / <span className="num">demo1234</span>
        </p>
      </div>
    </div>
  );
}
