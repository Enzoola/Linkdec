"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LinkRow, Stats as StatsT } from "@/lib/types";

function niceStep(x: number) {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(x, 1))));
  const f = x / p;
  return Math.max(1, (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p);
}
function fmtDay(k: string) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function Chart({ days }: { days: { day: string; clicks: number }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(320);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => setW(Math.max(280, el.clientWidth));
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const vals = days.map((d) => d.clicks);
  const H = 210, m = { l: 36, r: 8, t: 18, b: 28 };
  const step = niceStep(Math.max(...vals, 1) / 4), top = step * 4;
  const iw = w - m.l - m.r, ih = H - m.t - m.b, band = iw / Math.max(vals.length, 1);
  const bw = Math.min(26, band * 0.62);
  const y = (v: number) => m.t + ih - (v / top) * ih;
  const last = vals.length - 1;
  const stride = Math.max(1, Math.ceil(64 / band));
  const labels: number[] = [];
  for (let j = last; j >= 0; j -= stride) labels.push(j);

  return (
    <div className="chart" ref={ref}>
      <svg viewBox={`0 0 ${w} ${H}`} role="img" aria-label={`Clicks per day, last ${vals.length} days`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line className="gl" x1={m.l} x2={w - m.r} y1={y(step * i)} y2={y(step * i)} />
            <text className="ax" x={m.l - 8} y={y(step * i) + 4} textAnchor="end">{step * i}</text>
          </g>
        ))}
        {vals.map((v, i) => {
          const cx = m.l + band * (i + 0.5), x = cx - bw / 2, bh = ih * (v / top), r = Math.min(4, bh), yy = y(v);
          return (
            <g key={days[i].day}>
              {v > 0 && (
                <path className="mk" fillOpacity={i === last ? 1 : 0.62}
                  d={`M${x},${yy + bh} L${x},${yy + r} Q${x},${yy} ${x + r},${yy} L${x + bw - r},${yy} Q${x + bw},${yy} ${x + bw},${yy + r} L${x + bw},${yy + bh} Z`} />
              )}
              <rect className="hit" x={m.l + band * i} y={m.t} width={band} height={ih}
                onPointerEnter={() => setTip({ x: cx, y: Math.max(14, y(v) - 4), text: `${fmtDay(days[i].day)} · ${v} click${v === 1 ? "" : "s"}` })}
                onPointerLeave={() => setTip(null)} />
            </g>
          );
        })}
        {vals[last] > 0 && <text className="lastv" x={m.l + band * (last + 0.5)} y={y(vals[last]) - 6} textAnchor="middle">{vals[last]}</text>}
        {labels.map((j) => (
          <text key={j} className="ax" x={m.l + band * (j + 0.5)} y={H - 8} textAnchor="middle">{fmtDay(days[j].day)}</text>
        ))}
        <line className="axl" x1={m.l} x2={w - m.r} y1={y(0)} y2={y(0)} />
      </svg>
      {tip && <div className="tip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>}
    </div>
  );
}

export function Stats({ links, publicUrl }: { links: LinkRow[]; publicUrl: string }) {
  const [range, setRange] = useState(14);
  const [data, setData] = useState<StatsT | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let live = true;
    setError(false);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    createClient()
      .rpc("dashboard_stats", { p_days: range, p_tz: tz })
      .then(({ data, error }) => {
        if (!live) return;
        if (error) setError(true);
        else setData(data as StatsT);
      });
    return () => { live = false; };
  }, [range]);

  const views = data?.daily.reduce((a, d) => a + d.views, 0) ?? 0;
  const clicks = data?.daily.reduce((a, d) => a + d.clicks, 0) ?? 0;
  const per = new Map((data?.per_link ?? []).map((p) => [p.link_id, p.clicks]));
  const rows = links.filter((l) => l.kind !== "header").map((l) => ({ l, c: per.get(l.id) ?? 0 }))
    .sort((a, b) => b.c - a.c);
  const max = Math.max(1, ...rows.map((r) => r.c));

  return (
    <div className="pane">
      <div className="pane-head">
        <h2>Performance</h2>
        <div className="seg" role="group" aria-label="Date range">
          {[7, 14, 30].map((n) => (
            <button key={n} type="button" aria-pressed={n === range} onClick={() => setRange(n)}>{n} days</button>
          ))}
        </div>
      </div>
      {error && <p className="note" role="alert">Could not load analytics. Reload the page to try again.</p>}
      {!error && !data && <p className="small">Loading…</p>}
      {data && (
        <>
          {views + clicks === 0 && (
            <p className="note">No visits yet. Share {publicUrl} and the numbers will appear here.</p>
          )}
          <div className="tiles">
            <div className="tile"><div className="v">{views}</div><div className="l">Page views</div></div>
            <div className="tile"><div className="v">{clicks}</div><div className="l">Link clicks</div></div>
            <div className="tile"><div className="v">{views ? Math.round((clicks / views) * 100) + "%" : "–"}</div><div className="l">Clicks per view</div></div>
          </div>
          <div><div className="lab">Clicks per day</div><Chart days={data.daily} /></div>
          <div className="tablewrap">
            <table>
              <thead><tr><th>Link</th><th /><th className="n">Clicks</th><th className="n">Share</th></tr></thead>
              <tbody>
                {rows.map(({ l, c }) => (
                  <tr key={l.id}>
                    <td>{l.title || "Untitled"}</td>
                    <td><div className="share"><i style={{ width: `${Math.round((c / max) * 100)}%` }} /></div></td>
                    <td className="n">{c}</td>
                    <td className="n">{clicks ? Math.round((c / clicks) * 100) + "%" : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.referrers.length > 0 && (
            <div className="tablewrap">
              <table>
                <thead><tr><th>Where visitors came from</th><th className="n">Views</th></tr></thead>
                <tbody>{data.referrers.map((r) => <tr key={r.referrer}><td>{r.referrer}</td><td className="n">{r.views}</td></tr>)}</tbody>
              </table>
            </div>
          )}
          <details>
            <summary>Show daily numbers as a table</summary>
            <div className="tablewrap">
              <table>
                <thead><tr><th>Day</th><th className="n">Views</th><th className="n">Clicks</th></tr></thead>
                <tbody>
                  {[...data.daily].reverse().map((d) => (
                    <tr key={d.day}><td>{fmtDay(d.day)}</td><td className="n">{d.views}</td><td className="n">{d.clicks}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <p className="small">Counts visits from real browsers. Search-engine and link-preview bots are ignored. Refreshing the page counts again.</p>
        </>
      )}
    </div>
  );
}
