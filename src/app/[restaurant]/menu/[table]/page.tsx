import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMenu } from "@/lib/db";
import { MenuClient } from "./MenuClient";
import "./parosa-look.css";

// always fetch the latest menu (so edits show up immediately)
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ restaurant: string; table: string }> }): Promise<Metadata> {
  const { restaurant, table } = await params;
  const data = await getMenu(restaurant);
  // a guest's tab shows the restaurant, not Parosa
  return { title: { absolute: data ? `${data.restaurant.name} · Menu · Table ${table}` : "Menu not found" } };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ restaurant: string; table: string }>;
  searchParams: Promise<{ preview?: string; theme?: string }>;
}) {
  const { restaurant, table } = await params;
  const { preview, theme } = await searchParams;
  const data = await getMenu(restaurant);
  if (!data) notFound();

  // every restaurant uses the one Parosa design (Settings → Menu design shows it);
  // ?preview just lets the owner look at their menu without a table session

  return (
    <MenuClient
      restaurant={data.restaurant}
      categories={data.categories}
      dishes={data.dishes}
      table={table}
      template="parosa"
      theme="default"
      preview={!!preview || !!theme}
    />
  );
}
