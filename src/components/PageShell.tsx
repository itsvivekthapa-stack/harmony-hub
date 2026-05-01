import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { Footer } from "./Footer";

export function PageShell({
  children,
  withHeader = true,
}: {
  children: ReactNode;
  withHeader?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {withHeader && <SiteHeader />}
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
