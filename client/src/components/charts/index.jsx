import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar,
} from 'recharts';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { formatMoney, formatDate } from '../../lib';

/*
  WHY ResponsiveContainer needs a fixed pixel height on the parent: given a
  percentage height inside a flex container it resolves to 0 and the chart
  silently renders nothing.
*/

function TooltipBox({ active, payload, currency, labelFormatter }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-raised border border-line-strong rounded px-3 py-2 text-xs shadow-modal">
      <p className="text-text-muted mb-0.5">
        {labelFormatter ? labelFormatter(p.payload) : p.payload.name}
      </p>
      <p className="num text-text font-semibold">
        {formatMoney(p.value, currency)}
      </p>
    </div>
  );
}

export function CategoryDonut({ data, currency, height = 220 }) {
  if (!data?.length) return null;

  const total = data.reduce((s, d) => s + d.total, 0);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div style={{ width: 180, height }} className="shrink-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="name"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {/* Colour comes from each category's stored value, never an array index. */}
              {data.map((d) => (
                <Cell key={d.categoryId} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={<TooltipBox currency={currency} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="num text-lg font-semibold">{formatMoney(total, currency, { compact: true })}</span>
          <span className="text-xs text-text-faint">total</span>
        </div>
      </div>

      <ul className="flex-1 w-full flex flex-col gap-1.5">
        {data.slice(0, 6).map((d) => (
          <li key={d.categoryId} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
            <span className="flex-1 truncate text-text-secondary">{d.name}</span>
            <span className="num text-xs text-text-muted">{d.percentage}%</span>
            <span className="num text-xs w-20 text-right">{formatMoney(d.total, currency, { compact: true })}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrendLine({ points, currency, groupBy = 'day', height = 240 }) {
  const t = useThemeTokens();
  if (!points?.length) return null;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={t.line} vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fill: t.textFaint, fontSize: 10, fontFamily: 'IBM Plex Mono' }}
            tickLine={false}
            axisLine={{ stroke: t.line }}
            minTickGap={24}
            tickFormatter={(v) => formatDate(v, groupBy === 'month' ? 'month' : 'short')}
          />
          <YAxis
            tick={{ fill: t.textFaint, fontSize: 10, fontFamily: 'IBM Plex Mono' }}
            tickLine={false}
            axisLine={false}
            width={54}
            tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
          />
          <Tooltip
            content={
              <TooltipBox currency={currency} labelFormatter={(p) => formatDate(p.period, 'long')} />
            }
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke={t.accent}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: t.accent }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CompareBars({ months, currency, height = 200 }) {
  const t = useThemeTokens();
  if (!months?.length) return null;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={months} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={t.line} vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fill: t.textFaint, fontSize: 10, fontFamily: 'IBM Plex Mono' }}
            tickLine={false}
            axisLine={{ stroke: t.line }}
            tickFormatter={(v) => formatDate(v)}
          />
          <YAxis
            tick={{ fill: t.textFaint, fontSize: 10, fontFamily: 'IBM Plex Mono' }}
            tickLine={false}
            axisLine={false}
            width={54}
            tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
          />
          <Tooltip
            cursor={{ fill: t.raised }}
            content={
              <TooltipBox currency={currency} labelFormatter={(p) => formatDate(p.period)} />
            }
          />
          <Bar dataKey="total" fill={t.accent} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
