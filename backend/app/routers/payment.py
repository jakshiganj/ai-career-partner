import os
import stripe
import uuid
import traceback
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.core.logging import get_logger
from app.schemas.response import CheckoutSessionResponse

router = APIRouter()
logger = get_logger(__name__)

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
DOMAIN = os.getenv("FRONTEND_URL", "http://localhost:3000")
PRICE_ID = os.getenv("STRIPE_PRICE_ID")

@router.post("/create-checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    current_user: User = Depends(get_current_user)
):
    """Create a Stripe Checkout Session to subscribe the user to the Pro tier."""
    if not stripe.api_key or not PRICE_ID:
        logger.error("Stripe configuration is missing (STRIPE_SECRET_KEY or STRIPE_PRICE_ID)")
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
        logger.info(f"Created checkout session for user: {current_user.email}")
        return {"url": checkout_session.url}
    except Exception as e:
        logger.error(f"Failed to create checkout session: {e}")
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
            logger.warning(f"Invalid webhook payload: {e}")
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError as e:
            logger.warning(f"Invalid webhook signature: {e}")
            raise HTTPException(status_code=400, detail="Invalid signature")

        logger.info(f"[STRIPE] Received event type: {event['type']}")

        # Handle the checkout.session.completed event
        if event['type'] == 'checkout.session.completed':
            session_obj = event['data']['object']
            
            user_id_str = getattr(session_obj, "client_reference_id", None)
            customer_id = getattr(session_obj, "customer", None)
            subscription_id = getattr(session_obj, "subscription", None)

            if user_id_str:
                logger.info(f"[STRIPE] Processing subscription for client_reference_id = {user_id_str}")
                try:
                    user_id_uuid = uuid.UUID(user_id_str)
                    q = select(User).where(User.id == user_id_uuid)
                    res = await session.execute(q)
                    user = res.scalar_one_or_none()
                    if user:
                        logger.info(f"[STRIPE] Updating user {user.email} to pro tier")
                        user.tier = "pro"
                        user.stripe_customer_id = customer_id
                        user.stripe_subscription_id = subscription_id
                        session.add(user)
                        await session.commit()
                    else:
                        logger.error(f"[STRIPE] User with ID {user_id_str} not found in database!")
                except ValueError:
                    logger.error(f"[STRIPE] client_reference_id {user_id_str} is not a valid UUID")
            else:
                logger.warning("[STRIPE] No client_reference_id found in the session object!")

        # Handle subscription deletion
        elif event['type'] == 'customer.subscription.deleted':
            subscription_obj = event['data']['object']
            sub_id = getattr(subscription_obj, "id", None)

            q = select(User).where(User.stripe_subscription_id == sub_id)
            res = await session.execute(q)
            user = res.scalar_one_or_none()
            if user:
                logger.info(f"[STRIPE] Subscription deleted for user {user.email}, reverting to free tier")
                user.tier = "free"
                session.add(user)
                await session.commit()

        return {"status": "success"}
    except Exception as e:
        logger.critical(f"[STRIPE] Fatal error in webhook: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal webhook error")
