import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, X } from "lucide-react";

type Link = {
  id: string;
  label: string;
  url: string;
  image_url: string | null;
  sort_order: number;
};

export const Route = createFileRoute("/q/$pageId")({
  loader: async ({ params }) => {
    const { data: page, error } = await supabase
      .from("qr_pages")
      .select("id, title")
      .eq("id", params.pageId)
      .maybeSingle();
    if (error) throw error;
    if (!page) throw notFound();

    const { data: links, error: lerr } = await supabase
      .from("qr_links")
      .select("id, label, url, image_url, sort_order")
      .eq("page_id", params.pageId)
      .order("sort_order", { ascending: true });
    if (lerr) throw lerr;

    return { page, links: (links ?? []) as Link[] };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.page.title} — Pick a link` },
          { name: "description", content: `Choose from ${loaderData.links.length} links` },
        ]
      : [],
  }),
  component: LandingPage,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center p-6">
      <p className="text-sm text-destructive">Could not load this page: {error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">This QR link may have been removed.</p>
    </div>
  ),
});

function LandingPage() {
  const { page, links } = Route.useLoaderData();
  const [selected, setSelected] = useState<Link | null>(null);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{page.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tap a link to preview it</p>
      </header>

      {links.length === 0 ? (
        <p className="text-center text-muted-foreground">No links yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {links.map((link: Link) => (
            <li key={link.id}>
              {link.image_url ? (
                <button
                  type="button"
                  onClick={() => setSelected(link)}
                  className="group relative block w-full overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                    <img
                      src={link.image_url}
                      alt=""
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-base font-semibold text-white">
                        {link.label}
                      </span>
                      <ExternalLink className="h-4 w-4 shrink-0 text-white/80" />
                    </div>
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelected(link)}
                  className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-xl hover:shadow-primary/10 sm:h-full"
                >
                  <span className="truncate text-base font-semibold">{link.label}</span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-12 text-center">
        <a href="/" className="text-xs text-muted-foreground hover:text-foreground">
          Create your own multi-link QR →
        </a>
      </footer>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            {selected.image_url && (
              <div className="mb-4 aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
                <img src={selected.image_url} alt="" className="h-full w-full object-cover" />
              </div>
            )}

            <h2 className="text-xl font-bold">{selected.label}</h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">{selected.url}</p>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold transition hover:bg-muted"
              >
                Cancel
              </button>
              <a
                href={selected.url}
                target="_blank"
                rel="noreferrer noopener"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Open link
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
