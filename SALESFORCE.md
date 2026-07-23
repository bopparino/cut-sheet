# Salesforce integration — setup and activation

Scaffolded July 2026, **dormant by default**. The app can push a sheet's
whole-house packets (shop + foreman, the exact PDFs the print buttons make)
onto the matching **Lot** record in Salesforce as two Files. Until the env
vars below are set, nothing is visible: no button renders, and the send
endpoint answers 503. Turning it on is a Railway env change, not a deploy.

## How the mapping works

| Cut sheet | Salesforce (`Lot__c`) | Note |
| --- | --- | --- |
| **Prop #** | **`Name`** ("Lot Name") | The join key. Auto-number field — Salesforce assigns it. |
| Lot | `Lot_Number__c` | Builder's lot (e.g. `15K`, `101`). Display only. |
| Builder | `Builder__c` | Warn-only sanity check on send. |
| Project Code | `Project_Code__c` | Warn-only sanity check on send. |

> ⚠️ `Property_Number__c` on the Lot is **not** our Prop # — it's a
> zero-padded legacy identifier (`00000228`). Verified against live records
> July 2026. Do not "fix" the lookup to use it.

Sending from any sheet of a house pushes the same two whole-house packets.
Re-sending creates **new versions** of the same two Files on the lot
(matched by Title), so a lot always shows one shop packet card and one
foreman packet card with version history. Every send is recorded in the
`sf_send_events` table.

Guard rails: placeholder props (`999999999`) are refused, a prop with no
matching lot fails loudly, and a duplicate-prop lookup refuses to guess.
Builder/project-code mismatches between the sheet and the lot come back as
warnings on the toast, but don't block the send.

## Environment variables

| Var | Example | Meaning |
| --- | --- | --- |
| `SALESFORCE_ENABLED` | `true` | Master switch. Anything else = off. |
| `SALESFORCE_INSTANCE_URL` | `https://whmetcalfe.my.salesforce.com` | Org My Domain URL. Sandbox: `https://whmetcalfe--devsandbox.sandbox.my.salesforce.com` |
| `SALESFORCE_CLIENT_ID` | `3MVG9…` | Connected App consumer key |
| `SALESFORCE_CLIENT_SECRET` | `…` | Connected App consumer secret |
| `SALESFORCE_API_VERSION` | `v61.0` | Optional, defaults to `v61.0` |
| `SALESFORCE_LOT_OBJECT` | `Lot__c` | Optional override |
| `SALESFORCE_LOT_PROP_FIELD` | `Name` | Optional override |

## One-time Salesforce setup (sandbox first, then prod)

1. **Integration user** (recommended over a person's login): a user with a
   profile/permission set granting *API Enabled*, *Read* on Lot, and
   *create* on Files (ContentVersion). A minimal-access profile + permission
   set is the clean way.
2. **Connected App**: Setup → App Manager → New Connected App.
   - Enable OAuth Settings. Callback URL can be `https://login.salesforce.com/services/oauth2/callback` (unused by this flow but required by the form).
   - OAuth scopes: *Manage user data via APIs (api)*.
   - Check **Enable Client Credentials Flow**.
   - After saving: Manage → Edit Policies → under Client Credentials Flow,
     set **Run As** to the integration user.
   - Copy the **Consumer Key** (→ `SALESFORCE_CLIENT_ID`) and **Consumer
     Secret** (→ `SALESFORCE_CLIENT_SECRET`).
3. Wait the classic ~10 minutes for the Connected App to propagate.

## Sandbox pilot

The dev sandbox has no data. Seed a project and a few lots (`Lot__c` has no
required fields; `Project__c` needs city + state):

```bash
sf data record create --sobject Project__c \
  --values "Name='Cut Sheet Pilot' Project_City__c='Frederick' State__c='MD' Project_Code__c='PILOT1'" \
  --target-org dev-sandbox
# note the created Id, then make a few lots pointing at it:
sf data record create --sobject Lot__c \
  --values "Project__c='<projectId>' Lot_Number__c='101' Builder__c='TEST BUILDER' Project_Code__c='PILOT1'" \
  --target-org dev-sandbox
sf data query --query "SELECT Id, Name, Lot_Number__c FROM Lot__c ORDER BY CreatedDate DESC LIMIT 10" \
  --target-org dev-sandbox
```

`Name` is an auto-number, so **Salesforce picks the Prop #** — you can't
choose it. Read the assigned `Name` values from that last query, then create
a test cut sheet in the app whose Prop # matches one of them.

To pilot end-to-end without touching prod, run the app locally against the
sandbox:

```bash
SALESFORCE_ENABLED=true \
SALESFORCE_INSTANCE_URL=https://whmetcalfe--devsandbox.sandbox.my.salesforce.com \
SALESFORCE_CLIENT_ID=<sandbox consumer key> \
SALESFORCE_CLIENT_SECRET=<sandbox consumer secret> \
npm run dev
```

Open the test sheet's replica page — a **Send to Salesforce** button appears
next to the print buttons. Send, then check the lot's Files in the sandbox.
Send twice and confirm the files gained versions instead of duplicating.

## Offline testing (no Salesforce at all)

`scripts/mock-salesforce.mjs` fakes the whole Salesforce surface with node
builtins only:

```bash
node scripts/mock-salesforce.mjs 3999 424242   # fake org knowing prop 424242
SALESFORCE_ENABLED=true SALESFORCE_INSTANCE_URL=http://localhost:3999 \
SALESFORCE_CLIENT_ID=mock SALESFORCE_CLIENT_SECRET=mock npm run dev
```

Received PDFs land in `.mock-salesforce/` so you can open exactly what
"Salesforce" got.

## Prod activation checklist

1. Repeat the Connected App + integration user setup in prod.
2. Set the env vars on Railway (prod My Domain URL + prod key/secret,
   `SALESFORCE_ENABLED=true`). Railway redeploys; the button appears.
3. Pick one real house, send, verify the two Files on the lot in Salesforce.
4. Re-send the same house; confirm versioning (no duplicate file cards).
5. Tell Kimmie.

To turn it all off again: set `SALESFORCE_ENABLED=false`. History in
`sf_send_events` is kept either way.

## Limits / future

- Packets over ~30MB are refused with a clear error (Salesforce's JSON
  upload cap; would need the multipart upload variant — only plausible with
  huge scanned plan attachments in a foreman packet).
- Sends are manual (button). If Kimmie later wants auto-send on packet
  print, it's a small addition to the same plumbing.
