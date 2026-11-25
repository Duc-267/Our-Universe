export type ArchiveSummary = {
  body: string;
};

export function ArchivePanel({ archive }: { archive: ArchiveSummary | null }) {
  return (
    <section className="archive-panel" aria-labelledby="archive-heading">
      <div className="archive-card">
        <h2 id="archive-heading">Archive</h2>
        <p className="archive-copy">A recount of what you have already kept. It does not score the relationship.</p>
        <p className="archive-body">{archive?.body ?? "Nothing is written in this archive yet."}</p>
      </div>
    </section>
  );
}
