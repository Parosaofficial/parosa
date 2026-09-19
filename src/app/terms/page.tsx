import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = { title: "Terms of Service" };

export default function Terms() {
  return (
    <LegalShell title="Terms of Service" updated="September 2026">
      <p>Welcome to Parosa. These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the Parosa platform, websites and services (together, the &ldquo;Service&rdquo;) operated by Parosa (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or using the Service, you agree to these Terms.</p>

      <h2>1. Who can use Parosa</h2>
      <p>Parosa is built for restaurants, dhabas, cafés, food trucks and similar food businesses in India. You must be at least 18 years old and authorised to act on behalf of the business you register. You are responsible for the accuracy of the information you provide, including your business name, address, GSTIN and FSSAI details.</p>

      <h2>2. Your account</h2>
      <ul>
        <li>You are responsible for keeping your login credentials secure and for all activity under your account.</li>
        <li>Each account manages one restaurant workspace unless your plan permits multiple outlets.</li>
        <li>Tell us promptly if you suspect any unauthorised use of your account.</li>
      </ul>

      <h2>3. Plans, billing &amp; commission</h2>
      <ul>
        <li>Parosa is offered on paid subscription plans (Basic, Growth and Business). Plan features and prices are shown at sign-up and on our pricing page.</li>
        <li>Parosa charges <b>0% commission</b> on your orders — you keep everything your customers pay you.</li>
        <li>During early access, paid billing may be waived; when online billing is enabled, charges recur monthly or yearly as per your chosen plan until cancelled.</li>
        <li>You can cancel anytime; your plan stays active until the end of the current billing period. Taxes may apply as per Indian law.</li>
      </ul>

      <h2>4. Your content</h2>
      <p>You own your menu, dish photos, prices, and business information (&ldquo;Your Content&rdquo;). You grant Parosa a limited licence to host and display Your Content solely to operate the Service — for example, showing your menu to a customer who scans your QR code. You are responsible for ensuring Your Content is accurate, lawful, and does not infringe anyone&apos;s rights.</p>

      <h2>5. Acceptable use</h2>
      <ul>
        <li>Do not use Parosa for anything unlawful, misleading, or harmful.</li>
        <li>Do not attempt to break, overload, reverse-engineer or gain unauthorised access to the Service or other users&apos; data.</li>
        <li>Do not upload content that is obscene, infringing, or that you do not have the right to use.</li>
      </ul>

      <h2>6. Orders &amp; payments between you and your customers</h2>
      <p>Parosa provides the tools to display your menu, receive orders and generate bills. The sale of food and the collection of payment happen directly between you and your customer. Parosa is not a party to that transaction and is not responsible for order fulfilment, food quality, or payment disputes.</p>

      <h2>7. Availability</h2>
      <p>We work hard to keep Parosa fast and available, but we do not guarantee uninterrupted service. We may update, improve or temporarily suspend features for maintenance.</p>

      <h2>8. Termination</h2>
      <p>You may stop using Parosa and delete your restaurant at any time from Settings. We may suspend or terminate accounts that violate these Terms. On deletion, your menu, tables, QR codes and associated data are permanently removed.</p>

      <h2>9. Limitation of liability</h2>
      <p>To the extent permitted by law, Parosa is provided &ldquo;as is&rdquo;. We are not liable for indirect or consequential losses, or for lost profits, arising from your use of the Service. Our total liability in any matter is limited to the amount you paid us in the previous three months.</p>

      <h2>10. Changes to these Terms</h2>
      <p>We may update these Terms from time to time. If we make material changes, we&apos;ll notify you in the app or by email. Continuing to use Parosa after changes take effect means you accept the updated Terms.</p>

      <h2>11. Contact</h2>
      <p>Questions about these Terms? Email us at <b>sahustartup@gmail.com</b>.</p>
    </LegalShell>
  );
}
