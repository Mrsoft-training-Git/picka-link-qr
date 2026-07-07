import { createFileRoute, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink } from "lucide-react";

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

    return { page, links: links ?? [] };
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

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{page.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tap a link to open it</p>
      </header>

      {links.length === 0 ? (
        <p className="text-center text-muted-foreground">No links yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {links.map((link) => (
            <li key={link.id}>
              {link.image_url ? (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group relative block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10"
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
                </a>
              ) : (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-xl hover:shadow-primary/10 sm:h-full"
                >
                  <span className="truncate text-base font-semibold">{link.label}</span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-12 text-center">
        <a
          href="/"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Create your own multi-link QR →
        </a>
      </footer>
    </main>
  );
}
