#!/bin/bash
# Full API test suite for Zender237 backend
set -e
BASE=http://localhost:8090
PASS=0; FAIL=0
ok(){ echo "✅ $1"; PASS=$((PASS+1)); }
no(){ echo "❌ $1"; FAIL=$((FAIL+1)); }

echo "=== HEALTH ==="
H=$(curl -s $BASE/health)
echo "$H"
echo "$H" | grep -q '"status":"ok"' && ok "Health ok" || no "Health fail"
echo "$H" | grep -q '"store":"postgres"' && ok "PostgreSQL connected" || no "DB not postgres"

echo ""
echo "=== AUTH: Customer login ==="
CTOKEN=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"phone":"+22370000000","password":"demo1234"}' | tee /tmp/cust.json | python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
[ -n "$CTOKEN" ] && ok "Customer login → token" || no "Customer login failed"
echo "  cust.json: $(cat /tmp/cust.json | head -c 200)"

echo ""
echo "=== AUTH: Admin login ==="
ATOKEN=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"phone":"+237700000001","password":"admin123"}' | python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
[ -n "$ATOKEN" ] && ok "Admin login → token" || no "Admin login failed"

echo ""
echo "=== AUTH: Partner login ==="
PTOKEN=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"phone":"+237700000002","password":"partner123"}' | python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
[ -n "$PTOKEN" ] && ok "Partner login → token" || no "Partner login failed"

echo ""
echo "=== USER: me ==="
curl -s $BASE/api/users/me -H "Authorization: Bearer $CTOKEN" | grep -q '"phone":"+22370000000"' && ok "GET /users/me" || no "users/me fail"

echo ""
echo "=== CHAT: Customer sends message ==="
curl -s -X POST $BASE/api/chat/messages -H "Authorization: Bearer $CTOKEN" -H 'Content-Type: application/json' \
  -d '{"body":"Hello admin, I need help with a transfer."}' | grep -q '"body"' && ok "Customer chat send" || no "Chat send fail"

echo ""
echo "=== CHAT: Customer lists messages ==="
curl -s $BASE/api/chat/messages -H "Authorization: Bearer $CTOKEN" | grep -q 'Hello admin' && ok "Customer chat list" || no "Chat list fail"

echo ""
echo "=== CHAT: Admin lists conversations ==="
CONVS=$(curl -s $BASE/api/chat/conversations -H "Authorization: Bearer $ATOKEN")
echo "$CONVS" | grep -q '"user_id"' && ok "Admin conv list" || no "Admin conv list fail"
CONV_ID=$(echo "$CONVS" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['id'] if d else '')" 2>/dev/null)

echo ""
echo "=== CHAT: Admin replies ==="
[ -n "$CONV_ID" ] && curl -s -X POST $BASE/api/chat/conversations/$CONV_ID -H "Authorization: Bearer $ATOKEN" -H 'Content-Type: application/json' \
  -d '{"body":"Sure, how can I help you?"}' | grep -q '"body"' && ok "Admin reply" || no "Admin reply fail"

echo ""
echo "=== CHAT: Customer sees reply ==="
curl -s $BASE/api/chat/messages -H "Authorization: Bearer $CTOKEN" | grep -q 'how can I help' && ok "Customer sees admin reply" || no "Customer reply fail"

echo ""
echo "=== WHATSAPP OTP: send (demo mode) ==="
OTP_RESP=$(curl -s -X POST $BASE/api/auth/whatsapp/send -H 'Content-Type: application/json' \
  -d '{"phone":"+237678941859"}')
echo "$OTP_RESP" | head -c 300; echo ""
echo "$OTP_RESP" | grep -q '"ok":true' && ok "OTP send" || no "OTP send fail"
DEMO_CODE=$(echo "$OTP_RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('demoCode',''))" 2>/dev/null)
echo "  demoCode=$DEMO_CODE"

echo ""
echo "=== WHATSAPP OTP: verify correct code ==="
[ -n "$DEMO_CODE" ] && curl -s -X POST $BASE/api/auth/whatsapp/verify -H 'Content-Type: application/json' \
  -d "{\"phone\":\"+237678941859\",\"code\":\"$DEMO_CODE\"}" | grep -q '"verified":true' && ok "OTP verify correct" || no "OTP verify fail"

echo ""
echo "=== WHATSAPP OTP: verify WRONG code ==="
# Fresh send so we have a valid pending code, then try wrong code
curl -s -X POST $BASE/api/auth/whatsapp/send -H 'Content-Type: application/json' -d '{"phone":"+237600000099"}' > /dev/null
curl -s -X POST $BASE/api/auth/whatsapp/verify -H 'Content-Type: application/json' \
  -d '{"phone":"+237600000099","code":"000000"}' | grep -q 'Invalid verification code' && ok "OTP wrong rejected" || no "OTP wrong not rejected"

echo ""
echo "=== TRANSACTIONS: list ==="
curl -s $BASE/api/transactions -H "Authorization: Bearer $CTOKEN" | grep -q '\[' && ok "Tx list" || no "Tx list fail"

echo ""
echo "=== RATES: list (auth) ==="
curl -s $BASE/api/rates -H "Authorization: Bearer $CTOKEN" | grep -q '"rates"' && ok "Rates list" || no "Rates fail"

echo ""
echo "=== NUMBERS: list ==="
curl -s $BASE/api/numbers -H "Authorization: Bearer $ATOKEN" | grep -q '\[' && ok "Numbers list (admin)" || no "Numbers fail"

echo ""
echo "=== ADMIN: users ==="
curl -s $BASE/api/admin/users -H "Authorization: Bearer $ATOKEN" | grep -q '\[' && ok "Admin users list" || no "Admin users fail"

echo ""
echo "=== ADMIN: dashboard ==="
curl -s $BASE/api/admin/dashboard -H "Authorization: Bearer $ATOKEN" | grep -q '"counts"' && ok "Admin dashboard" || no "Admin dashboard fail"

echo ""
echo "=== ADMIN: transactions (via /api/transactions) ==="
curl -s $BASE/api/transactions -H "Authorization: Bearer $ATOKEN" | grep -q '\[' && ok "Admin tx list" || no "Admin tx fail"

echo ""
echo "=== ADMIN: audit logs ==="
curl -s $BASE/api/audit-logs -H "Authorization: Bearer $ATOKEN" | grep -q '\[' && ok "Audit logs" || no "Audit fail"

echo ""
echo "================================"
echo "RESULTS: $PASS passed, $FAIL failed"
echo "================================"
[ $FAIL -eq 0 ] && exit 0 || exit 1
