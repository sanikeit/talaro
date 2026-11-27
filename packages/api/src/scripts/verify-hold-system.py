#!/usr/bin/env python3
"""
Talaro 24-Hour Request Hold System — Verification Suite
Tests the complete end-to-end courtesy hold lifecycle:
1. Public hold creation (POST /public/holds)
2. Tokenized buyer pass (GET /public/holds/:token)
3. Concurrency lock (409 on duplicate hold for same offer)
4. Anti-abuse guardrails (max 2 active holds, max 3 daily holds)
5. Buyer cancellation (POST /public/holds/:token/cancel)
6. Seller 1-click confirmation URL (GET /public/holds/action/:seller_token)
7. Catalog hold annotation (GET /public/products -> is_held=True)
8. Storefront digital pass SSR (GET /in/h/:token)
9. Vendor portal actions (GET /vendor/holds, POST /vendor/holds/:id/pickup)
"""

import sys
import json
import urllib.request
import urllib.error
import random
import time

BACKEND_URL = "http://localhost:9000"
STOREFRONT_URL = "http://localhost:8000"

def log(msg):
    print(f"[TEST] {msg}")

def request_json(url, method="GET", data=None, headers=None):
    hdrs = {"Content-Type": "application/json"}
    if headers:
        hdrs.update(headers)
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            parsed = json.loads(content)
        except Exception:
            parsed = {"raw": content}
        return e.code, parsed

def request_raw(url, method="GET", headers=None):
    req = urllib.request.Request(url, headers=headers or {}, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")

def cleanup_test_data():
    import subprocess
    try:
        subprocess.run(
            ["/opt/homebrew/opt/postgresql@17/bin/psql", "-d", "my-mercur", "-c", "DELETE FROM stock_hold WHERE buyer_phone LIKE '+9198%';"],
            capture_output=True,
            check=False
        )
    except Exception:
        pass

def wait_for_backend():
    log("Waiting for backend on port 9000 to be ready...")
    for _ in range(30):
        try:
            with urllib.request.urlopen(f"{BACKEND_URL}/health", timeout=2) as resp:
                if resp.status == 200:
                    log("Backend is ready.")
                    return
        except Exception:
            time.sleep(1)
    raise RuntimeError("Backend failed to respond on port 9000")

def main():
    print("=" * 60)
    print("Talaro 24-Hour Courtesy Hold System — Verification Suite")
    print("=" * 60)

    wait_for_backend()
    cleanup_test_data()

    # 1. Fetch catalog to find available offers and sellers
    status, catalog = request_json(f"{BACKEND_URL}/public/products?limit=50")
    assert status == 200, f"Failed to fetch catalog: {catalog}"
    products = catalog.get("products", [])
    assert len(products) >= 2, "Need at least 2 products in catalog for testing"

    # Find a seller that has a member account for authenticated vendor tests
    import subprocess
    try:
        out = subprocess.check_output([
            "/opt/homebrew/opt/postgresql@17/bin/psql",
            "-d", "my-mercur", "-t", "-A", "-c",
            "SELECT s.id, m.email FROM seller s JOIN seller_member sm ON s.id = sm.seller_id JOIN member m ON sm.member_id = m.id WHERE m.email LIKE 'rahul%@sirsatraders.com' LIMIT 1;"
        ]).decode().strip()
        auth_seller_id, auth_member_email = out.split("|")
    except Exception:
        auth_seller_id, auth_member_email = None, None

    # Gather distinct offers, prioritizing auth_seller_id for offer_1
    test_offers = []
    auth_seller_offers = []
    other_offers = []

    for p in products:
        for off in p.get("offers", []):
            item = {
                "offer_id": off["id"],
                "product_title": p["title"],
                "seller_id": p["seller"]["id"],
                "seller_name": p["seller"]["name"],
            }
            if auth_seller_id and p["seller"]["id"] == auth_seller_id:
                auth_seller_offers.append(item)
            else:
                other_offers.append(item)

    test_offers = auth_seller_offers + other_offers
    assert len(test_offers) >= 3, "Need at least 3 unheld offers to test caps"

    offer_1 = test_offers[0]
    offer_2 = test_offers[1]
    offer_3 = test_offers[2]

    # Generate unique test phone numbers to avoid test pollution
    rand_suffix = random.randint(100000, 999999)
    phone_a = f"98{rand_suffix}01"
    phone_b = f"98{rand_suffix}02"

    log(f"Test Offer 1: {offer_1['product_title']} ({offer_1['offer_id']})")
    log(f"Test Phone A: {phone_a}")

    # TEST 1: Create Hold Request
    log("Running Test 1: POST /public/holds (Hold Request Creation)...")
    payload_1 = {
        "offer_id": offer_1["offer_id"],
        "buyer_name": "Rohan Sharma",
        "buyer_phone": phone_a,
    }
    status, hold_res = request_json(f"{BACKEND_URL}/public/holds", method="POST", data=payload_1)
    assert status == 201, f"Expected 201 Created, got {status}: {hold_res}"
    assert hold_res["status"] == "requested", f"Expected requested status, got {hold_res['status']}"
    assert "token" in hold_res and len(hold_res["token"]) >= 16, "Invalid token"
    assert "seller_token" in hold_res, "Missing seller_token"
    assert "whatsapp_url" in hold_res and "wa.me" in hold_res["whatsapp_url"], "Invalid WhatsApp URL"
    assert hold_res["seller_token"] in hold_res["whatsapp_url"], "Seller action link missing from WhatsApp URL"

    token_1 = hold_res["token"]
    seller_token_1 = hold_res["seller_token"]
    hold_id_1 = hold_res["id"]
    log(f"✔ Hold 1 created: id={hold_id_1}, token={token_1}")

    # TEST 2: Digital Pass Lookup
    log("Running Test 2: GET /public/holds/:token (Buyer Pass)...")
    status, pass_res = request_json(f"{BACKEND_URL}/public/holds/{token_1}")
    assert status == 200, f"Expected 200, got {status}: {pass_res}"
    assert pass_res["status"] == "requested", f"Pass status mismatch: {pass_res['status']}"
    assert pass_res["buyer_name"] == "Rohan Sharma"
    assert pass_res["can_cancel"] is True
    assert pass_res["product"]["title"] == offer_1["product_title"]
    log("✔ Digital pass lookup verified successfully.")

    # TEST 3: Duplicate Hold Prevention (Concurrency Lock)
    log("Running Test 3: Concurrency check — duplicate hold on same item...")
    payload_dup = {
        "offer_id": offer_1["offer_id"],
        "buyer_name": "Another Buyer",
        "buyer_phone": phone_b,
    }
    status, dup_res = request_json(f"{BACKEND_URL}/public/holds", method="POST", data=payload_dup)
    assert status == 409, f"Expected 409 Conflict, got {status}: {dup_res}"
    log("✔ Duplicate hold blocked with 409 Conflict.")

    # TEST 4: Anti-Abuse (Max 2 active holds per buyer phone)
    log("Running Test 4: Anti-abuse — max 2 active holds per buyer phone...")
    # Hold 2 for Phone A on Offer 2
    payload_2 = {
        "offer_id": offer_2["offer_id"],
        "buyer_name": "Rohan Sharma",
        "buyer_phone": phone_a,
    }
    status, hold_res_2 = request_json(f"{BACKEND_URL}/public/holds", method="POST", data=payload_2)
    assert status == 201, f"Expected 201 for 2nd hold, got {status}: {hold_res_2}"
    token_2 = hold_res_2["token"]
    log(f"✔ Hold 2 created for phone {phone_a}")

    # 3rd simultaneous hold for Phone A on Offer 3 -> must be blocked with 429
    payload_3 = {
        "offer_id": offer_3["offer_id"],
        "buyer_name": "Rohan Sharma",
        "buyer_phone": phone_a,
    }
    status, hold_res_3 = request_json(f"{BACKEND_URL}/public/holds", method="POST", data=payload_3)
    assert status == 429, f"Expected 429 Too Many Requests, got {status}: {hold_res_3}"
    assert "Active hold limit reached" in hold_res_3.get("message", "")
    log("✔ 3rd simultaneous active hold successfully blocked with 429.")

    # TEST 5: Buyer Cancellation & Daily Cap
    log("Running Test 5: Buyer cancellation (POST /public/holds/:token/cancel)...")
    status, cancel_res = request_json(f"{BACKEND_URL}/public/holds/{token_2}/cancel", method="POST")
    assert status == 200, f"Expected 200, got {status}: {cancel_res}"
    assert cancel_res["status"] == "cancelled"

    # Now that Hold 2 was cancelled, Phone A has only 1 active hold.
    # Creating a 3rd hold will now pass the active cap (1 active < 2), but hit 3 daily holds total!
    status, hold_res_3 = request_json(f"{BACKEND_URL}/public/holds", method="POST", data=payload_3)
    assert status == 201, f"Expected 201 after cancel, got {status}: {hold_res_3}"
    token_3 = hold_res_3["token"]
    log("✔ Created 3rd lifetime hold for phone A.")

    # Now cancel Hold 3 so Phone A has only 1 active hold (Hold 1),
    # but has already requested 3 holds today (Hold 1, Hold 2, Hold 3).
    status, cancel_res_3 = request_json(f"{BACKEND_URL}/public/holds/{token_3}/cancel", method="POST")
    assert status == 200, f"Expected 200 on cancel, got {status}: {cancel_res_3}"

    # 4th hold in 24 hours -> must be blocked with daily limit 429
    if len(test_offers) > 3:
        offer_4 = test_offers[3]
        payload_4 = {
            "offer_id": offer_4["offer_id"],
            "buyer_name": "Rohan Sharma",
            "buyer_phone": phone_a,
        }
        status, hold_res_4 = request_json(f"{BACKEND_URL}/public/holds", method="POST", data=payload_4)
        assert status == 429, f"Expected 429 Daily limit, got {status}: {hold_res_4}"
        assert "Daily hold limit" in hold_res_4.get("message", "")
        log("✔ 4th daily hold blocked by daily rate limiter.")

    # TEST 6: Seller 1-Click Action (Confirmation via seller_token)
    log("Running Test 6: Seller 1-click confirmation URL...")
    action_url = f"{BACKEND_URL}/public/holds/action/{seller_token_1}?action=confirm"
    status, action_html = request_raw(action_url)
    assert status == 200, f"Expected 200 HTML, got {status}"
    assert "Hold Confirmed" in action_html or "24-Hour Hold Confirmed" in action_html
    log("✔ Seller 1-click confirmation executed, mobile HTML card rendered.")

    # Verify pass updated to confirmed with 24h expiration
    status, pass_res_after = request_json(f"{BACKEND_URL}/public/holds/{token_1}")
    assert pass_res_after["status"] == "confirmed"
    assert pass_res_after["expires_at"] is not None
    log("✔ Hold status transitioned to 'confirmed'.")

    # TEST 7: Catalog Annotation (is_held = True)
    log("Running Test 7: Public catalog hold annotation...")
    status, catalog_after = request_json(f"{BACKEND_URL}/public/products?limit=50")
    assert status == 200
    held_offer_found = False
    for p in catalog_after.get("products", []):
        for off in p.get("offers", []):
            if off["id"] == offer_1["offer_id"]:
                assert off.get("is_held") is True, f"Offer {off['id']} should have is_held=True"
                assert off.get("hold_expires_at") is not None, "hold_expires_at should be present"
                held_offer_found = True
    assert held_offer_found, "Confirmed hold offer was not found with is_held=True in catalog"
    log("✔ Catalog correctly reflects is_held=True on held offer.")

    # TEST 8: Storefront Digital Pass Route
    log("Running Test 8: Storefront digital pass SSR (/in/h/:token)...")
    status, pass_page_html = request_raw(f"{STOREFRONT_URL}/in/h/{token_1}")
    assert status == 200, f"Expected 200 from storefront, got {status}"
    assert "Courtesy Hold Pass" in pass_page_html or "24-hour courtesy inventory hold" in pass_page_html
    log("✔ Storefront pass page SSR rendered with 200 OK.")

    # TEST 9: Vendor Portal API
    log("Running Test 9: Vendor portal endpoints (/vendor/holds/*)...")
    seller_id = offer_1["seller_id"]
    headers = {"x-seller-id": seller_id}

    # Query the exact member account associated with this seller
    try:
        member_email = subprocess.check_output([
            "/opt/homebrew/opt/postgresql@17/bin/psql",
            "-d", "my-mercur", "-t", "-A", "-c",
            f"SELECT m.email FROM member m JOIN seller_member sm ON m.id = sm.member_id WHERE sm.seller_id = '{seller_id}' LIMIT 1;"
        ]).decode().strip()
    except Exception:
        member_email = None

    if member_email:
        status, login_res = request_json(
            f"{BACKEND_URL}/auth/member/emailpass",
            method="POST",
            data={"email": member_email, "password": "Password123!"}
        )
        if status == 200 and "token" in login_res:
            headers["Authorization"] = f"Bearer {login_res['token']}"
            log(f"✔ Authenticated as seller member ({member_email})")

    status, vendor_holds = request_json(f"{BACKEND_URL}/vendor/holds", headers=headers)
    assert status == 200, f"Expected 200 from vendor holds, got {status}: {vendor_holds}"
    holds_list = vendor_holds.get("holds", [])
    matching_vendor_hold = next((h for h in holds_list if h["id"] == hold_id_1), None)
    assert matching_vendor_hold is not None, "Vendor should see their hold in list"
    assert matching_vendor_hold["status"] == "confirmed"

    # Mark as picked up in store
    status, pickup_res = request_json(
        f"{BACKEND_URL}/vendor/holds/{hold_id_1}/pickup",
        method="POST",
        headers=headers,
        data={"notes": "Buyer visited store and bought item"}
    )
    assert status == 200, f"Expected 200 from pickup, got {status}: {pickup_res}"
    assert pickup_res["hold"]["status"] == "picked_up"

    # Confirm pass reflects picked_up and can_cancel is False
    status, final_pass = request_json(f"{BACKEND_URL}/public/holds/{token_1}")
    assert final_pass["status"] == "picked_up"
    assert final_pass["can_cancel"] is False
    log("✔ Vendor pickup workflow verified successfully.")

    print("=" * 60)
    print("ALL 9 HOLD SYSTEM TESTS PASSED CLEANLY! (100% SUCCESS)")
    print("=" * 60)

if __name__ == "__main__":
    main()
