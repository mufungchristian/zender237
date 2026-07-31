# Zender237 — Final Fixes & Enhancements Todo

## Phase A: Database Connection  [x]
- [x] Add PostgreSQL connection string to backend/.env
- [x] Run migrations on the Neon PostgreSQL database
- [x] Run seed to populate initial data
- [x] Verify DB connectivity (login works against seeded admin user)
- [x] Test all API flows against PostgreSQL

## Phase D-partial: Chat Backend  [x]
- [x] Add chat_conversations + chat_messages tables to schema
- [x] Create backend/src/routes/chat.ts (pg + in-memory fallback)
- [x] Wire chatRouter into server.ts
- [x] Test customer send + admin reply against PostgreSQL

## Phase J: WhatsApp OTP + Firebase Test  [x]
- [x] Add /api/auth/whatsapp/send + /api/auth/whatsapp/verify endpoints
- [x] Admin receives code in-app to relay via WhatsApp
- [x] Tested with +237678941859 (code generated, verified) — Firebase/in-app delivery confirmed
- [x] Admin WhatsApp kept as +237700000001 (user's number is test-only)

## Phase B: Logo Integration  [x]
- [x] Copy logo to frontend/public (logo.png + favicon.png)
- [x] Use logo in BrandHeader (customer app)
- [x] Use logo in login pages (customer + admin)
- [x] Use logo in admin layout header + favicon

## Phase C: Country Code Dropdown  [x]
- [x] Create reusable CountryCodeSelect component (Mali +223, Guinea +224, Cameroon +237)
- [x] Add to customer login page
- [x] Add to customer register page
- [x] Add to admin login page
- [x] Combine country code + phone into full international format
- [x] Add WhatsApp OTP verification UI on register page

## Phase D-frontend: Chat Interface  [x]
- [x] Rewrite ChatPage with real chat (message list + input + poll)
- [x] Add FAQ accordion within chat page
- [x] WhatsApp button as secondary
- [x] Add admin chat page (list conversations + reply)

## Phase E: KmerDiaspora — Match Static Demo  [x]
- [x] Update services to: Need a position, Need a driver, Quests, Active Quests
- [x] Add forms for position/driver request + quest browsing
- [x] WhatsApp redirect for diaspora requests
- [x] EN/FR translations

## Phase F: Bottom Nav — Match Static Demo  [x]
- [x] Update to 5 tabs: Home, Finance & Loans, Kmer Diaspora, Chat, Profile

## Phase G: EN/FR Translation Completeness  [x]
- [x] Add all missing i18n keys (chat, diaspora, country codes, OTP)
- [x] Verify language toggle on every page

## Phase H: Dark/White Mode — Both Apps  [x]
- [x] Verify customer dark mode works on all pages (incl. chat, diaspora)
- [x] Verify admin dark mode works (incl. admin chat)
- [x] Add theme toggle + language toggle to admin layout

## Phase I: Admin Responsive Design  [x]
- [x] Make admin layout responsive (collapsible sidebar/hamburger menu)
- [x] Ensure tables scroll horizontally on small screens
- [x] Test admin on narrow viewport

## Phase K: Final Testing & Packaging  [x]
- [x] Build backend (0 TS errors)
- [x] Build frontend (0 TS errors, vite build 116 modules OK)
- [x] Run full API test suite via curl (21/21 pass, PostgreSQL connected)
- [x] Browser test all pages + take fresh screenshots (light/dark, EN/FR, customer/admin)
- [x] Update README with new features (incl. /api suffix fix for VITE_API_URL)
- [x] Package final ZIP with everything (exclude node_modules, dist, .env)
- [x] Deliver ZIP to user
