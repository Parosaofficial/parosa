import type { Metadata } from "next";
import { LegalShell, SUPPORT_EMAIL } from "@/components/LegalShell";

export const metadata: Metadata = { title: "Terms of Service" };

export default function Terms() {
  return (
    <LegalShell
      title="Terms of Service"
      updated="24 September 2026"
      tldr={[
        "Parosa gives your restaurant a digital menu, QR codes, order screens and bills.",
        "You keep 100% of what your customers pay you. We never take a commission.",
        "Your menu, photos and data stay yours. You can export or delete them whenever you want.",
        "The food, the service and the payment are between you and your customer — we only provide the software.",
        "You can cancel any time. No lock-in, no cancellation fee.",
      ]}
    >
      <p>
        These Terms are the agreement between you and Parosa. They explain what we give you,
        what we expect from you, and what happens if something goes wrong. We have written them
        in plain English on purpose — if any line is unclear, email us at <b>{SUPPORT_EMAIL}</b> and
        we will explain it.
      </p>
      <p>
        &ldquo;Parosa&rdquo;, &ldquo;we&rdquo; and &ldquo;us&rdquo; mean the Parosa platform and the team behind it.
        &ldquo;You&rdquo; means the food business that has signed up. &ldquo;The Service&rdquo; means the Parosa
        website, dashboard, staff POS and the QR menu your customers scan. By creating an account
        or using the Service you accept these Terms.
      </p>

      <h2>1. Who can sign up</h2>
      <ul>
        <li>Parosa is for restaurants, dhabas, cafés, cloud kitchens, food trucks and similar food businesses in India.</li>
        <li>You must be 18 or older and allowed to sign agreements for the business you are registering.</li>
        <li>The details you enter — business name, address, GSTIN, FSSAI — must be true and yours. We are not able to verify them for you, and you are responsible if they are wrong.</li>
      </ul>

      <h2>2. Your account and your staff</h2>
      <ul>
        <li>One account runs one restaurant workspace, unless your plan says otherwise.</li>
        <li>Keep your password private. Anything done from your account is treated as done by you.</li>
        <li>Staff log in with their phone number and a code you generate each day. That code is yours to share and yours to stop sharing — turn a staff member off in <b>Staff &amp; Admin</b> and they lose access immediately.</li>
        <li>If you think someone has got into your account, email <b>{SUPPORT_EMAIL}</b> straight away and change your password.</li>
      </ul>

      <h2>3. What you pay</h2>
      <ul>
        <li><b>0% commission, always.</b> When a customer pays you ₹500, you receive ₹500. We never sit between you and your money.</li>
        <li>Parosa is sold as a subscription — Basic, Growth or Business. The price of each plan is shown at sign-up and on the pricing section of our home page.</li>
        <li>During early access we may waive the subscription fee. When online billing is switched on, your plan renews monthly or yearly until you cancel, and we will tell you before the first charge.</li>
        <li>Prices are exclusive of GST and other taxes, which are added where the law requires.</li>
        <li>You can cancel any time. Your plan keeps working until the end of the period you have already paid for. We do not charge a cancellation fee.</li>
        <li>We do not give automatic refunds for a period already used, but if something went genuinely wrong, write to us — we would rather fix it than argue.</li>
      </ul>

      <h2>4. Your content stays yours</h2>
      <p>
        Your menu, dish photos, prices, logo and business information are <b>yours</b>. Signing up does
        not give us ownership of any of it.
      </p>
      <p>
        You give us permission to store and display that content only to run the Service — for example,
        showing your menu to a customer who scans your QR code, or printing your name on a bill. That
        permission ends when you delete the content or your account.
      </p>
      <p>
        You confirm that you have the right to use everything you upload. Please do not upload photos
        you found on the internet — use your own.
      </p>

      <h2>5. What you must not do</h2>
      <ul>
        <li>Use Parosa for anything illegal, misleading or harmful.</li>
        <li>Upload obscene content, or content that belongs to someone else.</li>
        <li>Try to break into, overload, copy or reverse-engineer the Service, or reach another restaurant&apos;s data.</li>
        <li>Resell or rebrand Parosa as your own product without a written agreement from us.</li>
      </ul>
      <p>If you do any of this, we may suspend the account. Where we can, we will warn you first.</p>

      <h2>6. Orders, food and payment are between you and your customer</h2>
      <p>
        Parosa shows your menu, collects the order and prepares the bill. That is where our part ends.
        The food, its quality and safety, the service at the table, the price you charge and the money
        you collect are all between you and your customer. We are not a party to that sale and cannot
        settle a dispute about it.
      </p>
      <p>
        If you turn on UPI scan-to-pay, the money goes straight from your customer&apos;s app to your UPI
        ID. It never passes through Parosa.
      </p>

      <h2>7. Uptime and changes to the product</h2>
      <p>
        We work hard to keep Parosa fast and online, but we cannot promise it will never go down.
        The Service is provided on a best-effort basis. We may add, change or retire features as the
        product grows; if a change removes something you rely on, we will give you notice in the app
        or by email.
      </p>
      <p>Keep a printed menu as a backup. Phones, Wi-Fi and websites all have bad days.</p>

      <h2>8. Ending the agreement</h2>
      <ul>
        <li>You can leave at any time. Deleting your restaurant in <b>Settings</b> removes your menu, tables, QR codes, orders and staff records permanently.</li>
        <li>Deletion cannot be undone, so export anything you want to keep first.</li>
        <li>We may suspend or close an account that breaks these Terms, or that is being used to harm someone.</li>
        <li>If we ever shut Parosa down, we will give you at least 30 days&apos; notice and a way to export your data.</li>
      </ul>

      <h2>9. Our liability</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo;. To the extent Indian law allows, we are not liable for
        indirect or knock-on losses — lost profit, lost customers, lost goodwill — arising from your use
        of Parosa. Our total liability for any claim is limited to whatever you paid us in the three
        months before it arose.
      </p>
      <p>Nothing here limits liability that cannot legally be limited, such as liability for fraud.</p>

      <h2>10. Governing law</h2>
      <p>
        These Terms are governed by the laws of India, and the courts of Gurugram, Haryana have
        jurisdiction. Before going to court, please email us — almost everything is quicker to solve
        over a conversation.
      </p>

      <h2>11. Changes to these Terms</h2>
      <p>
        We may update these Terms as the product changes. The date at the top always shows the current
        version. If a change materially affects you, we will tell you in the app or by email before it
        takes effect. Continuing to use Parosa after that means you accept the new version.
      </p>

      <h2>12. Contact us</h2>
      <p>
        Questions, complaints, or a line you would like explained? Email <b>{SUPPORT_EMAIL}</b> — a real
        person reads it, and we aim to reply within two working days.
      </p>
    </LegalShell>
  );
}
