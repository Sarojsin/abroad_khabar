import httpx
import asyncio

BASE_URL = "http://localhost:8002/api/v1"
EMAIL = "test_reset@example.com"
PASSWORD = "password123"

async def main():
    async with httpx.AsyncClient() as client:
        # 1. Register a user
        print(f"Registering user {EMAIL}...")
        resp = await client.post(f"{BASE_URL}/auth/register", json={
            "email": EMAIL,
            "username": "test_reset_user",
            "full_name": "Test User",
            "password": PASSWORD
        })
        if resp.status_code == 200:
            print("Registration successful.")
            access_token = resp.json()["data"]["tokens"]["access_token"]
        elif resp.status_code == 400 and "already exists" in resp.text:
            print("User already exists, logging in...")
            resp = await client.post(f"{BASE_URL}/auth/login", json={
                "email_or_username": EMAIL,
                "password": PASSWORD
            })
            if resp.status_code != 200:
                print(f"Login failed: {resp.text}")
                return
            access_token = resp.json()["data"]["tokens"]["access_token"]
        else:
            print(f"Registration failed: {resp.text}")
            return

        # 2. Try to use ACCESS token for reset (Reproduction of user error)
        print("\nAttempting reset with ACCESS token (expect failure)...")
        resp = await client.post(f"{BASE_URL}/auth/reset-password", params={
            "token": access_token,
            "new_password": "newpassword123"
        })
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")

        # 3. Get actual RESET token
        print("\nRequesting forgot-password (getting valid reset token)...")
        resp = await client.post(f"{BASE_URL}/auth/forgot-password", params={
            "email": EMAIL
        })
        if resp.status_code == 200:
            reset_token = resp.json()["data"]["reset_token"]
            print("Got reset token.")
            
            # 4. Try reset with VALID reset token
            print("\nAttempting reset with VALID reset token...")
            resp = await client.post(f"{BASE_URL}/auth/reset-password", params={
                "token": reset_token,
                "new_password": "newpassword123"
            })
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text}")
        else:
            print(f"Forgot password failed: {resp.text}")

asyncio.run(main())
