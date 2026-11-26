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

def make_req(path: str, headers: dict = None):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            body_bytes = resp.read()
            resp_headers = dict(resp.headers)
            try:
                body = json.loads(body_bytes.decode())
            except Exception:
                body = body_bytes.decode()
            return status, body, resp_headers
    except urllib.error.HTTPError as e:
        status = e.code
        body_bytes = e.read()
        resp_headers = dict(e.headers)
        try:
            body = json.loads(body_bytes.decode())
        except Exception:
            body = body_bytes.decode()
        return status, body, resp_headers

def main():
    print("=" * 60)
    print("RUNNING 7 VERIFICATION TESTS")
    print("=" * 60)

    # ----------------------------------------------------
    # TEST 1: GET /public/sellers returns only open sellers
    # Manually set one seller to 'suspended' -> verify it disappears.
    # ----------------------------------------------------
    print("\n[TEST 1] GET /public/sellers & seller suspension filter")
    status, body, _ = make_req("/public/sellers")
    assert status == 200, f"Expected 200, got {status}"
    initial_handles = [s["handle"] for s in body["sellers"]]
    print(f"Initial open sellers ({body['count']}): {initial_handles}")
    assert "sole-society" in initial_handles, "sole-society should be in open sellers"

    try:
        # Suspend sole-society
        run_psql("UPDATE seller SET status = 'suspended' WHERE handle = 'sole-society';")
        status, body_after, _ = make_req("/public/sellers")
        assert status == 200
        handles_after = [s["handle"] for s in body_after["sellers"]]
        print(f"After suspending 'sole-society' ({body_after['count']}): {handles_after}")
        assert "sole-society" not in handles_after, "'sole-society' must disappear when suspended"
        print("✓ Test 1 Passed: Suspended seller disappeared from /public/sellers")

        # ----------------------------------------------------
        # TEST 2: GET /public/sellers/:handle
        # Open seller returns seller + products. Suspended seller -> 404.
        # ----------------------------------------------------
        print("\n[TEST 2] GET /public/sellers/:handle for open vs suspended seller")
        # Check suspended sole-society
        status_susp, body_susp, _ = make_req("/public/sellers/sole-society")
        print(f"GET /public/sellers/sole-society (suspended) -> HTTP {status_susp}: {body_susp}")
        assert status_susp == 404, f"Expected 404 for suspended seller, got {status_susp}"

        # Check open trailhead-outfitters
        status_open, body_open, _ = make_req("/public/sellers/trailhead-outfitters")
        print(f"GET /public/sellers/trailhead-outfitters (open) -> HTTP {status_open}")
        assert status_open == 200, f"Expected 200 for open seller, got {status_open}"
        assert "seller" in body_open and "products" in body_open, "Should contain seller and products"
        print(f"  Seller: {body_open['seller']['handle']}, Products count: {len(body_open['products'])}")
        print("✓ Test 2 Passed: Suspended returns 404, open returns seller + products")

    finally:
        # Restore sole-society status
        run_psql("UPDATE seller SET status = 'open' WHERE handle = 'sole-society';")
        print("Restored sole-society status to 'open'")

    # ----------------------------------------------------
    # TEST 3: GET /public/products?q=Vantage
    # Returns matching products with offers from open sellers only.
    # ----------------------------------------------------
    print("\n[TEST 3] GET /public/products?q=Vantage")
    status_q, body_q, _ = make_req("/public/products?q=Vantage")
    assert status_q == 200, f"Expected 200, got {status_q}"
    print(f"Matched products count: {body_q['count']}")
    assert body_q["count"] > 0, "Should match at least 1 product"
    first_match = body_q["products"][0]
    print(f"  Matched Title: {first_match['title']}")
    print(f"  Seller: {first_match['seller']['handle']}")
    print(f"  Offers: {len(first_match['offers'])} (matched_offer_count: {first_match['matched_offer_count']})")
    assert "Vantage" in first_match["title"], "Product title should contain 'Vantage'"
    print("✓ Test 3 Passed: Successfully searched products by title with open seller offers")

    # ----------------------------------------------------
    # TEST 4: GET /public/products?q=nonexistentxyz
    # Returns empty list, not error.
    # ----------------------------------------------------
    print("\n[TEST 4] GET /public/products?q=nonexistentxyz")
    status_none, body_none, _ = make_req("/public/products?q=nonexistentxyz")
    assert status_none == 200, f"Expected 200, got {status_none}"
    assert body_none["products"] == [], "Products should be empty array"
    assert body_none["count"] == 0, "Count should be 0"
    print(f"Result: {body_none}")
    print("✓ Test 4 Passed: Nonexistent search returned empty list with HTTP 200")

    # ----------------------------------------------------
    # TEST 5: Rate limit: 61 requests within 60s
    # 60 succeed, 61st returns 429.
    # ----------------------------------------------------
    print("\n[TEST 5] Rate limit: 61 requests to GET /public/sellers with dedicated test IP")
    test_ip = f"198.51.100.{int(time.time() * 1000) % 200 + 10}"
    results = []
    for i in range(1, 62):
        s, b, h = make_req("/public/sellers", headers={"X-Forwarded-For": test_ip})
        results.append((i, s, h.get("x-ratelimit-remaining")))
        if i % 15 == 0 or i >= 60:
            print(f"  Req #{i}: HTTP {s}, remaining: {h.get('x-ratelimit-remaining')}")
    
    first_60_ok = all(r[1] == 200 for r in results[:60])
    req_61_code = results[60][1]
    print(f"First 60 requests HTTP 200: {first_60_ok}")
    print(f"61st request HTTP status: {req_61_code}")
    assert first_60_ok, "First 60 requests should succeed"
    assert req_61_code == 429, f"61st request should be 429, got {req_61_code}"
    print("✓ Test 5 Passed: Rate limiter enforced 60 req/min, 61st request returned 429")

    # ----------------------------------------------------
    # TEST 6: GET /public/sellers/:handle for nonexistent handle -> 404
    # ----------------------------------------------------
    print("\n[TEST 6] GET /public/sellers/nonexistent-handle-404")
    status_404, body_404, _ = make_req("/public/sellers/nonexistent-handle-404")
    print(f"HTTP {status_404}: {body_404}")
    assert status_404 == 404, f"Expected 404, got {status_404}"
    assert "not found" in str(body_404).lower(), "Expected clear 'not found' message"
    print("✓ Test 6 Passed: Nonexistent seller handle returned 404 with clear message")

    # ----------------------------------------------------
    # TEST 7: Confirm all 3 routes work WITHOUT auth or publishable key
    # ----------------------------------------------------
    print("\n[TEST 7] Unauthenticated access on all 3 public endpoints")
    endpoints = [
        "/public/sellers",
        "/public/sellers/trailhead-outfitters",
        "/public/products"
    ]
    for ep in endpoints:
        s, b, _ = make_req(ep)
        print(f"  {ep} -> HTTP {s}")
        assert s == 200, f"Expected 200 for {ep}, got {s}"
    print("✓ Test 7 Passed: All 3 public endpoints operate without auth headers or publishable keys")

    print("\n" + "=" * 60)
    print("ALL 7 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    main()
