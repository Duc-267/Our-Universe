import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/universe" aria-label="Our Universe home">
      <svg className="brand-mark" viewBox="0 0 46 38" fill="none" aria-hidden="true">
        <circle cx="17" cy="19" r="13" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="29" cy="19" r="13" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span>Our Universe</span>
    </Link>
  );
}
