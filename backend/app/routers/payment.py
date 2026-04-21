import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
DOMAIN = os.getenv("FRONTEND_URL", "http://localhost:5173")
PRICE_ID = os.getenv("STRIPE_PRICE_ID")

@router.post("/create-checkout-session")
async def create_checkout_session(
    current_user: User = Depends(get_current_user)
):
    """Create a Stripe Checkout Session to subscribe the user to the Pro tier."""
    if not stripe.api_key or not PRICE_ID:
        raise HTTPException(status_code=500, detail="Stripe configuration is missing")

    try:
        checkout_session = stripe.checkout.Session.create(
            customer_email=current_user.email,
            client_reference_id=str(current_user.id),
            payment_method_types=['card'],
            line_items=[
                {
                    'price': PRICE_ID,
                    'quantity': 1,
                },
            ],
            mode='subscription',
            success_url=DOMAIN + '/dashboard?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=DOMAIN + '/dashboard?payment=cancelled',
        )
        return {"url": checkout_session.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request, session: AsyncSession = Depends(get_session)):
    try:
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")
        endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

        event = None

        try:
            if endpoint_secret:
                event = stripe.Webhook.construct_event(
                    payload, sig_header, endpoint_secret
                )
            else:
                event = stripe.Event.construct_from(
                    stripe.util.json.loads(payload), stripe.api_key
                )
        except ValueError as e:
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError as e:
            raise HTTPException(status_code=400, detail="Invalid signature")

        print(f"WEBHOOK DEBUG: Received event type: {event['type']}")

        # Handle the checkout.session.completed event
        if event['type'] == 'checkout.session.completed':
            session_obj = event['data']['object']
            
            # client_reference_id contains the user ID
            user_id_str = getattr(session_obj, "client_reference_id", None)
            customer_id = getattr(session_obj, "customer", None)
            subscription_id = getattr(session_obj, "subscription", None)

            if user_id_str:
                print(f"WEBHOOK DEBUG: Found client_reference_id = {user_id_str}")
                # Ensure it is parsed as a UUID if needed
                import uuid
                try:
                    user_id_uuid = uuid.UUID(user_id_str)
                    q = select(User).where(User.id == user_id_uuid)
                    res = await session.execute(q)
                    user = res.scalar_one_or_none()
                    if user:
                        print(f"WEBHOOK DEBUG: Successfully updated user {user.email} to pro!")
                        user.tier = "pro"
                        user.stripe_customer_id = customer_id
                        user.stripe_subscription_id = subscription_id
                        session.add(user)
                        await session.commit()
                    else:
                        print(f"WEBHOOK DEBUG: User with ID {user_id_str} not found in database!")
                except ValueError:
                    print(f"WEBHOOK DEBUG: client_reference_id {user_id_str} is not a valid UUID")
            else:
                print("WEBHOOK DEBUG: No client_reference_id found in the session object!")

        # Handle subscription deletion
        elif event['type'] == 'customer.subscription.deleted':
            subscription_obj = event['data']['object']
            sub_id = getattr(subscription_obj, "id", None)

            q = select(User).where(User.stripe_subscription_id == sub_id)
            res = await session.execute(q)
            user = res.scalar_one_or_none()
            if user:
                user.tier = "free"
                session.add(user)
                await session.commit()

        return {"status": "success"}
    except Exception as e:
        import traceback
        print("WEBHOOK DEBUG: FATAL ERROR IN WEBHOOK!")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal webhook error")
