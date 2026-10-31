import type { Metadata } from "next";
import { DISH_LIBRARY } from "@/lib/dishLibrary";
import "./credits.css";

export const metadata: Metadata = { title: "Dish photo credits" };

/** Credits for the shared dish photos (CC BY / CC BY-SA ask for the photographer's name and the licence). */
export default function PhotoCredits() {
  return (
    <main className="pc">
      <h1>Dish photo credits</h1>
      <p>
        Parosa menus can use ready photos of common dishes. They come from Pexels, whose licence allows free commercial use.
        Thank you to the photographers. Each photo was cropped square and resized. Restaurants can always replace them with their
        own photos.
      </p>
      <ul>
        {DISH_LIBRARY.map((d) => (
          <li key={d.slug}>
            <b>{d.name}</b> — photo on {d.credit.by}
            {d.credit.source && <> · <a href={d.credit.source} target="_blank" rel="noopener noreferrer">source</a></>}
            {" · "}
            {d.credit.license_url ? <a href={d.credit.license_url} target="_blank" rel="noopener noreferrer license">{d.credit.license}</a> : d.credit.license}
          </li>
        ))}
      </ul>
    </main>
  );
}
