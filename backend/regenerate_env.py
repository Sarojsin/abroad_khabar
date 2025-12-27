old_cors = 'BACKEND_CORS_ORIGINS=["http://localhost:3000", "http://localhost:8080"]'
new_cors = 'BACKEND_CORS_ORIGINS=http://localhost:3000,http://localhost:8080'

with open('.env.example', 'r') as f:
    content = f.read()

content = content.replace(old_cors, new_cors)

with open('.env', 'w') as f:
    f.write(content)

print("Regenerated .env from .env.example with correct CORS origins")
