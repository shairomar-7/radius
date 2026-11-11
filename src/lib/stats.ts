// Small stats helpers for the admin page (pure functions, safe on client or server).

/** Wilson score interval for a proportion (95%). */
export function wilson(yes: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 0];
  const p = yes / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}

function erf(x: number) {
  // Abramowitz–Stegun 7.1.26
  const s = Math.sign(x);
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}

/** Two-sided two-proportion z-test p-value. Returns null when a group is empty. */
export function twoPropP(y1: number, n1: number, y2: number, n2: number): number | null {
  if (n1 === 0 || n2 === 0) return null;
  const p = (y1 + y2) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  if (se === 0) return 1;
  const z = (y1 / n1 - y2 / n2) / se;
  return 1 - erf(Math.abs(z) / Math.SQRT2);
}

export function pct(num: number, den: number, digits = 0): string {
  if (!den) return "—";
  return `${((num / den) * 100).toFixed(digits)}%`;
}
