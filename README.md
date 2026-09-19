# Parosa — परोसा

Bilingual QR menus, ordering and billing for Indian restaurants and dhabas.
Next.js (App Router) + Supabase (Auth, Postgres with RLS, Realtime, Storage).

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in the two Supabase values
npm run dev                  # http://localhost:3000
```

`.env.local` needs the project URL and the **anon (public)** key from
Supabase → Project Settings → API. Never put the `service_role` key in this app.

## Pages

| URL | What it is |
|---|---|
| `/` | Landing page |
| `/login` · `/login/staff` | Owner sign-in · staff sign-in (phone + daily code) |
| `/signup` → `/signup/details` → `/signup/licences` → `/signup/plan` | Create a restaurant, one URL per step |
| `/dashboard` `/menu-editor` `/tables` `/orders` `/customers` `/staff` `/analytics` `/templates` `/payments` `/settings` | Owner dashboard |
| `/pos` | Staff order-taking |
| `/<restaurant>/menu/<table>` | The guest menu a table's QR opens |
| `/pay/<order id>` | Guest pay page linked from the WhatsApp bill |
| `/terms` · `/privacy` | Legal |

Aliases: `/template` → `/templates`, `/register` → `/signup`, `/staff-login` → `/login/staff`.

## Database (Supabase)

Schema changes live in `supabase/migrations/` and run in order (`0001` → latest).
The CLI is configured in `supabase/config.toml`.

```bash
supabase login                                   # once per machine
supabase link --project-ref cyyyrunhjwnadjnsrtog # once per clone
supabase migration new <name>                    # write the SQL in the new file
supabase db push                                 # apply pending migrations to the live project
supabase migration list                          # local vs live, should match
```

`supabase/seed.sql` holds the Raj Darbar demo restaurant (only for a fresh project).

Security model, in short: menus are public to read; everything else is scoped to
the signed-in owner (`restaurants.owner_id = auth.uid()`); guests can only
*insert* orders; staff act through validated `SECURITY DEFINER` functions; photo
uploads require sign-in and only the uploader can replace or delete a file.

## Deploy

Vercel: import this repo, set the two `NEXT_PUBLIC_SUPABASE_*` variables, deploy.
Then add the production domain to Supabase → Authentication → URL Configuration
(Site URL + redirect URLs).
