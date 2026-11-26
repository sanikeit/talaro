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

def main():
    print("=" * 70)
    print("VERIFICATION SUITE: SELLER ADDRESS POPULATION & CITY/PINCODE FILTERING")
    print("=" * 70)

    admin_token = get_admin_token()
    print("✓ Acquired admin auth token")

    # -------------------------------------------------------------------------
    # VERIFY 1: Create fresh seller via approve-request flow (city="Sirsa", pincode="125055")
    # -------------------------------------------------------------------------
    print("\n--- VERIFY 1: Create fresh seller via approve-request flow ---")
    ts = int(time.time())
    phone = f"+9198765{ts % 100000:05d}"
    handle = f"sirsa-traders-{ts}"
    member_email = f"rahul-{ts}@sirsatraders.com"

    # Step 1.1: Submit public seller request
    business_name = f"Sirsa Footwear Traders {ts}"
    status, req_res, _ = make_req(
        "/public/seller-requests",
        method="POST",
        data={
            "business_name": business_name,
            "contact_name": "Rahul Verma",
            "phone": phone,
            "city": "Sirsa",
            "pincode": "125055",
            "shop_front_photo_url": "https://example.com/shop.jpg",
            "bill_book_photo_url": "https://example.com/bill.jpg",
        }
    )
    assert status in (200, 201), f"Submit seller request failed: {status} {req_res}"
    seller_req_id = req_res["seller_request"]["id"]
    print(f"Created seller_request: {seller_req_id} (city: Sirsa, pincode: 125055)")

    # Step 1.2: Admin approves seller request
    status, app_res, _ = make_req(
        f"/admin/seller-requests/{seller_req_id}/approve",
        method="POST",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert status == 200, f"Approve seller request failed: {status} {app_res}"
    invite_code = app_res["invite"]["code"]
    print(f"Approved request, generated invite code: {invite_code}")

    # Step 1.3: Register member to get member auth token
    status, mem_auth, _ = make_req(
        "/auth/member/emailpass/register",
        method="POST",
        data={"email": member_email, "password": "Password123!"}
    )
    assert status in (200, 201), f"Member register failed: {status} {mem_auth}"
    member_token = mem_auth["token"]
    print(f"Registered member auth token for {member_email}")

    # Step 1.4: Register seller with invite code and member token
    status, reg_res, _ = make_req(
        "/vendor/sellers",
        method="POST",
        headers={
            "Authorization": f"Bearer {member_token}",
            "x-invite-code": invite_code,
        },
        data={
            "name": business_name,
            "handle": handle,
            "email": member_email,
            "currency_code": "inr",
            "member_email": member_email,
            "first_name": "Rahul",
            "last_name": "Verma",
        }
    )
    assert status in (200, 201), f"Seller registration failed: {status} {reg_res}"
    new_seller = reg_res["seller"]
    seller_id = new_seller["id"]
    print(f"Registered seller: {seller_id} (handle: {handle}, status: {new_seller.get('status')})")

    # -------------------------------------------------------------------------
    # VERIFY 2: Query DB directly for seller_address
    # -------------------------------------------------------------------------
    print("\n--- VERIFY 2: Query DB: SELECT s.id, a.city, a.postal_code ---")
    sql = f"""
        SELECT s.id AS seller_id, s.handle, a.id AS address_id, a.city, a.postal_code
        FROM seller s
        JOIN seller_address a ON s.id = a.seller_id
        WHERE s.handle = '{handle}';
    """
    db_out = run_psql(sql)
    print("Database Output:")
    print(db_out)
    assert "Sirsa" in db_out and "125055" in db_out, "DB must contain Sirsa and 125055 in seller_address"
    print("✓ VERIFY 2 Passed: DB confirms seller_address created with city='Sirsa', postal_code='125055'")

    # -------------------------------------------------------------------------
    # VERIFY 3: GET /public/sellers?city=Sirsa
    # -------------------------------------------------------------------------
    print("\n--- VERIFY 3: GET /public/sellers?city=Sirsa ---")
    status, body_city, _ = make_req("/public/sellers?city=Sirsa")
    assert status == 200, f"Expected 200, got {status}"
    matched_sellers = [s for s in body_city["sellers"] if s["handle"] == handle]
    print(f"Total sellers in Sirsa: {body_city['count']}")
    assert len(matched_sellers) > 0, "Our newly created seller should be found by city=Sirsa"
    assert matched_sellers[0]["city"] == "Sirsa", f"Seller city should be Sirsa, got {matched_sellers[0]['city']}"
    assert matched_sellers[0]["pincode"] == "125055", f"Seller pincode should be 125055, got {matched_sellers[0]['pincode']}"
    print(f"✓ VERIFY 3 Passed: Found seller {handle} with city='{matched_sellers[0]['city']}'")

    # -------------------------------------------------------------------------
    # VERIFY 4: GET /public/sellers?pincode=125055
    # -------------------------------------------------------------------------
    print("\n--- VERIFY 4: GET /public/sellers?pincode=125055 ---")
    status, body_pin, _ = make_req("/public/sellers?pincode=125055")
    assert status == 200, f"Expected 200, got {status}"
    matched_pin = [s for s in body_pin["sellers"] if s["handle"] == handle]
    print(f"Total sellers with pincode 125055: {body_pin['count']}")
    assert len(matched_pin) > 0, "Our newly created seller should be found by pincode=125055"
    print(f"✓ VERIFY 4 Passed: Found seller {handle} with pincode='{matched_pin[0]['pincode']}'")

    # -------------------------------------------------------------------------
    # VERIFY 5: GET /public/sellers?city=NonexistentCity
    # -------------------------------------------------------------------------
    print("\n--- VERIFY 5: GET /public/sellers?city=NonexistentCity ---")
    status, body_none, _ = make_req("/public/sellers?city=NonexistentCity")
    assert status == 200, f"Expected 200, got {status}"
    assert body_none["count"] == 0 and body_none["sellers"] == [], "Should return count 0 and empty array"
    print(f"✓ VERIFY 5 Passed: Empty list and count 0 returned for nonexistent city")

    # -------------------------------------------------------------------------
    # VERIFY 6: GET /public/products?q=<product>&city=Sirsa
    # -------------------------------------------------------------------------
    print("\n--- VERIFY 6: Link an offer to new seller & query /public/products?q=...&city=Sirsa ---")
    # Link an offer for Vantage 204 Runner to our new seller so they have an active product
    # Find existing shipping profile and product variant
    prof_out = run_psql("SELECT id FROM shipping_profile LIMIT 1;")
    lines = [l.strip() for l in prof_out.splitlines() if l.strip().startswith("sp_")]
    shipping_profile_id = lines[0] if lines else "sp_default"

    # Get a variant for Vantage runner
    var_out = run_psql("SELECT pv.id, pv.product_id FROM product_variant pv JOIN product p ON pv.product_id = p.id WHERE p.title ILIKE '%Vantage%' LIMIT 1;")
    var_lines = [l.split("|") for l in var_out.splitlines() if "variant_" in l]
    variant_id = var_lines[0][0].strip()
    product_id = var_lines[0][1].strip()

    # Get seller member id
    mem_out = run_psql(f"SELECT member_id FROM seller_member WHERE seller_id = '{seller_id}' LIMIT 1;")
    mem_lines = [l.strip() for l in mem_out.splitlines() if l.strip().startswith("mem_")]
    created_by = mem_lines[0] if mem_lines else "mem_default"

    offer_id = f"offer_sirsa_{ts}"
    price_set_id = f"pset_sirsa_{ts}"
    price_id = f"price_sirsa_{ts}"

    insert_sql = f"""
    INSERT INTO offer (id, seller_id, variant_id, product_id, shipping_profile_id, sku, created_by, manage_inventory, allow_backorder)
    VALUES ('{offer_id}', '{seller_id}', '{variant_id}', '{product_id}', '{shipping_profile_id}', 'SKU-SIRSA-{ts}', '{created_by}', true, false);

    INSERT INTO offer_seller (id, offer_id, seller_id) VALUES ('link_os_{ts}', '{offer_id}', '{seller_id}');
    INSERT INTO offer_product (id, offer_id, product_id) VALUES ('link_op_{ts}', '{offer_id}', '{product_id}');

    INSERT INTO price_set (id, created_at, updated_at) VALUES ('{price_set_id}', now(), now());
    INSERT INTO price (id, currency_code, amount, raw_amount, price_set_id, created_at, updated_at)
    VALUES ('{price_id}', 'inr', 4999, '{{"value": "4999", "precision": 20}}', '{price_set_id}', now(), now());
    INSERT INTO offer_offer_pricing_price (id, offer_id, price_id) VALUES ('link_pr_{ts}', '{offer_id}', '{price_id}');
    """
    run_psql(insert_sql)
    print(f"Created active offer {offer_id} for product {product_id} under seller {seller_id}")

    status, prod_city, _ = make_req(f"/public/products?q=Vantage&city=Sirsa")
    assert status == 200, f"Expected 200, got {status}"
    print(f"Products matching 'Vantage' in 'Sirsa': {prod_city['count']}")
    assert prod_city["count"] > 0, "Must return at least 1 product in Sirsa"
    seller_handles = [p["seller"]["handle"] for p in prod_city["products"]]
    assert handle in seller_handles, f"Expected {handle} in {seller_handles}"
    matched_p = next(p for p in prod_city["products"] if p["seller"]["handle"] == handle)
    assert matched_p["seller"]["city"] == "Sirsa"
    assert matched_p["seller"]["handle"] == handle
    print(f"✓ VERIFY 6 Passed: Found product '{matched_p['title']}' for seller {handle} with city=Sirsa")

    # -------------------------------------------------------------------------
    # VERIFY 7: stock_status equals "unknown"
    # -------------------------------------------------------------------------
    print("\n--- VERIFY 7: Check stock_status fields equal 'unknown' ---")
    offers = matched_p["offers"]
    print(f"Offers count: {len(offers)}")
    for off in offers:
        print(f"  Offer {off['id']}: price={off['price']} {off['currency']}, stock_status={off['stock_status']}")
        assert off["stock_status"] == "unknown", f"Expected 'unknown', got {off['stock_status']}"
    print("✓ VERIFY 7 Passed: All offer stock_status fields equal 'unknown'")

    # -------------------------------------------------------------------------
    # VERIFY 8: Rate limit headers check
    # -------------------------------------------------------------------------
    print("\n--- VERIFY 8: curl -I http://localhost:9000/public/sellers | grep -i ratelimit ---")
    cmd = ["curl", "-I", "http://127.0.0.1:9000/public/sellers"]
    res = subprocess.run(cmd, capture_output=True, text=True)
    headers = [l for l in res.stdout.splitlines() if "ratelimit" in l.lower()]
    print("Headers output:")
    for h in headers:
        print(f"  {h}")
    assert any("x-ratelimit-limit" in h.lower() for h in headers), "Missing X-RateLimit-Limit"
    assert any("x-ratelimit-remaining" in h.lower() for h in headers), "Missing X-RateLimit-Remaining"
    assert any("x-ratelimit-reset" in h.lower() for h in headers), "Missing X-RateLimit-Reset"
    print("✓ VERIFY 8 Passed: All 3 RateLimit headers present in curl -I")

    # -------------------------------------------------------------------------
    # VERIFY 9: Confirm Prompt 10 tests still pass (no regressions)
    # -------------------------------------------------------------------------
    print("\n--- VERIFY 9: Re-running Prompt 10 7-test suite ---")
    test10_cmd = ["python3", "packages/api/src/scripts/verify-public-apis.py"]
    res10 = subprocess.run(test10_cmd, capture_output=True, text=True)
    if res10.returncode != 0:
        print("Prompt 10 tests output:\n", res10.stdout, res10.stderr)
        raise RuntimeError("Prompt 10 regression tests failed!")
    print("Prompt 10 test summary:")
    for line in res10.stdout.splitlines():
        if "Passed" in line or "PASSED" in line:
            print(f"  {line}")
    print("✓ VERIFY 9 Passed: No regressions, all Prompt 10 tests passed")

    print("\n" + "=" * 70)
    print("ALL 9 VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    main()
