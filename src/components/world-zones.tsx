"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";

export type WorldZone = "pond" | "garden" | "sky" | "home" | "mailbox";
export type IslandZone = Exclude<WorldZone, "sky">;

export const ZONE_ORDER: WorldZone[] = ["pond", "garden", "sky", "home", "mailbox"];

export const ZONE_LABELS: Record<WorldZone, { title: string; subtitle: string }> = {
  pond: { title: "Pond", subtitle: "Today's mood and Same Moments" },
  garden: { title: "Garden", subtitle: "Every memory you have planted" },
  sky: { title: "Sky", subtitle: "Trips, moons, dreams, and quests" },
  home: { title: "Home", subtitle: "Your days together" },
  mailbox: { title: "Mailbox", subtitle: "Capsules waiting for their day" },
};

export function ZoneIcon({ zone }: { zone: WorldZone }) {
  switch (zone) {
    case "pond":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true" className="zone-icon">
          <ellipse cx="16" cy="23" rx="12" ry="5" fill="#7fd8fb" />
          <path d="M9 19c0-5 3-8 7-8 2 0 3 1 4 2 2-1 5 0 5 2-2 0-3 1-3 2 1 3-2 6-7 6s-6-2-6-4z" fill="#ffd23a" />
          <circle cx="18" cy="14" r="1" fill="#2b1d3a" stroke="none" />
        </svg>
      );
    case "garden":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true" className="zone-icon">
          <path d="M6 25c0-2 2-3 4-3h12c2 0 4 1 4 3v1H6z" fill="#b98458" />
          <path d="M16 22v-9" fill="none" />
          <path d="M16 15c-5 0-8-3-8-7 5 0 8 3 8 7z" fill="#7fcf86" />
          <path d="M16 13c4 0 7-3 7-6-4 0-7 2-7 6z" fill="#a8e6a0" />
          <circle cx="23" cy="17" r="2.6" fill="#ff8fab" />
        </svg>
      );
    case "sky":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true" className="zone-icon">
          <path d="M19 6a9 9 0 1 0 7 15A10 10 0 0 1 19 6z" fill="#fff1c2" />
          <path d="M9 7l1.4 3 3 1.4-3 1.4L9 16l-1.4-3.2-3-1.4 3-1.4z" fill="#ffd23a" />
        </svg>
      );
    case "home":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true" className="zone-icon">
          <path d="M8 15h16v11H8z" fill="#fff1d6" />
          <path d="M5 16l11-9 11 9z" fill="#ff8fab" />
          <path d="M13 26v-6h6v6" fill="#b98458" />
          <rect x="20" y="17" width="3" height="3" fill="#ffd23a" />
        </svg>
      );
    case "mailbox":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true" className="zone-icon">
          <rect x="5" y="9" width="22" height="15" rx="3" fill="#fff1d6" />
          <path d="M6 11l10 7 10-7" fill="none" />
          <path d="M16 23.5c-3-2-5-3.5-5-5.5 0-1.4 1-2.3 2.2-2.3.9 0 1.6.5 1.8 1 .3-.5 1-1 1.9-1 1.2 0 2.1.9 2.1 2.3 0 2-2 3.5-5 5.5z" fill="#ff6d97" stroke="none" />
        </svg>
      );
  }
}

export function WorldDock({
  activeZone,
  dots,
  onZone,
}: {
  activeZone: WorldZone | null;
  dots: Partial<Record<WorldZone, string>>;
  onZone: (zone: WorldZone) => void;
}) {
  const renderZone = (zone: WorldZone) => (
    <button
      key={zone}
      type="button"
      className="dock-button"
      data-zone-trigger={zone}
      aria-pressed={activeZone === zone}
      aria-label={dots[zone] ? `${ZONE_LABELS[zone].title}: ${dots[zone]}` : ZONE_LABELS[zone].title}
      onClick={() => onZone(zone)}
    >
      <ZoneIcon zone={zone} />
      <span className="dock-label">{ZONE_LABELS[zone].title}</span>
      {dots[zone] && <span className="dock-dot" aria-hidden="true" />}
    </button>
  );

  return (
    <nav className="world-dock" aria-label="World zones">
      {renderZone("pond")}
      {renderZone("garden")}
      <Link className="dock-create" href="/memory/new">
        <span className="dock-create-plus" aria-hidden="true">+</span>
        <span className="dock-label">New memory</span>
      </Link>
      {renderZone("sky")}
      {renderZone("home")}
      {renderZone("mailbox")}
    </nav>
  );
}

export function ZoneDrawer({
  zone,
  onClose,
  children,
}: {
  zone: WorldZone;
  onClose: () => void;
  children: ReactNode;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [zone]);

  return (
    <aside
      className={`zone-drawer is-${zone}`}
      aria-labelledby="zone-drawer-title"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header className="zone-drawer-head">
        <span className="zone-drawer-emblem">
          <ZoneIcon zone={zone} />
        </span>
        <div className="zone-drawer-titles">
          <h2 id="zone-drawer-title" ref={headingRef} tabIndex={-1}>{ZONE_LABELS[zone].title}</h2>
          <p>{ZONE_LABELS[zone].subtitle}</p>
        </div>
        <button type="button" className="zone-drawer-close" aria-label={`Close ${ZONE_LABELS[zone].title}`} onClick={onClose}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>
      <div className="zone-drawer-body">{children}</div>
    </aside>
  );
}
