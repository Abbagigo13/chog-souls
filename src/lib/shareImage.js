// src/lib/shareImage.js
import html2canvas from "html2canvas";

/**
 * Draw an image (a Chog picture) onto a canvas and return it as a PNG data URL.
 * html2canvas can be unreliable with remote images, so the share card is given
 * this ready-made PNG instead.
 */
export function imageToPngDataUrl(imageUrl, size = 400) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (err) => reject(err);
    img.src = imageUrl;
  });
}

// Old name, kept so nothing that still imports it breaks
export const svgToPngDataUrl = imageToPngDataUrl;

/**
 * Render a DOM element to a PNG data URL.
 */
export async function renderToPng(element) {
  const canvas = await html2canvas(element, {
    backgroundColor: "#0b0814",
    scale: 2,
    useCORS: true,
    logging: false,
    width: 1200,
    height: 630,
  });
  return canvas.toDataURL("image/png");
}

/**
 * Download a PNG data URL as a file.
 */
export function downloadPng(dataUrl, filename = "chog-soul.png") {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Share to X (Twitter).
 */
export function shareToX(soul) {
  const text = encodeURIComponent(
    `Meet ${soul.name}, "${soul.archetype}" — a living Chog Soul on Monad.\n\n` +
    `Level ${soul.level} · ${soul.xp}/${soul.xp_to_next_level} XP\n\n` +
    `#CHOGSOULS #Monad #NFT`
  );
  const url = `https://twitter.com/intent/tweet?text=${text}`;
  window.open(url, "_blank", "noopener,noreferrer");
}