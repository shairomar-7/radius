// Generates realistic-looking but FAKE activities for the prototype, per neighborhood.
// Deterministic per neighborhood (same hood → same hosts/groups), dates relative to today.

export type MakeCategory = "Coffee & Food" | "Fitness" | "Arts & Crafts" | "Outdoors" | "Games";
export type Tone = "sage" | "peach" | "cream";

export const PHOTOS = {
  friends: "https://images.unsplash.com/photo-1582298538104-fe2e74c27f59?auto=format&fit=crop&w=1200&q=85",
  table: "https://images.unsplash.com/photo-1582298537624-c6a00f906e51?auto=format&fit=crop&w=1200&q=85",
  pottery: "https://images.unsplash.com/photo-1673339066658-1b36cea3054c?auto=format&fit=crop&w=1200&q=85",
  coffee: "https://images.unsplash.com/photo-1604881988758-f76ad2f7aac1?auto=format&fit=crop&w=1200&q=85",
} as const;
type PhotoKey = keyof typeof PHOTOS;
const PHOTO_KEYS = Object.keys(PHOTOS) as PhotoKey[];

interface Template {
  title: string;
  category: MakeCategory;
  weekday: number; // 0 = Sunday
  start: [number, number];
  durationMin: number;
  cadence: "week" | "two weeks" | "month";
  venue: string;
  cap: number;
  photo: PhotoKey;
  about: [string, string];
}

const TEMPLATES: Template[] = [
  { title: "Saturday Pilates & Coffee", category: "Fitness", weekday: 6, start: [10, 0], durationMin: 120, cadence: "week", venue: "Neighborhood studio", cap: 6, photo: "friends",
    about: ["A relaxed Saturday morning to move, recharge, and see familiar faces. We start with an all-levels mat session, then walk over for coffee together.", "No experience needed. Bring water and something comfortable to move in."] },
  { title: "Sunday Morning Run Club", category: "Fitness", weekday: 0, start: [9, 0], durationMin: 90, cadence: "week", venue: "Park entrance", cap: 12, photo: "friends",
    about: ["An easy, chatty 5K at conversation pace, every Sunday. Nobody gets left behind, and we always finish with bagels.", "All paces welcome. Look for the group by the park entrance."] },
  { title: "Bouldering Crew", category: "Fitness", weekday: 1, start: [18, 30], durationMin: 120, cadence: "week", venue: "Climbing gym", cap: 8, photo: "friends",
    about: ["Monday-night climbing with the same small crew. We swap beta, cheer each other on, and grab dinner after.", "Beginners welcome; shoes can be rented at the desk."] },
  { title: "Pottery & Matcha Afternoon", category: "Arts & Crafts", weekday: 0, start: [14, 30], durationMin: 150, cadence: "two weeks", venue: "Community clay studio", cap: 8, photo: "pottery",
    about: ["Hand-building, good music and matcha. Each session picks up where the last one left off, so you'll see your pieces (and people) again.", "Clay and tools are provided. Wear something you don't mind getting dusty."] },
  { title: "Sketch Walk", category: "Arts & Crafts", weekday: 6, start: [14, 0], durationMin: 120, cadence: "two weeks", venue: "Waterfront", cap: 10, photo: "pottery",
    about: ["A slow walk with sketchbooks. We stop three times, draw for 20 minutes, and compare pages over coffee.", "Any skill level. Bring a pen and a small notebook."] },
  { title: "Coffee & Bookstore Walk", category: "Coffee & Food", weekday: 3, start: [18, 0], durationMin: 90, cadence: "week", venue: "Corner bookstore", cap: 6, photo: "coffee",
    about: ["Browse the shelves, pick something you'd recommend, then trade picks over coffee next door.", "Low-key and easy to join: just show up with curiosity."] },
  { title: "Supper Club Potluck", category: "Coffee & Food", weekday: 5, start: [19, 30], durationMin: 150, cadence: "month", venue: "Host's backyard", cap: 12, photo: "table",
    about: ["Once a month, the same table of neighbors. Everyone brings one dish and one story.", "The host shares the address after you join."] },
  { title: "Slow-Read Book Club", category: "Coffee & Food", weekday: 2, start: [19, 0], durationMin: 90, cadence: "two weeks", venue: "Wine bar back room", cap: 9, photo: "coffee",
    about: ["We read a few chapters at a time, so it's easy to keep up and easy to jump in.", "This round: a short novel the group voted on. No spoilers past chapter 6."] },
  { title: "Pickup Soccer", category: "Outdoors", weekday: 6, start: [10, 0], durationMin: 90, cadence: "week", venue: "Turf field", cap: 16, photo: "friends",
    about: ["Friendly 7v7, same crew most weeks. Teams get shuffled so you meet everyone.", "Bring a light and a dark shirt."] },
  { title: "Morning Yoga in the Park", category: "Outdoors", weekday: 6, start: [8, 30], durationMin: 75, cadence: "week", venue: "The big lawn", cap: 15, photo: "friends",
    about: ["Outdoor flow on the lawn, then a slow walk for coffee.", "Bring a mat or a towel."] },
  { title: "Board Game Table", category: "Games", weekday: 4, start: [19, 30], durationMin: 150, cadence: "week", venue: "Game café", cap: 10, photo: "table",
    about: ["A standing Thursday table. We teach every game, so newcomers are always in.", "The café covers the game library; just order something."] },
  { title: "Trivia Team Regulars", category: "Games", weekday: 2, start: [20, 0], durationMin: 120, cadence: "week", venue: "Neighborhood pub", cap: 6, photo: "table",
    about: ["Same team, every Tuesday. We are mediocre at sports questions and proud of it.", "Join the team for the night; we always need a music person."] },
];

const FIRST = ["Maya", "Jordan", "Priya", "Diego", "Sam", "Aisha", "Theo", "Lena", "Marcus", "Yuki", "Nadia", "Chris", "Ines", "Kofi", "Ruth", "Ben", "Alma", "Dev", "Hana", "Luis", "Nina", "Elliot", "Amara", "Owen"];
const LAST = ["Reyes", "Kim", "Mehta", "Torres", "Shah", "Lopez", "Okafor", "Brooks", "Chen", "Nakamura", "Wright", "Adeyemi", "Park", "Diaz"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
function fmtTime(h: number, m: number) {
  const ap = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ap}`;
}

export interface Person {
  name: string;
  first: string;
  initials: string;
  photo: string | null;
  interests: string;
}

export interface DemoActivity {
  id: number;
  title: string;
  category: MakeCategory;
  date: string; // "Saturday, Nov 14"
  shortDate: string; // "SATURDAY, NOV 14"
  daysAway: number;
  time: string;
  endTime: string;
  location: string; // "Venue, Hood"
  venue: string;
  hood: string;
  distance: string;
  filled: number;
  capacity: number;
  spotsLeft: number;
  spots: string; // "4 of 6"
  badge: string;
  tone: Tone;
  image: string;
  cadenceLabel: string; // "Every Saturday"
  regulars: number;
  newcomerSpots: number;
  host: Person & { rating: number; hosted: number; full: string };
  attendees: Person[];
  about: [string, string];
}

const INTERESTS = ["Running · Coffee", "Pottery · Music", "Books · Food", "Art · Outdoors", "Climbing · Film", "Games · Cooking", "Yoga · Travel"];

function person(rnd: () => number, i: number): Person {
  const first = FIRST[Math.floor(rnd() * FIRST.length)];
  const last = LAST[Math.floor(rnd() * LAST.length)];
  return {
    name: `${first} ${last}`,
    first,
    initials: first[0] + last[0],
    // Mix photos and initials so the stack feels like real people without reusing one photo everywhere.
    photo: i % 2 === 0 ? PHOTOS[PHOTO_KEYS[Math.floor(rnd() * PHOTO_KEYS.length)]] : null,
    interests: INTERESTS[Math.floor(rnd() * INTERESTS.length)],
  };
}

/** Activities for a neighborhood: one per category plus a few extras, sorted by date. */
export function demoActivities(hood: string, now = new Date(), count = 6): DemoActivity[] {
  const rnd = mulberry32(hash(hood));
  const byCat = new Map<MakeCategory, Template[]>();
  for (const t of TEMPLATES) byCat.set(t.category, [...(byCat.get(t.category) ?? []), t]);
  const picked: Template[] = [];
  for (const list of byCat.values()) picked.push(list[Math.floor(rnd() * list.length)]);
  const rest = TEMPLATES.filter((t) => !picked.includes(t));
  while (picked.length < count && rest.length) picked.push(rest.splice(Math.floor(rnd() * rest.length), 1)[0]);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const out = picked.map((t, i) => {
    let daysAway = (t.weekday - today.getDay() + 7) % 7;
    if (daysAway === 0 && now.getHours() >= t.start[0]) daysAway = 7;
    const d = new Date(today);
    d.setDate(d.getDate() + daysAway);
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const endMins = t.start[0] * 60 + t.start[1] + t.durationMin;
    const filled = Math.max(2, Math.min(t.cap - 1, Math.round(t.cap * (0.45 + rnd() * 0.4))));
    const spotsLeft = t.cap - filled;
    const host = person(rnd, 0);
    const attendees = Array.from({ length: Math.min(filled, 6) }, (_, k) => person(rnd, k + 1));
    const regulars = Math.max(2, filled - 1 - Math.floor(rnd() * 2));
    const newcomerSpots = Math.max(1, Math.min(spotsLeft, 1 + Math.floor(rnd() * 3)));
    let badge: string;
    let tone: Tone;
    if (spotsLeft <= 2) {
      badge = `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`;
      tone = "sage";
    } else if (daysAway <= 2 || d.getDay() === 0 || d.getDay() === 6) {
      badge = daysAway === 0 ? "Today" : daysAway === 1 ? "Tomorrow" : daysAway <= 6 && (d.getDay() === 0 || d.getDay() === 6) ? "This weekend" : `This ${DAYS[d.getDay()]}`;
      tone = "peach";
    } else {
      badge = `${newcomerSpots} newcomer spot${newcomerSpots === 1 ? "" : "s"}`;
      tone = "cream";
    }
    const cadenceLabel =
      t.cadence === "week" ? `Every ${DAYS[t.weekday]}` : t.cadence === "two weeks" ? `Every other ${DAYS[t.weekday]}` : `Monthly, ${DAYS[t.weekday]}s`;
    return {
      id: i + 1,
      title: t.title,
      category: t.category,
      date: `${DAYS[d.getDay()]}, ${month} ${d.getDate()}`,
      shortDate: `${DAYS[d.getDay()]}, ${month} ${d.getDate()}`.toUpperCase(),
      daysAway,
      time: fmtTime(t.start[0], t.start[1]),
      endTime: fmtTime(Math.floor(endMins / 60) % 24, endMins % 60),
      location: `${t.venue}, ${hood}`,
      venue: t.venue,
      hood,
      distance: `${(Math.round((0.2 + rnd() * 1.1) * 10) / 10).toFixed(1)} mi`,
      filled,
      capacity: t.cap,
      spotsLeft,
      spots: `${filled} of ${t.cap}`,
      badge,
      tone,
      image: PHOTOS[t.photo],
      cadenceLabel,
      regulars,
      newcomerSpots,
      host: { ...host, full: host.name, rating: Math.round((4.6 + rnd() * 0.4) * 10) / 10, hosted: 6 + Math.floor(rnd() * 40) },
      attendees,
      about: t.about,
    } satisfies DemoActivity;
  });
  out.sort((a, b) => a.daysAway - b.daysAway || a.time.localeCompare(b.time));
  return out.map((a, i) => ({ ...a, id: i + 1 }));
}
