import os

env_path = 'c:/Users/U S E R/Desktop/abroad_khabar/backend/.env'
example_path = 'c:/Users/U S E R/Desktop/abroad_khabar/backend/.env.example'

with open(example_path, 'r') as f:
    lines = f.readlines()

with open(env_path, 'w') as f:
    for line in lines:
        if line.startswith('BACKEND_CORS_ORIGINS='):
            # Using valid JSON for pydantic-settings
            f.write('BACKEND_CORS_ORIGINS=["http://localhost:3000", "http://localhost:8080"]\n')
        else:
            f.write(line)

print("Updated .env with JSON CORS origins")
