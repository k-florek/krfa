# WHCC Editor API

The Editor API provides white-label, unbranded product design experiences. Customers are redirected into the WHCC editor, complete their design, and are returned to your site with a payload of completed design information which can then be submitted as an order.

**Official docs:** https://www.whcc.com/developer/docs/editor-api/

---

## Environments

| Environment | Base URL |
|---|---|
| Production | `https://prospector.dragdrop.design/api/v1` |
| Staging | `https://prospector-stage.dragdrop.design` |

All example requests in this document use the **production** hostname. You need separate credentials for each environment.

---

## Supported Product Types

- 5×7 Flat and Folded Cards (with optional boutique shapes and foils)
- Photo and Fine Art Prints and Posters
- Wall Art: Frames, Metal Prints, Canvas Wraps, Wood Prints, and more
- Albums and Photo Books (various cover and debossing options)
- And more — see https://www.whcc.com/products/online/

---

## Basic Flow

1. Authenticate → get an access token.
2. Fetch available products and designs.
3. Create an editor session for a specific product and design.
4. Redirect the customer to the returned editor URL.
5. Customer completes the editor → WHCC calls your `complete` redirect URL with design payload.
6. Export the completed editor(s) and submit an order.

---

## Local Product Variation Sync Script

To populate the local storefront variation file from WHCC Editor API products, run:

```bash
WHCC_KEY=... \
WHCC_SECRET=... \
WHCC_ACCOUNT_ID=... \
scripts/populate-whcc-product-variations.sh
```

Or rely on your repo `.env` file (auto-loaded by the script):

```bash
scripts/populate-whcc-product-variations.sh
```

Use a different env file with:

```bash
scripts/populate-whcc-product-variations.sh --env /path/to/.env
```

This updates `/public/data/whcc-product-variations.json` with products returned by `GET /products`.

Notes:

- By default it includes all product types (`WHCC_EDITOR_COMPATIBILITY_FILTER=all`). Set `WHCC_EDITOR_COMPATIBILITY_FILTER` to a comma-separated list (for example `simpleEditor,printEditor`) when you want to narrow results.
- By default it keeps only fine-art-like products using name/category matching (`WHCC_INCLUDE_PATTERN=fine art|print|poster`) and excludes common non-print storefront items (`WHCC_EXCLUDE_PATTERN=card|ornament|acrylic|album|book|calendar|invitation|announcement|greeting|stationery`).
- Override these regex patterns if your WHCC account uses different naming conventions for fine art products.
- Existing `paperOptions` and pricing are preserved when a product/node mapping already exists in the JSON.
- New entries receive default paper/pricing seed values that you should review before production use.

---

## Authentication

**Endpoint:** `POST /auth/access-token`

Tokens are JWTs valid for **90 minutes**. Request a new token before any series of API calls. The `accountId` claim must match the `userId` used when creating editors — it ties editors to a specific user.

> The Editor API and Order Submit API use **different tokens**. An Editor API token will not work with the Order Submit API.

### Request

```bash
curl https://prospector.dragdrop.design/api/v1/auth/access-token \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "12e1as132e2132aA0",
    "secret": "1291eaew2_3ehiew0-5eheudis92hC-0hsdas0d1n38L",
    "claims": {
      "accountId": "identifiable_id"
    }
  }'
```

### Response

```json
{
  "accessToken": "<JWT>",
  "expires": 1535063465
}
```

| Field | Description |
|---|---|
| `accessToken` | JWT to use in subsequent `Authorization: Bearer` headers |
| `expires` | Token expiration as a Unix timestamp |

---

## Editing

### Creating an Editor

**Endpoint:** `POST /editors`

Create an editor session for a specific product and design. The response contains a URL to redirect the customer to. This call typically happens server-side.

The `userId` in the payload must match the `accountId` used when authenticating. Editors created with the same `userId` are accessible together.

#### Request

```bash
curl https://prospector.dragdrop.design/api/v1/editors \
  -H "Authorization: Bearer <token>" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '<payload>'
```

#### Request Payload

```json
{
  "userId": "{{accountId}}",
  "productId": "b7jW7PmsfByoSxQ5m",
  "designId": "ztRMDiHup8ooFhxLr",
  "redirects": {
    "complete": {
      "text": "Checkout",
      "url": "https://yourdomain.com/return?editor=%EDITOR_ID%"
    },
    "cancel": {
      "text": "Change Design",
      "url": "https://yourdomain.com/cancel"
    }
  },
  "settings": {
    "quantity": {
      "default": 25
    },
    "client": {
      "vendor": "default",
      "accentColor": "#ff0000",
      "studioName": "Sample Studio",
      "hidePricing": true,
      "markupType": "PERCENT",
      "markupAmount": 30
    }
  },
  "photos": [
    {
      "id": "1",
      "name": "Photo IMG_1",
      "url": "https://s3.amazonaws.com/bucket/IMG_1.jpg",
      "printUrl": "https://s3.amazonaws.com/bucket/fullres-IMG_1.jpg",
      "filetype": "jpg",
      "size": {
        "original": { "width": 3600, "height": 2401 }
      }
    }
  ]
}
```

#### Request Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `userId` | string | Yes | Unique user identifier; must match the `accountId` claim used in authentication |
| `productId` | string | Yes | ID of the product to be edited |
| `designId` | string | Yes | ID of the design to be edited |
| `redirects.complete.url` | string | Yes | URL customers are sent to after completing their design. Supports `%EDITOR_ID%` placeholder |
| `redirects.complete.text` | string | Yes | Label shown on the "complete" action button in the editor |
| `redirects.cancel.url` | string | Yes | URL customers are sent to when they cancel |
| `redirects.cancel.text` | string | Yes | Label shown on the cancel/back button |
| `settings.quantity.default` | int | No | Default quantity pre-selected in the editor |
| `settings.client.vendor` | string | No | Visual theme (`"default"` uses brand accent color) |
| `settings.client.accentColor` | string | No | Hex color for editor accent elements |
| `settings.client.studioName` | string | No | Studio name pre-populated on design cards |
| `settings.client.hidePricing` | bool | No | If `true`, hides pricing in the editor |
| `settings.client.markupType` | string | No | Pricing markup type — only `"PERCENT"` is supported |
| `settings.client.markupAmount` | int | No | Markup percentage (positive integer); requires `markupType` |
| `photos[].id` | string | No | Unique ID for the photo |
| `photos[].name` | string | No | Display name for the photo |
| `photos[].url` | string | No | Publicly accessible URL for the preview image (may be watermarked) |
| `photos[].printUrl` | string | No | Publicly accessible URL for the full-resolution print image (same aspect ratio as `url`) |
| `photos[].filetype` | string | No | `"jpg"` or `"png"` |
| `photos[].size.original.width` | int | No | Width in pixels |
| `photos[].size.original.height` | int | No | Height in pixels |

#### Response

```json
{
  "editorId": "2321ej2101293a4e57cdf605",
  "url": "https://www.dragdrop.design/editor/2321ej2101293a4e57cdf605?token=..."
}
```

| Field | Description |
|---|---|
| `editorId` | Unique identifier for this editor session |
| `url` | URL to redirect the customer to for editing (single-use) |

---

### Completing an Editor

When the customer finishes in the editor, WHCC makes a `GET` request to your `complete` redirect URL. The `%EDITOR_ID%` placeholder in the URL is replaced with the actual `editorId`.

#### Returning to an Existing Editor

Editor URLs are **single-use**. To send a customer back to an existing editor session, request a new link:

**Endpoint:** `POST /editors/{editorId}/edit-link`

```bash
curl https://prospector.dragdrop.design/api/v1/editors/{editorId}/edit-link \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response:**

```json
{
  "url": "https://www.dragdrop.design/editor/2321ej2101293a4e57cdf605?token=..."
}
```

---

## Ordering

Ordering via the Editor API is a three-step process. Alternatively, you may use the [Order Submit API](./whcc-order-submit-api.md) directly with exported editor data.

### Step 1 — Export Editors

**Endpoint:** `PUT /oas/editors/export`

Exports one or more completed editor sessions into an order structure. Any required order fields not available from the editor are initialized to `null` and must be populated by your integration code.

```bash
curl https://prospector.dragdrop.design/api/v1/oas/editors/export \
  -H "Authorization: Bearer <token>" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"editors": [{ "editorId": "sampleEditorId" }]}'
```

**Response structure:**

```json
{
  "items": [{ "id": "sampleEditorId", "pricing": {}, "editor": {} }],
  "order": {
    "EntryId": "SampleEntryId",
    "Orders": [{ "...": "..." }]
  },
  "pricing": {}
}
```

### Step 2 — Create Order

**Endpoint:** `POST /oas/orders/create`

Pass the `order` object returned from the export call directly as the payload. Returns a `ConfirmationID` that must be used to confirm the order.

```bash
curl https://prospector.dragdrop.design/api/v1/oas/orders/create \
  -H "Authorization: Bearer <token>" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '<order object from export>'
```

**Response (abbreviated):**

```json
{
  "Account": "10072",
  "ConfirmationID": "d4bcb9a7-caf0-4d2b-aa18-674a5d2c527e",
  "NumberOfOrders": 1,
  "Orders": [{ "SubTotal": "4.13", "Tax": "0.29", "Total": "4.42" }],
  "Received": "8/19/2018 4:34:01 PM Central Time"
}
```

> The order is **not processed** until confirmed in Step 3.

### Step 3 — Confirm Order

**Endpoint:** `POST /oas/orders/{ConfirmationId}/confirm`

```bash
curl https://prospector.dragdrop.design/api/v1/oas/orders/a3ff9b4a-3112-4101-88ab-6ba025fd7600/confirm \
  -H "Authorization: Bearer <token>" \
  -X POST
```

**Response:**

```json
{
  "Confirmation": "Entry ID=a3ff9b4a-...: Confirmed order submitted.",
  "ConfirmationID": "a3ff9b4a-3112-4101-88ab-6ba025fd7600",
  "ConfirmedOrders": 1,
  "Received": "8/19/2018 5:00:17 PM Central Time"
}
```

---

## Webhooks

The Editor API provides endpoints to register a webhook callback URI and to validate the `WHCC-Signature` on incoming webhook payloads. See the [Order Submit API webhook docs](./whcc-order-submit-api.md#webhooks) for signature details and event type schemas.

### Register a Callback URI

**Endpoint:** `POST /webhooks/create`

```bash
curl https://prospector.dragdrop.design/api/v1/webhooks/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "callbackUri": "https://yourdomain.com/webhooks/whcc" }'
```

Immediately after registration, WHCC sends a `verifier` code to the specified URI.

### Verify Ownership

**Endpoint:** `POST /webhooks/verify`

```bash
curl https://prospector.dragdrop.design/api/v1/webhooks/verify \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "verifier": "<code sent to your URI>" }'
```

### Validate a Webhook Signature

**Endpoint:** `POST /webhooks/validate`

Use this endpoint to verify that an incoming webhook request is genuinely from WHCC.

```bash
curl https://prospector.dragdrop.design/api/v1/webhooks/validate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "body": <webhook payload>, "signature": "<WHCC-Signature header value>" }'
```
