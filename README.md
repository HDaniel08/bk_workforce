# BK Workforce App

Monorepo skeleton BK Workforce fejleszteshez. A projekt pnpm workspace-re epul, NestJS API-val, Vite React frontenddel, Prisma ORM-mel es PostgreSQL adatbazis celzassal.

## Telepites

```bash
pnpm install
```

Hozz letre egy `.env` fajlt a gyokerben az `.env.example` alapjan:

```bash
cp .env.example .env
```

Minimalis fejlesztoi pelda:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bk_workforce"
JWT_SECRET="MagdiToltosBased"
JWT_EXPIRES_IN="1d"
APP_URL="http://localhost:5173"
API_PORT="3000"
VITE_API_URL="http://localhost:3000"
MAIL_HOST=""
MAIL_PORT=""
MAIL_USER=""
MAIL_PASS=""
MAIL_FROM=""
```

## Fejlesztoi inditas

Teljes stack:

```bash
pnpm dev
```

Csak API:

```bash
pnpm dev:api
```

Csak frontend:

```bash
pnpm dev:web
```

Alap URL-ek:

- API: `http://localhost:3000`
- Health endpoint: `http://localhost:3000/health`
- Web: `http://localhost:5173`

## Build, lint, typecheck

```bash
pnpm build
pnpm lint
pnpm typecheck
```

Kulon build parancsok:

```bash
pnpm build:api
pnpm build:web
```

## Elesites Railway + Cloudflare Pages

Javasolt felosztas:

- API: Railway
- Postgres adatbazis: Railway Postgres
- Frontend: Cloudflare Pages
- DNS/domain: Cloudflare

### 1. Railway API

Railway-en hozz letre egy uj projektet GitHub repo alapjan, majd adj hozza egy Postgres adatbazist. A repo gyokerben talalhato `nixpacks.toml` es `railway.json` az API buildet es startot allitja be.

Railway service valtozok:

```env
DATABASE_URL="<Railway Postgres DATABASE_URL>"
JWT_SECRET="<eros-random-secret>"
JWT_EXPIRES_IN="1d"
APP_URL="https://<cloudflare-pages-vagy-sajat-domain>"
API_PORT="3000"
MAIL_HOST=""
MAIL_PORT=""
MAIL_USER=""
MAIL_PASS=""
MAIL_FROM=""
```

Az elso sikeres API deploy utan futtasd Railway terminalbol vagy one-off commandbol:

```bash
corepack pnpm --filter @bk-workforce/api prisma:deploy
```

Ha indulashoz kell a seed adat:

```bash
corepack pnpm --filter @bk-workforce/api prisma:seed
```

Ellenorzes:

```text
https://<railway-api-domain>/health
```

### 2. Cloudflare Pages frontend

Cloudflare Pages-ben hozz letre uj projektet ugyanarra a GitHub repora.

Beallitasok:

```text
Framework preset: None
Root directory: /
Build command: corepack pnpm --filter @bk-workforce/web build
Build output directory: apps/web/dist
```

Cloudflare Pages environment variables:

```env
VITE_API_URL="https://<railway-api-domain>"
```

A `apps/web/public/_redirects` fajl gondoskodik arrol, hogy frissites utan is mukodjenek a React route-ok, peldaul a `/login` es `/manager/...` oldalak.

### 3. Saját domain

Ha van sajat domain Cloudflare-ben:

- Frontend: `app.<domain>` vagy maga a root domain menjen Cloudflare Pages-re.
- API: `api.<domain>` menjen Railway custom domainre.
- Railway `APP_URL` erteke legyen a frontend vegleges URL-je.
- Cloudflare `VITE_API_URL` erteke legyen az API vegleges URL-je.

Pelda:

```env
APP_URL="https://workforce.ceg.hu"
VITE_API_URL="https://api.workforce.ceg.hu"
```

## Adatbazis es Prisma

Prisma client generalas:

```bash
pnpm --filter @bk-workforce/api prisma:generate
```

Fejlesztoi migracio letrehozasa es futtatasa:

```bash
pnpm --filter @bk-workforce/api prisma:migrate -- --name init_workforce_schema
```

Deploy migraciok futtatasa:

```bash
pnpm --filter @bk-workforce/api prisma:deploy
```

Seed futtatasa kezdo adatokkal:

```bash
pnpm --filter @bk-workforce/api prisma:seed
```

Prisma Studio inditasa:

```bash
pnpm --filter @bk-workforce/api prisma:studio
```

A Prisma schema itt talalhato:

```text
apps/api/prisma/schema.prisma
```

A seed fajl itt talalhato:

```text
apps/api/prisma/seed.ts
```

## Auth seed adatok

Seed utan ezekkel a fiokokkal lehet belepni:

```text
Superadmin:
email: admin@bk-app.local
password: Admin123!
route: /superadmin/login

Manager:
email: andras.fodor@bk-app.local
password: Manager123!
route: /login

Student worker:
email: bence.barta@bk-app.local
password: Student123!
route: /login

Full-time worker:
email: adam.balla@bk-app.local
password: Worker123!
route: /login
```

A manager es worker seed felhasznaloknal `mustChangePassword=true`, ezert sikeres elso login utan a frontend a `/change-password` oldalra iranyit.

## Auth endpointok

Normal tenant user login, csak `EMPLOYEE` role:

```http
POST /auth/login
```

Superadmin login, csak `ADMIN` role:

```http
POST /auth/superadmin/login
```

JWT-vel vedett jelszocsere:

```http
POST /auth/change-password
Authorization: Bearer <accessToken>
```

Login valasz:

```json
{
  "accessToken": "...",
  "user": {
    "id": "...",
    "tenantId": "...",
    "tenantName": "BK Pécs Drive 2",
    "tenantSlug": "bk-pecs-drive-2",
    "email": "andras.fodor@bk-app.local",
    "firstName": "Andras",
    "lastName": "Fodor",
    "role": "EMPLOYEE",
    "employeeSubRole": "MANAGER",
    "workerType": null,
    "mustChangePassword": true
  }
}
```

## Frontend route-ok

```text
/login              EMPLOYEE login
/superadmin/login   ADMIN login
/change-password    elso belepeses jelszocsere
/superadmin         ADMIN dashboard
/manager            MANAGER dashboard
/worker             WORKER dashboard
```

## Tenant endpointok

Csak `ADMIN` / superadmin erhet hozza:

```http
GET /tenants
POST /tenants
GET /tenants/:id
PATCH /tenants/:id
```

Tenant letrehozas pelda:

```json
{
  "name": "BK Pécs Drive 2",
  "slug": "bk-pecs-drive-2",
  "city": "Pécs",
  "address": "..."
}
```

## User endpointok

`ADMIN` minden usert lathat, es `tenantId` alapjan szurhet. `MANAGER` csak a sajat tenantjan beluli `EMPLOYEE` usereket lathatja es kezelheti. `WORKER` nem fer hozza ezekhez az endpointokhoz.

```http
GET /users
POST /users
GET /users/:id
PATCH /users/:id
```

Tamogatott `GET /users` queryk:

```text
tenantId
search
isActive
employeeSubRole
workerType
```

User letrehozas pelda:

```json
{
  "tenantId": "...",
  "email": "new.worker@example.com",
  "firstName": "Teszt",
  "lastName": "Elek",
  "phone": "+36...",
  "employeeSubRole": "WORKER",
  "workerType": "STUDENT"
}
```

MANAGER altali letrehozaskor a `tenantId` automatikusan a bejelentkezett manager tenantja, a role pedig automatikusan `EMPLOYEE`.

## Audit endpoint

Csak `ADMIN` erhet hozza:

```http
GET /audit-logs
```

Tamogatott queryk:

```text
tenantId
actorUserId
action
entityType
from
to
```

## Jogosultsagi mukodes

- `ADMIN`: tenant CRUD, osszes user listazasa/szurese, audit log listazas.
- `MANAGER`: csak sajat tenant userjeinek listazasa, letrehozasa es modositasa.
- `WORKER`: nem kezelhet tenantot vagy usert.
- `EMPLOYEE` tenant scope-ot a backend ellenorzi, igy mas tenant adatai nem modosithatok manager tokennel.

## Welcome email fejlesztes kozben

Uj user letrehozasakor a backend ideiglenes jelszot general, bcrypt-tel hash-eli, majd welcome emailt keszit. Ha nincs SMTP konfiguracio (`MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`), az email tartalma olvashatoan a console-ra kerul, es a muvelet nem dob hibat.

## Availability endpointok

Minden availability endpoint JWT-vel vedett.

Sajat raeres:

```http
GET /availability/me
POST /availability/me/save-draft
POST /availability/me/submit
```

Csapatnezeti endpointok:

```http
GET /availability/team
GET /availability/required-missing
```

`GET /availability/me` queryk:

```text
weekStartDate
monthStartDate
```

`GET /availability/team` queryk:

```text
tenantId
weekStartDate
monthStartDate
userId
employeeSubRole
workerType
```

Save/submit body pelda:

```json
{
  "periodType": "WEEKLY",
  "weekStartDate": "2026-07-06",
  "monthStartDate": null,
  "days": [
    {
      "date": "2026-07-06",
      "type": "WORK",
      "workPreference": "ANYTIME",
      "startTime": null,
      "endTime": null,
      "note": ""
    }
  ]
}
```

## Availability mukodes

- `WORKER`: csak sajat heti (`WEEKLY`) raereset latja es modosithatja.
- `STUDENT` worker: heti leadasa kotelezo; manager a `required-missing` endpointon latja a hianyzo leadasokat.
- `FULL_TIME` worker: heti raeres leadasa opcionalis.
- `MANAGER`: sajat havi (`MONTHLY`) raereset adhatja le, es sajat tenant dolgozoinak heti raereseit lathatja.
- `ADMIN`: read-only csapat availability adatokat lathat `tenantId` szuressel.
- `VACATION`: jelenleg csak manualis nap tipus, automatikus szabadsagkapcsolat kesobb keszul.

Frontend route-ok:

```text
/worker/availability          worker heti raeres
/manager/my-availability      manager sajat havi raeres
/manager/availability         manager csapat raeresek
```

## Schedule endpointok

Minden schedule endpoint JWT-vel vedett.

Hetek:

```http
GET /schedules/weeks
POST /schedules/weeks
GET /schedules/weeks/:id
POST /schedules/weeks/:id/publish
POST /schedules/weeks/:id/lock
```

Muszakok:

```http
POST /schedules/weeks/:id/shifts
PATCH /schedules/shifts/:shiftId
DELETE /schedules/shifts/:shiftId
POST /schedules/shifts/:shiftId/assign
DELETE /schedules/assignments/:assignmentId
```

Sajat beosztas:

```http
GET /schedules/me
```

## Schedule mukodes

- `MANAGER`: csak sajat tenantban hozhat letre es modosithat beosztasi heteket, muszakokat es hozzarendeleseket.
- `ADMIN`: read-only modban listazhat es megnezhet schedule weekeket, opcionaalis `tenantId` szuressel.
- `WORKER`: csak sajat beosztasat latja a `/schedules/me` endpointon.
- Worker es manager sajat beosztasban csak `PUBLISHED` vagy `LOCKED` schedule week muszakok jelennek meg, `DRAFT` nem.

Manager kezi beosztaskeszites frontend route:

```text
/manager/schedules
```

Sajat beosztas route-ok:

```text
/worker/schedule
/manager/schedule
```

Schedule validacios szabalyok:

- Muszak csak `DRAFT` schedule weekben hozhato letre, modosithato vagy torolheto.
- Muszak datum csak a schedule week hetjebe eshet.
- Idoformatum: `HH:mm`.
- Engedelyezett idotartomany: 07:00 es masnap 01:00 kozott.
- Ejfelen atnyulo muszak megengedett, peldaul `18:00-01:00`.
- `22:00-02:00` invalid, mert 01:00 utan vegzodik.
- Muszak hossza minimum 2 ora, maximum 12 ora.
- Ugyanaz a user nem oszthato be utkozo muszakokra.
- Egy napon egy user maximum 12 orat dolgozhat.
- Ket kulonbozo muszak kozott legalabb 10 ora piheno kell.
- Csak aktiv `EMPLOYEE` user oszthato be, `ADMIN` nem.
- A schedule modul most meg nem vizsgalja a raerest.
- Elfogadott szabadsagkerelem eseten a dolgozo nem oszthato be az adott napra.

## Vacation request endpointok

Minden vacation request endpoint JWT-vel vedett.

Sajat kerelmek:

```http
GET /vacation-requests/me
POST /vacation-requests/me
POST /vacation-requests/:id/cancel
```

Tenant/admin lista es biralat:

```http
GET /vacation-requests
POST /vacation-requests/:id/approve
POST /vacation-requests/:id/reject
```

Statuszok:

```text
PENDING
APPROVED
REJECTED
CANCELLED
```

Mukodes:

- `WORKER` es `MANAGER` sajat szabadsagkerelmet adhat le.
- `MANAGER` sajat tenantjan belul hagyhat jova vagy utasithat el `PENDING` kerelmeket.
- `ADMIN` read-only modban lathat kerelmeket, tenant es status szuresekkel.
- Multbeli datumra nem lehet kerelmet leadni.
- A vegdatum nem lehet korabbi, mint a kezdet.
- Egy uj kerelem nem fedhet at sajat `PENDING` vagy `APPROVED` kerelemmel.
- Csak `PENDING` kerelem vonhato vissza vagy biralhato el.

Approve folyamat:

- `status` `APPROVED` lesz.
- `reviewedByUserId`, `reviewedAt`, `reviewerNote` mentodik.
- Az erintett napokra automatikusan `VACATION` tipus kerul az availability-be.
- `WORKER` eseten heti `WEEKLY` availability rekordba kerul.
- `MANAGER` eseten havi `MONTHLY` availability rekordba kerul.
- Meglevo `WORK` vagy `OFF` napot a rendszer `VACATION` tipusra ir felul.
- Szombat es vasarnap nem szamit szabadsagnapnak; ha a kerelem idoszaka hetveget is tartalmaz, ezek `OFF` pihenonapkent kerulnek be.

Schedule kapcsolodas:

- Shift assignment letrehozasakor a backend ellenorzi az `APPROVED` szabadsagkerelmeket.
- Ha a dolgozo a shift hetkoznapi napjan elfogadott szabadsagon van, nem oszthato be.
- Hetvegi napot nem blokkol a szabadsagkerelem datumtartomanya.
- A hiba uzenete: `A dolgozo elfogadott szabadsagon van ezen a napon.`

Frontend route-ok:

```text
/worker/vacation-requests
/manager/my-vacation-requests
/manager/vacation-requests
/superadmin/vacation-requests
```

## Projektstruktura

```text
bk-workforce-app/
  apps/
    api/      NestJS API, Prisma setup, modulok, health endpoint
    web/      Vite + React + TypeScript frontend Tailwind CSS-sel
  packages/
    shared/   Kozos TypeScript tipusok es kesobbi megosztott utilok
```

Az API-ban jelenleg csak skeleton modulok vannak: auth, users, tenants, audit-logs, availability, vacation-requests es mail. A frontend mobil-first app shellt, login oldalakat es szerepkor szerinti dashboard placeholder oldalakat tartalmaz.
