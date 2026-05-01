import { Link } from "@tanstack/react-router";
import logo from "@/assets/kvs-logo.png";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="KVS logo" className="h-9 w-9 object-contain" />
          <div className="leading-tight">
            <div className="font-serif text-lg font-semibold tracking-tight">
              KVS Arrangement
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              PM SHRI KVS No. 2
            </div>
          </div>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/student"
            className="rounded-md px-3 py-2 text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
            activeProps={{ className: "rounded-md px-3 py-2 bg-accent text-foreground" }}
          >
            Student
          </Link>
          <Link
            to="/admin/login"
            className="rounded-md px-3 py-2 text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
            activeProps={{ className: "rounded-md px-3 py-2 bg-accent text-foreground" }}
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
