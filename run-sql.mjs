import { readFileSync } from "node:fs";
const ref = process.argv[2];
const file = process.argv[3];
const token = process.env.SUPABASE_ACCESS_TOKEN;
const sql = readFileSync(file, "utf8");
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql }),
});
console.log("HTTP", res.status);
console.log((await res.text()).slice(0, 3000));
