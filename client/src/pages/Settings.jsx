import { useCallback, useState } from 'react';
import { Plus, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { Button, Card, Field, Input, Select, Skeleton, ErrorState, Modal, ConfirmDialog } from '../components/ui/index.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useTheme } from '../hooks/useTheme.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { useFetch } from '../hooks/useFetch';
import { categoriesApi } from '../api/resources';
import { authApi } from '../api/auth';
import { errorMessage } from '../api/client';
import { CATEGORY_SWATCHES } from '../lib';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'JPY'];
const THEMES = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'system', label: 'Match system' },
];

export default function Settings() {
  const { user, patchUser, logout } = useAuth();
  const { preference, setPreference } = useTheme();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', color: CATEGORY_SWATCHES[0] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const categories = useFetch(useCallback(() => categoriesApi.list(true), []), []);

  async function createCategory(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await categoriesApi.create({ name: form.name.trim(), color: form.color });
      toast.push('Category added');
      setOpen(false);
      setForm({ name: '', color: CATEGORY_SWATCHES[0] });
      categories.refetch();
    } catch (err) {
      setError(errorMessage(err, 'Could not add the category'));
    } finally {
      setBusy(false);
    }
  }

  async function toggleArchive(c) {
    try {
      await categoriesApi.update(c.id, { isArchived: !c.isArchived });
      toast.push(c.isArchived ? 'Category restored' : 'Category archived');
      categories.refetch();
    } catch (err) {
      toast.push(errorMessage(err), { tone: 'danger' });
    }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await categoriesApi.remove(deleting.id);
      toast.push('Category deleted');
      setDeleting(null);
      categories.refetch();
    } catch (err) {
      // 409 when the category is in use — the message tells them to archive.
      toast.push(errorMessage(err, 'Could not delete'), { tone: 'danger' });
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }

  async function changeCurrency(e) {
    const currency = e.target.value;
    try {
      const updated = await authApi.updateCurrency(currency);
      patchUser({ currency: updated.currency });
      toast.push('Currency updated');
    } catch (err) {
      toast.push(errorMessage(err), { tone: 'danger' });
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <h1 className="text-lg font-bold tracking-tight">Settings</h1>

      <Card className="p-5 flex flex-col gap-4">
        <h2 className="font-semibold">Preferences</h2>
        <Field label="Currency">
          <Select value={user?.currency || 'INR'} onChange={changeCurrency}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Theme">
          <div className="flex gap-1">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setPreference(t.id)}
                className={`h-9 px-3 rounded text-sm flex-1 transition-colors ${
                  preference === t.id
                    ? 'bg-accent-subtle text-accent font-semibold'
                    : 'bg-raised text-text-muted hover:text-text border border-line'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Field>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Categories</h2>
          <Button onClick={() => setOpen(true)}><Plus size={14} /> Add</Button>
        </div>

        {categories.loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : categories.error ? (
          <ErrorState message={categories.error} onRetry={categories.refetch} />
        ) : (
          <ul className="flex flex-col">
            {categories.data.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5 border-t border-line first:border-0">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c.color }} />
                <span className={`flex-1 text-sm ${c.isArchived ? 'text-text-faint line-through' : ''}`}>
                  {c.name}
                </span>
                <span className="num text-xs text-text-faint">{c.expenseCount} expenses</span>
                <button
                  onClick={() => toggleArchive(c)}
                  aria-label={c.isArchived ? 'Restore' : 'Archive'}
                  title={c.isArchived ? 'Restore' : 'Archive'}
                  className="p-1.5 rounded text-text-muted hover:text-text"
                >
                  {c.isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                </button>
                <button
                  onClick={() => setDeleting(c)}
                  aria-label="Delete"
                  disabled={c.expenseCount > 0}
                  title={c.expenseCount > 0 ? 'In use — archive instead' : 'Delete'}
                  className="p-1.5 rounded text-text-muted hover:text-danger disabled:opacity-30 disabled:hover:text-text-muted"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-text-faint mt-3">
          Archiving hides a category from new expenses but keeps your history intact. Categories
          already used by an expense can't be deleted.
        </p>
      </Card>

      <Card className="p-5 flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">{user?.name}</p>
          <p className="text-xs text-text-faint">{user?.email}</p>
        </div>
        <Button onClick={logout}>Log out</Button>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add category"
        footer={
          <>
            <Button type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="cat-form" variant="primary" loading={busy}>Add category</Button>
          </>
        }
      >
        <form id="cat-form" onSubmit={createCategory} className="flex flex-col gap-4">
          <Field label="Name">
            <Input data-autofocus required maxLength={40} value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Colour">
            <div className="flex flex-wrap gap-2">
              {CATEGORY_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Colour ${c}`}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded transition-transform ${
                    form.color === c ? 'ring-2 ring-offset-2 ring-offset-surface ring-accent scale-110' : ''
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        busy={busy}
        title="Delete category"
        message={deleting ? `Delete "${deleting.name}"? This can't be undone.` : ''}
      />
    </div>
  );
}
