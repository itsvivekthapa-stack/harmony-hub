import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { Footer } from "@/components/Footer";
import logo from "@/assets/kvs-logo.png";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="max-w-md text-center">
          <img src={logo} alt="KVS" className="mx-auto mb-6 h-14 w-14 object-contain" />
          <h1 className="font-serif text-7xl font-semibold text-foreground">404</h1>
          <h2 className="mt-2 text-xl font-medium">Page not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The page you're looking for doesn't exist.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              Return home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "KVS Arrangement — PM SHRI KVS No. 2" },
      {
        name: "description",
        content:
          "Official daily arrangement portal for PM SHRI Kendriya Vidyalaya No. 2. View the latest teacher arrangement and previous schedules.",
      },
      { name: "author", content: "Vivek Thapa & Nikunj Kumar" },
      { property: "og:title", content: "KVS Arrangement — PM SHRI KVS No. 2" },
      { property: "og:description", content: "Official arrangement portal for PM SHRI KVS No. 2." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster richColors position="top-center" />
    </AuthProvider>
  );
}
