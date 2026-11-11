"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FlowState, Step } from "@/lib/types";
import { nextStep } from "@/lib/types";
import NearbyPanel from "./NearbyPanel";
import FlowSheet from "./FlowSheet";

interface Props {
  demoEmbedUrl: string;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Something went wrong — please try again.");
  return data as T;
}

export default function Experience({ demoEmbedUrl }: Props) {
  const [state, setState] = useState<FlowState | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [sheet, setSheet] = useState<Step | null>(null);
  const [hood, setHood] = useState<string | null>(null);
  const [nudge, setNudge] = useState<string | null>(null);
  const [pickHl, setPickHl] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const ownDemo = demoEmbedUrl.startsWith("/");
  // The iframe src is fixed at first render; later neighborhood changes are sent via postMessage
  // so the prototype doesn't reload and lose its place.
  const [frameSrc, setFrameSrc] = useState<string | null>(null);
  const ready = useRef<Promise<void> | null>(null);
  const demoRef = useRef<HTMLElement>(null);

  // 1) Create/load the anonymous session and log the visit (once per page load).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    ready.current = post<FlowState>("/api/session", {
      referrer: document.referrer || null,
      utm_source: params.get("utm_source") || params.get("ref"),
      test: params.get("test") === "1",
      path: window.location.pathname,
    })
      .then((s) => {
        setState(s);
        if (s.neighborhood) setHood((h) => h ?? s.neighborhood);
        // Refreshed mid-flow? Pick up where they left off.
        if (s.signedUp && nextStep(s) !== "done") {
          setDemoOpen(true);
          setSheet(nextStep(s));
        }
      })
      .catch(() => {});
  }, []);

  // Mount the prototype the first time the demo section opens (also when resuming after a refresh).
  useEffect(() => {
    if (!demoOpen || frameSrc) return;
    const q = new URLSearchParams({ embed: "1" });
    if (hood) q.set("hood", hood);
    setFrameSrc(ownDemo ? `${demoEmbedUrl}?${q}` : demoEmbedUrl);
  }, [demoOpen, frameSrc, hood, ownDemo, demoEmbedUrl]);

  // Send the neighborhood into the prototype whenever it changes.
  useEffect(() => {
    if (!ownDemo || !hood) return;
    frameRef.current?.contentWindow?.postMessage({ source: "radius-site", type: "hood", hood }, window.location.origin);
  }, [hood, ownDemo]);

  // Listen to the prototype: "joined" nudges the interest bar; "pick-location" jumps to the picker.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.source !== "radius-demo") return;
      if (e.data.type === "ready" && hood) {
        frameRef.current?.contentWindow?.postMessage({ source: "radius-site", type: "hood", hood }, window.location.origin);
      } else if (e.data.type === "joined") {
        setNudge(typeof e.data.title === "string" ? e.data.title : "this group");
      } else if (e.data.type === "pick-location") {
        selectRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        selectRef.current?.focus();
        setPickHl(true);
        setTimeout(() => setPickHl(false), 1600);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [hood]);

  const track = useCallback(async (event: "demo_opened" | "interest_clicked") => {
    await ready.current; // make sure the session cookie exists first
    post("/api/track", { event }).catch(() => {});
  }, []);

  const openDemo = () => {
    if (!demoOpen) {
      setDemoOpen(true);
      track("demo_opened");
    }
    requestAnimationFrame(() => demoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const clickInterest = () => {
    track("interest_clicked");
    setSheet(state ? nextStep(state) : "form");
  };

  const done = state ? state.signedUp && nextStep(state) === "done" : false;

  return (
    <div className="page">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="Radius home">
          <span className="wordmark-dot" aria-hidden />
          Radius
        </a>
        <span className="pill pill-preview" title="This is a clickable prototype, not the live app">
          Prototype preview
        </span>
      </header>

      <main>
        <section className="hero">
          <div className="hero-art" aria-hidden>
            <div className="ring r1" />
            <div className="ring r2" />
            <div className="ring r3" />
            <div className="you">You</div>
            <div className="chip c1"><b>Run club</b><span>Sun · 0.3 mi</span></div>
            <div className="chip c2"><b>Pottery night</b><span>Wed · 0.6 mi</span></div>
            <div className="chip c3"><b>Board games</b><span>Thu · 0.9 mi</span></div>
          </div>
          <p className="eyebrow">New to New York?</p>
          <h1>
            Be a <em>regular</em> from day one.
          </h1>
          <p className="lede">
            Radius matches you into small, recurring neighborhood groups that are already running — a Sunday run
            club, a pottery night, a weekly board-game table — so you show up to the same faces every week, not a
            room of strangers.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={openDemo}>
              Try the interactive demo
              <span aria-hidden>→</span>
            </button>
            <span className="hero-note">Takes 1 minute · no app to install</span>
          </div>

          <ul className="proof">
            <li>
              <strong>~50 hours</strong>
              <span>of time together turns an acquaintance into a casual friend</span>
            </li>
            <li>
              <strong>4–12 people</strong>
              <span>per group, small enough that everyone learns your name</span>
            </li>
            <li>
              <strong>Same time, every week</strong>
              <span>so seeing people again happens without planning it</span>
            </li>
          </ul>
        </section>

        {demoOpen && (
          <section className="demo" ref={demoRef} id="demo" aria-label="Interactive prototype">
            <div className="demo-head">
              <h2>Take Radius for a spin</h2>
              <p>This is our clickable prototype, filled with groups that could be running near you.</p>
            </div>
            <div className="demo-grid">
              <div className="phone-col">
                <div className="phone">
                  <div className="phone-notch" aria-hidden />
                  {frameSrc && (
                    <iframe ref={frameRef} src={frameSrc} title="Radius interactive prototype" allow="clipboard-write; fullscreen" allowFullScreen />
                  )}
                </div>
                <a
                  className="open-full"
                  href={ownDemo ? `${demoEmbedUrl}${hood ? `?hood=${encodeURIComponent(hood)}` : ""}` : demoEmbedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open prototype full screen ↗
                </a>
              </div>
              <NearbyPanel ref={selectRef} neighborhood={hood} onChange={setHood} highlight={pickHl} />
            </div>
          </section>
        )}

        <section className="how">
          <h2>How it works</h2>
          <ol>
            <li>
              <span className="how-n">1</span>
              <h3>Tell us what you&apos;re into</h3>
              <p>Pick a few interests and the nights you&apos;re usually free.</p>
            </li>
            <li>
              <span className="how-n">2</span>
              <h3>Join a group that already meets</h3>
              <p>We match you to a trusted host&apos;s recurring activity nearby, with spots held for newcomers.</p>
            </li>
            <li>
              <span className="how-n">3</span>
              <h3>Keep showing up</h3>
              <p>After each meetup, privately pick who you&apos;d like to see again. Mutual picks connect.</p>
            </li>
          </ol>
        </section>
      </main>

      <footer className="footer">
        <p>
          Radius is a Cornell Tech Product Studio project. This page is a prototype preview: activities, hosts and
          ratings shown are samples.
        </p>
        <p>We store the name and email you give us and your neighborhood (never your exact location).</p>
      </footer>

      {demoOpen && (
        <div className={`cta-bar ${nudge && !done ? "cta-nudge" : ""}`} role="region" aria-label="Get early access">
          <div className="cta-inner">
            <span className="cta-text">
              {done
                ? `You're on the list${state?.firstName ? `, ${state.firstName}` : ""}.`
                : nudge
                  ? "Want a spot like that for real?"
                  : "Would you use this?"}
            </span>
            {done ? (
              <span className="pill pill-ok">✓ Interested</span>
            ) : (
              <button className="btn btn-primary" onClick={clickInterest}>
                I&apos;m interested
              </button>
            )}
          </div>
        </div>
      )}

      {sheet && (
        <FlowSheet
          step={sheet}
          state={state}
          onClose={() => setSheet(null)}
          onSignup={async (name, email, website) => {
            const s = await post<FlowState>("/api/signup", { name, email, website });
            setState(s);
            setSheet(nextStep(s));
          }}
          onAnswer={async (experiment, answer) => {
            const s = await post<FlowState>("/api/answer", { experiment, answer });
            setState(s);
            setSheet(nextStep(s));
          }}
        />
      )}
    </div>
  );
}
