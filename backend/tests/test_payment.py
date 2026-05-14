import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app

def test_create_checkout_session(client):
    """TC_PAY_02: Test /api/payment session creation"""
    with patch("stripe.checkout.Session.create") as mock_create:
        mock_create.return_value = MagicMock(url="https://checkout.stripe.com/test")
        
        # We need a token for get_current_user
        # For simplicity in this test, we can mock get_current_user or provide a dummy token
        with patch("app.routers.payment.get_current_user") as mock_user:
            mock_user.return_value = MagicMock(id="test-id", email="test@example.com")
            
            response = client.post(
                "/api/payment/create-checkout-session",
                json={"tier": "pro"}
            )
            
            assert response.status_code == 200
            assert response.json()["url"] == "https://checkout.stripe.com/test"
            mock_create.assert_called_once()

def test_stripe_webhook_invalid_signature(client):
    """TC_PAY_01: Test Stripe webhook signature validation failure"""
    with patch("stripe.Webhook.construct_event") as mock_construct:
        import stripe
        mock_construct.side_effect = stripe.error.SignatureVerificationError("Invalid", "sig")
        
        response = client.post(
            "/api/payment/webhook",
            data="{}",
            headers={"stripe-signature": "invalid"}
        )
        
        assert response.status_code == 400
        assert "Invalid signature" in response.json()["detail"]

def test_stripe_webhook_success(client):
    """Test successful processing of checkout.session.completed"""
    with patch("stripe.Webhook.construct_event") as mock_construct:
        # Mock successful event construction
        mock_event = {
            "type": "checkout.session.completed",
            "data": {
                "object": MagicMock(
                    client_reference_id="550e8400-e29b-41d4-a716-446655440000",
                    customer="cus_123",
                    subscription="sub_123"
                )
            }
        }
        mock_construct.return_value = mock_event
        
        with patch("stripe.Subscription.retrieve") as mock_sub_retrieve:
            mock_sub_retrieve.return_value = MagicMock(to_dict=lambda: {
                "metadata": {"tier": "premium"},
                "items": {"data": [{"price": {"id": "price_premium"}}]}
            })
            
            # The session fixture from conftest will be used
            # We don't actually need to assert DB changes here if we just want to test the router logic
            response = client.post(
                "/api/payment/webhook",
                data="{}",
                headers={"stripe-signature": "valid-sig"}
            )
            
            assert response.status_code == 200
            assert response.json() == {"status": "success"}
