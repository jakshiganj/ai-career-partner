import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_workflow():
    # 1. Signup
    email = "test_user_secure@example.com"
    password = "securepassword123"
    print(f"1. Signing up user {email}...")
    signup_resp = requests.post(f"{BASE_URL}/auth/signup", json={
        "email": email,
        "password": password,
        "full_name": "Secure User"
    })
    
    if signup_resp.status_code == 400 and "registered" in signup_resp.text:
        print("   User already exists, proceeding to login.")
    elif signup_resp.status_code != 201:
        print(f"   Signup failed: {signup_resp.status_code} {signup_resp.text}")
        sys.exit(1)
    else:
        print("   Signup successful.")

    # 2. Login
    print("2. Logging in...")
    login_resp = requests.post(f"{BASE_URL}/auth/login", data={
        "username": email,
        "password": password
    })
    
    if login_resp.status_code != 200:
        print(f"   Login failed: {login_resp.status_code} {login_resp.text}")
        sys.exit(1)
    
    token = login_resp.json()["access_token"]
    print("   Login successful, token received.")
    
    # 3. Create dummy PDF
    print("3. Creating dummy PDF...")
    with open("dummy.pdf", "wb") as f:
        f.write(b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 4 0 R\n>>\n>>\n/MediaBox [0 0 600 900]\n/Contents 5 0 R\n>>\nendobj\n4 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\nendobj\n5 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 24 Tf\n100 100 Td\n(Hello World) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000010 00000 n\n0000000060 00000 n\n0000000117 00000 n\n0000000224 00000 n\n0000000312 00000 n\ntrailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n406\n%%EOF")

    # 4. Upload WITH Token (Should succeed)
    print("4. Attempting upload WITH token...")
    files = {'file': ('dummy.pdf', open('dummy.pdf', 'rb'), 'application/pdf')}
    headers = {'Authorization': f'Bearer {token}'}
    
    upload_resp = requests.post(f"{BASE_URL}/cv/upload", files=files, headers=headers)
    
    if upload_resp.status_code == 201:
        print("   Upload successful (Expected).")
        print(f"   Response: {upload_resp.json()}")
    else:
        print(f"   Upload failed: {upload_resp.status_code} {upload_resp.text}")
        sys.exit(1)

    # 5. Upload WITHOUT Token (Should fail)
    print("5. Attempting upload WITHOUT token (Test IDOR protection)...")
    files = {'file': ('dummy.pdf', open('dummy.pdf', 'rb'), 'application/pdf')}
    # No headers
    
    upload_resp_fail = requests.post(f"{BASE_URL}/cv/upload", files=files)
    
    if upload_resp_fail.status_code == 401:
        print("   Upload failed with 401 Unauthorized (Expected protection).")
    else:
        print(f"   WARNING: Upload did not return 401: {upload_resp_fail.status_code}")
        print("   Fix might not be working correctly!")
        sys.exit(1)

if __name__ == "__main__":
    try:
        test_workflow()
        print("\nVerification Passed!")
    except Exception as e:
        print(f"\nAn error occurred: {e}")
        sys.exit(1)
