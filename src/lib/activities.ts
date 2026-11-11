// Generates realistic-looking but FAKE nearby activities for the demo.
// Deterministic per neighborhood so the list doesn't reshuffle on every render.

export interface FakeActivity {
  id: string;
  title: string;
  category: string;
  when: string;
  cadence: string;
  venue: string;
  distanceMi: number;
  host: { name: string; initials: string; rating: number; sessions: number };
  attendees: number;
  capacity: number;
  regulars: string[]; // initials
  newcomerSpots: number;
  hue: number;
}

const TEMPLATES = [
  { title: "Sunday Morning Run Club", category: "Running", when: "Sun · 9:00 AM", cadence: "Every week", venue: "the park loop", cap: 14, hue: 18 },
  { title: "Pottery & Playlist Night", category: "Crafts", when: "Wed · 7:00 PM", cadence: "Every week", venue: "a community studio", cap: 8, hue: 28 },
  { title: "Board Game Table", category: "Games", when: "Thu · 7:30 PM", cadence: "Every week", venue: "a corner café", cap: 10, hue: 210 },
  { title: "Pickup Soccer", category: "Sports", when: "Sat · 10:00 AM", cadence: "Every week", venue: "the turf field", cap: 16, hue: 150 },
  { title: "Slow-Read Book Club", category: "Books", when: "Tue · 7:00 PM", cadence: "Every other week", venue: "a wine bar back room", cap: 9, hue: 280 },
  { title: "Bouldering Crew", category: "Climbing", when: "Mon · 6:30 PM", cadence: "Every week", venue: "the climbing gym", cap: 8, hue: 340 },
  { title: "Sketch Walk", category: "Art", when: "Sat · 2:00 PM", cadence: "Every other week", venue: "the waterfront", cap: 10, hue: 45 },
  { title: "Supper Club Potluck", category: "Food", when: "Fri · 7:30 PM", cadence: "Monthly", venue: "a host's backyard", cap: 12, hue: 8 },
  { title: "Morning Yoga in the Park", category: "Wellness", when: "Sat · 8:30 AM", cadence: "Every week", venue: "the big lawn", cap: 15, hue: 170 },
  { title: "Trivia Team Regulars", category: "Trivia", when: "Tue · 8:00 PM", cadence: "Every week", venue: "the neighborhood pub", cap: 6, hue: 235 },
];

const FIRST = ["Maya", "Jordan", "Priya", "Diego", "Sam", "Aisha", "Theo", "Lena", "Marcus", "Yuki", "Nadia", "Chris", "Ines", "Kofi", "Ruth", "Ben", "Alma", "Dev", "Hana", "Luis"];
const LAST = ["R.", "K.", "M.", "T.", "S.", "L.", "O.", "B.", "C.", "N.", "W.", "A.", "P.", "D."];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function fakeActivities(neighborhood: string, count = 4): FakeActivity[] {
  const rnd = mulberry32(hash(neighborhood));
  const pool = [...TEMPLATES];
  const out: FakeActivity[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    const t = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    const first = FIRST[Math.floor(rnd() * FIRST.length)];
    const last = LAST[Math.floor(rnd() * LAST.length)];
    const attendees = Math.max(3, Math.floor(t.cap * (0.45 + rnd() * 0.4)));
    const regulars = Array.from({ length: Math.min(4, attendees) }, () =>
      FIRST[Math.floor(rnd() * FIRST.length)][0] + LAST[Math.floor(rnd() * LAST.length)][0]
    );
    out.push({
      id: `${neighborhood}-${i}`,
      title: t.title,
      category: t.category,
      when: t.when,
      cadence: t.cadence,
      venue: t.venue,
      distanceMi: Math.round((0.2 + rnd() * 1.1) * 10) / 10,
      host: {
        name: `${first} ${last}`,
        initials: first[0] + last[0],
        rating: Math.round((4.6 + rnd() * 0.4) * 10) / 10,
        sessions: 6 + Math.floor(rnd() * 40),
      },
      attendees,
      capacity: t.cap,
      regulars,
      newcomerSpots: 1 + Math.floor(rnd() * 3),
      hue: t.hue,
    });
  }
  return out.sort((a, b) => a.distanceMi - b.distanceMi);
}
