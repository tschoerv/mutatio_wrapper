import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "./providers";
import { FlySwarmLayer } from "./components/fly-swarm";

const siteOrigin = "https://mutatioflies.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  alternates: { canonical: "/" },
  title: "MUTATIO $FLIES",
  description: "MUTATIO NFT to $FLIES wrapper",
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
  openGraph: {
    title: "MUTATIO $FLIES",
    description: "MUTATIO NFT to $FLIES wrapper",
    type: "website",
    url: "/",
    images: [{ url: "/FLIES_banner.jpg", width: 1200, height: 630, alt: "MUTATIO $FLIES" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MUTATIO $FLIES",
    description: "MUTATIO NFT to $FLIES wrapper",
    images: ["/FLIES_banner.jpg"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <WalletProvider>{children}<FlySwarmLayer /></WalletProvider>
      </body>
    </html>
  );
}
