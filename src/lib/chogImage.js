// src/lib/chogImage.js
const API_URL =
  (import.meta.env && import.meta.env.VITE_API_URL) || "http://127.0.0.1:8000/api";

// Folder that holds every Chog picture (1.webp ... 1969.webp)
export const CHOG_IMAGE_CID = "bafybeihau2egcccbdxymeckmmbrqytbfor5gkt3en6d5fsbueymdbq7g6e";

// Picture of Chog number N, served by our own backend
export function chogImageUrl(number) {
  return `${API_URL}/chog/image/${CHOG_IMAGE_CID}/${number}.webp`;
}

// Data files can write "chog:681"; this turns it into a real picture URL.
// Anything else (a normal URL) is returned unchanged.
export function resolveImage(ref) {
  if (typeof ref === "string" && ref.startsWith("chog:")) {
    const number = parseInt(ref.slice("chog:".length), 10);
    if (Number.isInteger(number) && number > 0) return chogImageUrl(number);
    return "";
  }
  return ref;
}

// Plain dark circle shown only if a picture cannot load (never a fake Chog)
export const EMPTY_AVATAR =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%2318122a'/></svg>";

// The Chog shown when a page does not name one (decorative avatars)
export const FEATURED_CHOG = 1777;