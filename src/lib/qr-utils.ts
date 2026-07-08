import QRCode from "qrcode";

export type QrOptions = {
  logo?: string; // data URL of center logo
  logoScale?: number; // 0-1 fraction of QR size, default 0.22
};

async function drawWithLogo(
  qrDataUrl: string,
  size: number,
  logo: string,
  logoScale: number,
  outputType: "image/png" | "image/jpeg",
  quality?: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const qrImg = new Image();
    qrImg.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no ctx"));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(qrImg, 0, 0, size, size);

      const logoImg = new Image();
      logoImg.onload = () => {
        const logoSize = Math.round(size * logoScale);
        const pad = Math.round(logoSize * 0.12);
        const boxSize = logoSize + pad * 2;
        const x = Math.round((size - boxSize) / 2);
        const y = Math.round((size - boxSize) / 2);
        const radius = Math.round(boxSize * 0.18);

        // White rounded background for readability
        ctx.fillStyle = "#ffffff";
        roundedRect(ctx, x, y, boxSize, boxSize, radius);
        ctx.fill();

        // Clip logo to rounded square
        ctx.save();
        roundedRect(ctx, x + pad, y + pad, logoSize, logoSize, Math.round(radius * 0.7));
        ctx.clip();
        ctx.drawImage(logoImg, x + pad, y + pad, logoSize, logoSize);
        ctx.restore();

        resolve(canvas.toDataURL(outputType, quality));
      };
      logoImg.onerror = reject;
      logoImg.src = logo;
    };
    qrImg.onerror = reject;
    qrImg.src = qrDataUrl;
  });
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function generateQrPng(
  text: string,
  size = 1024,
  options: QrOptions = {},
): Promise<string> {
  const base = await QRCode.toDataURL(text, {
    errorCorrectionLevel: options.logo ? "H" : "M",
    margin: 2,
    width: size,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });
  if (!options.logo) return base;
  return drawWithLogo(base, size, options.logo, options.logoScale ?? 0.22, "image/png");
}

export async function generateQrSvg(text: string, options: QrOptions = {}): Promise<string> {
  const svg = await QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: options.logo ? "H" : "M",
    margin: 2,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });
  if (!options.logo) return svg;
  // Embed logo as centered <image> with white rounded background.
  const scale = options.logoScale ?? 0.22;
  const viewMatch = svg.match(/viewBox="([\d.\-\s]+)"/);
  if (!viewMatch) return svg;
  const [, , vw, vh] = viewMatch[1].split(/\s+/).map(Number);
  const size = Math.min(vw, vh);
  const logoSize = size * scale;
  const pad = logoSize * 0.12;
  const boxSize = logoSize + pad * 2;
  const x = (vw - boxSize) / 2;
  const y = (vh - boxSize) / 2;
  const radius = boxSize * 0.18;
  const overlay = `<rect x="${x}" y="${y}" width="${boxSize}" height="${boxSize}" rx="${radius}" ry="${radius}" fill="#ffffff"/><image href="${options.logo}" x="${x + pad}" y="${y + pad}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid slice"/>`;
  return svg.replace("</svg>", `${overlay}</svg>`);
}

export async function generateQrJpg(
  text: string,
  size = 1024,
  options: QrOptions = {},
): Promise<string> {
  const pngDataUrl = await generateQrPng(text, size, options);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no ctx"));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = reject;
    img.src = pngDataUrl;
  });
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadSvg(svg: string, filename: string) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Resize + compress an image File into a data URL (JPEG) suitable for storage.
export function fileToCompressedDataUrl(
  file: File,
  maxDim = 800,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no ctx"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
