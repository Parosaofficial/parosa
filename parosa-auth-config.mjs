// Enables instant email+password signup (no email-confirmation step) so owners
// are logged straight in after creating their account.
// Usage: SUPABASE_ACCESS_TOKEN=<token> node parosa-auth-config.mjs <project-ref>
const ref = process.argv[2];
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!ref || !token) { console.error("Need project ref arg + SUPABASE_ACCESS_TOKEN env"); process.exit(1); }

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ mailer_autoconfirm: true }),
});
console.log("HTTP", res.status);
const t = await res.text();
try {
  const j = JSON.parse(t);
  console.log("mailer_autoconfirm:", j.mailer_autoconfirm);
} catch { console.log(t.slice(0, 1500)); }
