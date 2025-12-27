import sys
import os

# Ensure backend dir is in path
sys.path.append(os.getcwd())

try:
    from app.core.config import Settings
    settings = Settings()
    print("Settings loaded successfully!")
except Exception as e:
    print(f"Error type: {type(e)}")
    print(f"Error message: {e}")
    if hasattr(e, 'errors'):
        for error in e.errors():
            print(f"Field: {error.get('loc')}")
            print(f"Message: {error.get('msg')}")
            print(f"Type: {error.get('type')}")
