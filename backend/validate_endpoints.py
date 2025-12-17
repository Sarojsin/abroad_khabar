import asyncio
import httpx
import sys

# Default to 8002 if no arg provided
PORT = sys.argv[1] if len(sys.argv) > 1 else "8002"
BASE_URL = f"http://localhost:{PORT}"

ENDPOINTS = [
    "/health",
    "/api/v1/",
    "/api/v1/services/",
    "/api/v1/videos/",
    "/api/v1/images/",
    "/api/v1/ads/",
    "/api/v1/contact/", 
    "/api/v1/countries/",
    "/api/v1/faq/",
    "/api/v1/homepage/",
    "/api/v1/testimonials/"
]

async def check_endpoint(client, path):
    url = f"{BASE_URL}{path}"
    try:
        response = await client.get(url, follow_redirects=True)
        # We accept 200 OK or 401 Unauthorized (protected) or 405 Method Not Allowed (exists but maybe POST only)
        # 422 Unprocessable Entity means validation failed but endpoint exists!
        status = response.status_code
        success = status in [200, 401, 405, 422]
        if not success:
            print(f"[ERR] {path} -> {status} Body: {response.text[:200]}")
        else:
            print(f"[{'OK'}] {path} -> {status}")
        return success
    except Exception as e:
        print(f"[ERR] {path} -> {e}")
        return False

async def main():
    print(f"Testing endpoints on {BASE_URL}...")
    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(*[check_endpoint(client, ep) for ep in ENDPOINTS])
        
    if all(results):
        print("\nAll endpoints checked passed validation.")
        sys.exit(0)
    else:
        print("\nSome endpoints failed.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
