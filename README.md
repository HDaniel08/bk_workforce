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

Railway-en hozz letre egy uj projektet GitHub repo alapjan, majd adj hozza egy Postgres adatbazist. A repo gyokerben talalhato `Dockerfile` es `railway.json` az API buildet es startot allitja be.

Railway service valtozok:

```env
DATABASE_URL="<Railway Postgres DATABASE_URL>"
JWT_SECRET="<eros-random-secret>"
JWT_EXPIRES_IN="1d"
APP_URL="https://<cloudflare-pages-vagy-sajat-domain>"
MAIL_HOST=""
MAIL_PORT=""
MAIL_USER=""
MAIL_PASS=""
MAIL_FROM=""
```

Az elso sikeres API deploy utan futtasd Railway terminalbol vagy one-off commandbol:

```bash
pnpm --filter @bk-workforce/api prisma:deploy
```

Ha indulashoz kell a seed adat:

```bash
pnpm --filter @bk-workforce/api prisma:seed
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
Build command: pnpm install --frozen-lockfile && pnpm --filter @bk-workforce/web build
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
```

`GET /availability/team` queryk:

```text
tenantId
weekStartDate
userId
workerType
```

Save/submit body pelda:

```json
{
  "periodType": "WEEKLY",
  "weekStartDate": "2026-07-06",
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
- `MANAGER`: sajat tenant dolgozoinak heti raereseit lathatja es kezelheti.
- `ADMIN`: read-only csapat availability adatokat lathat `tenantId` szuressel.
- `VACATION`: jelenleg csak manualis nap tipus, automatikus szabadsagkapcsolat kesobb keszul.

Frontend route-ok:

```text
/worker/availability          worker heti raeres
/manager/availability         manager csapat raeresek
```

## Manager havi beosztas

- Tenantonkent egy aktiv manager a beosztasfelelos. Az uj tenant elso managere kapja meg a jogot; a profiloldalon atadhatja, vagy a szuperadmin a tenantok oldalan atallithatja.
- A managerek napi munka- vagy pihenoigenyt adhatnak le rovid megjegyzessel a `/manager/requests` oldalon. Ugyanarra a napra beadott masik managerkerelemrol anonim, nem blokkolo figyelmeztetest kapnak.
- Szabadsagot ugyanezen az oldalon a meglevo szabadsagkerelem-rendszerbe adnak le. Sajat manager-szabadsagkerelmet masik manager biralja el.
- A managerkerelmek es a `/manager/monthly-schedule` alapertelmezetten a kovetkezo honapot nyitjak meg. A beosztas heti, het egyenlo naposzlopbol allo nezetben jelenik meg vizszintes gorgetes nelkul. Ezen az oldalon a desktop menu a tartalom fole csuszik; a kijelolt nap jobb oldali panelen, mobilon also panelen szerkesztheto. A kijelolt felelos szerkesztheti a piszkozatot, kozzeteheti, majd javitashoz visszateheti piszkozatba.
- A kozzetett managerbeosztast minden manager az osszes aktiv managerre latja, de a muszakfigyelmeztetesek csak a piszkozatot szerkeszto felelosnek jelennek meg. A manager kezdolapon hetente lapozhato, egyszerusitett kozzetett beosztas lathato. Elso kozzetetelkor es modositas utani ujrakozzetetelkor minden aktiv manager ertesitest kap; egy kozzetett beosztasba bekerulo jovahagyott managerszabadsag szinten modositasrol szolo ertesitest indit.
- A munka naphoz kezdes es vegzes kotelezo. Ejfel utan vegzodo muszak is lehet; a netto ido a muszak hossza minusz egy ora szunet, a kezdonaphoz szamolva.
- Az elvart munkanapok es pihenonapok szama havonta kozos. Az idoelegyenleg a beosztott netto munkaora es a jovahagyott szabadsagonkent 8 ora osszege, minusz az elvart munkanapok szorozva nyolc oraval. A kethavi ciklus mindig paros honappal zarul.
- Piros jelzes figyelmeztet a 9 oratol eltero muszakra (8 ora munka + 1 ora szunet), az 5 napnal hosszabb egybefuggo munkara es a ket muszak kozotti 10 oranal rovidebb pihenore. Az ellenorzes a szomszedos honapok beosztott napjait is figyelembe veszi.
- Az elfogadott manager-szabadsag a beosztasban kotelezo Szabadsag nap; a fuggo szabadsag figyelmezteteskent jelenik meg.
- Az adatbazishoz a `20261030120000_manager_month_schedule` migraciot futtatni kell.

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
- Manager szabadsagkerelem nem modosit availability rekordot.
- Meglevo `WORK` vagy `OFF` napot a rendszer `VACATION` tipusra ir felul.
- Szombat es vasarnap nem szamit szabadsagnapnak; ha a kerelem idoszaka hetveget is tartalmaz, ezek `OFF` pihenonapkent kerulnek be.

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
