import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  generateQrPng,
  generateQrSvg,
  generateQrJpg,
  downloadDataUrl,
  downloadSvg,
  fileToCompressedDataUrl,
} from "@/lib/qr-utils";
import { Plus, Trash2, Download, Link2, Upload, QrCode, Copy, Check } from "lucide-react";

export const Route = createFileRoute("/")({
  component: CreatePage,
});

type LinkDraft = {
  id: string;
  label: string;
  url: string;
  image?: string; // data URL
};

function newDraft(): LinkDraft {
  return { id: crypto.randomUUID(), label: "", url: "", image: undefined };
}

function CreatePage() {
  const [title, setTitle] = useState("");
  const [links, setLinks] = useState<LinkDraft[]>([newDraft(), newDraft()]);
  const [centerLogo, setCenterLogo] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; url: string; logo?: string } | null>(null);
  const [qrPng, setQrPng] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!result) return;
    generateQrPng(result.url, 1024, { logo: result.logo }).then(setQrPng);
  }, [result]);

  async function handleCenterLogo(file: File) {
    try {
      const dataUrl = await fileToCompressedDataUrl(file, 512, 0.9);
      setCenterLogo(dataUrl);
    } catch {
      setError("Could not read image");
    }
  }

  function updateLink(id: string, patch: Partial<LinkDraft>) {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function removeLink(id: string) {
    setLinks((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  }
  function addLink() {
    setLinks((prev) => [...prev, newDraft()]);
  }

  async function handleImage(id: string, file: File) {
    try {
      const dataUrl = await fileToCompressedDataUrl(file, 800, 0.82);
      updateLink(id, { image: dataUrl });
    } catch {
      setError("Could not read image");
    }
  }

  function normalizeUrl(u: string) {
    const trimmed = u.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  async function handleCreate() {
    setError(null);
    if (!title.trim()) return setError("Please enter a title");
    const cleaned = links
      .map((l) => ({ ...l, url: normalizeUrl(l.url), label: l.label.trim() }))
      .filter((l) => l.label && l.url);
    if (cleaned.length < 1) return setError("Add at least one link with a name and URL");

    setSaving(true);
    try {
      const { data: page, error: pageErr } = await supabase
        .from("qr_pages")
        .insert({ title: title.trim() })
        .select("id")
        .single();
      if (pageErr || !page) throw pageErr ?? new Error("Failed to create page");

      const rows = cleaned.map((l, i) => ({
        page_id: page.id,
        label: l.label,
        url: l.url,
        image_url: l.image ?? null,
        sort_order: i,
      }));
      const { error: linksErr } = await supabase.from("qr_links").insert(rows);
      if (linksErr) throw linksErr;

      const url = `${window.location.origin}/q/${page.id}`;
      setResult({ id: page.id, url, logo: centerLogo });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function download(format: "png" | "svg" | "jpg") {
    if (!result) return;
    const fname = `qr-${result.id.slice(0, 8)}`;
    const opts = { logo: result.logo };
    if (format === "png") {
      const d = await generateQrPng(result.url, 2048, opts);
      downloadDataUrl(d, `${fname}.png`);
    } else if (format === "svg") {
      const s = await generateQrSvg(result.url, opts);
      downloadSvg(s, `${fname}.svg`);
    } else {
      const d = await generateQrJpg(result.url, 2048, opts);
      downloadDataUrl(d, `${fname}.jpg`);
    }
  }

  function copyLink() {
    if (!result) return;
    navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setTitle("");
    setLinks([newDraft(), newDraft()]);
    setCenterLogo(undefined);
    setResult(null);
    setQrPng("");
  }

  if (result) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-xl shadow-primary/5 sm:p-12">
          <div className="text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <QrCode className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-3xl font-bold">Your QR is ready</h1>
            <p className="mt-2 text-muted-foreground">
              Scanners see a picker page with all your links.
            </p>
          </div>

          <div className="mt-8 flex justify-center">
            <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-black/5">
              {qrPng ? (
                <img src={qrPng} alt="QR code" className="h-64 w-64" />
              ) : (
                <div className="h-64 w-64 animate-pulse rounded bg-muted" />
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm">
            <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-mono text-xs sm:text-sm">{result.url}</span>
            <button
              onClick={copyLink}
              className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium hover:bg-background"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            {(["png", "svg", "jpg"] as const).map((f) => (
              <button
                key={f}
                onClick={() => download(f)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90"
              >
                <Download className="h-4 w-4" />
                {f.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <a
              href={result.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Preview landing page
            </a>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Create another
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <header className="mb-10 text-center">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <QrCode className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          One QR, many links
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Bundle multiple destinations into a single QR code. When someone scans it,
          they pick where to go.
        </p>
      </header>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">
        <label className="block">
          <span className="text-sm font-semibold">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. My links"
            className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <div className="mt-6">
          <span className="text-sm font-semibold">Center logo (optional)</span>
          <p className="mt-1 text-xs text-muted-foreground">
            Adds a small image to the middle of your QR code.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted transition hover:border-primary"
              aria-label="Upload center logo"
            >
              {centerLogo ? (
                <img src={centerLogo} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground">
                  <Upload className="h-5 w-5" />
                  <span className="mt-0.5 text-[10px]">Upload</span>
                </div>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleCenterLogo(f);
                  e.target.value = "";
                }}
              />
            </button>
            {centerLogo && (
              <button
                type="button"
                onClick={() => setCenterLogo(undefined)}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Remove logo
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Links</h2>
            <span className="text-xs text-muted-foreground">{links.length} added</span>
          </div>

          {links.map((link, idx) => (
            <LinkRow
              key={link.id}
              index={idx}
              link={link}
              onChange={(patch) => updateLink(link.id, patch)}
              onRemove={() => removeLink(link.id)}
              onImage={(file) => handleImage(link.id, file)}
              canRemove={links.length > 1}
            />
          ))}

          <button
            type="button"
            onClick={addLink}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
          >
            <Plus className="h-4 w-4" />
            Add another link
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={saving}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          <QrCode className="h-5 w-5" />
          {saving ? "Generating…" : "Generate QR code"}
        </button>
      </div>
    </main>
  );
}

function LinkRow({
  index,
  link,
  onChange,
  onRemove,
  onImage,
  canRemove,
}: {
  index: number;
  link: LinkDraft;
  onChange: (patch: Partial<LinkDraft>) => void;
  onRemove: () => void;
  onImage: (f: File) => void;
  canRemove: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-2xl border border-border bg-background/50 p-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted transition hover:border-primary"
          aria-label="Upload image"
        >
          {link.image ? (
            <img src={link.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground">
              <Upload className="h-4 w-4" />
              <span className="mt-0.5 text-[10px]">Image</span>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImage(f);
              e.target.value = "";
            }}
          />
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          <input
            value={link.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder={`Link ${index + 1} name`}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <input
            value={link.url}
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="https://example.com"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          className="shrink-0 rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
          aria-label="Remove link"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {link.image && (
        <button
          type="button"
          onClick={() => onChange({ image: undefined })}
          className="mt-2 text-xs text-muted-foreground hover:text-destructive"
        >
          Remove image
        </button>
      )}
    </div>
  );
}
