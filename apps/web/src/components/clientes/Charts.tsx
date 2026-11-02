/**
 * Small, dependency-free charts for the client panel. Single series only (one hue: navy/signal), so identity
 * never rests on color; every chart carries an accessible name and a screen-reader table, and every bar shows
 * its value on hover or keyboard focus.
 */

type Tone = "navy" | "signal" | "ember";

const STROKE: Record<Tone, string> = { navy: "var(--color-navy)", signal: "var(--color-signal)", ember: "var(--color-ember)" };

/** Progress ring with the number in the middle. */
export function Ring({ value, size = 112, label, tone = "navy", caption }: { value: number; size?: number; label: string; tone?: Tone; caption?: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <figure className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`${label}: ${v}%`} className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-mist)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={STROKE[tone]}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(v / 100) * c} ${c}`}
          className="ring-draw"
        />
      </svg>
      <figcaption className="absolute inset-0 grid place-content-center text-center">
        <span className="display text-[1.6rem] leading-none">{v}%</span>
        {caption && <span className="mt-1 text-[0.7rem] text-slate">{caption}</span>}
      </figcaption>
    </figure>
  );
}

export type Bar = { key: string; label: string; tick?: string; value: number; display: string; highlight?: boolean };

/** Vertical bars from a zero baseline; recessive axis, direct label only on the highlighted bar. */
export function Bars({ data, title, height = 160, tickEvery = 1 }: { data: Bar[]; title: string; height?: number; tickEvery?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure>
      <figcaption className="sr-only">{title}</figcaption>
      <div className="flex items-end gap-[2px] border-b border-line" style={{ height }} aria-hidden>
        {data.map((d) => {
          const h = d.value > 0 ? Math.max(4, (d.value / max) * (height - 22)) : 0;
          return (
            <div key={d.key} tabIndex={0} className="group relative flex h-full flex-1 flex-col justify-end outline-none">
              <span
                className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-xs text-paper opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                style={{ bottom: h + 6 }}
              >
                {d.label}: {d.display}
              </span>
              {d.highlight && d.value > 0 && (
                <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xs font-semibold text-ink group-hover:opacity-0" style={{ bottom: h + 4 }}>
                  {d.display}
                </span>
              )}
              <span
                className={`bar-grow block w-full rounded-t-[4px] transition-colors ${d.highlight ? "bg-navy" : "bg-signal/70 group-hover:bg-signal"}`}
                style={{ height: h }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-[2px] text-[0.7rem] text-steel" aria-hidden>
        {data.map((d, i) => (
          <span key={d.key} className="flex-1 whitespace-nowrap text-center">
            {i % tickEvery === 0 ? (d.tick ?? d.label) : ""}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.label}</th>
              <td>{d.display}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Tiny trend line for KPI tiles: no axes, the tile's number is the read. */
export function Sparkline({ values, label, width = 120, height = 36 }: { values: number[]; label: string; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(height - 3 - (v / max) * (height - 6)).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={label} className="overflow-visible">
      <polyline points={pts} fill="none" stroke="var(--color-signal)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={width} cy={pts.split(" ").at(-1)!.split(",")[1]} r="3" fill="var(--color-navy)" />
    </svg>
  );
}

/** Proportion meter for money: paid vs pending vs overdue, with labels outside the bar. */
export function SplitMeter({ parts, label }: { parts: { value: number; className: string; name: string }[]; label: string }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  if (!total) return <div className="h-3 rounded-full bg-mist" role="img" aria-label={`${label}: sin datos`} />;
  return (
    <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={`${label}: ${parts.map((p) => `${p.name} ${Math.round((p.value / total) * 100)}%`).join(", ")}`}>
      {parts
        .filter((p) => p.value > 0)
        .map((p) => (
          <span key={p.name} className={`bar-grow h-full ${p.className}`} style={{ width: `${(p.value / total) * 100}%` }} />
        ))}
    </div>
  );
}
