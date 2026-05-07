# WHCC Order Submit API

The Order Submit API allows you to programmatically create and submit print and product orders to WHCC for production and fulfilment. Orders can be constructed directly from the product catalog or from data exported via the [Editor API](./whcc-editor-api.md).

**Official docs:** https://www.whcc.com/developer/docs/order-submit-api/

---

## Environments

| Environment | Base URL |
|---|---|
| Production | `https://apps.whcc.com` |
| Sandbox | `https://sandbox.apps.whcc.com` |

All example requests use the **production** URL. All requests must use `https`. You need separate credentials for each environment.

---

## Basic Flow

1. Make image assets accessible via public URI (e.g. Amazon S3; signed URLs are supported for additional security).
2. Authenticate → get an access token.
3. Fetch the product catalog to identify `ProductUID` and `AttributeUID` values.
4. Build an order request JSON object.
5. Import (`POST /api/OrderImport`) → receive a `ConfirmationID`.
6. Submit (`POST /api/OrderImport/Submit/{ConfirmationID}`) → order is sent to production.
7. Receive order status and shipping webhooks.

---

## Authentication

There are two authentication flows available. For most integrations, **Access Token** is recommended.

### Access Token (Recommended)

**Endpoint:** `GET /api/AccessToken`

Tokens are valid for **1 hour** and are tied to your consumer key and the associated WHCC account. Request a new token for each order; use the same token for both the import and submit calls.

```bash
curl https://apps.whcc.com/api/AccessToken \
  -d grant_type=consumer_credentials \
  -d consumer_key=B431BE78D2E9FFFE3709 \
  -d consumer_secret=RkZGRTM3MDk= \
  -X GET
```

**Response:**

```json
{
  "ClientId": "10072",
  "ConsumerKey": "B431BE78D2E9FFFE3709",
  "EffectiveDate": "8/19/2018 3:10:26 PM CST",
  "ExpirationDate": "8/19/2018 4:10:26 PM CST",
  "Token": "835770680158"
}
```

Use `Token` as the bearer token in subsequent requests: `Authorization: Bearer 835770680158`

### OAuth

An OAuth login flow is also available for integrations that require an end-user to authenticate with their own WHCC username and password. See https://www.whcc.com/developer/docs/order-submit-api/oauth-login-flow/ for details.

---

## Product Catalog

The catalog exposes all products, attributes, and shipping options available to your account. You only need to pull the catalog when adding or changing products — not on every order.

**Endpoint:** `GET /api/catalog`

```bash
curl https://apps.whcc.com/api/catalog/ \
  -H "Authorization: Bearer <token>" \
  -X GET
```

The response is a large JSON object. A condensed example showing the key structure:

```json
{
  "Key": "B431BE78D2E9FFFE3709",
  "Name": "My Account Catalog",
  "Categories": [
    {
      "Id": 215,
      "Name": "Partner Photo Fulfillment",
      "ProductList": [
        {
          "Id": 3,
          "Name": "8x10",
          "ProductCategoryUID": 215,
          "AttributeCategories": [
            {
              "Id": 2,
              "AttributeCategoryName": "Paper Types",
              "RequiredLevel": 1,
              "Attributes": [
                { "Id": 4, "AttributeName": "Glossy Paper" },
                { "Id": 5, "AttributeName": "Lustre Paper" },
                { "Id": 6, "AttributeName": "Metallic Paper" }
              ]
            }
          ],
          "ProductNodes": [
            { "DP2NodeID": 10000, "Description": "Main", "W": 8, "H": 10 }
          ]
        }
      ],
      "OrderAttributeCategoryList": [
        {
          "Id": 35,
          "CategoryName": "Shipping Options",
          "Attributes": [
            { "Id": 96, "AttributeName": "Drop Ship to Client" }
          ]
        },
        {
          "Id": 38,
          "CategoryName": "Drop Ship Shipping Options",
          "Attributes": [
            { "Id": 545, "AttributeName": "USA - Economy Shipping" },
            { "Id": 100, "AttributeName": "USA – Trackable 3 days or less" }
          ]
        }
      ]
    }
  ]
}
```

### Key Catalog Fields

| Field | Description |
|---|---|
| `ProductList[].Id` | `ProductUID` — used in `OrderItems[].ProductUID` |
| `AttributeCategories[].Attributes[].Id` | `AttributeUID` — used in `ItemAttributes[].AttributeUID` |
| `OrderAttributeCategoryList[].Attributes[].Id` | `AttributeUID` — used in `OrderAttributes[].AttributeUID` for order-level options (shipping, packaging) |
| `ProductNodes[].DP2NodeID` | `ProductNodeID` — used in `ItemAssets[].ProductNodeID` |

---

## Processing Orders

Submitting an order is a two-step process: **import** then **submit**.

### Step 1 — Order Import

**Endpoint:** `POST /api/OrderImport`

Import the order request JSON. Returns a `ConfirmationID` and a pricing breakdown. The order is **not processed** until submitted in Step 2.

```bash
curl https://apps.whcc.com/api/OrderImport \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '<order request JSON>'
```

#### Order Request Schema

```json
{
  "EntryId": "12345",
  "Orders": [
    {
      "SequenceNumber": 1,
      "Instructions": null,
      "Reference": "OrderID 12345",
      "SendNotificationEmailAddress": null,
      "SendNotificationEmailToAccount": true,
      "ShipToAddress": {
        "Name": "Customer Name",
        "Attn": null,
        "Addr1": "123 Main St",
        "Addr2": null,
        "City": "Eagan",
        "State": "MN",
        "Zip": "55121",
        "Country": "US",
        "Phone": "6516468263"
      },
      "ShipFromAddress": {
        "Name": "Returns Department",
        "Addr1": "3432 Denmark Ave",
        "Addr2": "Suite 390",
        "City": "Eagan",
        "State": "MN",
        "Zip": "55123",
        "Country": "US",
        "Phone": "8002525234"
      },
      "OrderAttributes": [
        { "AttributeUID": 96 },
        { "AttributeUID": 545 }
      ],
      "OrderItems": [
        {
          "ProductUID": 2,
          "Quantity": 1,
          "ItemAssets": [
            {
              "ProductNodeID": 10000,
              "AssetPath": "https://s3.amazonaws.com/bucket/image.jpg",
              "ImageHash": "a9825bb0836325e07ccfed16751b1d07",
              "PrintedFileName": "image.jpg",
              "AutoRotate": true,
              "AssetEnhancement": null
            }
          ],
          "ItemAttributes": [
            { "AttributeUID": 1 },
            { "AttributeUID": 5 }
          ]
        }
      ]
    }
  ]
}
```

#### Order Request Fields

| Field | Description |
|---|---|
| `EntryId` | Your internal order reference ID |
| `Orders[].SequenceNumber` | Numeric sequence number for this sub-order |
| `Orders[].Reference` | Human-readable order reference |
| `Orders[].SendNotificationEmailToAccount` | If `true`, WHCC sends a production notification to your account email |
| `Orders[].SendNotificationEmailAddress` | Optional email address to also receive production notifications |
| `Orders[].ShipToAddress` | Destination address for the order |
| `Orders[].ShipFromAddress` | Return address shown on the package |
| `Orders[].OrderAttributes` | Order-level attributes (shipping method, packaging) — `AttributeUID` values from the catalog |
| `Orders[].OrderItems[].ProductUID` | Product identifier from the catalog |
| `Orders[].OrderItems[].Quantity` | Number of copies |
| `Orders[].OrderItems[].ItemAssets[].ProductNodeID` | Node ID from the catalog (`DP2NodeID`) |
| `Orders[].OrderItems[].ItemAssets[].AssetPath` | Publicly accessible URL to the image asset |
| `Orders[].OrderItems[].ItemAssets[].ImageHash` | MD5 hash of the image file for integrity verification |
| `Orders[].OrderItems[].ItemAssets[].PrintedFileName` | Filename used in WHCC's production system |
| `Orders[].OrderItems[].ItemAssets[].AutoRotate` | If `true`, WHCC may auto-rotate the image to fit the product |
| `Orders[].OrderItems[].ItemAttributes` | Item-level attributes (paper type, coating, etc.) — `AttributeUID` values from the catalog |

#### Import Response

```json
{
  "Account": "10072",
  "ConfirmationID": "d4bcb9a7-caf0-4d2b-aa18-674a5d2c527e",
  "EntryID": "12345",
  "Key": "B431BE78D2E9FFFE3709",
  "NumberOfOrders": 1,
  "Orders": [
    {
      "SequenceNumber": "1",
      "Products": [
        { "ProductDescription": "Print Fulfillment 5x7", "Quantity": 1, "Price": "0.65" },
        { "ProductDescription": "Fulfillment Shipping - Economy", "Quantity": 1, "Price": "3.48" }
      ],
      "SubTotal": "4.13",
      "Tax": "0.29",
      "Total": "4.42"
    }
  ],
  "Received": "8/19/2018 4:34:01 PM Central Time"
}
```

| Field | Description |
|---|---|
| `ConfirmationID` | Required for the submit call |
| `Orders[].Products` | Line-item pricing breakdown |
| `Orders[].Total` | Total cost including tax |

---

### Step 2 — Order Submit

**Endpoint:** `POST /api/OrderImport/Submit/{ConfirmationID}`

Confirms the order and sends it to production.

```bash
curl https://apps.whcc.com/api/OrderImport/Submit/a3ff9b4a-3112-4101-88ab-6ba025fd7600 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Length: 0" \
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

| Field | Description |
|---|---|
| `Confirmation` | Human-readable status message |
| `ConfirmationID` | The confirmed order ID |
| `ConfirmedOrders` | Number of orders confirmed |

---

## Webhooks

Webhooks deliver real-time order lifecycle events. Processing webhooks is critical — without them, you will not be notified of errors that may prevent order processing.

### Registration

Each set of API credentials supports a **single webhook endpoint** at a time.

#### Register Endpoint

**Endpoint:** `POST /api/callback/create`

```bash
curl https://apps.whcc.com/api/callback/create \
  -H "Authorization: Bearer <token>" \
  -F callbackUri=https://yourdomain.com/webhooks/whcc \
  -X POST
```

WHCC immediately POSTs a `verifier` code to the specified URI.

#### Verify Endpoint

**Endpoint:** `POST /api/callback/verify`

```bash
curl https://apps.whcc.com/api/callback/verify \
  -H "Authorization: Bearer <token>" \
  -F verifier=a53ae191-00f3-44f4-810c-19d88a5b4c16 \
  -X POST
```

---

### Event Types

There are two webhook event types: `Status` and `Event`.

#### Status Webhook

Indicates whether your order was accepted or rejected after submission. An order can be rejected if WHCC cannot access the image assets.

**Accepted example:**

```json
{
  "Status": "Accepted",
  "Errors": [],
  "OrderNumber": 14989342,
  "Event": "Processed",
  "ConfirmationId": "a3ff9b4a-3112-4101-88ab-6ba025fd7600",
  "EntryId": "12345",
  "Reference": "OrderID 12345",
  "SequenceNumber": "1"
}
```

**Rejected example:**

```json
{
  "Status": "Rejected",
  "Errors": [
    {
      "ErrorCode": "400.03",
      "Error": "Error copying files from consumer.",
      "AssetPath": "https://s3.amazonaws.com/bucket/not-found.jpg"
    }
  ],
  "Event": "Processed",
  "ConfirmationId": "a3ff9b4a-3112-4101-88ab-6ba025fd7600",
  "EntryId": "12345",
  "Reference": "OrderID 12345",
  "SequenceNumber": "1"
}
```

#### Event Webhook

Sent when an order's production status changes. Currently the only event is `Shipped`.

```json
{
  "ShippingInfo": [
    {
      "Carrier": "FedEx",
      "ShipDate": "2018-12-31T06:18:38-06:00",
      "TrackingNumber": "512376671311227",
      "TrackingUrl": "http://www.fedex.com/Tracking?tracknumbers=512376671311227",
      "Weight": 0.35
    }
  ],
  "OrderNumber": 14989342,
  "Event": "Shipped",
  "ConfirmationId": "a3ff9b4a-3112-4101-88ab-6ba025fd7600",
  "EntryId": "12345",
  "Reference": "OrderID 12345",
  "SequenceNumber": "1"
}
```

> Always check the `Event` field value explicitly — additional event types may be added in the future.

---

### Webhook Security

Every webhook request from WHCC includes a `WHCC-Signature` header. Validate this header to confirm the request is genuinely from WHCC and intended for your endpoint.

**Example header:**

```
WHCC-Signature: t=1591735205,v1=307D88AF1425DC58552C1A6EDFB4C95E3E989F5B878CAFFEFFA6D581578DC82A
```

#### Verification Steps

**Step 1 — Extract timestamp and signature**

Split the header on `,` to get key=value pairs. `t` is the timestamp; `v1` is the signature. Ignore any other prefixes.

**Step 2 — Prepare the payload string**

Concatenate:
1. The timestamp string
2. A literal `.`
3. The raw JSON request body string

**Step 3 — Compute expected signature**

Compute HMAC-SHA256 using your **consumer secret** as the key and the assembled string from Step 2 as the message.

**Step 4 — Compare**

Compare the computed signature to `v1` from the header using a **constant-time string comparison** (to prevent timing attacks). Also check that the timestamp is within your acceptable tolerance window (to prevent replay attacks).

#### Attack Mitigations

| Attack | Mitigation |
|---|---|
| Replay | Reject webhooks where `t` is older than your tolerance window (e.g. 5 minutes) |
| Downgrade | Ignore any signature versions that are not `v1` |
| Timing | Use a constant-time comparison function when comparing signatures |

> If you use the **Editor API**, WHCC provides a `/webhooks/validate` endpoint that handles signature validation for you. See [whcc-editor-api.md](./whcc-editor-api.md#webhooks).
