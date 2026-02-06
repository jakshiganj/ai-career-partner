from app.models.user import User, UserCreate
from app.core.security import get_password_hash
import sys
import traceback

# Ensure current directory is in python path
sys.path.append(".")

def test_signup_logic():
    print("Testing Signup Logic...")
    try:
        # Create Dummy Data
        user_create = UserCreate(
            email="test@example.com",
            full_name="Test User",
            password="password123"
        )
        print(f"Created UserCreate: {user_create}")

        # 1. Test from_orm (model_validate in v2)
        print("Attempting User.from_orm(user_create)...")
        # SQLModel 0.0.16+ uses from_orm or model_validate depending on Pydantic version
        # Let's see if this fails
        # This line will raise a validation error because `password_hash` is missing.
        # The test should follow the router's logic to construct the User model.
        user = User(
            email=user_create.email,
            full_name=user_create.full_name,
            password_hash=get_password_hash(user_create.password)
        )
        print(f"User model created: {user}")

        # 2. Test Hashing
        print("Attempting get_password_hash...")
        hash = get_password_hash(user_create.password)
        print(f"Hash created: {hash[:10]}...")
        
        user.password_hash = hash
        print("Success! Logic valid.")

    except Exception as e:
        print(f"FAILURE: Logic Error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    test_signup_logic()
