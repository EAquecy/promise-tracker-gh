# Promise Tracker GH

An accountability platform for Ghana. Residents see what their MP, Minister, MMDCE and Assembly Member promised, the evidence posted for each promise, and whether people in the area confirm or dispute it.

## Stack

- Next.js 15 (App Router) on Vercel
- Supabase: Postgres with PostGIS, Auth (email links), Storage, row level security
- Leaflet with OpenStreetMap and CARTO tiles
- Boundaries: geoBoundaries Ghana ADM1 (16 regions) and ADM2 (260 districts), CC BY 4.0

## Screens

| Route | What it does |
| --- | --- |
| `/` | Home: search, use my location, browse officials by role, latest evidence |
| `/my-area` | Turns on location, finds the district with PostGIS, lists the area's officials on a map |
| `/explore` | All districts on a map shaded by promises kept, search and region filter |
| `/officials`, `/officials/[id]` | Directory and public profile: scorecard, promises, evidence with confirm or dispute, petitions, area map |
| `/promises/[id]` | Promise detail with the evidence timeline and community verdict |
| `/official/login`, `/official/setup` | Officials sign in, pick roles and area, upload proof of office |
| `/official/dashboard` | Post project updates (in app camera photos are GPS stamped), petitions and new promises; answer disputes |
| `/admin` | Verify officials and approve new promises (profiles with `is_admin`) |

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Making someone an admin

In the Supabase SQL editor, after they have signed in once:

```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'you@example.com');
```

## Demo data

Profiles marked `is_demo` (Kwame Asante-Mensah, Ama Owusu-Boateng, Kojo Danso, Salamatu Dawuni) are fictional sample data. Remove them before launch:

```sql
delete from public.officials where is_demo;
delete from public.constituencies where name = 'Nkwanta Central';
delete from public.electoral_areas where name = 'Abenase';
```

## Not yet included

- Constituency (276) and electoral area boundaries: need Electoral Commission data
- SMS sign in with Ghana Card: needs an SMS provider (Arkesel, Hubtel or Twilio)
- Resident identity verification for the "verified resident" badge
