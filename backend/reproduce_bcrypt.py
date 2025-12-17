from passlib.context import CryptContext
import sys

try:
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    print("Context created")
    
    password = "123"
    print(f"Hashing password: '{password}' (len: {len(password)})")
    
    hashed = pwd_context.hash(password)
    print(f"Success: {hashed}")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

import bcrypt
print(f"Bcrypt version: {bcrypt.__version__}")
import passlib
print(f"Passlib version: {passlib.__version__}")
