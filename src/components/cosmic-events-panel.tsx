export type CosmicEventKind = "aurora" | "meteor_shower" | "planet_bloom";

export type CosmicEventRow = {
  id: string;
  kind: CosmicEventKind;
  eventDate: string;
  title: string;
};

const KIND_LABEL: Record<CosmicEventKind, string> = {
  aurora: "Aurora",
  meteor_shower: "Meteor shower",
  planet_bloom: "Planet bloom",
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function cosmicEventLabel(kind: CosmicEventKind): string {
  return KIND_LABEL[kind];
}

export function CosmicEventsPanel({ events }: { events: CosmicEventRow[] }) {
  if (events.length === 0) return null;

  return (
    <section className="cosmic-events-panel" aria-labelledby="cosmic-events-heading">
      <div className="cosmic-events-card">
        <h2 id="cosmic-events-heading">Sky events</h2>
        <p className="cosmic-events-copy">Each milestone lights the sky once, on the day it arrives.</p>
        <ul className="cosmic-events-list">
          {events.map((event) => (
            <li key={event.id} className="cosmic-events-item">
              <span className={`cosmic-events-mark is-${event.kind}`} aria-hidden="true" />
              <span>
                <span className="cosmic-events-title">{KIND_LABEL[event.kind]}</span>
                <span className="cosmic-events-meta">
                  {event.title} · {formatDate(event.eventDate)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
