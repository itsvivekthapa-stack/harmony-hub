import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Key, ArrowUpRight } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import logo from "@/assets/kvs-logo.png";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <PageShell>
      <section className="relative overflow-hidden bg-grid-faint">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-16 text-center sm:py-24">
          <img
            src={logo}
            alt="KVS emblem"
            className="h-28 w-28 object-contain sm:h-32 sm:w-32"
          />
          <p className="mt-8 text-xs font-medium uppercase tracking-[0.32em] text-muted-foreground sm:text-sm">
            PM SHRI Kendriya Vidyalaya No. 2
          </p>
          <h1 className="mt-2 font-serif text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            KVS Arrangement
          </h1>

          <div className="mt-12 grid w-full max-w-4xl gap-5 sm:grid-cols-2">
            <RoleCard
              to="/student"
              icon={<BookOpen className="h-6 w-6" />}
              label="Student"
              tone="gold"
            />
            <RoleCard
              to="/admin/login"
              icon={<Key className="h-6 w-6" />}
              label="Admin"
              tone="maroon"
            />
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function RoleCard({
  to,
  icon,
  label,
  tone,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  tone: "gold" | "maroon";
}) {
  const accent =
    tone === "gold"
      ? "bg-[oklch(0.96_0.05_82)] text-[oklch(0.45_0.12_70)]"
      : "bg-[oklch(0.96_0.03_25)] text-maroon";
  return (
    <Link
      to={to}
      className="group relative flex h-44 flex-col justify-between rounded-2xl border border-border/70 bg-card p-6 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated sm:h-56 sm:p-8"
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent}`}>
          {icon}
        </div>
        <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
      <div className="font-serif text-3xl font-semibold tracking-[0.2em] text-foreground sm:text-4xl">
        {label.toUpperCase()}
      </div>
    </Link>
  );
}
