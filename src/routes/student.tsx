import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Calendar, Loader2, FileText } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

type Arrangement = {
  id: string;
  title: string;
  note: string | null;
  file_url: string;
  file_type: string;
  arrangement_date: string;
  is_active: boolean;
  created_at: string;
};

export const Route = createFileRoute("/student")({
  head: () => ({
    meta: [
      { title: "Student View — KVS Arrangement" },
      {
        name: "description",
        content:
          "View the latest teacher arrangement for PM SHRI KVS No. 2 along with previous schedules.",
      },
    ],
  }),
  component: StudentPage,
});

function StudentPage() {
  const [items, setItems] = useState<Arrangement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Arrangement | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("arrangements")
        .select("*")
        .order("is_active", { ascending: false })
        .order("arrangement_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(60);
      const list = (data ?? []) as Arrangement[];
      setItems(list);
      setSelected(list.find((i) => i.is_active) ?? list[0] ?? null);
      setLoading(false);
    })();
  }, []);

  const previous = items.filter((i) => i.id !== selected?.id);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {loading ? (
          <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !selected ? (
          <EmptyState />
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  {selected.is_active ? "Today's Active Arrangement" : "Arrangement"}
                </p>
                <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                  {selected.title}
                </h1>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(selected.arrangement_date), "EEEE, d MMMM yyyy")}
                </div>
              </div>
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:opacity-90">
                <a href={selected.file_url} download target="_blank" rel="noreferrer">
                  <Download className="mr-2 h-4 w-4" /> Download
                </a>
              </Button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
              {selected.file_type === "image" ? (
                <img
                  key={selected.id}
                  src={selected.file_url}
                  alt={selected.title}
                  className="h-auto max-h-[78vh] w-full animate-in fade-in object-contain"
                />
              ) : (
                <iframe
                  key={selected.id}
                  src={selected.file_url}
                  title={selected.title}
                  className="h-[78vh] w-full"
                />
              )}
            </div>

            {selected.note && (
              <p className="mt-4 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                {selected.note}
              </p>
            )}

            {previous.length > 0 && (
              <div className="mt-12">
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="font-serif text-2xl font-semibold">Previous arrangements</h2>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {previous.map((it) => (
                    <button
                      key={it.id}
                      onClick={() => setSelected(it)}
                      className="group overflow-hidden rounded-xl border border-border bg-card text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated"
                    >
                      <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-muted">
                        {it.file_type === "image" ? (
                          <img
                            src={it.file_url}
                            alt={it.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                        ) : (
                          <FileText className="h-10 w-10 text-muted-foreground" />
                        )}
                      </div>
                      <div className="px-3 py-3">
                        <div className="line-clamp-1 text-sm font-medium">{it.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(it.arrangement_date), "d MMM yyyy")}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </PageShell>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto flex h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent">
        <FileText className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="mt-4 font-serif text-2xl font-semibold">No arrangement yet</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The latest arrangement will appear here once an admin uploads it.
      </p>
    </div>
  );
}
