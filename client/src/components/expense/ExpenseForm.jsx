import { useEffect, useState } from 'react';
import { Button, Field, Input, Modal, Select } from '../ui/index.jsx';
import { todayISO } from '../../lib';
import { errorMessage } from '../../api/client';
import { expensesApi } from '../../api/resources';

const LAST_CATEGORY_KEY = 'lastCategoryId';

export default function ExpenseForm({ open, onClose, onSaved, categories, expense }) {
  const editing = Boolean(expense);
  const [form, setForm] = useState({ amount: '', date: todayISO(), categoryId: '', note: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setForm({
        amount: String(expense.amount),
        date: expense.date,
        categoryId: expense.category?.id ?? '',
        note: expense.note ?? '',
      });
    } else {
      // Defaults that save keystrokes: today, and whatever they picked last.
      let last = '';
      try {
        last = localStorage.getItem(LAST_CATEGORY_KEY) || '';
      } catch { /* private mode */ }
      const valid = categories.some((c) => c.id === last);
      setForm({
        amount: '',
        date: todayISO(),
        categoryId: valid ? last : categories[0]?.id ?? '',
        note: '',
      });
    }
  }, [open, expense, editing, categories]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = {
        amount: Number(form.amount),
        date: form.date,
        categoryId: form.categoryId,
        note: form.note.trim(),
      };
      const saved = editing
        ? await expensesApi.update(expense.id, payload)
        : await expensesApi.create(payload);
      try {
        localStorage.setItem(LAST_CATEGORY_KEY, form.categoryId);
      } catch { /* private mode */ }
      onSaved(saved, editing);
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not save the expense'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit expense' : 'Add expense'}
      footer={
        <>
          <Button type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="expense-form" variant="primary" loading={busy}>
            {editing ? 'Save changes' : 'Add expense'}
          </Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={submit} className="flex flex-col gap-4">
        {/* Amount first and autofocused — it's the only field the user must think about. */}
        <Field label="Amount">
          <Input
            data-autofocus
            mono
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            placeholder="0.00"
            required
            value={form.amount}
            onChange={set('amount')}
            className="text-lg h-11"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input type="date" required value={form.date} onChange={set('date')} />
          </Field>
          <Field label="Category">
            <Select required value={form.categoryId} onChange={set('categoryId')}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Note" hint="Optional">
          <Input
            placeholder="What was it for?"
            maxLength={255}
            value={form.note}
            onChange={set('note')}
          />
        </Field>

        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
    </Modal>
  );
}
