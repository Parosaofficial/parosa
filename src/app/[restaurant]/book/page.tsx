import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/db";
import { BookClient } from "./BookClient";

// live occupancy — never cache
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ restaurant: string }> }): Promise<Metadata> {
  const { restaurant } = await params;
  const r = await getRestaurantBySlug(restaurant);
  return { title: { absolute: r ? `Book a table · ${r.name}` : "Restaurant not found" } };
}

/** The permanent booking link: parosa.food/<slug>/book */
export default async function Page({ params }: { params: Promise<{ restaurant: string }> }) {
  const { restaurant } = await params;
  const r = await getRestaurantBySlug(restaurant);
  if (!r) notFound();
  return <BookClient restaurant={r} />;
}
