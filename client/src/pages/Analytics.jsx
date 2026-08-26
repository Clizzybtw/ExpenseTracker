import { useCallback, useMemo, useState } from 'react';
import { PieChart as PieIcon } from 'lucide-react';
import { Card, Skeleton, EmptyState, ErrorState } from '../components/ui/index.jsx';
import { CategoryDonut, TrendLine, CompareBars } from '../components/charts/index.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useFetch } from '../hooks/useFetch';
import { analyticsApi } from '../api/resources';
import { formatMoney, monthRange, rangeBack } from '../lib';

const PERIODS = [
  { id: 'this', label: 'This month', groupBy: 'day' },
  { id: 'last', label: 'Last month', groupBy: 'day' },
  { id: '3m', label: '3 months', groupBy: 'month' },
  { id: '6m', label: '6 months', groupBy: 'month' },
];

function rangeFor(id) {
  if (id === 'this') return monthRange(0);
  if (id === 'last') return monthRange(-1);
  if (id === '3m') return rangeBack(3);
  return rangeBack(6);
}

export default function Analytics() {
  const { user } = useAuth();
  const currency = user?.currency || 'INR';
  const [period, setPeriod] = useState('this');

  const cfg = PERIODS.find((p) => p.id === period);
  const range = useMemo(() => rangeFor(period), [period]);

  const summary = useFetch(useCallback(() => analyticsApi.summary(range), [range.from, range.to]), [range.from, range.to]);
  const byCat = useFetch(useCallback(() => analyticsApi.byCategory(range), [range.from, range.to]), [range.from, range.to]);
  const trend = useFetch(
    useCallback(() => analyticsApi.trend({ ...range, groupBy: cfg.groupBy }), [range.from, range.to, cfg.groupBy]),
    [range.from, range.to, cfg.groupBy]
  );
  const compare = useFetch(useCallback(() => analyticsApi.compare(6), []), []);

  const empty = !byCat.loading && !byCat.data?.length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-lg font-bold tracking-tight">Analytics</h1>
        <div className="flex gap-1 flex-wrap">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`h-8 px-3 rounded text-sm transition-colors ${
                period === p.id ? 'bg-accent-subtle text-accent font-semibold' : 'text-text-muted hover:text-text hover:bg-raised'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {empty ? (
        <Card>
          <EmptyState
            icon={PieIcon}
            title="Nothing to analyse yet"
            description="Log a few expenses and your spending patterns show up here."
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {summary.loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[76px]" />)
            ) : summary.error ? (
              <Card className="col-span-full"><ErrorState message={summary.error} onRetry={summary.refetch} /></Card>
            ) : (
              <>
                <Card className="p-4">
                  <p className="text-xs uppercase tracking-wide text-text-faint font-semibold">Total</p>
                  <p className="num text-lg font-semibold">{formatMoney(summary.data.totalSpent, currency, { compact: true })}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs uppercase tracking-wide text-text-faint font-semibold">Expenses</p>
                  <p className="num text-lg font-semibold">{summary.data.expenseCount}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs uppercase tracking-wide text-text-faint font-semibold">Avg / day</p>
                  <p className="num text-lg font-semibold">{formatMoney(summary.data.avgPerDay, currency, { compact: true })}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs uppercase tracking-wide text-text-faint font-semibold">vs previous</p>
                  <p className={`num text-lg font-semibold ${
                    summary.data.changePercent == null ? '' : summary.data.changePercent > 0 ? 'text-danger' : 'text-ok'
                  }`}>
                    {summary.data.changePercent == null
                      ? 'No prior data'
                      : `${summary.data.changePercent > 0 ? '+' : ''}${summary.data.changePercent}%`}
                  </p>
                </Card>
              </>
            )}
          </div>

          <Card className="p-5">
            <h2 className="font-semibold mb-4">Spending over time</h2>
            {trend.loading ? (
              <Skeleton className="h-[240px]" />
            ) : trend.error ? (
              <ErrorState message={trend.error} onRetry={trend.refetch} />
            ) : (
              <TrendLine points={trend.data.points} currency={currency} groupBy={trend.data.groupBy} />
            )}
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h2 className="font-semibold mb-4">By category</h2>
              {byCat.loading ? <Skeleton className="h-[220px]" /> : <CategoryDonut data={byCat.data} currency={currency} />}
            </Card>

            <Card className="p-5">
              <h2 className="font-semibold mb-4">Last six months</h2>
              {compare.loading ? (
                <Skeleton className="h-[200px]" />
              ) : compare.error ? (
                <ErrorState message={compare.error} onRetry={compare.refetch} />
              ) : (
                <CompareBars months={compare.data} currency={currency} />
              )}
            </Card>
          </div>

          <Card className="p-5">
            <h2 className="font-semibold mb-3">Top categories</h2>
            {byCat.loading ? (
              <Skeleton className="h-32" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-text-faint">
                    <th className="text-left font-semibold py-2">Category</th>
                    <th className="text-right font-semibold py-2">Expenses</th>
                    <th className="text-right font-semibold py-2">Share</th>
                    <th className="text-right font-semibold py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {byCat.data.slice(0, 5).map((c) => (
                    <tr key={c.categoryId} className="border-t border-line">
                      <td className="py-2.5">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                          {c.name}
                        </span>
                      </td>
                      <td className="num text-right text-text-muted">{c.count}</td>
                      <td className="num text-right text-text-muted">{c.percentage}%</td>
                      <td className="num text-right font-medium">{formatMoney(c.total, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
