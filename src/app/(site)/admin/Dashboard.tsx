"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logout, setExperiment } from "./actions";
import { pct, twoPropP, wilson } from "@/lib/stats";

export interface Stats {
  generated_at: string;
  sessions: number;
  test_sessions: number;
  funnel: Record<"visit" | "demo_opened" | "interest_clicked" | "form_submitted" | "wtp_answered" | "commute_answered", number>;
  responses: { experiment: "wtp" | "commute"; variant: string; n: number; yes: number }[];
  assigned: { wtp_5: number; wtp_10: number; commute_25: number; commute_60: number };
  neighborhoods: { neighborhood: string; n: number }[];
  daily: { day: string; visitors: number; signups: number }[];
  signups: {
    name: string;
    email: string;
    created_at: string;
    neighborhood: string | null;
    wtp_price_usd: number;
    wtp_answer: boolean | null;
    commute_minutes: number;
    commute_answer: boolean | null;
  }[];
}

interface Props {
  stats: Stats;
  settings: { wtp_enabled: boolean; commute_enabled: boolean };
  includeTest: boolean;
}

const REFRESH_MS = 15000;

function maskEmail(e: string) {
  const [u, d] = e.split("@");
  if (!d) return "•••";
  return `${u.slice(0, 1)}${"•".repeat(Math.max(2, Math.min(6, u.length - 1)))}@${d}`;
}

function ago(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function Dashboard({ stats, settings, includeTest }: Props) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [showEmails, setShowEmails] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const refresh = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [router]);

  const f = stats.funnel;
  const visits = f.visit;
  const signups = f.form_submitted;
  const wtp = stats.responses.filter((r) => r.experiment === "wtp");
  const commute = stats.responses.filter((r) => r.experiment === "commute");
  const wtpYes = wtp.reduce((a, r) => a + r.yes, 0);
  const wtpN = wtp.reduce((a, r) => a + r.n, 0);

  const funnel: { key: keyof Stats["funnel"]; label: string }[] = [
    { key: "visit", label: "Visited" },
    { key: "demo_opened", label: "Opened demo" },
    { key: "interest_clicked", label: "Clicked “I’m interested”" },
    { key: "form_submitted", label: "Submitted name + email" },
    ...(settings.wtp_enabled || f.wtp_answered > 0 ? [{ key: "wtp_answered" as const, label: "Answered price question" }] : []),
    ...(settings.commute_enabled || f.commute_answered > 0 ? [{ key: "commute_answered" as const, label: "Answered commute question" }] : []),
  ];

  const toggle = (key: "wtp_enabled" | "commute_enabled", value: boolean, label: string) => {
    if (!confirm(`${value ? "Turn ON" : "Turn OFF"} ${label}? This takes effect for visitors immediately.`)) return;
    start(async () => {
      await setExperiment(key, value);
      router.refresh();
    });
  };

  return (
    <div className="adm">
      <header className="adm-head">
        <div>
          <p className="eyebrow">Radius · Validation experiment</p>
          <h1>Live results</h1>
        </div>
        <div className="adm-head-meta">
          <span className="live">
            <span className="live-dot" aria-hidden /> Live · updated {ago(stats.generated_at, now)}
          </span>
          <a className="adm-link" href={includeTest ? "/admin" : "/admin?test=1"}>
            {includeTest ? "Hide test traffic" : `Include test traffic (${stats.test_sessions})`}
          </a>
          <form action={logout}>
            <button className="adm-link" type="submit">Log out</button>
          </form>
        </div>
      </header>
      {includeTest && <div className="adm-banner">Showing test traffic too. Numbers below include sessions opened with <code>?test=1</code>.</div>}

      <section className="kpis">
        <Kpi label="Visitors" value={visits.toLocaleString()} sub="unique browsers" />
        <Kpi label="Signups" value={signups.toLocaleString()} sub="name + email" />
        <Kpi label="Interest rate" value={pct(signups, visits)} sub="visitors → signup" accent />
        <Kpi label="Would pay" value={pct(wtpYes, wtpN)} sub={`${wtpYes} yes · ${wtpN - wtpYes} no (${wtpN} answers)`} />
      </section>

      <div className="adm-grid">
        <section className="card card-wide">
          <CardHead title="Funnel" note="Unique visitors reaching each step" />
          <ol className="funnel">
            {funnel.map((step, i) => {
              const n = f[step.key];
              const prev = i > 0 ? f[funnel[i - 1].key] : null;
              return (
                <li key={step.key}>
                  <div className="funnel-label">
                    <span>{step.label}</span>
                    {prev !== null && <span className="funnel-step">{pct(n, prev)} of previous</span>}
                  </div>
                  <div className="funnel-row">
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: visits ? `${Math.max(0.5, (n / visits) * 100)}%` : 0 }} />
                    </div>
                    <span className="funnel-n">
                      <strong>{n.toLocaleString()}</strong>
                      <span>{pct(n, visits)}</span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <ExperimentCard
          title="Willingness to pay"
          question="“Would you pay $X/month for Radius?”"
          variants={[
            { key: "5", label: "$5 / month", assigned: stats.assigned.wtp_5 },
            { key: "10", label: "$10 / month", assigned: stats.assigned.wtp_10 },
          ]}
          rows={wtp}
          enabled={settings.wtp_enabled}
          onToggle={(v) => toggle("wtp_enabled", v, "the price question (Experiment 2)")}
          busy={pending}
        />

        <ExperimentCard
          title="Commute tolerance"
          question="“Would you commute up to N minutes to join an activity like this?”"
          variants={[
            { key: "25", label: "25 minutes", assigned: stats.assigned.commute_25 },
            { key: "60", label: "60 minutes", assigned: stats.assigned.commute_60 },
          ]}
          rows={commute}
          enabled={settings.commute_enabled}
          onToggle={(v) => toggle("commute_enabled", v, "the commute question (Experiment 3)")}
          busy={pending}
        />

        <DailyChart daily={stats.daily} />

        <section className="card">
          <CardHead title="Where visitors live" note="Neighborhood (coarse, self-reported or from location)" />
          {stats.neighborhoods.length === 0 ? (
            <p className="empty">No neighborhoods yet.</p>
          ) : (
            <ul className="hoods">
              {stats.neighborhoods.map((h) => (
                <li key={h.neighborhood}>
                  <span>{h.neighborhood}</span>
                  <div className="bar-track sm">
                    <div className="bar-fill" style={{ width: `${(h.n / stats.neighborhoods[0].n) * 100}%` }} />
                  </div>
                  <strong>{h.n}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card card-wide">
          <CardHead
            title={`Signups (${stats.signups.length})`}
            note="Newest first"
            right={
              <div className="card-actions">
                <button className="adm-link" onClick={() => setShowEmails((v) => !v)}>
                  {showEmails ? "Hide emails" : "Show emails"}
                </button>
                <a className="adm-link" href={`/api/admin/export?kind=signups${includeTest ? "&test=1" : ""}`}>
                  Export CSV
                </a>
                <a className="adm-link" href={`/api/admin/export?kind=responses${includeTest ? "&test=1" : ""}`}>
                  Export responses
                </a>
              </div>
            }
          />
          {stats.signups.length === 0 ? (
            <p className="empty">No signups yet. Share the link!</p>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Neighborhood</th>
                    <th>Price shown</th>
                    <th>Would pay?</th>
                    {(settings.commute_enabled || commute.length > 0) && <th>Commute</th>}
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAll ? stats.signups : stats.signups.slice(0, 12)).map((s, i) => (
                    <tr key={i}>
                      <td>{s.name}</td>
                      <td className="mono">{showEmails ? s.email : maskEmail(s.email)}</td>
                      <td>{s.neighborhood ?? "—"}</td>
                      <td>${s.wtp_price_usd}</td>
                      <td><Answer v={s.wtp_answer} /></td>
                      {(settings.commute_enabled || commute.length > 0) && (
                        <td>
                          {s.commute_answer === null ? "—" : <>{s.commute_minutes} min · <Answer v={s.commute_answer} /></>}
                        </td>
                      )}
                      <td className="muted">{ago(s.created_at, now)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {stats.signups.length > 12 && (
                <button className="adm-link show-all" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? "Show fewer" : `Show all ${stats.signups.length}`}
                </button>
              )}
            </div>
          )}
        </section>
      </div>
      <footer className="adm-foot">
        Variants are assigned server-side at first visit (50/50) and stick to the browser. Rates use unique visitors; test sessions are excluded unless shown.
      </footer>
    </div>
  );
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={`kpi ${accent ? "kpi-accent" : ""}`}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      <span className="kpi-sub">{sub}</span>
    </div>
  );
}

function CardHead({ title, note, right }: { title: string; note?: string; right?: React.ReactNode }) {
  return (
    <div className="card-head">
      <div>
        <h2>{title}</h2>
        {note && <p>{note}</p>}
      </div>
      {right}
    </div>
  );
}

function Answer({ v }: { v: boolean | null }) {
  if (v === null) return <span className="muted">—</span>;
  return <span className={v ? "ans yes" : "ans no"}>{v ? "Yes" : "No"}</span>;
}

function ExperimentCard({
  title,
  question,
  variants,
  rows,
  enabled,
  onToggle,
  busy,
}: {
  title: string;
  question: string;
  variants: { key: string; label: string; assigned: number }[];
  rows: { variant: string; n: number; yes: number }[];
  enabled: boolean;
  onToggle: (v: boolean) => void;
  busy: boolean;
}) {
  const data = variants.map((v) => {
    const r = rows.find((x) => x.variant === v.key) ?? { n: 0, yes: 0 };
    const [lo, hi] = wilson(r.yes, r.n);
    return { ...v, n: r.n, yes: r.yes, rate: r.n ? r.yes / r.n : 0, lo, hi };
  });
  const [a, b] = data;
  const p = twoPropP(a.yes, a.n, b.yes, b.n);
  const diff = a.n && b.n ? (b.rate - a.rate) * 100 : null;
  let verdict = "Waiting for answers in both groups.";
  if (p !== null && diff !== null) {
    const dir = diff === 0 ? "No difference" : `${b.label.split(" ")[0]} is ${Math.abs(diff).toFixed(0)} pts ${diff > 0 ? "higher" : "lower"} than ${a.label.split(" ")[0]}`;
    verdict = `${dir} · ${p < 0.05 ? `significant (p = ${p.toFixed(3)})` : `not significant yet (p = ${p.toFixed(2)})`}`;
  }

  return (
    <section className="card">
      <CardHead
        title={title}
        note={question}
        right={
          <button
            className={`switch ${enabled ? "on" : ""}`}
            role="switch"
            aria-checked={enabled}
            disabled={busy}
            onClick={() => onToggle(!enabled)}
            title={enabled ? "Live: visitors see this question" : "Off: visitors don't see this question"}
          >
            <span className="switch-knob" />
            <span className="switch-label">{enabled ? "Live" : "Off"}</span>
          </button>
        }
      />
      <div className="exp-rows">
        {data.map((d) => (
          <div className="exp-row" key={d.key}>
            <div className="exp-row-head">
              <span className="exp-variant">{d.label}</span>
              <span className="exp-rate">
                <strong>{d.n ? `${Math.round(d.rate * 100)}%` : "—"}</strong> yes
              </span>
            </div>
            <div className="bar-track lg" title={d.n ? `95% CI ${Math.round(d.lo * 100)}–${Math.round(d.hi * 100)}%` : ""}>
              <div className="bar-fill" style={{ width: `${d.rate * 100}%` }} />
              {d.n > 0 && <div className="ci" style={{ left: `${d.lo * 100}%`, width: `${(d.hi - d.lo) * 100}%` }} />}
            </div>
            <div className="yn">
              <span className="yn-yes">
                <i /> Yes <b>{d.yes}</b> {d.n ? `(${Math.round((d.yes / d.n) * 100)}%)` : ""}
              </span>
              <span className="yn-no">
                <i /> No <b>{d.n - d.yes}</b> {d.n ? `(${Math.round(((d.n - d.yes) / d.n) * 100)}%)` : ""}
              </span>
              <span className="yn-n">n = {d.n} · {d.assigned} assigned</span>
            </div>
          </div>
        ))}
      </div>
      <p className="verdict">{verdict}</p>
      <p className="legend-note">Orange = yes, beige = no · thin band = 95% confidence interval for the yes-rate</p>
    </section>
  );
}

function DailyChart({ daily }: { daily: Stats["daily"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...daily.map((d) => Math.max(d.visitors, d.signups)));
  const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const h = hover !== null ? daily[hover] : null;
  return (
    <section className="card">
      <CardHead
        title="Last 14 days"
        note={h ? `${fmt(h.day)}: ${h.visitors} visitors · ${h.signups} signups` : "Hover a day for details"}
        right={
          <div className="legend">
            <span><i className="sw sw-blue" /> Visitors</span>
            <span><i className="sw sw-accent" /> Signups</span>
          </div>
        }
      />
      <div className="daily" onMouseLeave={() => setHover(null)}>
        {daily.map((d, i) => (
          <div
            key={d.day}
            className={`daily-col ${hover === i ? "hot" : ""}`}
            onMouseEnter={() => setHover(i)}
            onClick={() => setHover(i)}
            aria-label={`${fmt(d.day)}: ${d.visitors} visitors, ${d.signups} signups`}
          >
            <div className="daily-bars">
              <div className="db db-blue" style={{ height: `${(d.visitors / max) * 100}%` }} />
              <div className="db db-accent" style={{ height: `${(d.signups / max) * 100}%` }} />
            </div>
            <span className="daily-x">{(daily.length - 1 - i) % 3 === 0 ? fmt(d.day).replace(" ", " ") : ""}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
