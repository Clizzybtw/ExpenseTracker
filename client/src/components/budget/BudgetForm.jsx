import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button, Field, Input, Modal, Select } from '../ui/index.jsx';
import { formatMoney, monthRange, todayISO } from '../../lib';
import { errorMessage } from '../../api/client';
import { budgetsApi } from '../../api/resources';

const PRESETS = [
  { id: 'MONTHLY', label: 'This month' },
  { id: 'WEEKLY', label: 'This week' },
  { id: 'YEARLY', label: 'This year' },
  { id: 'CUSTOM', label: 'Custom' },
];

function presetRange(id) {
  const now = new Date();
  const iso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (id === 'MONTHLY') return monthRange(0);
  if (id === 'WEEKLY') {
    const day = now.getDay();
    const monday = new Date(now); monday.setDate(now.getDate() - ((day + 6) % 7));
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    return { from: iso(monday), to: iso(sunday) };
  }
  if (id === 'YEARLY') {
    return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
  }
  return { from: todayISO(), to: todayISO() };
}

export default function BudgetForm({ open, onClose, onSaved, categories, budget, currency }) {
  const editing = Boolean(budget);
  const [form, setForm] = useState({ name: '', periodType: 'MONTHLY', startDate: '', endDate: '', totalLimit: '' });
  const [allocations, setAllocations] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setForm({
        name: budget.name,
        periodType: budget.periodType,
        startDate: budget.startDate,
        endDate: budget.endDate,
        totalLimit: budget.totalLimit == null ? '' : String(budget.totalLimit),
      });
      setAllocations(budget.allocations.map((a) => ({ categoryId: a.categoryId, limit: String(a.limit) })));
    } else {
      const r = presetRange('MONTHLY');
      const now = new Date();
      setForm({
        name: now.toLocaleString('en-US', { month: 'long' }) + ' ' + now.getFullYear(),
        periodType: 'MONTHLY',
        startDate: r.from,
        endDate: r.to,
        totalLimit: '',
      });
      setAllocations([]);
    }
  }, [open, budget, editing]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function choosePreset(e) {
    const id = e.target.value;
    const r = presetRange(id);
    setForm((f) => ({ ...f, periodType: id, ...(id === 'CUSTOM' ? {} : { startDate: r.from, endDate: r.to }) }));
  }

  const used = new Set(allocations.map((a) => a.categoryId));
  const available = categories.filter((c) => !used.has(c.id));

  const totalAllocated = useMemo(
    () => allocations.reduce((s, a) => s + (Number(a.limit) || 0), 0),
    [allocations]
  );
  const limitNum = Number(form.totalLimit) || 0;
  // WHY: surfaced live so over-allocation is visible before saving, not after.
  const over = limitNum > 0 && totalAllocated > limitNum;

  function addAllocation() {
    if (!available.length) return;
    setAllocations((a) => [...a, { categoryId: available[0].id, limit: '' }]);
  }

  function updateAllocation(i, key, value) {
    setAllocations((a) => a.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  }

  async function submit(e) {
    e.preventDefault();
    if (form.endDate < form.startDate) {
      setError('End date must be on or after the start date');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        periodType: form.periodType,
        startDate: form.startDate,
        endDate: form.endDate,
        totalLimit: form.totalLimit === '' ? null : Number(form.totalLimit),
        allocations: allocations
          .filter((a) => a.categoryId && Number(a.limit) > 0)
          .map((a) => ({ categoryId: a.categoryId, limit: Number(a.limit) })),
      };
      const saved = editing
        ? await budgetsApi.update(budget.id, payload)
        : await budgetsApi.create(payload);
      onSaved(saved, editing);
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not save the budget'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit budget' : 'New budget'}
      footer={
        <>
          <Button type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="budget-form" variant="primary" loading={busy}>
            {editing ? 'Save changes' : 'Create budget'}
          </Button>
        </>
      }
    >
      <form id="budget-form" onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Name">
          <Input data-autofocus required maxLength={60} value={form.name} onChange={set('name')} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Period">
            <Select value={form.periodType} onChange={choosePreset}>
              {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </Select>
          </Field>
          <Field label="Overall limit" hint="Optional">
            <Input mono type="number" step="0.01" min="0" placeholder="No cap"
              value={form.totalLimit} onChange={set('totalLimit')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start"><Input type="date" required value={form.startDate} onChange={set('startDate')} /></Field>
          <Field label="End"><Input type="date" required value={form.endDate} onChange={set('endDate')} /></Field>
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-faint font-semibold">
              Category limits
            </span>
            <Button type="button" onClick={addAllocation} disabled={!available.length} className="h-7 px-2">
              <Plus size={13} /> Add
            </Button>
          </div>

          {allocations.length === 0 && (
            <p className="text-sm text-text-faint py-2">
              No category limits yet. Spending still tracks against the overall limit.
            </p>
          )}

          {allocations.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select
                value={a.categoryId}
                onChange={(e) => updateAllocation(i, 'categoryId', e.target.value)}
                className="flex-1"
              >
                {categories
                  .filter((c) => c.id === a.categoryId || !used.has(c.id))
                  .map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Input
                mono type="number" step="0.01" min="0.01" placeholder="0.00"
                value={a.limit}
                onChange={(e) => updateAllocation(i, 'limit', e.target.value)}
                className="w-28"
              />
              <button
                type="button"
                aria-label="Remove"
                onClick={() => setAllocations((x) => x.filter((_, idx) => idx !== i))}
                className="p-2 text-text-muted hover:text-danger"
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {allocations.length > 0 && (
            <div className={`flex justify-between text-sm pt-1 ${over ? 'text-danger' : 'text-text-muted'}`}>
              <span>Allocated</span>
              <span className="num">
                {formatMoney(totalAllocated, currency)}
                {limitNum > 0 && ` / ${formatMoney(limitNum, currency)}`}
              </span>
            </div>
          )}
          {over && (
            <p className="text-xs text-danger">
              Allocations exceed the overall limit by {formatMoney(totalAllocated - limitNum, currency)}.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
    </Modal>
  );
}
