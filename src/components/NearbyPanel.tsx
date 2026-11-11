"use client";

import { useMemo, useState } from "react";
import { NEIGHBORHOODS, nearestNeighborhood } from "@/lib/neighborhoods";
import { fakeActivities } from "@/lib/activities";

type Status = "idle" | "locating" | "denied" | "outside";

const BOROUGHS = Array.from(new Set(NEIGHBORHOODS.map((n) => n.borough)));

export default function NearbyPanel({ initialNeighborhood }: { initialNeighborhood: string | null }) {
  const [hood, setHood] = useState<string | null>(initialNeighborhood);
  const [status, setStatus] = useState<Status>("idle");

  const save = (neighborhood: string, method: "geolocation" | "picker") => {
    setHood(neighborhood);
    fetch("/api/location", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ neighborhood, method }),
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

  const activities = useMemo(() => (hood ? fakeActivities(hood) : []), [hood]);

  return (
    <div className="nearby">
      <div className="nearby-head">
        <div>
          <p className="eyebrow">Running near you</p>
          <h3>{hood ? hood : "Where do you live?"}</h3>
        </div>
        <span className="pill pill-sample">Sample data</span>
      </div>

      <div className="loc-controls">
        <button className="btn btn-ghost" onClick={locate} disabled={status === "locating"}>
          {status === "locating" ? "Finding you…" : "📍 Use my location"}
        </button>
        <label className="sr-only" htmlFor="hood-select">
          Neighborhood
        </label>
        <select
          id="hood-select"
          value={hood ?? ""}
          onChange={(e) => e.target.value && save(e.target.value, "picker")}
        >
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

      {hood ? (
        <ul className="act-list">
          {activities.map((a) => (
            <li key={a.id} className="act">
              <div className="act-top">
                <span className="act-cat" style={{ "--h": a.hue } as React.CSSProperties}>
                  {a.category}
                </span>
                <span className="act-dist">{a.distanceMi} mi</span>
              </div>
              <h4>{a.title}</h4>
              <p className="act-when">
                {a.when} · {a.cadence} · at {a.venue}
              </p>
              <div className="act-host">
                <span className="avatar" style={{ "--h": a.hue } as React.CSSProperties}>
                  {a.host.initials}
                </span>
                <span>
                  Hosted by <strong>{a.host.name}</strong>
                  <span className="act-rating">
                    ★ {a.host.rating.toFixed(1)} · {a.host.sessions} meetups
                  </span>
                </span>
              </div>
              <div className="act-foot">
                <span className="faces" aria-label={`${a.attendees} regulars going`}>
                  {a.regulars.map((r, i) => (
                    <span key={i} className="face">
                      {r}
                    </span>
                  ))}
                  <span className="faces-n">
                    {a.attendees}/{a.capacity} going
                  </span>
                </span>
                <span className="spots">
                  {a.newcomerSpots} newcomer spot{a.newcomerSpots > 1 ? "s" : ""}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="act-empty">Pick a neighborhood to see sample groups nearby.</div>
      )}
    </div>
  );
}
