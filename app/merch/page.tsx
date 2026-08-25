import type { Metadata } from "next";
import { MerchInterface } from "../components/merch-interface";

export const metadata: Metadata = {
  alternates: { canonical: "/merch" },
  title: "DIY Merch Patch · MUTATIO $FLIES",
  description: "Mint and redeem the MUTATIO $FLIES physical iron-on patch.",
  openGraph: {
    title: "DIY Merch Patch · MUTATIO $FLIES",
    description: "Mint and redeem the MUTATIO $FLIES physical iron-on patch.",
    type: "website",
    url: "/merch",
    images: [{ url: "/FLIES_banner.jpg", width: 1200, height: 630, alt: "MUTATIO $FLIES" }],
  },
};

export default function MerchPage() {
  return <MerchInterface />;
}
