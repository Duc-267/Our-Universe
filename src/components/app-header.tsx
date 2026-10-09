import Link from "next/link";
import { signOut } from "@/features/auth/actions";
import { Brand } from "./brand";

export function AppHeader({ coupleName }: { coupleName?: string }) {
  return (
    <header className="app-header">
      <Brand />
      {coupleName && <span className="header-couple">{coupleName}</span>}
      <nav aria-label="Account navigation" className="header-nav">
        <Link href="/couple/settings">Settings</Link>
        <form action={signOut}><button type="submit" className="text-button">Sign out</button></form>
      </nav>
    </header>
  );
}
