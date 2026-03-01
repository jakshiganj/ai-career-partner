import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.core.database import async_session
from app.models.user import User
from app.core.security import create_access_token

async def test_db():
    email = "test_linkedin@example.com"
    name = "Test LinkedIn User"
    
    try:
        async with async_session() as session:
            print("1. Querying DB")
            stmt = select(User).where(User.email == email)
            result = await session.execute(stmt)
            user = result.scalar_one_or_none()
            
            is_new = False
            if not user:
                print("2. Creating new user")
                is_new = True
                user = User(
                    email=email,
                    full_name=name,
                    password_hash="oauth_placeholder"
                )
                session.add(user)
                await session.commit()
                print("3. Refreshing user")
                await session.refresh(user)
                
            jwt_token = create_access_token(data={"sub": user.email})
            
            redirect_url = f"http://localhost:5173/dashboard?token={jwt_token}&user_id={user.id}"
            
            with open("result.txt", "w") as f:
                f.write(f"Success! URL: {redirect_url}\nUser ID type: {type(user.id)}")
            
    except Exception as e:
        import traceback
        with open("error.txt", "w") as f:
            traceback.print_exc(file=f)

if __name__ == "__main__":
    asyncio.run(test_db())
