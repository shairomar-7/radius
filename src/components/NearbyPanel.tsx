"use client";

import { forwardRef, useState } from "react";
import { NEIGHBORHOODS, nearestNeighborhood } from "@/lib/neighborhoods";

type Status = "idle" | "locating" | "denied" | "outside";

const BOROUGHS = Array.from(new Set(NEIGHBORHOODS.map((n) => n.borough)));

interface Props {
  neighborhood: string | null;
  onChange: (n: string) => void;
  highlight?: boolean;
}

/** Location controls beside the prototype. Picking a neighborhood re-populates the prototype. */
const NearbyPanel = forwardRef<HTMLSelectElement, Props>(function NearbyPanel({ neighborhood, onChange, highlight }, ref) {
  const [status, setStatus] = useState<Status>("idle");

  const save = (n: string, method: "geolocation" | "picker") => {
    onChange(n);
    fetch("/api/location", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ neighborhood: n, method }),
    }).catch(() => {});
  };

  const locate = () => {
    if (!("geolocation" in navigator)) return setStatus("denied");
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Resolved to a neighborhood name right here in the browser; coordinates are discarded.
        const n = nearestNeighborhood(pos.coords.latitude, pos.coords.longitude);
        if (n) {
          setStatus("idle");
          save(n.name, "geolocation");
        } else setStatus("outside");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  };

  return (
    <div className={`nearby ${highlight ? "nearby-hl" : ""}`}>
      <div className="nearby-head">
        <div>
          <p className="eyebrow">Step 1 · Where do you live?</p>
          <h3>{neighborhood ?? "Pick your neighborhood"}</h3>
        </div>
        <span className="pill pill-sample">Sample data</span>
      </div>
      <p className="nearby-sub">The prototype fills with groups that could be running near you.</p>

      <div className="loc-controls">
        <button className="btn btn-ghost" onClick={locate} disabled={status === "locating"}>
          {status === "locating" ? "Finding you…" : "📍 Use my location"}
        </button>
        <label className="sr-only" htmlFor="hood-select">
          Neighborhood
        </label>
        <select ref={ref} id="hood-select" value={neighborhood ?? ""} onChange={(e) => e.target.value && save(e.target.value, "picker")}>
          <option value="">Pick a neighborhood…</option>
          {BOROUGHS.map((b) => (
            <optgroup key={b} label={b}>
              {NEIGHBORHOODS.filter((n) => n.borough === b).map((n) => (
                <option key={n.name} value={n.name}>
                  {n.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      {status === "denied" && <p className="loc-msg">No problem — just pick your neighborhood instead.</p>}
      {status === "outside" && <p className="loc-msg">Looks like you&apos;re outside NYC right now — pick a neighborhood to preview.</p>}
      <p className="loc-fine">We only keep your neighborhood, never your exact location.</p>

      <div className="try">
        <p className="eyebrow">Step 2 · Try it</p>
        <ol>
          <li>
            <strong>Browse</strong> groups that already meet every week near you.
          </li>
          <li>
            <strong>Open one and tap Join</strong>: newcomer spots are held so you&apos;re in as a regular.
          </li>
          <li>
            <strong>My Activities → Past → Meet Again</strong>: privately pick who you&apos;d see again.
          </li>
          <li>
            <strong>Tap +</strong> to see how hosting works.
          </li>
        </ol>
      </div>
    </div>
  );
});

export default NearbyPanel;
