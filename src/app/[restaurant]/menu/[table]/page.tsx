import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMenu } from "@/lib/db";
import { MenuClient } from "./MenuClient";

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

  // preview lets the owner see a template from the Templates page before applying;
  // otherwise the customer sees the restaurant's saved template.
  const template = preview || data.restaurant.template || "virasat";
  const themeId = theme || data.restaurant.theme || "default";

  return (
    <MenuClient
      restaurant={data.restaurant}
      categories={data.categories}
      dishes={data.dishes}
      table={table}
      template={template}
      theme={themeId}
    />
  );
}
