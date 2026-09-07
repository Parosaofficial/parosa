import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = { title: "Privacy Policy — Parosa" };

export default function Privacy() {
  return (
    <LegalShell title="Privacy Policy" updated="September 2026">
      <p>This Privacy Policy explains what information Parosa collects, how we use it, and the choices you have. We keep it short and honest.</p>

      <h2>1. Information we collect</h2>
      <ul>
        <li><b>Account &amp; business details</b> you give us: your name, email, phone, restaurant name, address, and (optionally) GSTIN/FSSAI numbers and documents.</li>
        <li><b>Menu &amp; operations data</b> you create: categories, dishes, prices, photos, tables, and orders.</li>
        <li><b>Customer order data</b>: when a diner places an order, we store the items, table number, amount and (if provided) their phone number for the bill.</li>
        <li><b>Basic technical data</b>: standard logs needed to run and secure the Service.</li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>To run your restaurant workspace — show your menu, take orders, generate bills, and display your analytics.</li>
        <li>To secure your account and keep each restaurant&apos;s data isolated from every other.</li>
        <li>To support you and improve the product.</li>
      </ul>

      <h2>3. What we do not do</h2>
      <ul>
        <li>We do <b>not</b> sell your data or your customers&apos; data.</li>
        <li>We do <b>not</b> show your private orders or analytics to other restaurants. Your menu is public (it&apos;s meant to be scanned); your orders, bills and payments are private to you.</li>
      </ul>

      <h2>4. Where your data lives</h2>
      <p>Your data is stored securely with our infrastructure provider (Supabase, built on PostgreSQL) with row-level security so an owner can only access their own restaurant&apos;s records. Menu images are stored in secured cloud storage.</p>

      <h2>5. Sharing</h2>
      <p>We share data only with service providers that help us run Parosa (for example, hosting and, in future, a payment processor such as Razorpay), and only to the extent needed to provide the Service — or when required by law.</p>

      <h2>6. Data retention &amp; deletion</h2>
      <p>We keep your data while your account is active. If you delete your restaurant from Settings, its menu, tables, QR codes and orders are permanently removed. You can request account deletion by emailing us.</p>

      <h2>7. Your customers&apos; data</h2>
      <p>As the restaurant owner, you are responsible for how you use any customer phone numbers collected through your menu (for example, sending a WhatsApp bill). Only use them for the purpose the customer expects.</p>

      <h2>8. Security</h2>
      <p>We use industry-standard measures — encrypted connections, hashed passwords, and per-owner access rules. No system is perfectly secure, but we take protecting your data seriously.</p>

      <h2>9. Changes</h2>
      <p>If we update this policy, we&apos;ll post the new version here and update the date above.</p>

      <h2>10. Contact</h2>
      <p>Questions or requests about your data? Email <b>sahustartup@gmail.com</b>.</p>
    </LegalShell>
  );
}
