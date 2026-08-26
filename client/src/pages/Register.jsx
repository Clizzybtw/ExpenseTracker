import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button, Card, Field, Input, Select } from '../components/ui/index.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { errorMessage } from '../api/client';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'JPY'];

export default function Register() {
  const { user, register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', currency: 'INR' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(form);
    } catch (err) {
      setError(errorMessage(err, 'Could not create the account'));
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <div className="w-10 h-1 bg-accent rounded mb-4" />
          <h1 className="text-xl font-bold tracking-tight">Create your account</h1>
          <p className="text-sm text-text-muted mt-1">Nine categories are set up for you automatically.</p>
        </div>

        <Card className="p-6">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Name">
              <Input required autoFocus maxLength={60} value={form.name} onChange={set('name')} />
            </Field>
            <Field label="Email">
              <Input type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
            </Field>
            <Field label="Password" hint="At least 8 characters">
              <Input type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={set('password')} />
            </Field>
            <Field label="Currency">
              <Select value={form.currency} onChange={set('currency')}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" variant="primary" loading={busy} className="h-10">Create account</Button>
          </form>
        </Card>

        <p className="text-sm text-text-muted mt-4 text-center">
          Already have one? <Link to="/login" className="text-accent font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
