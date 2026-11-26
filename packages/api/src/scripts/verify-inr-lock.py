import json
import subprocess
import urllib.request
import urllib.error
import time

BASE_URL = "http://127.0.0.1:9000"

def run_psql(sql: str):
    cmd = ["/opt/homebrew/opt/postgresql@17/bin/psql", "-d", "my-mercur", "-U", "sanikeit", "-c", sql]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"psql error: {res.stderr}")
    return res.stdout

def wait_for_server(max_retries=15, delay=1):
    for _ in range(max_retries):
        try:
            req = urllib.request.Request(f"{BASE_URL}/health")
            with urllib.request.urlopen(req, timeout=2) as resp:
                if resp.status == 200:
                    return
        except Exception:
            time.sleep(delay)

def make_req(path: str, method: str = "GET", data: dict = None, headers: dict = None):
    url = f"{BASE_URL}{path}"
    req_headers = headers.copy() if headers else {}
    body_bytes = None
    if data is not None:
        body_bytes = json.dumps(data).encode("utf-8")
        req_headers["Content-Type"] = "application/json"
    
    req = urllib.request.Request(url, data=body_bytes, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            resp_body_bytes = resp.read()
            resp_headers = dict(resp.headers)
            try:
                body = json.loads(resp_body_bytes.decode())
            except Exception:
                body = resp_body_bytes.decode()
            return status, body, resp_headers
    except urllib.error.HTTPError as e:
        status = e.code
        resp_body_bytes = e.read()
        resp_headers = dict(e.headers)
        try:
            body = json.loads(resp_body_bytes.decode())
        except Exception:
            body = resp_body_bytes.decode()
        return status, body, resp_headers

def get_admin_token():
    status, body, _ = make_req(
        "/auth/user/emailpass",
        method="POST",
        data={"email": "admin@mercur-test.com", "password": "supersecret"}
    )
    if status == 200 and "token" in body:
        return body["token"]
    raise RuntimeError(f"Failed to get admin token: {status} {body}")

def get_or_create_seller_auth():
    ts = int(time.time())
    email = "rahul-1795597162@sirsatraders.com"
    password = "Password123!"
    seller_id = "sel_01M88YWNXPEECNYP5GECYGKQCF"
    handle = "sirsa-traders-1795597162"

    status, login_body, _ = make_req(
        "/auth/member/emailpass",
        method="POST",
        data={"email": email, "password": password}
    )
    if status == 200 and "token" in login_body:
        token = login_body["token"]
    else:
        # Create fresh seller if not present
        email = f"seller-{ts}@inrlocktest.com"
        status, reg_body, _ = make_req(
            "/auth/member/emailpass/register",
            method="POST",
            data={"email": email, "password": password}
        )
        assert status == 200, f"Member register failed: {status} {reg_body}"
        initial_token = reg_body["token"]

        seller_name = f"INR Test Trader {ts}"
        handle = f"inr-trader-{ts}"
        status, seller_body, _ = make_req(
            "/vendor/sellers",
            method="POST",
            headers={
                "Authorization": f"Bearer {initial_token}",
                "x-invite-code": "TALARO-BETA-001"
            },
            data={
                "name": seller_name,
                "handle": handle,
                "email": email,
                "currency_code": "inr",
                "member_email": email,
                "first_name": "Test",
                "last_name": "Seller",
                "phone": f"+9198765{ts % 100000:05d}",
            }
        )
        assert status in (200, 201), f"Seller registration failed: {status} {seller_body}"
        seller_id = seller_body["seller"]["id"]
        run_psql(f"UPDATE seller SET status = 'open' WHERE id = '{seller_id}';")

        status, login_after, _ = make_req(
            "/auth/member/emailpass",
            method="POST",
            data={"email": email, "password": password}
        )
        assert status == 200 and "token" in login_after, f"Login failed: {status} {login_after}"
        token = login_after["token"]

    sp_out = run_psql(f"SELECT id FROM shipping_profile WHERE type = 'default' LIMIT 1;")
    sp_lines = [l.strip() for l in sp_out.splitlines() if l.strip().startswith("sp_")]
    shipping_profile_id = sp_lines[0]

    var_out = run_psql("SELECT id, product_id FROM product_variant LIMIT 1;")
    var_lines = [l.strip() for l in var_out.splitlines() if "variant_" in l]
    variant_id, product_id = [x.strip() for x in var_lines[0].split("|")]

    return {
        "token": token,
        "seller_id": seller_id,
        "handle": handle,
        "shipping_profile_id": shipping_profile_id,
        "variant_id": variant_id,
        "product_id": product_id,
        "ts": ts,
    }

def main():
    print("=" * 70)
    print("VERIFICATION SUITE: INR-ONLY LOCK FOR MVP (8 TESTS)")
    print("=" * 70)

    wait_for_server()
    auth = get_or_create_seller_auth()
    token = auth["token"]
    seller_id = auth["seller_id"]
    handle = auth["handle"]
    sp_id = auth["shipping_profile_id"]
    var_id = auth["variant_id"]
    prod_id = auth["product_id"]
    ts = auth["ts"]
    headers = {
        "Authorization": f"Bearer {token}",
        "x-seller-id": seller_id,
    }

    EXPECTED_MSG = "Only INR (inr) offers are supported in this pilot. Remove non-INR prices from the request."

    # -------------------------------------------------------------------------
    # TEST 1: POST /vendor/offers with prices [{ currency_code: "eur", amount: 100 }] -> 400
    # -------------------------------------------------------------------------
    print("\n--- TEST 1: POST /vendor/offers with prices [{ currency_code: 'eur', amount: 100 }] ---")
    sku_eur = f"SKU-EUR-{ts}"
    status, body, _ = make_req(
        "/vendor/offers",
        method="POST",
        headers=headers,
        data={
            "sku": sku_eur,
            "variant_id": var_id,
            "shipping_profile_id": sp_id,
            "inventory_items": [{"sku": sku_eur}],
            "prices": [{"currency_code": "eur", "amount": 100}],
        }
    )
    print(f"Status: HTTP {status}, Response: {body}")
    assert status == 400, f"Expected 400, got {status}"
    assert body.get("type") == "invalid_data", f"Expected type 'invalid_data', got {body.get('type')}"
    assert body.get("message") == EXPECTED_MSG, f"Expected message '{EXPECTED_MSG}', got '{body.get('message')}'"
    print("✓ Test 1 Passed: EUR offer was rejected with HTTP 400 and exact INR-only message")

    # -------------------------------------------------------------------------
    # TEST 2: POST /vendor/offers with prices [{ currency_code: "usd", amount: 100 }] -> 400
    # -------------------------------------------------------------------------
    print("\n--- TEST 2: POST /vendor/offers with prices [{ currency_code: 'usd', amount: 100 }] ---")
    sku_usd = f"SKU-USD-{ts}"
    status, body, _ = make_req(
        "/vendor/offers",
        method="POST",
        headers=headers,
        data={
            "sku": sku_usd,
            "variant_id": var_id,
            "shipping_profile_id": sp_id,
            "inventory_items": [{"sku": sku_usd}],
            "prices": [{"currency_code": "usd", "amount": 100}],
        }
    )
    print(f"Status: HTTP {status}, Response: {body}")
    assert status == 400, f"Expected 400, got {status}"
    assert body.get("type") == "invalid_data", f"Expected type 'invalid_data', got {body.get('type')}"
    assert body.get("message") == EXPECTED_MSG, f"Expected message '{EXPECTED_MSG}', got '{body.get('message')}'"
    print("✓ Test 2 Passed: USD offer was rejected with HTTP 400 and exact INR-only message")

    # -------------------------------------------------------------------------
    # TEST 3: POST /vendor/offers with prices [{ currency_code: "inr", amount: 100 }] -> 201
    # -------------------------------------------------------------------------
    print("\n--- TEST 3: POST /vendor/offers with prices [{ currency_code: 'inr', amount: 100 }] ---")
    sku_inr = f"SKU-INR-{ts}"
    status, body, _ = make_req(
        "/vendor/offers",
        method="POST",
        headers=headers,
        data={
            "sku": sku_inr,
            "variant_id": var_id,
            "shipping_profile_id": sp_id,
            "inventory_items": [{"sku": sku_inr}],
            "prices": [{"currency_code": "inr", "amount": 100}],
        }
    )
    print(f"Status: HTTP {status}, Response offer ID: {body.get('offer', {}).get('id') if isinstance(body, dict) else body}")
    assert status == 201, f"Expected 201, got {status} {body}"
    created_offer = body.get("offer")
    assert created_offer is not None, "Expected created offer in response"
    print(f"✓ Test 3 Passed: INR offer created successfully with HTTP 201 (offer id: {created_offer.get('id')})")

    # -------------------------------------------------------------------------
    # TEST 4: POST /vendor/offers with prices [{ currency_code: "inr", amount: 100 }, { currency_code: "eur", amount: 50 }] -> 400
    # -------------------------------------------------------------------------
    print("\n--- TEST 4: POST /vendor/offers with mixed INR + EUR prices ---")
    sku_mix = f"SKU-MIX-{ts}"
    status, body, _ = make_req(
        "/vendor/offers",
        method="POST",
        headers=headers,
        data={
            "sku": sku_mix,
            "variant_id": var_id,
            "shipping_profile_id": sp_id,
            "inventory_items": [{"sku": sku_mix}],
            "prices": [
                {"currency_code": "inr", "amount": 100},
                {"currency_code": "eur", "amount": 50},
            ],
        }
    )
    print(f"Status: HTTP {status}, Response: {body}")
    assert status == 400, f"Expected 400, got {status}"
    assert body.get("type") == "invalid_data", f"Expected type 'invalid_data', got {body.get('type')}"
    assert body.get("message") == EXPECTED_MSG, f"Expected message '{EXPECTED_MSG}', got '{body.get('message')}'"
    print("✓ Test 4 Passed: Mixed INR+EUR offer rejected loudly with HTTP 400")

    # -------------------------------------------------------------------------
    # TEST 5: Direct DB EUR-only test offer. GET /public/products -> offer does not appear, product not counted from that offer.
    # -------------------------------------------------------------------------
    print("\n--- TEST 5: Direct DB EUR-only offer omitted from /public/products ---")
    # Create a unique test product for this test
    eur_prod_id = f"prod_eur_test_{ts}"
    eur_var_id = f"var_eur_test_{ts}"
    eur_offer_id = f"offer_eur_test_{ts}"
    eur_pset_id = f"pset_eur_test_{ts}"
    eur_price_id = f"price_eur_test_{ts}"

    insert_eur_sql = f"""
    INSERT INTO product (id, title, handle, status, created_at, updated_at)
    VALUES ('{eur_prod_id}', 'Exclusive EUR Only Sneaker {ts}', 'eur-sneaker-{ts}', 'published', now(), now());

    INSERT INTO product_variant (id, product_id, title, sku, created_at, updated_at)
    VALUES ('{eur_var_id}', '{eur_prod_id}', 'EU 42', 'SKU-EUR-ONLY-{ts}', now(), now());

    INSERT INTO offer (id, seller_id, variant_id, product_id, shipping_profile_id, sku, created_by, manage_inventory, allow_backorder)
    VALUES ('{eur_offer_id}', '{seller_id}', '{eur_var_id}', '{eur_prod_id}', '{sp_id}', 'SKU-EUR-ONLY-{ts}', 'admin', true, false);

    INSERT INTO offer_seller (id, offer_id, seller_id) VALUES ('link_os_eur_{ts}', '{eur_offer_id}', '{seller_id}');
    INSERT INTO offer_product (id, offer_id, product_id) VALUES ('link_op_eur_{ts}', '{eur_offer_id}', '{eur_prod_id}');

    INSERT INTO price_set (id, created_at, updated_at) VALUES ('{eur_pset_id}', now(), now());
    INSERT INTO price (id, currency_code, amount, raw_amount, price_set_id, created_at, updated_at)
    VALUES ('{eur_price_id}', 'eur', 88, '{{"value": "88", "precision": 20}}', '{eur_pset_id}', now(), now());
    INSERT INTO offer_offer_pricing_price (id, offer_id, price_id) VALUES ('link_pr_eur_{ts}', '{eur_offer_id}', '{eur_price_id}');
    """
    run_psql(insert_eur_sql)
    print(f"Directly inserted EUR-only product ({eur_prod_id}) and offer ({eur_offer_id}) into DB")

    status, prod_res, _ = make_req(f"/public/products?q=Exclusive%20EUR%20Only%20Sneaker%20{ts}")
    print(f"GET /public/products response for EUR-only product: count={prod_res['count']}, products={prod_res['products']}")
    assert status == 200, f"Expected 200, got {status}"
    assert prod_res["count"] == 0, f"Expected count 0, got {prod_res['count']}"
    assert len(prod_res["products"]) == 0, "EUR-only product must not be returned in public products"
    print("✓ Test 5 Passed: EUR-only offer does not appear, product group excluded from /public/products")

    # -------------------------------------------------------------------------
    # TEST 6: GET /public/sellers/:handle for a seller whose only offer is EUR -> products array is empty
    # -------------------------------------------------------------------------
    print("\n--- TEST 6: GET /public/sellers/:handle for EUR-only seller ---")
    # Create seller whose only offer is EUR
    eur_seller_id = f"sel_eur_only_{ts}"
    eur_seller_handle = f"eur-only-seller-{ts}"
    eur_seller_sql = f"""
    INSERT INTO seller (id, name, handle, email, currency_code, status, created_at, updated_at)
    VALUES ('{eur_seller_id}', 'EUR Only Footwear {ts}', '{eur_seller_handle}', 'eur-{ts}@seller.com', 'eur', 'open', now(), now());

    INSERT INTO seller_address (id, seller_id, city, postal_code, created_at, updated_at)
    VALUES ('seladdr_eur_{ts}', '{eur_seller_id}', 'Berlin', '10115', now(), now());

    INSERT INTO offer (id, seller_id, variant_id, product_id, shipping_profile_id, sku, created_by, manage_inventory, allow_backorder)
    VALUES ('offer_eur_sel_{ts}', '{eur_seller_id}', '{eur_var_id}', '{eur_prod_id}', '{sp_id}', 'SKU-EUR-SEL-{ts}', 'admin', true, false);

    INSERT INTO offer_seller (id, offer_id, seller_id) VALUES ('link_os_eursel_{ts}', 'offer_eur_sel_{ts}', '{eur_seller_id}');
    INSERT INTO offer_product (id, offer_id, product_id) VALUES ('link_op_eursel_{ts}', 'offer_eur_sel_{ts}', '{eur_prod_id}');
    INSERT INTO offer_offer_pricing_price (id, offer_id, price_id) VALUES ('link_pr_eursel_{ts}', 'offer_eur_sel_{ts}', '{eur_price_id}');
    """
    run_psql(eur_seller_sql)
    print(f"Created open seller {eur_seller_handle} with only EUR offers in DB")

    status, seller_detail, _ = make_req(f"/public/sellers/{eur_seller_handle}")
    print(f"GET /public/sellers/{eur_seller_handle} status: {status}")
    print(f"Returned seller: {seller_detail['seller']['handle']}, products count: {len(seller_detail['products'])}")
    assert status == 200, f"Expected 200, got {status}"
    assert seller_detail["products"] == [], f"Expected empty products array, got {seller_detail['products']}"
    print("✓ Test 6 Passed: Seller whose only offer is EUR returns empty products: [] array")

    # -------------------------------------------------------------------------
    # TEST 7: Confirm existing INR offers still appear correctly in /public/products and /public/sellers/:handle
    # -------------------------------------------------------------------------
    print("\n--- TEST 7: Existing INR offers appear in /public/products and /public/sellers/:handle ---")
    status, detail_inr, _ = make_req(f"/public/sellers/{handle}")
    assert status == 200, f"Expected 200, got {status}"
    print(f"Seller {handle} products count: {len(detail_inr['products'])}")
    assert len(detail_inr["products"]) > 0, f"Expected at least 1 product for INR seller {handle}"
    p_inr = detail_inr["products"][0]
    print(f"  Product: {p_inr['title']}, currency: {p_inr['currency']}, min_price: {p_inr['min_price']}, max_price: {p_inr['max_price']}")
    assert p_inr["currency"] == "inr", f"Expected currency 'inr', got {p_inr['currency']}"
    assert p_inr["min_price"] == 100, f"Expected min_price 100, got {p_inr['min_price']}"

    status, prod_inr, _ = make_req(f"/public/products?seller_handle={handle}")
    assert status == 200, f"Expected 200, got {status}"
    assert prod_inr["count"] > 0, f"Expected count > 0, got {prod_inr['count']}"
    first_group = prod_inr["products"][0]
    print(f"  Group in /public/products: {first_group['title']}, offers: {len(first_group['offers'])}")
    assert all(o["currency"] == "inr" for o in first_group["offers"]), "All offers must have currency 'inr'"
    print("✓ Test 7 Passed: Existing INR offers appear correctly with currency='inr' in both endpoints")

    # -------------------------------------------------------------------------
    # TEST 8: Run 7 tests from Prompt 10 + 9 tests from Prompt 11 -> confirm no regressions
    # -------------------------------------------------------------------------
    print("\n--- TEST 8: Regression suite (Prompt 10 [7 tests] + Prompt 11 [9 tests]) ---")
    print("Executing verify-public-apis.py (Prompt 10)...")
    res_p10 = subprocess.run(["python3", "packages/api/src/scripts/verify-public-apis.py"], capture_output=True, text=True)
    print(res_p10.stdout)
    if res_p10.returncode != 0:
        print("STDERR:", res_p10.stderr)
    assert res_p10.returncode == 0, f"Prompt 10 tests failed with code {res_p10.returncode}"
    print("✓ Prompt 10 (7 tests) PASSED without regressions")

    print("Executing verify-address-and-filters.py (Prompt 11)...")
    res_p11 = subprocess.run(["python3", "packages/api/src/scripts/verify-address-and-filters.py"], capture_output=True, text=True)
    print(res_p11.stdout)
    if res_p11.returncode != 0:
        print("STDERR:", res_p11.stderr)
    assert res_p11.returncode == 0, f"Prompt 11 tests failed with code {res_p11.returncode}"
    print("✓ Prompt 11 (9 tests) PASSED without regressions")
    print("✓ Test 8 Passed: Full regression suite (16 tests) passed with 0 regressions")

    print("\n" + "=" * 70)
    print("ALL 8 INR-LOCK VERIFICATION TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    main()
