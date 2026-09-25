import { readFile, writeFile } from "node:fs/promises";

const apiOrigin = process.env.MUTATIO_GALLERY_API_ORIGIN ?? "https://api.mutatioflies.com";
const response = await fetch(new URL("/api/gallery", apiOrigin), { headers: { accept: "application/json" } });

if (!response.ok) throw new Error(`Gallery request failed with ${response.status}`);

const payload = await response.json();
if (!Array.isArray(payload.artworks)) throw new Error("Gallery response did not contain an artworks array");

const workCount = payload.artworks.length;
const artistCount = new Set(payload.artworks.map((artwork) => {
  if (typeof artwork.artist !== "string" || !artwork.artist.trim()) throw new Error("Gallery artwork is missing an artist");
  return artwork.artist.trim().toLocaleLowerCase("en-US");
})).size;

const galleryFile = new URL("../app/components/gallery-client.tsx", import.meta.url);
const current = await readFile(galleryFile, "utf8");
if (!/const PRESET_WORK_COUNT = \d+;/.test(current) || !/const PRESET_ARTIST_COUNT = \d+;/.test(current)) {
  throw new Error("Gallery count constants were not found");
}
const updated = current
  .replace(/const PRESET_WORK_COUNT = \d+;/, `const PRESET_WORK_COUNT = ${workCount};`)
  .replace(/const PRESET_ARTIST_COUNT = \d+;/, `const PRESET_ARTIST_COUNT = ${artistCount};`);

if (updated !== current) await writeFile(galleryFile, updated);
console.log(`${updated === current ? "Gallery counters already current" : "Updated gallery counters"}: ${workCount} works, ${artistCount} artists`);
