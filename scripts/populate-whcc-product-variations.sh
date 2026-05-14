#!/usr/bin/env bash
set -euo pipefail

# Populate public/data/whcc-product-variations.json from WHCC Editor API products.
#
# Required env vars:
#   WHCC_KEY
#   WHCC_SECRET
#   WHCC_ACCOUNT_ID
#
# Optional env vars:
#   WHCC_EDITOR_API_BASE_URL         (default: https://prospector.dragdrop.design/api/v1)
#   WHCC_EDITOR_COMPATIBILITY_FILTER (default: all)
#   WHCC_INCLUDE_PATTERN             (default: fine art|print|poster)
#   WHCC_EXCLUDE_PATTERN             (default excludes cards/ornaments/books/etc.)
#   DEFAULT_PAPER_ID                 (default: lustre)
#   DEFAULT_PAPER_LABEL              (default: Lustre Paper)
#   DEFAULT_PAPER_ATTRIBUTE_UID      (default: 5)
#   DEFAULT_UNIT_PRICE_CENTS         (default: 1000)
#   DEFAULT_QUANTITY                 (default: 1)
#   MIN_QUANTITY                     (default: 1)
#   MAX_QUANTITY                     (default: 20)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OUTPUT_FILE="${REPO_ROOT}/public/data/whcc-product-variations.json"
ENV_FILE="${REPO_ROOT}/.env"

usage() {
  cat <<'EOF'
Usage:
  scripts/populate-whcc-product-variations.sh [--output <path>] [--env <path>]

Required env vars (from shell and/or loaded .env):
  WHCC_KEY
  WHCC_SECRET
  WHCC_ACCOUNT_ID

Optional env vars:
  WHCC_EDITOR_API_BASE_URL
  WHCC_EDITOR_COMPATIBILITY_FILTER (default: all)
  WHCC_INCLUDE_PATTERN (default: fine art|print|poster)
  WHCC_EXCLUDE_PATTERN (default: card|ornament|acrylic|album|book|calendar|invitation|announcement|greeting|stationery)
  DEFAULT_PAPER_ID
  DEFAULT_PAPER_LABEL
  DEFAULT_PAPER_ATTRIBUTE_UID
  DEFAULT_UNIT_PRICE_CENTS
  DEFAULT_QUANTITY
  MIN_QUANTITY
  MAX_QUANTITY
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output)
      if [[ -z "${2:-}" ]]; then
        echo "Error: --output requires a file path" >&2
        exit 1
      fi
      OUTPUT_FILE="$2"
      shift 2
      ;;
    --env)
      if [[ -z "${2:-}" ]]; then
        echo "Error: --env requires a file path" >&2
        exit 1
      fi
      ENV_FILE="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Error: unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command not found: $1" >&2
    exit 1
  fi
}

require_env() {
  local key="$1"
  if [[ -z "${!key:-}" ]]; then
    echo "Error: missing required environment variable: ${key}" >&2
    exit 1
  fi
}

normalize_api_base() {
  local raw="$1"
  raw="${raw%/}"
  if [[ "$raw" == */api/v1 ]]; then
    echo "$raw"
  else
    echo "${raw}/api/v1"
  fi
}

load_env_file() {
  local env_path="$1"
  if [[ ! -f "$env_path" ]]; then
    return 0
  fi

  while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
    local line="$raw_line"
    line="${line%$'\r'}"

    # Skip blanks and comments.
    [[ -z "${line//[[:space:]]/}" ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue

    # Support optional "export KEY=VALUE" style.
    if [[ "$line" =~ ^[[:space:]]*export[[:space:]]+ ]]; then
      line="${line#export }"
      line="${line#${line%%[![:space:]]*}}"
    fi

    # Only accept KEY=VALUE assignments.
    if [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=(.*)$ ]]; then
      local key="${BASH_REMATCH[1]}"
      local value="${BASH_REMATCH[2]}"

      # Trim leading/trailing whitespace around value.
      value="${value#${value%%[![:space:]]*}}"
      value="${value%${value##*[![:space:]]}}"

      # Remove matching surrounding quotes.
      if [[ "$value" =~ ^\".*\"$ ]]; then
        value="${value:1:${#value}-2}"
      elif [[ "$value" =~ ^\'.*\'$ ]]; then
        value="${value:1:${#value}-2}"
      else
        # Strip inline comment for unquoted values.
        value="${value%%#*}"
        value="${value%${value##*[![:space:]]}}"
      fi

      printf -v "$key" '%s' "$value"
      export "$key"
    fi
  done < "$env_path"
}

load_env_file "$ENV_FILE"

require_cmd curl
require_cmd jq

require_env WHCC_KEY
require_env WHCC_SECRET
require_env WHCC_ACCOUNT_ID

API_BASE="$(normalize_api_base "${WHCC_EDITOR_API_BASE_URL:-https://prospector.dragdrop.design/api/v1}")"
COMPATIBILITY_FILTER="${WHCC_EDITOR_COMPATIBILITY_FILTER:-all}"
INCLUDE_PATTERN="${WHCC_INCLUDE_PATTERN:-fine art|print|poster}"
EXCLUDE_PATTERN="${WHCC_EXCLUDE_PATTERN:-card|ornament|acrylic|album|book|calendar|invitation|announcement|greeting|stationery}"
DEFAULT_PAPER_ID="${DEFAULT_PAPER_ID:-lustre}"
DEFAULT_PAPER_LABEL="${DEFAULT_PAPER_LABEL:-Lustre Paper}"
DEFAULT_PAPER_ATTRIBUTE_UID="${DEFAULT_PAPER_ATTRIBUTE_UID:-5}"
DEFAULT_UNIT_PRICE_CENTS="${DEFAULT_UNIT_PRICE_CENTS:-1000}"
DEFAULT_QUANTITY="${DEFAULT_QUANTITY:-1}"
MIN_QUANTITY="${MIN_QUANTITY:-1}"
MAX_QUANTITY="${MAX_QUANTITY:-20}"
# Sizes used when a product node has no fixed dimensions (e.g. Fine Art Print).
# Format: WxH,WxH,...  (inches, portrait assumed first)
STANDARD_SIZES="${WHCC_STANDARD_SIZES:-4x6,5x7,8x10,8x12,11x14,16x20,20x24,20x30}"
TODAY="$(date +%F)"

TMP_AUTH="$(mktemp)"
TMP_PRODUCTS="$(mktemp)"
TMP_CATALOG="$(mktemp)"
TMP_CATALOG_PAPERS="$(mktemp)"
trap 'rm -f "$TMP_AUTH" "$TMP_PRODUCTS" "$TMP_CATALOG" "$TMP_CATALOG_PAPERS"' EXIT

echo "Requesting WHCC Editor API token..."
curl -fsS "${API_BASE}/auth/access-token" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "$(jq -n \
    --arg key "$WHCC_KEY" \
    --arg secret "$WHCC_SECRET" \
    --arg accountId "$WHCC_ACCOUNT_ID" \
    '{key: $key, secret: $secret, claims: {accountId: $accountId}}')" \
  > "$TMP_AUTH"

TOKEN="$(jq -r '.accessToken // .access_token // .token // empty' "$TMP_AUTH")"
if [[ -z "$TOKEN" ]]; then
  echo "Error: token response did not include accessToken" >&2
  cat "$TMP_AUTH" >&2
  exit 1
fi

# ── Order API catalog (optional) ─────────────────────────────────────────────
# If WHCC_ORDER_KEY + WHCC_ORDER_SECRET are present, fetch the Order catalog so
# we can seed real paper-type attributes instead of only the hardcoded default.
ORDER_API_BASE="${WHCC_ORDER_API_BASE_URL:-https://apps.whcc.com}"
ORDER_API_BASE="${ORDER_API_BASE%/}"
CATALOG_PAPERS_MAP='{}'

if [[ -n "${WHCC_ORDER_KEY:-}" ]] && [[ -n "${WHCC_ORDER_SECRET:-}" ]]; then
  echo "Fetching WHCC Order catalog for paper attributes..."
  ORDER_TOKEN="$(curl -fsS "${ORDER_API_BASE}/api/AccessToken" \
    --get \
    --data-urlencode "grant_type=consumer_credentials" \
    --data-urlencode "consumer_key=${WHCC_ORDER_KEY}" \
    --data-urlencode "consumer_secret=${WHCC_ORDER_SECRET}" \
    | jq -r '.Token // empty' 2>/dev/null || true)"

  if [[ -n "$ORDER_TOKEN" ]]; then
    curl -fsS "${ORDER_API_BASE}/api/catalog" \
      -H "Authorization: Bearer ${ORDER_TOKEN}" \
      -H "Accept: application/json" \
      > "$TMP_CATALOG" 2>/dev/null || true

    # Build: { "product name wxh" (trimmed, lowercase): [ {id, paperAttributeUID, paperLabel} ] }
    # Written to a temp file to avoid "arg list too long" when passing as --argjson.
    jq -c '
      [.Categories[]?.ProductList[]?
        | { key: (.Name // "" | gsub("^\\s+|\\s+$"; "") | ascii_downcase),
            value: [
              .AttributeCategories[]?
              | select((.AttributeCategoryName // "") | test("paper|media|surface|finish"; "i"))
              | .Attributes[]?
              | {
                  id: (.AttributeName | ascii_downcase | gsub("[^a-z0-9]+"; "-") | gsub("(^-|-$)"; "")),
                  paperAttributeUID: .Id,
                  paperLabel: .AttributeName,
                  unitPriceCents: 1000,
                  active: true
                }
            ]
          }
        | select((.value | length) > 0)
      ] | from_entries
    ' "$TMP_CATALOG" > "$TMP_CATALOG_PAPERS" 2>/dev/null || echo '{}' > "$TMP_CATALOG_PAPERS"
    echo "Loaded paper attributes for $(jq 'length' "$TMP_CATALOG_PAPERS") Order catalog products."
  else
    echo "Warning: could not obtain Order API token; paper options will use defaults." >&2
    echo '{}' > "$TMP_CATALOG_PAPERS"
  fi
else
  echo "Note: WHCC_ORDER_KEY/WHCC_ORDER_SECRET not set — paper options will use defaults."
  echo '{}' > "$TMP_CATALOG_PAPERS"
fi

curl -fsS "${API_BASE}/products" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  > "$TMP_PRODUCTS"

EXISTING_MAP='{}'
if [[ -f "$OUTPUT_FILE" ]] && [[ -s "$OUTPUT_FILE" ]]; then
  EXISTING_MAP="$(jq -c '
    ((.variations // [])
      | map({
          key: .id,
          value: {
            paperOptions: (.paperOptions // []),
            defaultQuantity: (.defaultQuantity // 1),
            minQuantity: (.minQuantity // 1),
            maxQuantity: (.maxQuantity // 20),
            sortOrder: (.sortOrder // null),
            active: (.active // true)
          }
        })
      | from_entries)
  ' "$OUTPUT_FILE" 2>/dev/null || echo '{}')"
fi
# Guard: ensure EXISTING_MAP is never an empty string (would break --argjson)
[[ -z "$EXISTING_MAP" ]] && EXISTING_MAP='{}'

mkdir -p "$(dirname "$OUTPUT_FILE")"

jq \
  --arg today "$TODAY" \
  --arg compatibility "$COMPATIBILITY_FILTER" \
  --arg includePattern "$INCLUDE_PATTERN" \
  --arg excludePattern "$EXCLUDE_PATTERN" \
  --arg paperId "$DEFAULT_PAPER_ID" \
  --arg paperLabel "$DEFAULT_PAPER_LABEL" \
  --argjson paperAttributeUID "$DEFAULT_PAPER_ATTRIBUTE_UID" \
  --argjson unitPriceCents "$DEFAULT_UNIT_PRICE_CENTS" \
  --argjson defaultQty "$DEFAULT_QUANTITY" \
  --argjson minQty "$MIN_QUANTITY" \
  --argjson maxQty "$MAX_QUANTITY" \
  --arg standardSizesStr "$STANDARD_SIZES" \
  --argjson existing "$EXISTING_MAP" \
  --slurpfile catalogPapersArr "$TMP_CATALOG_PAPERS" \
  '
  ($catalogPapersArr[0] // {}) as $catalogPapers |

  def absnum: (tonumber | if . < 0 then -. else . end);

  def ratio($w; $h):
    if (($w | floor) == $w) and (($h | floor) == $h) then
      ((if $w > $h then ($w / $h) else ($h / $w) end) | tostring)
    else
      ((if $w > $h then ($w / $h) else ($h / $w) end) * 10000 | round / 10000 | tostring)
    end;

  def slug:
    ascii_downcase
    | gsub("[^a-z0-9]+"; "-")
    | gsub("(^-|-$)"; "");

  def productsArray:
    if type == "array" then .
    elif (.products? | type) == "array" then .products
    elif (.products? | type) == "object" then ([.products[]?] | flatten)
    elif (.data? | type) == "array" then .data
    elif (.data? | type) == "object" then ([.data[]?] | flatten)
    else []
    end;

  def compatAllowed($value):
    if $compatibility == "all" then
      true
    else
      (($compatibility | split(",") | map(gsub("^\\s+|\\s+$"; "")) | map(select(length > 0))) as $allowed
        | ($allowed | index(($value // "")) != null))
    end;

  def productLabel($product):
    (($product.category.name // "") + " " + ($product.name // "")) | ascii_downcase;

  def looksLikeFineArt($product):
    (productLabel($product) | test($includePattern; "i"))
    and (if ($excludePattern | length) > 0 then (productLabel($product) | test($excludePattern; "i") | not) else true end);

  def standardSizes:
    $standardSizesStr
    | split(",")
    | map(gsub("^\\s+|\\s+$"; ""))
    | map(select(length > 0))
    | map(
        split("x")
        | { w: (.[0] | tonumber), h: (.[1] | tonumber) }
      )
    | map(select(.w > 0 and .h > 0));

  def firstNode:
    ((.nodes // []) as $nodes
      | ($nodes | map(select((.name // "") == "Main" and .nodeId != null)) | first)
      // ($nodes | map(select(.nodeId != null)) | first));

  {
    version: 1,
    updatedAt: $today,
    variations: (
      productsArray
      | map(select(type == "object"))
      | map(select(compatAllowed(.editorCompatibility)))
      | map(select(looksLikeFineArt(.)))
      | map(
          . as $p
          | (firstNode) as $node
          | select($node != null)
          | ($p.metadata.width // $node.width) as $fixedW
          | ($p.metadata.height // $node.height) as $fixedH
          | (if ($fixedW != null and $fixedH != null) then
              [{ w: ($fixedW | tonumber), h: ($fixedH | tonumber) }]
            else
              standardSizes
            end)[]
          | . as $dim
          | $dim.w as $widthIn
          | $dim.h as $heightIn
          | select($widthIn > 0 and $heightIn > 0)
          | (if ($fixedW != null and $fixedH != null) then
              (($p.name // "product") | tostring | slug) + "-" + ($node.nodeId | tostring)
            else
              (($p.name // "product") | tostring | slug) + "-" + ($widthIn | tostring) + "x" + ($heightIn | tostring)
            end) as $id
          | ($existing[$id] // null) as $prev
          | {
              id: $id,
              productUID: ($p._id | tostring),
              productName: ($p.name | tostring),
              productNodeId: ($node.nodeId | tonumber),
              widthIn: $widthIn,
              heightIn: $heightIn,
              aspectRatio: ratio($widthIn; $heightIn),
              active: ($prev.active // true),
              sortOrder: ($prev.sortOrder // null),
              defaultQuantity: ($prev.defaultQuantity // $defaultQty),
              minQuantity: ($prev.minQuantity // $minQty),
              maxQuantity: ($prev.maxQuantity // $maxQty),
              paperOptions: (
                if ($prev.paperOptions | length) > 0 then
                  $prev.paperOptions
                else
                  (($p.name // "" | gsub("^\\s+|\\s+$"; "") | ascii_downcase) as $pname
                    | ($pname + " " + ($widthIn | tostring) + "x" + ($heightIn | tostring)) as $k1
                    | ($pname + " " + ($heightIn | tostring) + "x" + ($widthIn | tostring)) as $k2
                    | ($catalogPapers[$k1] // $catalogPapers[$k2]) as $found
                    | if ($found | length) > 0 then
                        $found
                      else
                        [{
                          id: $paperId,
                          paperAttributeUID: $paperAttributeUID,
                          paperLabel: $paperLabel,
                          unitPriceCents: $unitPriceCents,
                          active: true
                        }]
                      end)
                end
              )
            }
        )
      | unique_by(.id)
      | sort_by([.productUID, .widthIn, .heightIn])
      | to_entries
      | map(.value + {sortOrder: (.value.sortOrder // ((.key + 1) * 10))})
    )
  }
  ' "$TMP_PRODUCTS" > "${OUTPUT_FILE}.tmp"

mv -f "${OUTPUT_FILE}.tmp" "$OUTPUT_FILE"

COUNT="$(jq '.variations | length' "$OUTPUT_FILE")"
echo "Wrote ${COUNT} product variations to ${OUTPUT_FILE}"
