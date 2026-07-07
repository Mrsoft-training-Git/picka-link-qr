import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink } from "lucide-react";

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
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [] };
    const meta: any[] = [
      { title: `${loaderData.page.title} — Pick a link` },
      { name: "description", content: `Choose from ${loaderData.links.length} links` },
    ];
    if (loaderData.links.length === 1) {
      meta.push({ httpEquiv: "refresh", content: `0;url=${loaderData.links[0].url}` });
    }
    return { meta };
  },
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

  useEffect(() => {
    if (links.length === 1) {
      window.location.href = links[0].url;
    }
  }, [links]);

  if (links.length === 1) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-muted-foreground">Redirecting…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {/* Dimmed backdrop */}
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" aria-hidden="true" />

      {/* Popup that appears immediately on scan */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-popup-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <header className="mb-5 text-center">
            <h2 id="qr-popup-title" className="text-2xl font-bold tracking-tight">
              {page.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a link to open
            </p>
          </header>

          {links.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No links yet.</p>
          ) : (
            <ul className="space-y-3">
              {links.map((link: Link) => (
                <li key={link.id}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition hover:border-primary hover:bg-muted"
                  >
                    {link.image_url ? (
                      <img
                        src={link.image_url}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                        {link.label.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="min-w-0 flex-1 truncate text-base font-semibold">
                      {link.label}
                    </span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                  </a>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-5 text-center text-[11px] text-muted-foreground">
            <a href="/" className="hover:text-foreground">Create your own multi-link QR →</a>
          </p>
        </div>
      </div>
    </main>
  );
}
