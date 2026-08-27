"use client";

/* Artwork is served by the separate storage service, without an image proxy. */
/* eslint-disable @next/next/no-img-element */

import { useDeferredValue, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

const PRESET_WORK_COUNT = 239;
const PRESET_ARTIST_COUNT = 206;
const GALLERY_FETCH_ATTEMPTS = 3;
const GALLERY_RETRY_DELAYS_MS = [700, 1_500];
const GALLERY_REQUEST_TIMEOUT_MS = 5_000;

export type GalleryArtwork = {
  id: string;
  artist: string;
  title: string;
  handle: string | null;
  altText: string;
  kind: "image" | "video";
  originalUrl: string;
  thumbnailUrl: string;
  createdAt: string;
};

type AudioAwareVideo = HTMLVideoElement & {
  audioTracks?: { length: number };
  mozHasAudio?: boolean;
  webkitAudioDecodedByteCount?: number;
};

export function GalleryClient({ apiUrl }: { apiUrl: string }) {
  const [artworks, setArtworks] = useState<GalleryArtwork[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [kind, setKind] = useState<"all" | "image" | "video">("all");
  const [sort, setSort] = useState<"artist" | "title" | "random">("random");
  const [ascending, setAscending] = useState(true);
  const [sortInteracted, setSortInteracted] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [selected, setSelected] = useState<GalleryArtwork | null>(null);
  const selectedVideoRef = useRef<HTMLVideoElement>(null);
  const [selectedVideoHasAudio, setSelectedVideoHasAudio] = useState(false);
  const [selectedVideoMuted, setSelectedVideoMuted] = useState(true);
  const artistCount = useMemo(() => new Set(artworks.map((item) => item.artist.toLowerCase())).size, [artworks]);

  const openArtwork = (artwork: GalleryArtwork) => {
    setSelectedVideoHasAudio(false);
    setSelectedVideoMuted(true);
    setSelected(artwork);
  };

  const toggleSelectedAudio = () => {
    const video = selectedVideoRef.current;
    if (!video) return;
    const nextMuted = !selectedVideoMuted;
    video.muted = nextMuted;
    setSelectedVideoMuted(nextMuted);
    if (!nextMuted) video.play().catch(() => undefined);
  };

  useEffect(() => {
    setShuffleSeed(createShuffleSeed());
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadGallery() {
      for (let attempt = 0; attempt < GALLERY_FETCH_ATTEMPTS; attempt += 1) {
        try {
          const response = await fetchGallery(apiUrl, controller.signal);
          if (!response.ok) throw new Error(String(response.status));
          const payload = await response.json() as { artworks: GalleryArtwork[] };
          if (!Array.isArray(payload.artworks)) throw new Error("Invalid gallery response");
          setArtworks(payload.artworks);
          setLoadFailed(false);
          setLoaded(true);
          return;
        } catch {
          if (controller.signal.aborted) return;
          if (attempt === GALLERY_FETCH_ATTEMPTS - 1) {
            setLoadFailed(true);
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, GALLERY_RETRY_DELAYS_MS[attempt]));
          if (controller.signal.aborted) return;
        }
      }
    }
    void loadGallery();
    return () => controller.abort();
  }, [apiUrl]);

  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const list = artworks.filter((item) =>
      (kind === "all" || item.kind === kind) &&
      (!needle || `${item.artist} ${item.title}`.toLowerCase().includes(needle)),
    );
    if (sort === "artist" || sort === "title") {
      return [...list].sort((a, b) => {
        const comparison = a[sort].localeCompare(b[sort]);
        return ascending ? comparison : -comparison;
      });
    }
    if (sort === "random") return shuffleArtworks(list, shuffleSeed);
    return list;
  }, [artworks, ascending, deferredQuery, kind, shuffleSeed, sort]);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKeyDown);
    document.body.classList.add("modal-open");
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("modal-open");
    };
  }, [selected]);

  return (
    <main className="site-shell art-shell">
      <SiteHeader current="art" />
      <section className="public-intro">
        <h1>FLIES Art Gallery</h1>
        <div className="public-stats" aria-label="Archive totals">
          <div><strong>{loaded ? artworks.length : PRESET_WORK_COUNT}</strong><span>Works</span></div>
          <div><strong>{loaded ? artistCount : PRESET_ARTIST_COUNT}</strong><span>Artists</span></div>
        </div>
      </section>

      <section className="public-archive" id="archive">
        <div className="public-section-heading">
          <span>{loaded ? filtered.length : PRESET_WORK_COUNT} visible</span>
        </div>
        <div className="public-controls" role="search">
          <label className="public-search"><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Artist or work" aria-label="Search gallery" /></label>
          <div className="public-filter-row">
            <div className="public-segmented" aria-label="Filter by media type">
              {(["image", "video"] as const).map((value) => <button key={value} className={kind === value ? "active" : ""} aria-pressed={kind === value} onClick={() => setKind((current) => current === value ? "all" : value)}>{value}</button>)}
            </div>
            <label className="public-sort"><select aria-label="Sort gallery" value={sortInteracted ? sort : ""} onPointerDown={() => setSortInteracted(true)} onFocus={() => setSortInteracted(true)} onChange={(event) => {
              const value = event.target.value as typeof sort;
              setSort(value);
              if (value === "random") setShuffleSeed(createShuffleSeed());
            }}>{!sortInteracted && <option value="" disabled>Sort</option>}<option value="artist">Artist</option><option value="title">Name</option><option value="random">Random</option></select></label>
            <button className="public-sort-order" type="button" aria-label={ascending ? "Sort Z to A" : "Sort A to Z"} disabled={!sortInteracted || sort === "random"} onClick={() => setAscending((current) => !current)}>{ascending ? "A→Z" : "Z→A"}</button>
          </div>
        </div>

        {loadFailed ? <div className="public-empty">Gallery unavailable</div> : !loaded ? (
          <div className="public-loading" role="status" aria-live="polite"><span className="public-loading-spinner" aria-hidden="true" />Loading gallery</div>
        ) : filtered.length ? (
          <div className="public-art-grid">
            {filtered.map((artwork) => (
              <button className="public-art-card" key={artwork.id} onClick={() => openArtwork(artwork)} aria-label={`Open ${artwork.title} by ${artwork.artist}`}>
                <span className="public-art-frame">{artwork.kind === "video" ? <GalleryVideo artwork={artwork} /> : <img src={artwork.thumbnailUrl} alt={artwork.altText} loading="lazy" />}</span>
                <span className="public-caption"><span><strong>{artwork.title}</strong><small>{artwork.artist}</small></span><span>↗</span></span>
              </button>
            ))}
          </div>
        ) : artworks.length ? <div className="public-empty">No results</div> : null}
      </section>

      <SiteFooter current="art" />

      {selected && (
        <div className="art-modal" role="dialog" aria-modal="true" aria-label={`${selected.title} by ${selected.artist}`}>
          <button className="modal-backdrop" onClick={() => setSelected(null)} aria-label="Close artwork" />
          <button className="modal-close" onClick={() => setSelected(null)} aria-label="Close artwork">Close ×</button>
          <div className="modal-media">
            {selected.kind === "video" ? (
              // Artwork videos may not contain speech, so no generated caption track is attached.
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <ArtworkVideo artwork={selected} videoRef={selectedVideoRef} hasAudio={selectedVideoHasAudio} muted={selectedVideoMuted} onAudioDetected={() => setSelectedVideoHasAudio(true)} />
            ) : <img src={selected.originalUrl} alt={selected.altText} />}
          </div>
          <div className="modal-caption"><div><p>{selected.title}</p><a href={selected.handle ? `https://x.com/${selected.handle}` : undefined} target="_blank" rel="noreferrer">{selected.artist}{selected.handle ? " ↗" : ""}</a></div><div className="modal-links"><a className="download-link" href={downloadUrl(selected.originalUrl)} download>Download ↓</a>{selected.kind === "video" && selectedVideoHasAudio && <button className="modal-audio-link" type="button" onClick={toggleSelectedAudio}>{selectedVideoMuted ? "Unmute" : "Mute"}</button>}</div></div>
        </div>
      )}
    </main>
  );
}

async function fetchGallery(apiUrl: string, pageSignal: AbortSignal): Promise<Response> {
  const requestController = new AbortController();
  const abortRequest = () => requestController.abort();
  if (pageSignal.aborted) abortRequest();
  else pageSignal.addEventListener("abort", abortRequest, { once: true });
  const timeout = setTimeout(abortRequest, GALLERY_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(apiUrl, { signal: requestController.signal });
  } finally {
    clearTimeout(timeout);
    pageSignal.removeEventListener("abort", abortRequest);
  }
}

function ArtworkVideo({ artwork, videoRef, hasAudio, muted, onAudioDetected }: { artwork: GalleryArtwork; videoRef: RefObject<HTMLVideoElement | null>; hasAudio: boolean; muted: boolean; onAudioDetected: () => void }) {
  const detectAudio = () => {
    const video = videoRef.current as AudioAwareVideo | null;
    if (!video) return;
    if (video.mozHasAudio || (video.webkitAudioDecodedByteCount ?? 0) > 0 || (video.audioTracks?.length ?? 0) > 0) onAudioDetected();
  };

  return <video ref={videoRef} src={artwork.originalUrl} poster={artwork.thumbnailUrl} autoPlay muted={muted} loop playsInline onLoadedMetadata={detectAudio} onCanPlay={detectAudio} onTimeUpdate={hasAudio ? undefined : detectAudio} />;
}

function GalleryVideo({ artwork }: { artwork: GalleryArtwork }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [nearViewport, setNearViewport] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNearViewport(true);
        video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    }, { rootMargin: "160px" });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (nearViewport) videoRef.current?.play().catch(() => undefined);
  }, [nearViewport]);

  return <video ref={videoRef} src={nearViewport ? artwork.originalUrl : undefined} poster={artwork.thumbnailUrl} autoPlay muted loop playsInline preload="none" aria-hidden="true" />;
}

function createShuffleSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

function shuffleArtworks(artworks: GalleryArtwork[], seed: number): GalleryArtwork[] {
  const shuffled = [...artworks];
  let state = seed || 0x6d2b79f5;
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = (state + 0x6d2b79f5) | 0;
    let random = state;
    random = Math.imul(random ^ (random >>> 15), random | 1);
    random ^= random + Math.imul(random ^ (random >>> 7), random | 61);
    const swapIndex = Math.floor((((random ^ (random >>> 14)) >>> 0) / 4294967296) * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function downloadUrl(originalUrl: string): string {
  const url = new URL(originalUrl);
  url.searchParams.set("download", "1");
  return url.toString();
}
