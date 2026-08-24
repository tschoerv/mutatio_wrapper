import type { Metadata } from "next";
import { MerchInterface } from "../components/merch-interface";

export const metadata: Metadata = {
  title: "DIY Merch Patch · MUTATIO $FLIES",
  description: "Mint and redeem the MUTATIO $FLIES physical iron-on patch.",
};

export default function MerchPage() {
  return <MerchInterface />;
}
