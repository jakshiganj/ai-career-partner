import os
import stripe
import uuid
import traceback
from datetime import datetime
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

# Tier Price IDs
PRICE_IDS = {
    "pro": os.getenv("STRIPE_PRO_PRICE_ID"),
    "premium": os.getenv("STRIPE_PREMIUM_PRICE_ID"),
}

from app.schemas.response import (
    CheckoutSessionResponse, 
    SubscriptionStatusResponse, 
    CreateCheckoutRequest,
    PortalSessionResponse
)

@router.post("/create-checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    request_data: CreateCheckoutRequest,
    current_user: User = Depends(get_current_user)
):
    """Create a Stripe Checkout Session for Pro or Premium tier in LKR."""
    tier = request_data.tier.lower()
    if tier not in PRICE_IDS or not PRICE_IDS[tier]:
        logger.error(f"Stripe configuration is missing or invalid for tier: {tier}")
        raise HTTPException(status_code=500, detail=f"Stripe configuration for {tier} is missing")

    try:
        checkout_session = stripe.checkout.Session.create(
            customer_email=current_user.email,
            client_reference_id=str(current_user.id),
            payment_method_types=['card'],
            line_items=[
                {
                    'price': PRICE_IDS[tier],
                    'quantity': 1,
                },
            ],
            mode='subscription',
            subscription_data={
                "metadata": {
                    "tier": tier
                }
            },
            success_url=DOMAIN + '/dashboard/billing?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=DOMAIN + '/dashboard/billing?payment=cancelled',
        )
        logger.info(f"Created checkout session for user: {current_user.email}, tier: {tier}")
        return {"url": checkout_session.url}
    except Exception as e:
        logger.error(f"Failed to create checkout session: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/subscription-status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: User = Depends(get_current_user)
):
    """Get current subscription details from Stripe or DB."""
    status_data = {
        "tier": current_user.tier,
        "stripe_customer_id": current_user.stripe_customer_id,
        "status": "inactive",
        "current_period_end": None,
        "cancel_at_period_end": False
    }
    
    if current_user.stripe_subscription_id:
        try:
            sub = stripe.Subscription.retrieve(current_user.stripe_subscription_id)
            sub_dict = sub.to_dict()
            status = sub_dict.get("status")
            end_timestamp = sub_dict.get("current_period_end") or sub_dict.get("trial_end") or sub_dict.get("billing_cycle_anchor")
            
            status_data.update({
                "status": status,
                "current_period_end": datetime.fromtimestamp(end_timestamp).isoformat() if end_timestamp else None,
                "cancel_at_period_end": sub_dict.get("cancel_at_period_end", False)
            })
                
        except Exception as e:
            logger.warning(f"Could not retrieve Stripe subscription: {e}")
    
    return status_data

@router.post("/create-portal-session", response_model=PortalSessionResponse)
async def create_portal_session(
    current_user: User = Depends(get_current_user)
):
    """Create a Stripe Customer Portal session."""
    if not current_user.stripe_customer_id:
        # If user has no customer ID, they can't access portal
        # We might want to create one or just return error
        raise HTTPException(status_code=400, detail="No active subscription or customer record found.")

    try:
        portal_session = stripe.billing_portal.Session.create(
            customer=current_user.stripe_customer_id,
            return_url=DOMAIN + '/dashboard/billing',
        )
        return {"url": portal_session.url}
    except Exception as e:
        logger.error(f"Failed to create portal session: {e}")
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
                logger.info(f"[STRIPE] Processing checkout completion for user = {user_id_str}")
                try:
                    # Retrieve the subscription
                    sub = stripe.Subscription.retrieve(subscription_id)
                    sub_dict = sub.to_dict()
                    
                    # 1. Try to get tier from subscription metadata
                    metadata = sub_dict.get('metadata', {}) or {}
                    tier = metadata.get("tier")
                    
                    # 2. Fallback: Check the Price ID in the subscription items
                    if not tier:
                        items = sub_dict.get('items', {}).get('data', [])
                        if items:
                            price_id = items[0].get('price', {}).get('id')
                            if price_id == PRICE_IDS.get("premium"):
                                tier = "premium"
                            elif price_id == PRICE_IDS.get("pro"):
                                tier = "pro"
                        
                        if not tier:
                            tier = "pro" # Default fallback
                    
                    user_id_uuid = uuid.UUID(user_id_str)
                    q = select(User).where(User.id == user_id_uuid)
                    res = await session.execute(q)
                    user = res.scalar_one_or_none()
                    if user:
                        logger.info(f"[STRIPE] Updating user {user.email} to {tier} tier")
                        user.tier = tier
                        user.stripe_customer_id = customer_id
                        user.stripe_subscription_id = subscription_id
                        session.add(user)
                        await session.commit()
                    else:
                        logger.error(f"[STRIPE] User with ID {user_id_str} not found in database!")
                except Exception as e:
                    logger.error(f"[STRIPE] Error processing checkout completion: {e}")
            else:
                logger.warning("[STRIPE] No client_reference_id found in the session object!")

        # Handle successful payments (including renewals)
        elif event['type'] == 'invoice.payment_succeeded':
            invoice_obj = event['data']['object']
            customer_id = getattr(invoice_obj, "customer", None)
            subscription_id = getattr(invoice_obj, "subscription", None)

            if customer_id and subscription_id:
                try:
                    # 1. Try to find user by Stripe Customer ID
                    q = select(User).where(User.stripe_customer_id == customer_id)
                    res = await session.execute(q)
                    user = res.scalar_one_or_none()
                    
                    # 2. If not found (first payment), try finding by email
                    if not user:
                        customer_email = getattr(invoice_obj, "customer_email", None)
                        if customer_email:
                            q = select(User).where(User.email == customer_email)
                            res = await session.execute(q)
                            user = res.scalar_one_or_none()
                    
                    if user:
                        # Retrieve subscription to get tier
                        sub = stripe.Subscription.retrieve(subscription_id)
                        sub_dict = sub.to_dict()
                        
                        # 1. Try to get tier from subscription metadata
                        metadata = sub_dict.get('metadata', {}) or {}
                        tier = metadata.get("tier")
                        
                        # 2. Fallback: Check the Price ID in the subscription items
                        if not tier:
                            try:
                                items = sub_dict.get('items', {}).get('data', [])
                                if items:
                                    price_id = items[0].get('price', {}).get('id')
                                    if price_id == PRICE_IDS.get("premium"):
                                        tier = "premium"
                                    elif price_id == PRICE_IDS.get("pro"):
                                        tier = "pro"
                            except Exception as price_err:
                                logger.warning(f"Failed to extract Price ID: {price_err}")

                        if tier:
                            logger.info(f"[STRIPE] Payment succeeded: Updating user {user.email} to {tier}")
                            user.tier = tier
                            user.stripe_customer_id = customer_id
                            user.stripe_subscription_id = subscription_id
                            session.add(user)
                            await session.commit()
                        else:
                            logger.warning(f"[STRIPE] Could not determine tier for subscription {subscription_id}")
                except Exception as e:
                    logger.error(f"[STRIPE] Error processing invoice payment: {str(e)}", exc_info=True)

        # Handle subscription updates (e.g. tier changes via portal)
        elif event['type'] == 'customer.subscription.updated':
            sub_obj = event['data']['object']
            sub_dict = sub_obj.to_dict()
            sub_id = sub_dict.id if hasattr(sub_dict, 'id') else sub_obj.id
            
            # Try to get tier from metadata first
            metadata = sub_dict.get('metadata', {}) or {}
            tier = metadata.get("tier")
            
            # Fallback to Price ID
            if not tier:
                items = sub_dict.get('items', {}).get('data', [])
                if items:
                    price_id = items[0].get('price', {}).get('id')
                    if price_id == PRICE_IDS.get("premium"):
                        tier = "premium"
                    elif price_id == PRICE_IDS.get("pro"):
                        tier = "pro"

            if tier:
                q = select(User).where(User.stripe_subscription_id == sub_id)
                res = await session.execute(q)
                user = res.scalar_one_or_none()
                if user and user.tier != tier:
                    logger.info(f"[STRIPE] Subscription updated for user {user.email} to {tier}")
                    user.tier = tier
                    session.add(user)
                    await session.commit()

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
                user.stripe_subscription_id = None
                session.add(user)
                await session.commit()

        return {"status": "success"}
    except Exception as e:
        logger.critical(f"[STRIPE] Fatal error in webhook: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal webhook error")
