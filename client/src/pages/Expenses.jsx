import { useCallback, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button, Card, Input, Select, ErrorState, ConfirmDialog } from '../components/ui/index.jsx';
import ExpenseTable from '../components/expense/ExpenseTable.jsx';
import ExpenseForm from '../components/expense/ExpenseForm.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { useFetch } from '../hooks/useFetch';
import { categoriesApi, expensesApi } from '../api/resources';
import { errorMessage } from '../api/client';
import { formatMoney, monthRange, rangeBack } from '../lib';

const PERIODS = [
  { id: 'this', label: 'This month' },
  { id: 'last', label: 'Last month' },
  { id: '3m', label: '3 months' },
  { id: 'all', label: 'All time' },
];

function periodRange(id) {
  if (id === 'this') return monthRange(0);
  if (id === 'last') return monthRange(-1);
  if (id === '3m') return rangeBack(3);
  return { from: undefined, to: undefined };
}

export default function Expenses() {
  const { user } = useAuth();
  const toast = useToast();
  const currency = user?.currency || 'INR';

  const [period, setPeriod] = useState('this');
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const range = useMemo(() => periodRange(period), [period]);
  const params = useMemo(
    () => ({ ...range, categoryId: categoryId || undefined, search: search || undefined, page, limit: 25 }),
    [range.from, range.to, categoryId, search, page]
  );

  const categories = useFetch(useCallback(() => categoriesApi.list(), []), []);
  const list = useFetch(
    useCallback(() => expensesApi.list(params), [params]),
    [params.from, params.to, params.categoryId, params.search, params.page]
  );

  function resetPageThen(fn) {
    return (v) => { setPage(1); fn(v); };
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await expensesApi.remove(deleting.id);
      toast.push('Expense deleted');
      setDeleting(null);
      list.refetch();
    } catch (err) {
      toast.push(errorMessage(err, 'Could not delete'), { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  }

  const cats = categories.data || [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight">Expenses</h1>
        <Button variant="primary" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus size={15} /> Add expense
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-3 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex gap-1 flex-wrap">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => { setPage(1); setPeriod(p.id); }}
              className={`h-8 px-3 rounded text-sm transition-colors ${
                period === p.id ? 'bg-accent-subtle text-accent font-semibold' : 'text-text-muted hover:text-text hover:bg-raised'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <Select
          value={categoryId}
          onChange={(e) => resetPageThen(setCategoryId)(e.target.value)}
          className="lg:w-44"
        >
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>

        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
          <Input
            placeholder="Search notes…"
            value={search}
            onChange={(e) => resetPageThen(setSearch)(e.target.value)}
            className="pl-9"
          />
        </div>

        {list.data && (
          <div className="text-sm whitespace-nowrap lg:text-right">
            <span className="text-text-faint">Filtered total </span>
            <span className="num font-semibold">{formatMoney(list.data.summary.total, currency)}</span>
          </div>
        )}
      </Card>

      <Card className="p-2 sm:p-4">
        {list.error ? (
          <ErrorState message={list.error} onRetry={list.refetch} />
        ) : (
          <ExpenseTable
            expenses={list.data?.expenses || []}
            loading={list.loading}
            currency={currency}
            onAdd={() => { setEditing(null); setFormOpen(true); }}
            onEdit={(e) => { setEditing(e); setFormOpen(true); }}
            onDelete={setDeleting}
          />
        )}

        {list.data && list.data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-line">
            <span className="num text-xs text-text-faint">
              Page {list.data.pagination.page} of {list.data.pagination.totalPages}
              {' · '}{list.data.pagination.total} expenses
            </span>
            <div className="flex gap-2">
              <Button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1}>Previous</Button>
              <Button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= list.data.pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ExpenseForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        categories={cats}
        expense={editing}
        onSaved={(_, wasEdit) => {
          toast.push(wasEdit ? 'Expense updated' : 'Expense saved');
          list.refetch();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        busy={busy}
        title="Delete expense"
        message={
          deleting
            ? `Delete ${formatMoney(deleting.amount, currency)} from ${deleting.category?.name}? This can't be undone.`
            : ''
        }
      />
    </div>
  );
}
