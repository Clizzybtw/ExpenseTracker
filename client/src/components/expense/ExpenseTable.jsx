import { Pencil, Trash2, Receipt } from 'lucide-react';
import { Badge, Skeleton, EmptyState, Button } from '../ui/index.jsx';
import { formatMoney, formatDate } from '../../lib';

export default function ExpenseTable({ expenses, loading, currency, onEdit, onDelete, onAdd }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-px">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  if (!expenses.length) {
    return (
      <EmptyState
        icon={Receipt}
        title="No expenses yet"
        description="Log one and the charts fill in. Your nine categories are ready to use."
        action={onAdd && <Button variant="primary" onClick={onAdd}>Add first expense</Button>}
      />
    );
  }

  return (
    <>
      {/* Desktop table */}
      <table className="w-full hidden sm:table">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-text-faint">
            <th className="text-left font-semibold py-2 px-3">Date</th>
            <th className="text-left font-semibold py-2 px-3">Category</th>
            <th className="text-left font-semibold py-2 px-3">Note</th>
            <th className="text-right font-semibold py-2 px-3">Amount</th>
            <th className="w-20" />
          </tr>
        </thead>
        <tbody>
          {expenses.map((e) => (
            <tr key={e.id} className="border-t border-line hover:bg-raised group">
              <td className="num text-xs text-text-muted py-2.5 px-3 whitespace-nowrap">
                {formatDate(e.date)}
              </td>
              <td className="py-2.5 px-3">
                <Badge color={e.category?.color}>{e.category?.name}</Badge>
              </td>
              <td className="py-2.5 px-3 text-text-secondary truncate max-w-xs">{e.note}</td>
              <td className="num py-2.5 px-3 text-right font-medium whitespace-nowrap">
                {formatMoney(e.amount, currency)}
              </td>
              <td className="py-2.5 px-3">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(e)} aria-label="Edit" className="p-1.5 rounded text-text-muted hover:text-text">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => onDelete(e)} aria-label="Delete" className="p-1.5 rounded text-text-muted hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile cards */}
      <ul className="sm:hidden flex flex-col">
        {expenses.map((e) => (
          <li key={e.id} className="border-t border-line py-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge color={e.category?.color}>{e.category?.name}</Badge>
                <span className="num text-xs text-text-faint">{formatDate(e.date)}</span>
              </div>
              {e.note && <p className="text-sm text-text-secondary mt-1 truncate">{e.note}</p>}
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="num font-medium whitespace-nowrap">{formatMoney(e.amount, currency)}</span>
              <div className="flex gap-1">
                <button onClick={() => onEdit(e)} aria-label="Edit" className="p-1 text-text-muted"><Pencil size={13} /></button>
                <button onClick={() => onDelete(e)} aria-label="Delete" className="p-1 text-text-muted"><Trash2 size={13} /></button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
