
CREATE TABLE public.qr_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.qr_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.qr_pages(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX qr_links_page_id_idx ON public.qr_links(page_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_pages TO anon, authenticated;
GRANT ALL ON public.qr_pages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_links TO anon, authenticated;
GRANT ALL ON public.qr_links TO service_role;

ALTER TABLE public.qr_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_links ENABLE ROW LEVEL SECURITY;

-- Public app: anyone can create and view QR pages/links
CREATE POLICY "Anyone can view qr_pages" ON public.qr_pages FOR SELECT USING (true);
CREATE POLICY "Anyone can create qr_pages" ON public.qr_pages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view qr_links" ON public.qr_links FOR SELECT USING (true);
CREATE POLICY "Anyone can create qr_links" ON public.qr_links FOR INSERT WITH CHECK (true);
