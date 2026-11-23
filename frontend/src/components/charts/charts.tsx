"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactNode } from "react";
import { fmtCompact, fmtNum, shortDay } from "@/lib/format";
import { cn } from "@/lib/utils";

const AXIS = { fontSize: 11, fill: "var(--fg-3)", fontFamily: "var(--font-fira-code), ui-monospace, monospace" };

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
  format?: (v: number) => string;
  kind?: "area" | "line" | "bar";
  dashed?: boolean;
}

function ChartTooltip({
  active,
  payload,
  label,
  series,
  labelFormat,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ dataKey?: unknown; value?: unknown }>;
  label?: unknown;
  series: SeriesDef[];
  labelFormat?: (l: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-xl border border-line-strong bg-surface px-3 py-2.5 shadow-float">
      <p className="text-[12px] font-medium text-fg">{labelFormat ? labelFormat(String(label)) : String(label)}</p>
      <ul className="mt-1.5 space-y-1">
        {series.map((s) => {
          const p = payload.find((x) => x.dataKey === s.key);
          if (!p) return null;
          const v = Number(p.value) || 0;
          return (
            <li key={s.key} className="flex items-center gap-2 text-[12px]">
              <span className="size-2 rounded-sm" style={{ background: s.color }} aria-hidden />
              <span className="flex-1 text-fg-2">{s.label}</span>
              <span className="font-mono tabular text-fg">{s.format ? s.format(v) : fmtNum(v)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Legend({ series, className }: { series: SeriesDef[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1", className)} aria-label="Legend">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5 text-[12px] text-fg-2">
          <span
            className={cn("h-0.5 w-3.5 rounded-full", s.dashed && "bg-transparent")}
            style={
              s.dashed
                ? { backgroundImage: `linear-gradient(to right, ${s.color} 60%, transparent 60%)`, backgroundSize: "5px 2px" }
                : { background: s.color }
            }
            aria-hidden
          />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

/** Time series on one y-axis: first series as a soft area, the rest as lines. */
export function TimeSeriesChart<T extends { date: string }>({
  data,
  series,
  height = 300,
  ariaLabel,
}: {
  data: T[];
  series: SeriesDef[];
  height?: number;
  ariaLabel: string;
}) {
  return (
    <div style={{ height }} role="img" aria-label={ariaLabel} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => shortDay(d)}
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
            tickMargin={8}
          />
          <YAxis
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            width={44}
            allowDecimals={false}
            tickFormatter={(v: number) => fmtCompact(v)}
          />
          <Tooltip
            cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }}
            content={(p) => (
              <ChartTooltip active={p.active} payload={p.payload} label={p.label} series={series} labelFormat={shortDay} />
            )}
          />
          {series.map((s, i) =>
            (s.kind ?? (i === 0 ? "area" : "line")) === "area" ? (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                fill={`url(#fill-${s.key})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
                isAnimationActive={false}
              />
            ) : (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dashed ? "5 4" : undefined}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
                isAnimationActive={false}
              />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Small single-series daily chart (bars or a line). */
export function MiniDailyChart<T extends { date: string }>({
  data,
  series,
  height = 200,
  ariaLabel,
}: {
  data: T[];
  series: SeriesDef;
  height?: number;
  ariaLabel: string;
}) {
  const common = (
    <>
      <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
      <XAxis
        dataKey="date"
        tickFormatter={(d: string) => shortDay(d)}
        tick={AXIS}
        tickLine={false}
        axisLine={false}
        minTickGap={32}
        tickMargin={8}
      />
      <YAxis
        tick={AXIS}
        tickLine={false}
        axisLine={false}
        width={52}
        tickFormatter={(v: number) => (series.format ? series.format(v) : fmtCompact(v))}
      />
      <Tooltip
        cursor={series.kind === "bar" ? { fill: "var(--raised)" } : { stroke: "var(--line-strong)" }}
        content={(p) => (
          <ChartTooltip active={p.active} payload={p.payload} label={p.label} series={[series]} labelFormat={shortDay} />
        )}
      />
    </>
  );
  return (
    <div style={{ height }} role="img" aria-label={ariaLabel} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {series.kind === "bar" ? (
          <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            {common}
            <Bar dataKey={series.key} name={series.label} fill={series.color} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            {common}
            <Line
              type="monotone"
              dataKey={series.key}
              name={series.label}
              stroke={series.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
              isAnimationActive={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/** Ranked horizontal bars as plain HTML: readable labels, keyboard-friendly, no chart lib needed. */
export function RankedBars({
  items,
  format = fmtNum,
  accentFirst = true,
}: {
  items: { key: string; label: ReactNode; value: number }[];
  format?: (v: number) => string;
  accentFirst?: boolean;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((it, i) => (
        <li key={it.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5">
          <span className="min-w-0 truncate text-[13px] text-fg-2">{it.label}</span>
          <span className="font-mono text-[12px] tabular text-fg">{format(it.value)}</span>
          <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-raised" aria-hidden>
            <span
              className={cn("block h-full rounded-full", accentFirst && i === 0 ? "bg-accent" : "bg-fg-3/60")}
              style={{ width: `${(it.value / max) * 100}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
