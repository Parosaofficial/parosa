import type { Metadata } from "next";
import { LegalShell, SUPPORT_EMAIL } from "@/components/LegalShell";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function Privacy() {
  return (
    <LegalShell
      title="Privacy Policy"
      updated="24 September 2026"
      tldr={[
        "We collect only what is needed to run your restaurant on Parosa.",
        "We never sell your data, or your customers' data, to anybody.",
        "Your orders, bills and analytics are private to you. Only your menu is public — that is the point of a QR code.",
        "Every restaurant's data is locked to its own account at the database level.",
        "Ask us to show you, correct or delete your data any time at support.parosa@gmail.com.",
      ]}
    >
      <p>
        This policy explains exactly what Parosa stores, why we store it, who can see it and how to
        get rid of it. No hidden clauses — if something here worries you, email <b>{SUPPORT_EMAIL}</b> and
        ask.
      </p>

      <h2>1. What we collect</h2>
      <p>Three kinds of information, and nothing else:</p>
      <ul>
        <li><b>What you tell us.</b> Your name, email, phone number, restaurant name, address, city, and — only if you choose to add them — your GSTIN and FSSAI numbers and documents.</li>
        <li><b>What you create in the app.</b> Categories, dishes, prices, photos, table count, staff records (name, phone, and optionally email, date of birth and Aadhaar number), orders, bills and payment status.</li>
        <li><b>What the system records.</b> Ordinary technical logs — when a request was made and whether it worked — which we need to keep the Service running and secure.</li>
      </ul>
      <p>
        We do not track you across other websites, we do not run advertising pixels, and we do not buy
        information about you from anyone.
      </p>

      <h2>2. Your customers&apos; information</h2>
      <p>
        When a diner orders, we store the items, table number and amount. If they give a phone number
        or name for the bill, that is stored too, against your restaurant only.
      </p>
      <p>
        You are the one who decides how that is used. Use it to send the bill or to recognise a regular
        — not to send marketing they did not ask for. Under Indian data-protection law you are the data
        fiduciary for your customers; Parosa only processes it on your instructions.
      </p>

      <h2>3. Why we hold it</h2>
      <ul>
        <li>To run your workspace: show the menu, take orders, print bills, draw your analytics.</li>
        <li>To keep your account secure and keep every restaurant&apos;s records separate.</li>
        <li>To answer you when you write to support.</li>
        <li>To fix bugs and decide what to build next, using totals rather than individual records wherever we can.</li>
      </ul>

      <h2>4. What we will never do</h2>
      <ul>
        <li>We will <b>never sell</b> your data or your customers&apos; data.</li>
        <li>We will <b>never show</b> your orders, revenue or customer list to another restaurant.</li>
        <li>We will <b>never email your customers</b> on our own behalf.</li>
      </ul>
      <p>
        Your menu is deliberately public — anyone with your QR code or link can read it. Everything
        behind your login is private.
      </p>

      <h2>5. Where it is stored, and who can reach it</h2>
      <p>
        Your data lives in a PostgreSQL database run by Supabase, our infrastructure provider, and
        photos sit in their secured storage. Every table has row-level security switched on, which
        means the database itself refuses to return a row that does not belong to the account asking
        for it. It is not a filter in our code that could be forgotten — it is a rule in the database.
      </p>
      <p>
        On our side, access is limited to the few people who need it to run the Service, and only for
        support or debugging.
      </p>

      <h2>6. Who else sees it</h2>
      <p>We share data only with companies that help us run Parosa, and only as much as they need:</p>
      <ul>
        <li><b>Supabase</b> — database, authentication and file storage.</li>
        <li><b>Vercel</b> — hosting the website itself.</li>
        <li><b>A payment processor</b> (such as Razorpay) if and when online subscription billing is switched on.</li>
      </ul>
      <p>
        We will also hand over information if a valid legal order requires it. If that ever happens and
        we are permitted to tell you, we will.
      </p>
      <p>
        UPI scan-to-pay is a direct transfer from your customer&apos;s app to your UPI ID. No card number,
        UPI PIN or bank detail ever reaches Parosa.
      </p>

      <h2>7. How long we keep it</h2>
      <ul>
        <li>While your account is open, we keep your data so the app works and your history stays intact.</li>
        <li>Delete your restaurant in <b>Settings</b> and its menu, photos, tables, QR codes, staff and orders are removed permanently, normally within 30 days including backups.</li>
        <li>We may keep a minimal billing record where tax law requires it.</li>
      </ul>

      <h2>8. Your rights</h2>
      <p>You can ask us at any time to:</p>
      <ul>
        <li>show you a copy of everything we hold about you;</li>
        <li>correct anything that is wrong;</li>
        <li>delete your account and its data;</li>
        <li>export your menu and orders so you can take them elsewhere.</li>
      </ul>
      <p>
        Email <b>{SUPPORT_EMAIL}</b> from the address on your account and we will action it within 30
        days, free of charge.
      </p>

      <h2>9. Security</h2>
      <p>
        Connections are encrypted (HTTPS). Passwords are hashed, never stored as text, and no one at
        Parosa can read yours. Access to your records is enforced by the database, per owner. Staff
        codes expire the same day they are made.
      </p>
      <p>
        No system is perfect. If a breach ever affects your data, we will tell you what happened, what
        it affected and what we did about it — promptly, not quietly.
      </p>

      <h2>10. Children</h2>
      <p>
        Parosa is a business tool and is not intended for anyone under 18. We do not knowingly collect
        information from children.
      </p>

      <h2>11. Changes</h2>
      <p>
        If we update this policy we will change the date at the top and, for anything significant,
        tell you in the app or by email.
      </p>

      <h2>12. Contact us</h2>
      <p>
        Any question or request about your data goes to <b>{SUPPORT_EMAIL}</b>. A real person reads it,
        and we aim to reply within two working days.
      </p>
    </LegalShell>
  );
}
