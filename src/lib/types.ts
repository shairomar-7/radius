// Shared between server routes and client components (no secrets here).

export type Step = "form" | "wtp" | "commute" | "done";

export interface FlowState {
  signedUp: boolean;
  firstName: string | null;
  neighborhood: string | null;
  wtp: { enabled: boolean; answered: boolean; price: number | null };
  commute: { enabled: boolean; answered: boolean; minutes: number | null };
}

export function nextStep(s: FlowState): Step {
  if (!s.signedUp) return "form";
  if (s.wtp.enabled && !s.wtp.answered) return "wtp";
  if (s.commute.enabled && !s.commute.answered) return "commute";
  return "done";
}

export const CLIENT_EVENTS = ["demo_opened", "interest_clicked"] as const;
export type ClientEvent = (typeof CLIENT_EVENTS)[number];
