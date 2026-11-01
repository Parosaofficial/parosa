import { TEMPLATES } from "@/lib/templates";
import "./menudesign.css";

/**
 * Settings → the menu design every restaurant uses. There's one Parosa design,
 * so this is a read-only card: a small live-looking preview, its name and a
 * Preview button that opens the owner's own menu.
 */
export function MenuDesignCard({ slug }: { slug: string }) {
  const t = TEMPLATES.find((x) => x.id === "parosa")!;
  const rows = [
    { name: "Butter Chicken", price: 280, photo: "/dishes/butter-chicken.webp" },
    { name: "Paneer Tikka", price: 240, photo: "/dishes/paneer-tikka-masala.webp" },
  ];
  return (
    <section className="set-card md-card" aria-label="Menu design">
      <div className="md-preview" aria-hidden="true">
        <div className="md-top"><b>Parosa · परोसा</b><span className="md-live">✓ Live</span></div>
        <div className="md-pills"><span className="on">Starters</span><span>Mains</span><span>Drinks</span></div>
        {rows.map((r) => (
          <div key={r.name} className="md-row">
            <span className="md-ph" style={{ backgroundImage: `url(${r.photo})` }} />
            <b>{r.name}</b>
            <span className="md-pr">₹{r.price}</span>
            <span className="md-plus">+</span>
          </div>
        ))}
      </div>
      <div className="md-body">
        <h3>{t.name} <span aria-hidden="true">★</span></h3>
        <p className="md-best">{t.best} · default for every menu</p>
        <p className="md-blurb">{t.blurb}</p>
        <div className="md-sw" aria-label="Colours">{t.swatches.map((c) => <i key={c} style={{ background: c }} />)}</div>
        <div className="md-acts">
          <a className="md-btn ghost" href={`/${slug}/menu/1?preview=1`} target="_blank" rel="noopener noreferrer">Preview</a>
          <span className="md-btn on" aria-label="This design is in use">Applied</span>
        </div>
      </div>
    </section>
  );
}
