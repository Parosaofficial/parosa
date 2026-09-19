"use client";

import { RestaurantLogo } from "@/components/RestaurantLogo";
import { UpiPay } from "@/components/UpiPay";
import type { PayInfo } from "@/lib/db";
import { isValidUpi, payNote, reviewLinkOf } from "@/lib/upi";
import "./pay.css";

/** The loaded pay page: amount, UPI pay (or Paid ✓), and the Google review ask. */
export function PayCard({ info }: { info: PayInfo }) {
  const paid = info.payment_status === "paid";
  const canPay = !paid && !!info.upi_id && isValidUpi(info.upi_id);
  const review = reviewLinkOf(info);

  return (
    <main className="py-wrap">
      <div className="py-card">
        <div className="py-head">
          <RestaurantLogo restaurant={{ name: info.restaurant_name, logo_url: info.logo_url }} size={52} />
          <div className="py-name">{info.restaurant_name}</div>
          <div className="py-meta">{[info.order_no && `Bill #${info.order_no}`, info.table_number && `Table ${info.table_number}`].filter(Boolean).join(" · ")}</div>
        </div>

        <div className="py-amt">
          <span className="l">{paid ? "Amount paid" : "Amount to pay"}</span>
          <span className="v">₹{info.total.toLocaleString("en-IN")}</span>
        </div>

        {paid ? (
          <div className="py-paid"><span className="tick">✓</span><div><b>Paid{info.payment_method ? ` · ${info.payment_method}` : ""}</b><span>Thank you — see you again soon!</span></div></div>
        ) : canPay ? (
          <UpiPay upi={info.upi_id!} name={info.restaurant_name} amount={info.total} note={payNote(info.restaurant_name, info.order_no, info.table_number)} />
        ) : (
          <p className="py-p">Please pay at the counter. Show this screen to the staff.</p>
        )}

        {review && (
          <a className="py-review" href={review} target="_blank" rel="noopener noreferrer">
            <span className="stars" aria-hidden="true">★★★★★</span>
            <span className="t"><b>Enjoyed your meal?</b><span>Rate {info.restaurant_name} on Google — it takes 30 seconds.</span></span>
            <span className="go" aria-hidden="true">›</span>
          </a>
        )}
      </div>
      <div className="py-foot">Bill by <b>Parosa</b></div>
    </main>
  );
}
