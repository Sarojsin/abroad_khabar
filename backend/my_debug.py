import sys
import os
import time

print(f"PID: {os.getpid()}")
print("Starting granular debug...")
sys.path.append(os.getcwd())
sys.stdout.flush()

try:
    print("1. Importing app.core.config...")
    from app.core.config import settings
    print("   Config imported.")

    print("2. Importing app.db.session...")
    from app.db.session import engine
    print("   DB Session imported.")

    print("3. Importing app.core.security...")
    import app.core.security
    print("   Security imported.")

    print("3b. Importing app.utils.file...")
    import app.utils.file
    print("    File utils imported.")

    print("4. Importing app.api.v1.api (routers)...")
    try:
        from app.api.v1 import auth
        print("   - auth imported")
        from app.api.v1 import services
        print("   - services imported")
        from app.api.v1 import videos
        print("   - videos imported")
        from app.api.v1 import images
        print("   - images imported")
        from app.api.v1 import ads
        print("   - ads imported")
        from app.api.v1 import contact
        print("   - contact imported")
        
        from app.api.v1 import api
        print("   API Router imported.")
    except Exception as e:
        print(f"   ERROR importing routers: {e}")
        raise

    print("5. Importing app.main...")
    import app.main
    print("   Main imported.")

    print("DEBUG SUCCESS")

except Exception as e:
    print(f"DEBUG ERROR: {e}")
    import traceback
    traceback.print_exc()
