import { Brand } from "./brand";

export function AuthShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="auth-layout">
      <div className="auth-art">
        <Brand />
      </div>
      <section className="auth-content">{children}</section>
    </main>
  );
}
