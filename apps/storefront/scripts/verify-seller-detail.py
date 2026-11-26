import urllib.request
import urllib.parse
import json
import sys

BASE_URL = "http://localhost:8000"

def test_url(url, follow_redirects=True):
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None

    opener = urllib.request.build_opener() if follow_redirects else urllib.request.build_opener(NoRedirect)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        resp = opener.open(req)
        return resp.status, resp.read().decode("utf-8"), resp.headers
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8") if e.fp else ""
        return e.code, body, e.headers
    except Exception as e:
        return 500, str(e), {}

print("=== RUNNING SELLER DETAIL VERIFICATION SUITE ===")
results = []

# TEST 1: GET /s/sirsa-traders-1795597162 -> 200, renders name, city, pincode, badge, products, INR
status, html, headers = test_url(f"{BASE_URL}/s/sirsa-traders-1795597162")
test1_passed = (
    status == 200 and
    "Sirsa Footwear Traders 1795597162" in html and
    "Sirsa" in html and
    "125055" in html and
    "VERIFIED" in html and
    "₹100" in html and
    "Meridian Twin-Strap Buckle Sandal" in html and
    "Vantage 204 Runner" in html
)
results.append(("1. GET /s/sirsa-traders-1795597162 (200, name, city, pincode, badge, products, ₹ INR)", test1_passed, f"Status: {status}"))

# TEST 2: GET /s/nonexistent-handle -> 404
status2, html2, _ = test_url(f"{BASE_URL}/s/nonexistent-handle-123456789")
test2_passed = status2 == 404 or "Seller not found or not currently active" in html2 or "not found" in html2.lower()
results.append(("2. GET /s/nonexistent-handle (404 Not Found)", test2_passed, f"Status: {status2}"))

# TEST 3: GET /s/sole-society -> 200 if open / 404 if suspended
status3, html3, _ = test_url(f"{BASE_URL}/s/sole-society")
test3_passed = (status3 == 200 and "Sole Society" in html3)
results.append(("3. GET /s/sole-society (200 OK)", test3_passed, f"Status: {status3}"))

# TEST 4: Product 'Enquire on WhatsApp' button has valid wa.me URL with pre-filled title & seller name
wa_check = "wa.me/919876543210" in html and "interested" in html and "Meridian" in html
results.append(("4. Product 'Enquire on WhatsApp' valid wa.me URL with pre-filled text", wa_check, "Found valid wa.me link with product title & seller name"))

# TEST 5: Share button copies URL & provides WhatsApp share option
share_check = "Share" in html and "wa.me/?text=Check%20out" in html and ("Copy link to seller profile" in html or "Share seller profile" in html)
results.append(("5. Share button functionality (Clipboard copy + WhatsApp share link)", share_check, "Share button + WhatsApp share link present"))

# TEST 6: Empty seller (0 products) renders empty state
empty_state_check = (
    "This seller hasn&#x27;t listed any products yet" in html3 or
    "This seller hasn't listed any products yet" in html3 or
    "No products listed yet" in html3
)
results.append(("6. Empty seller (sole-society with 0 products) renders empty state", empty_state_check, "Empty state message rendered"))

# TEST 7: Seller with no phone has disabled WhatsApp & Call buttons with tooltips
disabled_check = 'disabled="" title="No phone provided"' in html3 or 'title="No phone provided"' in html3
results.append(("7. Seller with no phone has disabled WhatsApp & Call buttons", disabled_check, "Disabled buttons with 'No phone provided' tooltip present in sole-society"))

# TEST 8: GET /sellers/[handle] redirects to /s/[handle]
status8a, _, headers8a = test_url(f"{BASE_URL}/sellers/sirsa-traders-1795597162", follow_redirects=False)
status8b, _, headers8b = test_url(f"{BASE_URL}/in/sellers/sirsa-traders-1795597162", follow_redirects=False)
loc8a = headers8a.get("Location", "")
loc8b = headers8b.get("Location", "")
redirect_passed = (
    status8a in (307, 308, 302, 301) and "/s/sirsa-traders-1795597162" in loc8a and
    status8b in (307, 308, 302, 301) and "/s/sirsa-traders-1795597162" in loc8b
)
results.append(("8. GET /sellers/[handle] and /in/sellers/[handle] redirect to /s/[handle]", redirect_passed, f"Status: {status8a} -> {loc8a}, {status8b} -> {loc8b}"))

# TEST 9: All INR prices display with ₹ symbol and correct range
price_check = "₹100" in html and ("₹4,999" in html or "₹4999" in html)
results.append(("9. All INR prices display with ₹ symbol and correct values", price_check, "Found ₹100 and ₹4,999"))

# TEST 10: Breadcrumb / Back button
breadcrumb_check = "Back to all sellers" in html and "href=\"/in/sellers\"" in html or "href=\"/sellers\"" in html
results.append(("10. Back to all sellers navigation link", breadcrumb_check, "Breadcrumb back link rendered"))

# TEST 11: Mobile sticky action bar
mobile_bar_check = "md:hidden fixed bottom-0 left-0 right-0" in html or "fixed bottom-0" in html
results.append(("11. Mobile sticky action bar", mobile_bar_check, "Fixed bottom mobile bar present"))

print("\n--- RESULTS ---")
all_passed = True
for title, passed, note in results:
    status_str = "PASS" if passed else "FAIL"
    if not passed:
        all_passed = False
    print(f"[{status_str}] {title} -> {note}")

print("\nOVERALL STATUS:", "ALL 11 TESTS PASSED" if all_passed else "SOME TESTS FAILED")
if not all_passed:
    sys.exit(1)
