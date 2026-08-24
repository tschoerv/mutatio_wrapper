import { GalleryClient } from "../components/gallery-client";

export default function ArtPage() {
  const botOrigin = (process.env.NEXT_PUBLIC_BOT_ORIGIN || "https://api.mutatioflies.com").replace(/\/$/, "");
  return <GalleryClient apiUrl={`${botOrigin}/api/gallery`} />;
}
