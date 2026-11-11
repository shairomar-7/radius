"use client";

import { useEffect, useRef, useState } from "react";
import type { FlowState, Step } from "@/lib/types";

interface Props {
  step: Step;
  state: FlowState | null;
  onClose: () => void;
  onSignup: (name: string, email: string, website: string) => Promise<void>;
  onAnswer: (experiment: "wtp" | "commute", answer: boolean) => Promise<void>;
}

const STEP_LABEL: Record<Step, string> = {
  form: "Get early access",
  wtp: "One quick question",
  commute: "One quick question",
  done: "You're in",
};

export default function FlowSheet({ step, state, onClose, onSignup, onAnswer }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [choice, setChoice] = useState<boolean | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChoice(null);
    setErr(null);
    dialogRef.current?.querySelector<HTMLElement>("input, button.opt")?.focus();
  }, [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const steps: Step[] = ["form", ...(state?.wtp.enabled ? (["wtp"] as Step[]) : []), ...(state?.commute.enabled ? (["commute"] as Step[]) : [])];
  const idx = steps.indexOf(step);

  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" ref={dialogRef}>
        <button className="sheet-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        {step !== "done" && steps.length > 1 && (
          <div className="dots" aria-label={`Step ${idx + 1} of ${steps.length}`}>
            {steps.map((s, i) => (
              <span key={s} className={i <= idx ? "dot on" : "dot"} />
            ))}
          </div>
        )}
        <p className="eyebrow">{STEP_LABEL[step]}</p>

        {step === "form" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              run(() => onSignup(String(f.get("name") ?? ""), String(f.get("email") ?? ""), String(f.get("website") ?? "")));
            }}
          >
            <h2 id="sheet-title">Be first in when Radius launches near you.</h2>
            <label className="field">
              <span>Name</span>
              <input name="name" autoComplete="name" required maxLength={120} placeholder="Your name" />
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" />
            </label>
            {/* honeypot */}
            <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden />
            {err && <p className="err" role="alert">{err}</p>}
            <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
              {busy ? "Saving…" : "Next"}
            </button>
            <p className="fine">We&apos;ll only use this to contact you about the Radius pilot. No spam.</p>
          </form>
        )}

        {(step === "wtp" || step === "commute") && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (choice === null) return setErr("Pick Yes or No.");
              run(() => onAnswer(step, choice));
            }}
          >
            <h2 id="sheet-title">
              {step === "wtp" ? (
                <>
                  Would you pay <span className="hl">${state?.wtp.price}/month</span> for Radius?
                </>
              ) : (
                <>
                  Would you commute up to <span className="hl">{state?.commute.minutes} minutes</span> to join an activity
                  like this?
                </>
              )}
            </h2>
            <div className="opts" role="radiogroup" aria-labelledby="sheet-title">
              {[true, false].map((v) => (
                <button
                  type="button"
                  key={String(v)}
                  role="radio"
                  aria-checked={choice === v}
                  className={`opt ${choice === v ? "on" : ""}`}
                  onClick={() => {
                    setChoice(v);
                    setErr(null);
                  }}
                >
                  {v ? "Yes" : "No"}
                </button>
              ))}
            </div>
            {err && <p className="err" role="alert">{err}</p>}
            <button className="btn btn-primary btn-block btn-lg" disabled={busy || choice === null}>
              {busy ? "Submitting…" : "Submit"}
            </button>
            <p className="fine">There&apos;s no wrong answer, and nothing will be charged.</p>
          </form>
        )}

        {step === "done" && (
          <div className="done">
            <div className="done-badge" aria-hidden>
              ✓
            </div>
            <h2 id="sheet-title">Thanks{state?.firstName ? `, ${state.firstName}` : ""}! You&apos;re on the list.</h2>
            <p>We&apos;ll reach out when Radius opens near you. Know someone new to the city?</p>
            <ShareButton />
            <button className="btn btn-ghost btn-block" onClick={onClose}>
              Back to the demo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ShareButton() {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Radius", text: "Be a regular from day one — try the Radius prototype", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <button className="btn btn-primary btn-block" onClick={share}>
      {copied ? "Link copied ✓" : "Share Radius"}
    </button>
  );
}
