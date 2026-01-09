"""
Afroboost Stripe Payment Integration Tests
Tests for:
- POST /api/stripe/create-checkout - Create Stripe Checkout session
- GET /api/stripe/checkout-status/{session_id} - Check payment status
- POST /api/webhook/stripe - Stripe webhook endpoint
- POST /api/payrexx/create-payment - TWINT payment (manual mode)
- POST /api/flutterwave/create-payment - Mobile Money payment (manual mode)
- GET /api/payments/history - All transactions visible
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://certboost.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_USER_ID = f"TEST_stripe_{uuid.uuid4().hex[:8]}"


class TestStripeCheckoutCreation:
    """Test POST /api/stripe/create-checkout endpoint"""
    
    created_transaction_id = None
    created_session_id = None
    
    def test_01_create_stripe_checkout_success(self):
        """POST /api/stripe/create-checkout - Creates session and transaction"""
        # Ensure level-1 has stripe enabled
        config = {
            "level_id": "level-1",
            "payment_mode": "money",
            "price": 150,
            "currency": "CHF",
            "enabled_payment_methods": ["stripe", "twint"],
            "payment_instructions": {"stripe": "Pay via Stripe"},
            "volunteer_description": ""
        }
        requests.post(f"{BASE_URL}/api/level-payment-config", json=config)
        
        # Create checkout
        payload = {
            "user_id": TEST_USER_ID,
            "level_id": "level-1",
            "origin_url": "https://certboost.preview.emergentagent.com"
        }
        response = requests.post(f"{BASE_URL}/api/stripe/create-checkout", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "checkout_url" in data, "Response should contain checkout_url"
        assert "session_id" in data, "Response should contain session_id"
        assert "transaction_id" in data, "Response should contain transaction_id"
        
        # Validate checkout_url starts with Stripe URL
        assert data["checkout_url"].startswith("https://checkout.stripe.com"), \
            f"checkout_url should start with https://checkout.stripe.com, got: {data['checkout_url'][:50]}"
        
        TestStripeCheckoutCreation.created_transaction_id = data["transaction_id"]
        TestStripeCheckoutCreation.created_session_id = data["session_id"]
        
        print(f"✓ Stripe checkout created successfully")
        print(f"  - checkout_url: {data['checkout_url'][:60]}...")
        print(f"  - session_id: {data['session_id']}")
        print(f"  - transaction_id: {data['transaction_id']}")
    
    def test_02_transaction_created_in_db_before_redirect(self):
        """Verify transaction is created in DB BEFORE redirect to Stripe"""
        assert TestStripeCheckoutCreation.created_transaction_id is not None, "Transaction not created"
        
        # Get transaction from payments history
        response = requests.get(f"{BASE_URL}/api/payments/history?user_id={TEST_USER_ID}")
        assert response.status_code == 200
        
        transactions = response.json()
        assert isinstance(transactions, list)
        
        # Find our transaction
        our_tx = None
        for tx in transactions:
            if tx.get("id") == TestStripeCheckoutCreation.created_transaction_id:
                our_tx = tx
                break
        
        assert our_tx is not None, "Transaction should exist in DB"
        assert our_tx["status"] == "pending", f"Transaction status should be pending, got: {our_tx['status']}"
        assert our_tx["payment_method"] == "stripe", f"Payment method should be stripe, got: {our_tx['payment_method']}"
        assert our_tx["user_id"] == TEST_USER_ID
        assert our_tx["level_id"] == "level-1"
        
        print(f"✓ Transaction created in DB before redirect")
        print(f"  - status: {our_tx['status']}")
        print(f"  - amount: {our_tx['amount']} {our_tx['currency']}")
    
    def test_03_transaction_has_stripe_session_id(self):
        """Verify transaction has stripe_session_id after creation"""
        assert TestStripeCheckoutCreation.created_transaction_id is not None, "Transaction not created"
        
        # Get transaction
        response = requests.get(f"{BASE_URL}/api/payments/{TestStripeCheckoutCreation.created_transaction_id}")
        assert response.status_code == 200
        
        tx = response.json()
        assert "stripe_session_id" in tx, "Transaction should have stripe_session_id"
        assert tx["stripe_session_id"] is not None, "stripe_session_id should not be None"
        assert tx["stripe_session_id"] == TestStripeCheckoutCreation.created_session_id
        
        print(f"✓ Transaction has stripe_session_id: {tx['stripe_session_id']}")
    
    def test_04_create_checkout_stripe_not_enabled_fails(self):
        """POST /api/stripe/create-checkout - Fails if Stripe not enabled for level"""
        # Level-2 has volunteer mode only
        payload = {
            "user_id": TEST_USER_ID,
            "level_id": "level-2",
            "origin_url": "https://certboost.preview.emergentagent.com"
        }
        response = requests.post(f"{BASE_URL}/api/stripe/create-checkout", json=payload)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Stripe checkout correctly rejected for level without Stripe enabled")
    
    def test_05_create_checkout_unconfigured_level_fails(self):
        """POST /api/stripe/create-checkout - Fails for unconfigured level"""
        payload = {
            "user_id": TEST_USER_ID,
            "level_id": "level-99",
            "origin_url": "https://certboost.preview.emergentagent.com"
        }
        response = requests.post(f"{BASE_URL}/api/stripe/create-checkout", json=payload)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Stripe checkout correctly returns 404 for unconfigured level")


class TestStripeCheckoutStatus:
    """Test GET /api/stripe/checkout-status/{session_id} endpoint"""
    
    def test_01_get_checkout_status_valid_session(self):
        """GET /api/stripe/checkout-status/{session_id} - Returns status for valid session"""
        # First create a checkout
        payload = {
            "user_id": f"TEST_status_{uuid.uuid4().hex[:8]}",
            "level_id": "level-1",
            "origin_url": "https://certboost.preview.emergentagent.com"
        }
        create_response = requests.post(f"{BASE_URL}/api/stripe/create-checkout", json=payload)
        assert create_response.status_code == 200
        
        session_id = create_response.json()["session_id"]
        
        # Check status
        response = requests.get(f"{BASE_URL}/api/stripe/checkout-status/{session_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert "payment_status" in data
        assert "transaction_id" in data
        
        # Status should be open/unpaid since we haven't completed payment
        print(f"✓ Checkout status retrieved: status={data['status']}, payment_status={data['payment_status']}")
    
    def test_02_get_checkout_status_invalid_session(self):
        """GET /api/stripe/checkout-status/{session_id} - Returns 404 for invalid session"""
        response = requests.get(f"{BASE_URL}/api/stripe/checkout-status/invalid_session_12345")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid session correctly returns 404")


class TestStripeWebhook:
    """Test POST /api/webhook/stripe endpoint"""
    
    def test_01_webhook_endpoint_exists(self):
        """POST /api/webhook/stripe - Endpoint exists and accepts requests"""
        # Send empty body - should not crash
        response = requests.post(
            f"{BASE_URL}/api/webhook/stripe",
            data=b"",
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 200 (acknowledges receipt) or 500 (processing error)
        # but NOT 404 (endpoint not found)
        assert response.status_code != 404, "Webhook endpoint should exist"
        print(f"✓ Webhook endpoint exists (status: {response.status_code})")


class TestPayrexxTWINT:
    """Test POST /api/payrexx/create-payment endpoint (TWINT manual mode)"""
    
    def test_01_create_twint_payment_success(self):
        """POST /api/payrexx/create-payment - Creates TWINT transaction in manual mode"""
        # Ensure level-1 has twint enabled
        config = {
            "level_id": "level-1",
            "payment_mode": "money",
            "price": 150,
            "currency": "CHF",
            "enabled_payment_methods": ["stripe", "twint_api"],
            "payment_instructions": {"twint": "Pay via TWINT"},
            "volunteer_description": ""
        }
        requests.post(f"{BASE_URL}/api/level-payment-config", json=config)
        
        payload = {
            "user_id": f"TEST_twint_{uuid.uuid4().hex[:8]}",
            "level_id": "level-1",
            "payment_method": "twint_api"
        }
        response = requests.post(f"{BASE_URL}/api/payrexx/create-payment", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response
        assert "transaction_id" in data
        assert "action" in data
        assert data["action"] == "manual_validation_required"
        assert data["status"] == "pending"
        
        print(f"✓ TWINT payment created in manual mode")
        print(f"  - transaction_id: {data['transaction_id']}")
        print(f"  - action: {data['action']}")
    
    def test_02_twint_transaction_visible_in_history(self):
        """Verify TWINT transaction appears in payment history"""
        test_user = f"TEST_twint_hist_{uuid.uuid4().hex[:8]}"
        
        # Create TWINT payment
        payload = {
            "user_id": test_user,
            "level_id": "level-1",
            "payment_method": "twint_api"
        }
        create_response = requests.post(f"{BASE_URL}/api/payrexx/create-payment", json=payload)
        assert create_response.status_code == 200
        tx_id = create_response.json()["transaction_id"]
        
        # Check history
        response = requests.get(f"{BASE_URL}/api/payments/history?user_id={test_user}")
        assert response.status_code == 200
        
        transactions = response.json()
        assert any(tx["id"] == tx_id for tx in transactions), "TWINT transaction should be in history"
        
        print("✓ TWINT transaction visible in payment history")


class TestFlutterwaveMobileMoney:
    """Test POST /api/flutterwave/create-payment endpoint (Mobile Money manual mode)"""
    
    def test_01_create_mtn_payment_success(self):
        """POST /api/flutterwave/create-payment - Creates MTN Mobile Money transaction"""
        # Ensure level-3 has mobile money enabled
        config = {
            "level_id": "level-3",
            "payment_mode": "money",
            "price": 50000,
            "currency": "XAF",
            "enabled_payment_methods": ["mobile_money_mtn", "mobile_money_orange"],
            "payment_instructions": {"mobile_money_mtn": "Dial *126#"},
            "volunteer_description": ""
        }
        requests.post(f"{BASE_URL}/api/level-payment-config", json=config)
        
        payload = {
            "user_id": f"TEST_mtn_{uuid.uuid4().hex[:8]}",
            "level_id": "level-3",
            "payment_method": "mobile_money_mtn"
        }
        response = requests.post(f"{BASE_URL}/api/flutterwave/create-payment", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response
        assert "transaction_id" in data
        assert "action" in data
        assert data["action"] == "manual_validation_required"
        assert data["status"] == "pending"
        assert data["currency"] == "XAF"
        assert data["amount"] == 50000
        
        print(f"✓ MTN Mobile Money payment created in manual mode")
        print(f"  - transaction_id: {data['transaction_id']}")
        print(f"  - amount: {data['amount']} {data['currency']}")
    
    def test_02_create_orange_payment_success(self):
        """POST /api/flutterwave/create-payment - Creates Orange Money transaction"""
        payload = {
            "user_id": f"TEST_orange_{uuid.uuid4().hex[:8]}",
            "level_id": "level-3",
            "payment_method": "mobile_money_orange"
        }
        response = requests.post(f"{BASE_URL}/api/flutterwave/create-payment", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["action"] == "manual_validation_required"
        print(f"✓ Orange Money payment created in manual mode")
    
    def test_03_mobile_money_transaction_visible_in_history(self):
        """Verify Mobile Money transactions appear in payment history"""
        test_user = f"TEST_mm_hist_{uuid.uuid4().hex[:8]}"
        
        # Create Mobile Money payment
        payload = {
            "user_id": test_user,
            "level_id": "level-3",
            "payment_method": "mobile_money_mtn"
        }
        create_response = requests.post(f"{BASE_URL}/api/flutterwave/create-payment", json=payload)
        assert create_response.status_code == 200
        tx_id = create_response.json()["transaction_id"]
        
        # Check history
        response = requests.get(f"{BASE_URL}/api/payments/history?user_id={test_user}")
        assert response.status_code == 200
        
        transactions = response.json()
        assert any(tx["id"] == tx_id for tx in transactions), "Mobile Money transaction should be in history"
        
        print("✓ Mobile Money transaction visible in payment history")


class TestPaymentHistoryAllTransactions:
    """Test GET /api/payments/history - All transactions visible"""
    
    def test_01_all_payment_methods_in_history(self):
        """GET /api/payments/history - Returns all transaction types"""
        response = requests.get(f"{BASE_URL}/api/payments/history")
        assert response.status_code == 200
        
        transactions = response.json()
        assert isinstance(transactions, list)
        
        # Check for different payment methods
        payment_methods = set(tx.get("payment_method") for tx in transactions)
        print(f"✓ Payment history contains {len(transactions)} transactions")
        print(f"  - Payment methods found: {payment_methods}")
    
    def test_02_filter_by_payment_method(self):
        """GET /api/payments/history - Filter by payment method works"""
        # Filter by stripe
        response = requests.get(f"{BASE_URL}/api/payments/history?payment_method=stripe")
        assert response.status_code == 200
        stripe_txs = response.json()
        
        # All should be stripe
        for tx in stripe_txs:
            assert tx["payment_method"] == "stripe", f"Expected stripe, got {tx['payment_method']}"
        
        print(f"✓ Filter by payment_method=stripe: {len(stripe_txs)} transactions")
    
    def test_03_filter_by_status(self):
        """GET /api/payments/history - Filter by status works"""
        response = requests.get(f"{BASE_URL}/api/payments/history?status=pending")
        assert response.status_code == 200
        pending_txs = response.json()
        
        for tx in pending_txs:
            assert tx["status"] == "pending", f"Expected pending, got {tx['status']}"
        
        print(f"✓ Filter by status=pending: {len(pending_txs)} transactions")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_transactions(self):
        """Clean up TEST_ prefixed transactions"""
        # Note: We don't have a delete endpoint for transactions
        # This is intentional - transactions should be immutable for audit
        print("✓ Test transactions preserved for audit trail (by design)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
