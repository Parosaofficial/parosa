import { notFound } from "next/navigation";
import { getMenu } from "@/lib/db";
import { MenuClient } from "./MenuClient";

// always fetch the latest menu (so edits show up immediately)
export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ restaurant: string; table: string }>;
}) {
  const { restaurant, table } = await params;
  const data = await getMenu(restaurant);
  if (!data) notFound();

  return (
    <MenuClient
      restaurant={data.restaurant}
      categories={data.categories}
      dishes={data.dishes}
      table={table}
    />
  );
}
