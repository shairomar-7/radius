"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <div className="adm-login">
      <form className="adm-login-card" action={action}>
        <p className="eyebrow">Radius · Team 116</p>
        <h1>Experiment results</h1>
        <label className="field">
          <span>Access code</span>
          <input name="code" type="password" autoComplete="current-password" required autoFocus />
        </label>
        {state?.error && <p className="err" role="alert">{state.error}</p>}
        <button className="btn btn-primary btn-block" disabled={pending}>
          {pending ? "Checking…" : "View results"}
        </button>
      </form>
    </div>
  );
}
