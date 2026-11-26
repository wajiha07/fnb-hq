#!/usr/bin/env bash
# Requirements verification against test.md (run with API on :4000)
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:4000/api}"
PASS=0
FAIL=0

ok() { echo "  ✓ $1"; PASS=$((PASS+1)); }
bad() { echo "  ✗ $1"; FAIL=$((FAIL+1)); }

assert_json() {
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d); process.exit(j.success?0:1);}catch{process.exit(1);}})" 2>/dev/null
}

echo "=== API connectivity ==="
H=$(curl -s "$BASE/health")
echo "$H" | grep -q '"OK"' && ok "Health check" || bad "Health check"

COMPANY=$(curl -s "$BASE/companies" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).data[0].id))")
OUTLET_A=$(curl -s "$BASE/outlets?companyId=$COMPANY" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const o=JSON.parse(d).data; console.log(o.find(x=>x.code==='DTN')?.id || o[0].id);})")
OUTLET_B=$(curl -s "$BASE/outlets?companyId=$COMPANY" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const o=JSON.parse(d).data; console.log(o.find(x=>x.code==='APT')?.id || o[1]?.id);})")

echo ""
echo "=== Master Menu + Assignment ==="
MENU_RES=$(curl -s -X POST "$BASE/menu" -H 'Content-Type: application/json' \
  -d "{\"companyId\":\"$COMPANY\",\"name\":\"Test Item $(date +%s)\",\"category\":\"Test\",\"basePrice\":9.99}")
TEST_ITEM=$(echo "$MENU_RES" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).data.id))")
echo "$MENU_RES" | assert_json && ok "Create master menu item" || bad "Create master menu item"

ASSIGN=$(curl -s -X POST "$BASE/menu/assign" -H 'Content-Type: application/json' \
  -d "{\"outletId\":\"$OUTLET_A\",\"menuItemId\":\"$TEST_ITEM\",\"priceOverride\":12.5,\"initialStock\":5,\"isAvailable\":true}")
echo "$ASSIGN" | assert_json && ok "Assign menu to outlet with price override" || bad "Assign menu"

OUTLET_MENU_A=$(curl -s "$BASE/menu/outlet/$OUTLET_A")
OUTLET_MENU_B=$(curl -s "$BASE/menu/outlet/$OUTLET_B")
HAS_A=$(echo "$OUTLET_MENU_A" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const id=process.argv[1]; const found=JSON.parse(d).data.some(x=>x.menu_item_id===id); console.log(found?'yes':'no');})" "$TEST_ITEM")
HAS_B=$(echo "$OUTLET_MENU_B" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const id=process.argv[1]; const found=JSON.parse(d).data.some(x=>x.menu_item_id===id); console.log(found?'yes':'no');})" "$TEST_ITEM")
[ "$HAS_A" = "yes" ] && ok "Outlet A sees assigned item" || bad "Outlet A menu"
[ "$HAS_B" = "no" ] && ok "Outlet B does NOT see unassigned item" || bad "Outlet B menu isolation"

OVERRIDE=$(echo "$OUTLET_MENU_A" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const id=process.argv[1]; const row=JSON.parse(d).data.find(x=>x.menu_item_id===id); console.log(row?.price_override);})" "$TEST_ITEM")
[ "$OVERRIDE" = "12.5" ] || [ "$OVERRIDE" = "12.50" ] && ok "Price override stored" || bad "Price override (got $OVERRIDE)"

echo ""
echo "=== Inventory ==="
curl -s -X PUT "$BASE/outlets/$OUTLET_A/inventory" -H 'Content-Type: application/json' \
  -d "{\"menuItemId\":\"$TEST_ITEM\",\"quantity\":3}" | assert_json && ok "Set outlet stock" || bad "Set stock"

STOCK=$(curl -s "$BASE/outlets/$OUTLET_A/inventory" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const id=process.argv[1]; const r=JSON.parse(d).data.find(x=>x.menu_item_id===id); console.log(r?.quantity);})" "$TEST_ITEM")
[ "$STOCK" = "3" ] && ok "Stock tracked per outlet ($STOCK)" || bad "Stock read ($STOCK)"

NEG=$(curl -s -o /tmp/neg.json -w "%{http_code}" -X PUT "$BASE/outlets/$OUTLET_A/inventory" -H 'Content-Type: application/json' \
  -d "{\"menuItemId\":\"$TEST_ITEM\",\"quantity\":-1}")
[ "$NEG" = "400" ] && ok "Reject negative stock via API" || bad "Negative stock API (status $NEG)"

echo ""
echo "=== Sales ==="
# Multi-item sale
ITEM2=$(curl -s "$BASE/menu/outlet/$OUTLET_A" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const skip=process.argv[1]; const rows=JSON.parse(d).data.filter(x=>x.menu_item_id!==skip); console.log(rows[0]?.menu_item_id||'');})" "$TEST_ITEM")
SALE1=$(curl -s -X POST "$BASE/outlets/$OUTLET_A/sales" -H 'Content-Type: application/json' \
  -d "{\"items\":[{\"menuItemId\":\"$TEST_ITEM\",\"quantity\":2},{\"menuItemId\":\"$ITEM2\",\"quantity\":1}]}")
echo "$SALE1" | assert_json && ok "Multi-item sale" || bad "Multi-item sale"
R1=$(echo "$SALE1" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).data.receipt_number))")

STOCK_AFTER=$(curl -s "$BASE/outlets/$OUTLET_A/inventory" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const id=process.argv[1]; console.log(JSON.parse(d).data.find(x=>x.menu_item_id===id).quantity);})" "$TEST_ITEM")
[ "$STOCK_AFTER" = "1" ] && ok "Sales deduct stock (3→1)" || bad "Stock after sale ($STOCK_AFTER)"

OVERSALE=$(curl -s -o /tmp/over.json -w "%{http_code}" -X POST "$BASE/outlets/$OUTLET_A/sales" -H 'Content-Type: application/json' \
  -d "{\"items\":[{\"menuItemId\":\"$TEST_ITEM\",\"quantity\":99}]}")
[ "$OVERSALE" = "409" ] || [ "$OVERSALE" = "400" ] && ok "Prevent oversale / negative stock" || bad "Oversale (status $OVERSALE)"

# Sequential + concurrent receipts (same outlet)
curl -s -X PUT "$BASE/outlets/$OUTLET_A/inventory" -H 'Content-Type: application/json' \
  -d "{\"menuItemId\":\"$ITEM2\",\"quantity\":50}" > /dev/null
for i in $(seq 1 8); do
  curl -s -X POST "$BASE/outlets/$OUTLET_A/sales" -H 'Content-Type: application/json' \
    -d "{\"items\":[{\"menuItemId\":\"$ITEM2\",\"quantity\":1}]}" > "/tmp/conc_$i.json" &
done
wait
UNIQUE=$(ls /tmp/conc_*.json 2>/dev/null | xargs -I{} node -e "console.log(JSON.parse(require('fs').readFileSync('{}','utf8')).data.receipt_number)" | sort -u | wc -l | tr -d ' ')
TOTAL=$(ls /tmp/conc_*.json 2>/dev/null | wc -l | tr -d ' ')
[ "$UNIQUE" = "$TOTAL" ] && ok "Concurrent sales: $TOTAL unique receipt numbers" || bad "Duplicate receipts under concurrency"

echo ""
echo "=== Reporting ==="
REV=$(curl -s "$BASE/reports/revenue?companyId=$COMPANY")
echo "$REV" | assert_json && ok "Revenue by outlet endpoint" || bad "Revenue report"
echo "$REV" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const rows=JSON.parse(d).data; if(rows.length<1) process.exit(1);})" && ok "Revenue returns outlet rows" || bad "Revenue rows"

TOP=$(curl -s "$BASE/reports/outlets/$OUTLET_A/top-items?limit=5")
echo "$TOP" | assert_json && ok "Top 5 items endpoint" || bad "Top items"
LIMIT=$(echo "$TOP" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{console.log(JSON.parse(d).data.length);})")
[ "$LIMIT" -le 5 ] && ok "Top items limit ≤5 ($LIMIT)" || bad "Top items limit"

echo ""
echo "=== Summary ==="
echo "Passed: $PASS | Failed: $FAIL"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1