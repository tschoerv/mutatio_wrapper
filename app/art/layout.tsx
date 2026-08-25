import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/art" },
  title: "FLIES Art Gallery",
  description: "FLIES Art Gallery",
  openGraph: {
    title: "FLIES Art Gallery",
    description: "FLIES Art Gallery",
    type: "website",
    url: "/art",
    images: [{ url: "/FLIES_banner.jpg", width: 1200, height: 630, alt: "FLIES Art Gallery" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "FLIES Art Gallery",
    description: "FLIES Art Gallery",
    images: ["/FLIES_banner.jpg"],
  },
};

export default function ArtLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
