import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, SUPPORT_EMAIL } from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Delete your account",
  description: "How to delete your Parosa account and all your restaurant's data — from the website, the app, or by email.",
};

/*
 * Public account-deletion page (www.parosa.food/delete). Google Play asks for
 * a web link where users can learn how to delete their account and data.
 */
export default function DeleteAccount() {
  return (
    <LegalShell
      title="Delete your account"
      updated="11 November 2026"
      readTime="2-minute read"
      tldr={[
        "You can delete your Parosa account any time — from the website or the Parosa app. It takes a minute.",
        "Deleting removes your login and your restaurant's menu, photos, tables, QR codes, staff, orders, bills and loyalty cards.",
        "It happens straight away and can't be undone. Copies in our backups are cleared within 30 days.",
        `Can't sign in? Email ${SUPPORT_EMAIL} from your registered email and we will do it for you.`,
      ]}
    >
      <p className="lgl-actions">
        <Link href="/settings/account" className="lgl-btn danger">Sign in and delete my account</Link>
        <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Delete my Parosa account")}`} className="lgl-btn">Email us instead</a>
      </p>

      <h2>1. Delete on the website</h2>
      <ol>
        <li>Sign in at <Link href="/login">www.parosa.food/login</Link>.</li>
        <li>Open <b>Settings → Account</b>.</li>
        <li>Under <b>Delete account</b>, tap <b>Delete</b> with your restaurant&apos;s name, type the name to confirm, and tap <b>Delete forever</b>.</li>
      </ol>
      <p>You are signed out and your account is gone.</p>

      <h2>2. Delete in the Parosa app</h2>
      <ol>
        <li>Open the Parosa app and sign in.</li>
        <li>Go to <b>Settings → Account</b>.</li>
        <li>Tap <b>Delete account</b>, then <b>Delete forever</b>.</li>
      </ol>

      <h2>3. Can&apos;t sign in? Ask us</h2>
      <p>
        Email <b>{SUPPORT_EMAIL}</b> with the subject <b>&ldquo;Delete my Parosa account&rdquo;</b>. Write from the
        email address you signed up with, and include your restaurant&apos;s name and registered mobile number so we
        know it is really you. We delete the account and reply to confirm, normally within 7 days.
      </p>

      <h2>4. What is deleted</h2>
      <ul>
        <li>Your login (email and password).</li>
        <li>Your restaurant profile, logo, address, hours, UPI ID, GSTIN and FSSAI details.</li>
        <li>Your menu: categories, dishes, prices and photos.</li>
        <li>Tables, QR codes, table bookings and kitchen screens.</li>
        <li>Staff records and their logins.</li>
        <li>Orders, bills, payment records and analytics.</li>
        <li>Your guests&apos; stamp cards and the phone numbers they gave your restaurant.</li>
      </ul>

      <h2>5. What we may keep</h2>
      <ul>
        <li>A minimal billing record of what you paid Parosa, only where Indian tax law requires it.</li>
        <li>Ordinary technical logs, which are anonymous and cleared on their normal schedule.</li>
      </ul>
      <p>Nothing else is kept, and nothing is ever sold. See our <Link href="/privacy">Privacy Policy</Link> for the full details.</p>

      <h2>6. Before you delete</h2>
      <ul>
        <li>Download any bills you still need from <b>Orders &amp; Bills → Print / PDF</b>. They can&apos;t be recovered afterwards.</li>
        <li>Your table QR codes stop working, so take the stickers off the tables.</li>
        <li>If you only want a break, you can simply stop using Parosa — nothing is charged while online payment is not switched on.</li>
      </ul>

      <h2>7. Are you a guest of a restaurant?</h2>
      <p>
        If you ordered at a restaurant that uses Parosa and want your phone number or stamp card removed, ask that
        restaurant, or email <b>{SUPPORT_EMAIL}</b> with the restaurant&apos;s name and your phone number and we will
        remove it.
      </p>
    </LegalShell>
  );
}
