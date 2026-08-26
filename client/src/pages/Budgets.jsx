import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Wallet, Pencil, Trash2 } from 'lucide-react';
import { Button, Card, Skeleton, EmptyState, ErrorState, ProgressBar, ConfirmDialog, statusClass } from '../components/ui/index.jsx';
import BudgetForm from '../components/budget/BudgetForm.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { useFetch } from '../hooks/useFetch';
import { budgetsApi, categoriesApi } from '../api/resources';
import { errorMessage } from '../api/client';
import { formatMoney, formatDate } from '../lib';

export default function Budgets() {
  const { user } = useAuth();
  const toast = useToast();
  const currency = user?.currency || 'INR';

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const budgets = useFetch(useCallback(() => budgetsApi.list(), []), []);
  const categories = useFetch(useCallback(() => categoriesApi.list(), []), []);

  async function openEdit(b) {
    try {
      setEditing(await budgetsApi.get(b.id));
      setFormOpen(true);
    } catch (err) {
      toast.push(errorMessage(err), { tone: 'danger' });
    }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await budgetsApi.remove(deleting.id);
      toast.push('Budget deleted');
      setDeleting(null);
      budgets.refetch();
    } catch (err) {
      toast.push(errorMessage(err, 'Could not delete'), { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight">Budgets</h1>
        <Button variant="primary" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus size={15} /> New budget
        </Button>
      </div>

      {budgets.loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : budgets.error ? (
        <Card><ErrorState message={budgets.error} onRetry={budgets.refetch} /></Card>
      ) : !budgets.data.length ? (
        <Card>
          <EmptyState
            icon={Wallet}
            title="No budgets yet"
            description="Set limits per category to track spending against a target."
            action={<Button variant="primary" onClick={() => setFormOpen(true)}>Create a budget</Button>}
          />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {budgets.data.map((b) => (
            <Card key={b.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/budgets/${b.id}`} className="font-semibold hover:text-accent transition-colors">
                    {b.name}
                  </Link>
                  <p className="num text-xs text-text-faint mt-0.5">
                    {formatDate(b.startDate)} — {formatDate(b.endDate, 'long')}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(b)} aria-label="Edit" className="p-1.5 rounded text-text-muted hover:text-text">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDeleting(b)} aria-label="Delete" className="p-1.5 rounded text-text-muted hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p className={`num text-xl font-semibold ${statusClass(b.status)}`}>
                    {formatMoney(b.totalSpent, currency, { compact: true })}
                  </p>
                  <p className="text-xs text-text-faint">
                    of {b.totalLimit != null
                      ? formatMoney(b.totalLimit, currency, { compact: true })
                      : `${formatMoney(b.totalAllocated, currency, { compact: true })} allocated`}
                  </p>
                </div>
                <span className={`num text-sm ${statusClass(b.status)}`}>{b.percentage}%</span>
              </div>

              <ProgressBar percentage={b.percentage} status={b.status} />

              <div className="flex flex-wrap gap-1.5">
                {b.allocations.slice(0, 5).map((a) => (
                  <span key={a.id} className="flex items-center gap-1.5 text-xs text-text-muted">
                    <span className="w-2 h-2 rounded-full" style={{ background: a.color }} />
                    {a.categoryName}
                  </span>
                ))}
                {b.allocations.length > 5 && (
                  <span className="text-xs text-text-faint">+{b.allocations.length - 5} more</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <BudgetForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        categories={categories.data || []}
        budget={editing}
        currency={currency}
        onSaved={(_, wasEdit) => {
          toast.push(wasEdit ? 'Budget updated' : 'Budget created');
          budgets.refetch();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        busy={busy}
        title="Delete budget"
        message={
          deleting
            ? `Delete "${deleting.name}"? Your expenses are not affected — budgets are just a lens over them.`
            : ''
        }
      />
    </div>
  );
}
