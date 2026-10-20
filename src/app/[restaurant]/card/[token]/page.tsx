import type { Metadata } from "next";
import { CardClient } from "./CardClient";

// the stamp count changes on every paid bill — never cache it
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { absolute: "Your stamp card" }, robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ restaurant: string; token: string }> }) {
  const { restaurant, token } = await params;
  return <CardClient slug={restaurant} token={token} />;
}
