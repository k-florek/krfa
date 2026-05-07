# WHCC Integration Overview

WHCC (White House Custom Colour) provides two APIs used in this project to deliver a print-on-demand experience for customers.

**Official docs:** https://www.whcc.com/developer/docs/

---

## APIs

### Editor API
Allows you to create white-label, unbranded product design experiences hosted by WHCC. Customers are redirected into the editor, design their product, and are returned to your site with a payload of completed design data.

- Base URL (production): `https://prospector.dragdrop.design/api/v1`
- Base URL (staging): `https://prospector-stage.dragdrop.design`

→ See [whcc-editor-api.md](./whcc-editor-api.md)

### Order Submit API
Allows you to programmatically create and submit print/product orders to WHCC for production and fulfilment.

- Base URL (production): `https://apps.whcc.com`
- Base URL (sandbox): `https://sandbox.apps.whcc.com`

→ See [whcc-order-submit-api.md](./whcc-order-submit-api.md)

---

## Key Differences

| | Editor API | Order Submit API |
|---|---|---|
| Auth endpoint | `https://prospector.dragdrop.design/api/v1/auth/access-token` | `https://apps.whcc.com/api/AccessToken` |
| Token format | JWT (90-minute lifetime) | Opaque token (1-hour lifetime) |
| Token scope | Per `accountId` / user | Per consumer key / WHCC account |
| Primary use | Customer-facing design editors | Server-side order submission |

> Tokens are **not interchangeable** between the two APIs. Each API uses its own credentials and token endpoint.

---

## Integration Flow (Combined)

1. Authenticate with Editor API → get a JWT access token scoped to the customer.
2. Fetch available products and designs via the Editor API.
3. Create an editor session → redirect the customer to the WHCC editor URL.
4. Customer completes design → WHCC `GET`s your `complete` redirect URL with editor payload.
5. Export the completed editor(s) to get an order structure (`/oas/editors/export`).
6. Submit the order via the Editor API (`/oas/orders/create` + `/oas/orders/{id}/confirm`) **or** use the Order Submit API directly (`/api/OrderImport` + `/api/OrderImport/Submit/{id}`).
7. Receive order status and shipping webhooks from WHCC.

---

## Environment Variables

This project reads the following environment variables for WHCC integration (see `netlify/functions/_whcc.mjs`):

| Variable | Description |
|---|---|
| `WHCC_KEY` | Consumer key provided by WHCC |
| `WHCC_SECRET` | Consumer secret provided by WHCC |
| `WHCC_ACCOUNT_ID` | Default WHCC account ID |
| `WHCC_EDITOR_API_BASE_URL` | Override the Editor API base URL (defaults to production) |
| `WHCC_HTTP_TIMEOUT_MS` | HTTP timeout in milliseconds (default: 15000) |
