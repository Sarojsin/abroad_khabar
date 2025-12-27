import os

env_path = 'c:/Users/U S E R/Desktop/abroad_khabar/backend/.env'
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        content = f.read()
    
    # Fix CORS origins
    old_cors = 'BACKEND_CORS_ORIGINS=["http://localhost:3000", "http://localhost:8080"]'
    new_cors = 'BACKEND_CORS_ORIGINS=http://localhost:3000,http://localhost:8080'
    content = content.replace(old_cors, new_cors)
    
    with open(env_path, 'w') as f:
        f.write(content)
    print("Fixed .env CORS origins")
else:
    print(".env not found")
