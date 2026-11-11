"use client";

// Adapted from the team's Figma Make prototype ("Radius Mockup"). Markup and styles are kept as
// designed; the hardcoded sample data is replaced with generated, neighborhood-specific activities,
// and a few actions talk to the parent experiment page via postMessage.

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { demoActivities, DemoActivity, Person, PHOTOS } from "@/lib/demo-data";

type Tab = "discover" | "activities" | "connections" | "profile";
type Screen = "main" | "detail" | "create" | "success" | "meetAgain";

const photos = PHOTOS;

/** Tell the parent page (when embedded) that something happened. */
function notifyParent(type: string, data: Record<string, unknown> = {}) {
  if (typeof window !== "undefined" && window.parent !== window) {
    window.parent.postMessage({ source: "radius-demo", type, ...data }, window.location.origin);
  }
}

function Icon({ name, size = 20, strokeWidth = 1.8 }: { name: string; size?: number; strokeWidth?: number }) {
  const paths: Record<string, ReactNode> = {
    search: (<><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>),
    pin: (<><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>),
    plus: (<><path d="M12 5v14M5 12h14" /></>),
    sliders: (<><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>),
    home: (<><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>),
    calendar: (<><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></>),
    users: (<><path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 20v-2a4 4 0 0 0-3-3.8M16 3.2a4 4 0 0 1 0 7.6" /></>),
    user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>),
    arrow: (<><path d="m15 18-6-6 6-6" /></>),
    chevron: (<><path d="m9 18 6-6-6-6" /></>),
    clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
    repeat: (<><path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></>),
    map: (<><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" /><path d="M9 3v15M15 6v15" /></>),
    check: (<><path d="m5 12 4 4L19 6" /></>),
    message: (<><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" /></>),
    camera: (<><rect x="3" y="6" width="18" height="14" rx="3" /><path d="m8 6 1-2h6l1 2" /><circle cx="12" cy="13" r="3" /></>),
    star: (<><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" /></>),
    more: (<><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function Button({ children, className = "", onClick, type = "button", ariaLabel, disabled = false }: {
  children: ReactNode; className?: string; onClick?: () => void; type?: "button" | "submit"; ariaLabel?: string; disabled?: boolean;
}) {
  return (
    <button type={type} className={className} onClick={onClick} aria-label={ariaLabel} disabled={disabled}>
      {children}
    </button>
  );
}

/** Photo avatar when we have one, otherwise a tinted initials avatar in the same size/slot. */
function Avatar({ person, className = "" }: { person: Pick<Person, "photo" | "initials" | "name">; className?: string }) {
  if (person.photo) return <img className={`avatar ${className}`} src={person.photo} alt={person.name} />;
  return (
    <span className={`avatar initials-avatar ${className}`} aria-label={person.name}>
      {person.initials}
    </span>
  );
}

function ActivityCard({ activity, onOpen }: { activity: DemoActivity; onOpen: () => void }) {
  return (
    <article className="activity-card" onClick={onOpen}>
      <div className="card-image-wrap">
        <img src={activity.image} alt={`${activity.title} activity`} className="card-image" />
        <span className={`badge badge-${activity.tone}`}>{activity.badge}</span>
        <Button className="save-button" ariaLabel={`Save ${activity.title}`}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
          </svg>
        </Button>
      </div>
      <div className="card-content">
        <div className="eyebrow">{activity.category} · {activity.cadenceLabel}</div>
        <h3>{activity.title}</h3>
        <div className="meta-line">
          <Icon name="calendar" size={16} />
          {activity.date} · {activity.time}
        </div>
        <div className="meta-line">
          <Icon name="pin" size={16} />
          {activity.location} · {activity.distance}
        </div>
        <div className="card-footer">
          <div className="attendee-stack">
            {activity.attendees.slice(0, 3).map((p, i) => (
              <Avatar key={i} person={p} />
            ))}
          </div>
          <span>{activity.spots} spots filled</span>
          <span className="host-line">
            Hosted by {activity.host.first}{" "}
            <span className="verified">
              <Icon name="check" size={10} />
            </span>
          </span>
        </div>
      </div>
    </article>
  );
}

function BottomNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const items: { key: Tab; icon: string; label: string }[] = [
    { key: "discover", icon: "home", label: "Discover" },
    { key: "activities", icon: "calendar", label: "My Activities" },
    { key: "connections", icon: "users", label: "Connections" },
    { key: "profile", icon: "user", label: "Profile" },
  ];
  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <Button key={item.key} className={`nav-item ${active === item.key ? "active" : ""}`} onClick={() => onChange(item.key)}>
          <Icon name={item.icon} size={21} />
          <span>{item.label}</span>
        </Button>
      ))}
    </nav>
  );
}

function Discover({ activities, hood, onOpen, onCreate }: {
  activities: DemoActivity[]; hood: string; onOpen: (id: number) => void; onCreate: () => void;
}) {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const categories = ["All", "Coffee & Food", "Fitness", "Arts & Crafts", "Outdoors", "Games"];
  const filtered = useMemo(
    () =>
      activities.filter((activity) => {
        const matchesCategory = category === "All" || activity.category === category;
        const matchesSearch = `${activity.title} ${activity.category} ${activity.location}`.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
      }),
    [activities, category, search]
  );

  return (
    <main className="screen-content discover">
      <header className="discover-header">
        <div>
          <div className="wordmark">
            <span className="logo-mark">R</span>radius
          </div>
          <Button className="location-button" onClick={() => notifyParent("pick-location")} ariaLabel="Change neighborhood">
            <Icon name="pin" size={14} /> {hood} <span className="down">⌄</span>
          </Button>
        </div>
        <Button className="create-button" onClick={onCreate} ariaLabel="Create an activity">
          <Icon name="plus" size={25} strokeWidth={2.2} />
        </Button>
      </header>

      <section className="intro">
        <p className="overline">Your neighborhood, your people</p>
        <h1>
          Find your next
          <br />
          <em>good time.</em>
        </h1>
        <p>Small groups that already meet every week, right around the corner. Join as a regular from day one.</p>
      </section>

      <label className="search-box">
        <Icon name="search" size={21} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search activities or places" />
        <Button className="filter-icon" ariaLabel="Open filters">
          <Icon name="sliders" size={18} />
        </Button>
      </label>

      <div className="category-row">
        {categories.map((item) => (
          <Button key={item} className={`chip ${category === item ? "selected" : ""}`} onClick={() => setCategory(item)}>
            {item}
          </Button>
        ))}
      </div>

      <div className="refine-row">
        <Button className="mini-chip">
          <Icon name="calendar" size={14} /> This week <span>⌄</span>
        </Button>
        <Button className="mini-chip">
          <Icon name="pin" size={14} /> Within 1.5 mi <span>⌄</span>
        </Button>
        <Button className="mini-chip">Newcomer spots</Button>
      </div>

      <div className="section-heading">
        <div>
          <p className="overline">Near {hood}</p>
          <h2>Activities for you</h2>
        </div>
        <Button className="map-toggle">
          <Icon name="map" size={16} /> Map
        </Button>
      </div>

      <div className="feed">
        {filtered.length ? (
          filtered.map((activity) => <ActivityCard key={activity.id} activity={activity} onOpen={() => onOpen(activity.id)} />)
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <Icon name="search" />
            </div>
            <h3>Nothing nearby just yet</h3>
            <p>Try another category or clear your search.</p>
            <Button className="text-button" onClick={() => { setCategory("All"); setSearch(""); }}>
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}

function Detail({ activity, joined, onBack, onJoin }: { activity: DemoActivity; joined: boolean; onBack: () => void; onJoin: () => void }) {
  const extra = activity.filled - Math.min(activity.attendees.length, 4);
  return (
    <main className="detail-screen">
      <div className="detail-hero">
        <img src={activity.image} alt={activity.title} />
        <Button className="floating-back" onClick={onBack} ariaLabel="Back">
          <Icon name="arrow" />
        </Button>
        <Button className="floating-more" ariaLabel="More options">
          <Icon name="more" />
        </Button>
        <div className="hero-fade" />
      </div>
      <div className="detail-body">
        <div className="eyebrow">{activity.category}</div>
        <h1>{activity.title}</h1>
        {joined && (
          <div className="going-pill">
            <Icon name="check" size={14} /> You’re going
          </div>
        )}
        <div className="info-list">
          <div className="info-row">
            <span className="info-icon">
              <Icon name="calendar" />
            </span>
            <div>
              <strong>{activity.date}</strong>
              <span>
                {activity.time} – {activity.endTime}
              </span>
            </div>
          </div>
          <div className="info-row">
            <span className="info-icon cream">
              <Icon name="repeat" />
            </span>
            <div>
              <strong>{activity.cadenceLabel}</strong>
              <span>
                {activity.regulars} regulars · {activity.newcomerSpots} newcomer spot{activity.newcomerSpots === 1 ? "" : "s"} held
              </span>
            </div>
          </div>
          <div className="info-row">
            <span className="info-icon peach">
              <Icon name="pin" />
            </span>
            <div>
              <strong>{activity.venue}</strong>
              <span>
                {activity.hood} · {activity.distance}
              </span>
            </div>
            <Button className="round-next">
              <Icon name="chevron" size={16} />
            </Button>
          </div>
          <div className="info-row">
            <span className="info-icon cream">
              <Icon name="users" />
            </span>
            <div>
              <strong>{activity.spots} spots filled</strong>
              <span>Small group · {activity.capacity} people max</span>
            </div>
          </div>
        </div>

        {joined && (
          <section className="updates">
            <div className="section-title">
              <h2>Updates from host</h2>
              <span className="new-dot">1 new</span>
            </div>
            <div className="update-card">
              <div className="host-avatar">{activity.host.first[0]}</div>
              <div>
                <strong>{activity.host.first}</strong>
                <span>Today, 8:42 AM</span>
                <p>
                  Welcome! We meet at the {activity.venue.toLowerCase()} at {activity.time}. Say hi when you arrive. I’ll introduce you to everyone.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="about">
          <h2>About this activity</h2>
          <p>{activity.about[0]}</p>
          <p>{activity.about[1]}</p>
        </section>
        <section className="host-section">
          <h2>Hosted by</h2>
          <div className="host-card">
            <div className="host-avatar large">{activity.host.first[0]}</div>
            <div>
              <strong>
                {activity.host.full}{" "}
                <span className="verified">
                  <Icon name="check" size={10} />
                </span>
              </strong>
              <span>
                ★ {activity.host.rating.toFixed(1)} · {activity.host.hosted} activities hosted
              </span>
            </div>
            <Button className="round-next">
              <Icon name="chevron" size={16} />
            </Button>
          </div>
        </section>
        <section className="going-section">
          <div className="section-title">
            <h2>Who’s going</h2>
            <span>{activity.filled} people</span>
          </div>
          <div className="people-row">
            {activity.attendees.slice(0, 4).map((p, i) => (
              <Avatar key={i} person={p} />
            ))}
            {extra > 0 && <div className="avatar more-avatar">+{extra}</div>}
          </div>
        </section>
      </div>
      <div className="sticky-action">
        <div>
          <span>{joined ? `See you ${activity.date.split(",")[0]}` : "Free to join"}</span>
          <strong>{joined ? "You’re all set" : `${activity.spotsLeft} spot${activity.spotsLeft === 1 ? "" : "s"} remaining`}</strong>
        </div>
        <Button className={`primary-button ${joined ? "joined" : ""}`} onClick={onJoin}>
          {joined ? (
            <>
              <Icon name="check" size={18} /> You’re Going
            </>
          ) : (
            "Join Activity"
          )}
        </Button>
      </div>
    </main>
  );
}

function CreateActivity({ onBack, onPublish }: { onBack: () => void; onPublish: () => void }) {
  const [size, setSize] = useState(6);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onPublish();
  };
  return (
    <main className="form-screen">
      <header className="top-bar">
        <Button className="icon-button" onClick={onBack} ariaLabel="Back">
          <Icon name="arrow" />
        </Button>
        <h1>Create an activity</h1>
        <span className="top-spacer" />
      </header>
      <form onSubmit={submit}>
        <div className="form-intro">
          <p className="overline">Bring people together</p>
          <h2>What should we do?</h2>
          <p>Create a simple plan for a small group nearby.</p>
        </div>
        <Button className="cover-upload">
          <Icon name="camera" size={28} />
          <strong>Add a cover photo</strong>
          <span>Choose something that sets the vibe</span>
        </Button>
        <label className="field">
          <span>Activity name</span>
          <input required placeholder="e.g. Casual Saturday tennis" />
        </label>
        <label className="field">
          <span>Category</span>
          <div className="select-shell">
            Choose a category <span>⌄</span>
          </div>
        </label>
        <label className="field">
          <span>Description</span>
          <textarea required placeholder="What's the plan? Is it beginner-friendly? What should people bring?" />
        </label>
        <div className="field-grid">
          <label className="field">
            <span>Date</span>
            <input required type="date" />
          </label>
          <label className="field">
            <span>Time</span>
            <input required type="time" />
          </label>
        </div>
        <label className="field">
          <span>Meeting place</span>
          <div className="input-icon">
            <Icon name="pin" size={18} />
            <input required placeholder="Search for a place" />
          </div>
        </label>
        <label className="field">
          <span>Group size</span>
          <div className="capacity">
            <Button onClick={() => setSize((s) => Math.max(3, s - 1))}>−</Button>
            <strong>{size} people</strong>
            <Button onClick={() => setSize((s) => Math.min(16, s + 1))}>+</Button>
          </div>
          <small>Small groups make it easier to connect.</small>
        </label>
        <div className="form-action">
          <Button type="submit" className="primary-button wide">
            Publish Activity
          </Button>
        </div>
      </form>
    </main>
  );
}

function Success({ hood, onView, onHome }: { hood: string; onView: () => void; onHome: () => void }) {
  return (
    <main className="success-screen">
      <div className="success-mark">
        <Icon name="check" size={35} strokeWidth={2.2} />
      </div>
      <p className="overline">Nice work</p>
      <h1>Your activity is live!</h1>
      <p>People in {hood} can now discover and join your activity.</p>
      <div className="mini-preview">
        <img src={photos.table} alt="Published activity" />
        <div>
          <span>THIS SATURDAY · 4:00 PM</span>
          <strong>Sunset Picnic in the Park</strong>
          <p>Neighborhood park · {hood}</p>
        </div>
      </div>
      <Button className="primary-button wide" onClick={onView}>
        View Activity
      </Button>
      <Button className="secondary-button wide" onClick={onHome}>
        Back to Discover
      </Button>
    </main>
  );
}

function MyActivities({ activities, onOpen, onMeetAgain, meetAgainComplete }: {
  activities: DemoActivity[]; onOpen: (id: number) => void; onMeetAgain: () => void; meetAgainComplete: boolean;
}) {
  const [view, setView] = useState<"upcoming" | "past">(meetAgainComplete ? "past" : "upcoming");
  const [going, hosting, past, older] = [activities[0], activities[1], activities[2], activities[3] ?? activities[0]];

  return (
    <main className="screen-content simple-page">
      <p className="overline">Plans in one place</p>
      <h1>My Activities</h1>
      <div className="segment">
        <Button className={view === "upcoming" ? "active" : ""} onClick={() => setView("upcoming")}>
          Upcoming
        </Button>
        <Button className={view === "past" ? "active" : ""} onClick={() => setView("past")}>
          Past
        </Button>
      </div>
      {view === "upcoming" ? (
        <>
          <div className="date-label">{going.shortDate}</div>
          <article className="compact-activity" onClick={() => onOpen(going.id)}>
            <img src={going.image} alt="" />
            <div>
              <span className="role">Going</span>
              <h3>{going.title}</h3>
              <p>
                {going.time} · {going.hood}
              </p>
              <div className="host-note">
                <span className="pulse" /> New update from {going.host.first}
              </div>
            </div>
            <Icon name="chevron" size={18} />
          </article>
          <div className="date-label">{hosting.shortDate}</div>
          <article className="compact-activity" onClick={() => onOpen(hosting.id)}>
            <img src={hosting.image} alt="" />
            <div>
              <span className="role peach-role">Hosting</span>
              <h3>{hosting.title}</h3>
              <p>
                {hosting.time} · {hosting.hood}
              </p>
            </div>
            <Icon name="chevron" size={18} />
          </article>
        </>
      ) : (
        <>
          <div className="past-intro">
            <strong>Good connections can keep going.</strong>
            <p>Your selections are always private unless the feeling is mutual.</p>
          </div>
          <div className="date-label">LAST WEEK · COMPLETED</div>
          <article className="past-activity">
            <img src={past.image} alt={past.title} />
            <div className="past-activity-copy">
              <span className="role">Attended</span>
              <h3>{past.title}</h3>
              <p>Last {past.date.split(",")[0]} · {past.venue}</p>
              {meetAgainComplete ? (
                <div className="meet-complete">
                  <Icon name="check" size={14} />
                  Meet Again selections sent
                </div>
              ) : (
                <Button className="meet-again-button" onClick={onMeetAgain}>
                  Choose who to meet again
                  <Icon name="chevron" size={15} />
                </Button>
              )}
            </div>
          </article>
          <div className="date-label">TWO WEEKS AGO · COMPLETED</div>
          <article className="compact-activity completed">
            <img src={older.image} alt={older.title} />
            <div>
              <span className="role completed-role">
                <Icon name="check" size={10} /> Selections sent
              </span>
              <h3>{older.title}</h3>
              <p>{older.venue} · {older.hood}</p>
            </div>
            <Icon name="chevron" size={18} />
          </article>
        </>
      )}
    </main>
  );
}

function MeetAgain({ activity, onBack, onDone }: { activity: DemoActivity; onBack: () => void; onDone: () => void }) {
  const people = activity.attendees.slice(0, 4);
  const [selected, setSelected] = useState<number[]>([]);
  const togglePerson = (id: number) => {
    setSelected((current) => (current.includes(id) ? current.filter((personId) => personId !== id) : [...current, id]));
  };

  return (
    <main className="meet-screen">
      <header className="top-bar">
        <Button className="icon-button" onClick={onBack} ariaLabel="Back">
          <Icon name="arrow" />
        </Button>
        <h1>Meet Again</h1>
        <span className="top-spacer" />
      </header>
      <div className="meet-content">
        <div className="meet-heading">
          <span className="connection-mark">
            <Icon name="users" size={25} />
          </span>
          <p className="overline">{activity.title}</p>
          <h2>Who would you like to meet again?</h2>
          <p>Choose anyone you’d enjoy seeing again. Your picks stay private unless they choose you too.</p>
        </div>
        <div className="privacy-note">
          <Icon name="check" size={16} />
          <span>No one is notified unless it’s a mutual connection.</span>
        </div>
        <div className="people-grid">
          {people.map((person, id) => {
            const isSelected = selected.includes(id);
            return (
              <Button key={id} className={`person-card ${isSelected ? "selected" : ""}`} onClick={() => togglePerson(id)} ariaLabel={`${isSelected ? "Remove" : "Select"} ${person.first}`}>
                <span className="person-photo">
                  {person.photo ? <img src={person.photo} alt={person.first} /> : <span className="person-initials">{person.initials}</span>}
                  <span className="select-check">{isSelected ? <Icon name="check" size={14} /> : <Icon name="plus" size={14} />}</span>
                </span>
                <strong>{person.first}</strong>
                <span>{person.interests}</span>
              </Button>
            );
          })}
        </div>
      </div>
      <div className="meet-action">
        <div>
          <strong>
            {selected.length ? `${selected.length} ${selected.length === 1 ? "person" : "people"} selected` : "Select anyone you connected with"}
          </strong>
          <span>You can choose more than one person.</span>
        </div>
        <Button className="primary-button" onClick={onDone} disabled={selected.length === 0}>
          Done
        </Button>
        <Button className="skip-button" onClick={onBack}>
          Skip for now
        </Button>
      </div>
    </main>
  );
}

function Connections({ activities }: { activities: DemoActivity[] }) {
  const people = [activities[2]?.attendees[0], activities[0]?.attendees[1], activities[1]?.attendees[2]].filter(Boolean) as Person[];
  const metAt = [activities[2], activities[0], activities[1]];
  return (
    <main className="screen-content simple-page">
      <div className="page-title-row">
        <div>
          <p className="overline">People worth knowing</p>
          <h1>Connections</h1>
        </div>
        <Button className="icon-button" ariaLabel="Messages">
          <Icon name="message" />
        </Button>
      </div>
      {people[0] && (
        <div className="notice">
          <div className="success-mark small">
            <Icon name="check" />
          </div>
          <div>
            <strong>You and {people[0].first} connected</strong>
            <p>You both want to meet again after {metAt[0]?.title}.</p>
          </div>
        </div>
      )}
      <h2 className="list-title">Your people</h2>
      {people.map((p, index) => (
        <div className="connection-row" key={index}>
          <Avatar person={p} />
          <div>
            <strong>{p.name}</strong>
            <span>Met at {metAt[index]?.title}</span>
          </div>
          <Button className="round-next">
            <Icon name="chevron" size={16} />
          </Button>
        </div>
      ))}
    </main>
  );
}

function Profile({ hood }: { hood: string }) {
  return (
    <main className="screen-content simple-page profile-page">
      <div className="profile-head">
        <div className="profile-photo-wrap">
          <img className="avatar" src={photos.table} alt="Alex" />
          <span className="verified profile-verified">
            <Icon name="check" size={12} />
          </span>
        </div>
        <h1>Alex Morgan</h1>
        <p>
          <Icon name="pin" size={15} /> {hood}
        </p>
        <Button className="secondary-button">Edit Profile</Button>
      </div>
      <section className="profile-section">
        <div className="section-title">
          <h2>About me</h2>
          <span>Available weekends</span>
        </div>
        <div className="interest-list">
          <span>Running</span>
          <span>Coffee</span>
          <span>Art</span>
          <span>Hiking</span>
        </div>
      </section>
      <section className="profile-section">
        <h2>Your Radius activity</h2>
        <div className="stat-grid">
          <div>
            <strong>8</strong>
            <span>Attended</span>
          </div>
          <div>
            <strong>3</strong>
            <span>Hosted</span>
          </div>
          <div>
            <strong>4</strong>
            <span>Credits</span>
          </div>
        </div>
      </section>
      <section className="membership">
        <span className="overline">Radius Regular</span>
        <h2>Keep the good times going</h2>
        <p>You have one free activity left.</p>
        <div className="progress">
          <span />
          <span />
          <i />
        </div>
        <Button className="text-button">View membership</Button>
      </section>
      <section className="settings">
        <h2>Settings</h2>
        {["Notifications", "Privacy & safety", "Account settings", "Help & support"].map((item) => (
          <Button key={item}>
            {item}
            <Icon name="chevron" size={17} />
          </Button>
        ))}
      </section>
    </main>
  );
}

export default function RadiusApp({ initialHood, embedded = false }: { initialHood: string; embedded?: boolean }) {
  const [hood, setHood] = useState(initialHood);
  const [now, setNow] = useState<Date | null>(null);
  const [tab, setTab] = useState<Tab>("discover");
  const [screen, setScreen] = useState<Screen>("main");
  const [selectedId, setSelectedId] = useState(1);
  const [joinedIds, setJoinedIds] = useState<number[]>([]);
  const [meetAgainComplete, setMeetAgainComplete] = useState(false);

  // Dates are relative to the viewer's "today"; compute on the client to avoid hydration drift.
  useEffect(() => setNow(new Date()), []);

  // The parent experiment page tells us when the visitor picks a neighborhood.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.source === "radius-site" && e.data.type === "hood" && typeof e.data.hood === "string") {
        setHood(e.data.hood);
        setScreen("main");
        setJoinedIds([]);
      }
    };
    window.addEventListener("message", onMsg);
    notifyParent("ready");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const activities = useMemo(() => demoActivities(hood, now ?? new Date(2026, 10, 10, 12)), [hood, now]);
  const selected = activities.find((activity) => activity.id === selectedId) || activities[0];
  const openDetail = (id: number) => {
    setSelectedId(id);
    setScreen("detail");
    document.querySelector(".phone-frame")?.scrollTo({ top: 0 });
  };
  const changeTab = (next: Tab) => {
    setTab(next);
    setScreen("main");
    document.querySelector(".phone-frame")?.scrollTo({ top: 0 });
  };

  return (
    <div className={`app-shell ${embedded ? "embedded" : ""}`}>
      <div className="phone-frame">
        {screen === "detail" && (
          <Detail
            activity={selected}
            joined={joinedIds.includes(selected.id)}
            onBack={() => setScreen("main")}
            onJoin={() => {
              if (!joinedIds.includes(selected.id)) {
                setJoinedIds((ids) => [...ids, selected.id]);
                notifyParent("joined", { title: selected.title });
              }
            }}
          />
        )}
        {screen === "create" && <CreateActivity onBack={() => setScreen("main")} onPublish={() => setScreen("success")} />}
        {screen === "success" && (
          <Success
            hood={hood}
            onView={() => setScreen("detail")}
            onHome={() => {
              setTab("discover");
              setScreen("main");
            }}
          />
        )}
        {screen === "meetAgain" && (
          <MeetAgain
            activity={activities[2]}
            onBack={() => setScreen("main")}
            onDone={() => {
              setMeetAgainComplete(true);
              setScreen("main");
            }}
          />
        )}
        {screen === "main" && (
          <>
            {tab === "discover" && <Discover activities={activities} hood={hood} onOpen={openDetail} onCreate={() => setScreen("create")} />}
            {tab === "activities" && (
              <MyActivities activities={activities} onOpen={openDetail} onMeetAgain={() => setScreen("meetAgain")} meetAgainComplete={meetAgainComplete} />
            )}
            {tab === "connections" && <Connections activities={activities} />}
            {tab === "profile" && <Profile hood={hood} />}
            <BottomNav active={tab} onChange={changeTab} />
          </>
        )}
      </div>
    </div>
  );
}
