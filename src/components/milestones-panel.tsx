export type UniverseMilestone = {
  id: string;
  kind: "anniversary" | "days";
  key: string;
  reachedOn: string;
  title: string;
  moon: {
    positionX: number;
    positionY: number;
    positionZ: number;
    scale: number;
    rotation: number;
    visualSeed: number;
  } | null;
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function MilestonesPanel({
  milestones,
  selectedId,
  onSelect,
}: {
  milestones: UniverseMilestone[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  if (milestones.length === 0) return null;

  return (
    <section className="milestones-panel" aria-labelledby="milestones-heading">
      <div className="milestones-card">
        <h2 id="milestones-heading">Milestones</h2>
        <p className="milestones-copy">Moments that quietly changed your sky.</p>
        <ul className="milestones-list">
          {milestones.map((milestone) => (
            <li key={milestone.id}>
              <button
                type="button"
                className="milestones-item"
                aria-current={selectedId === milestone.id ? "true" : undefined}
                onClick={() =>
                  onSelect(selectedId === milestone.id ? null : milestone.id)
                }
              >
                <span className={`milestones-mark is-${milestone.kind}`} aria-hidden="true" />
                <span className="milestones-text">
                  <span className="milestones-title">{milestone.title}</span>
                  <span className="milestones-meta">{formatDate(milestone.reachedOn)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
