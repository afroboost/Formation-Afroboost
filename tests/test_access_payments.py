"""
Afroboost Access CRUD & Payment Transaction Tests
Tests for:
- User Access CRUD (GET, POST, PUT, DELETE)
- Access Revocation
- Payment History
- Payment Initiation
- Payment Webhook
- Manual Payment Completion
- Backward compatibility with user_level_progress
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://certboost.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_ID = "AFRO-ADMIN-2025"
TEST_USER_ID = f"TEST_user_{uuid.uuid4().hex[:8]}"
TEST_USER_ID_2 = f"TEST_user_{uuid.uuid4().hex[:8]}"


class TestAccessCRUD:
    """User Access CRUD operations tests"""
    
    created_access_id = None
    
    def test_01_get_all_access_returns_array(self):
        """GET /api/access should return an array"""
        response = requests.get(f"{BASE_URL}/api/access")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected array, got {type(data)}"
        print(f"✓ GET /api/access returns array with {len(data)} items")
    
    def test_02_create_access(self):
        """POST /api/access - Create a new access"""
        payload = {
            "user_id": TEST_USER_ID,
            "level_id": "level-1",
            "access_type": "admin_grant",
            "status": "active",
            "expires_at": None
        }
        response = requests.post(f"{BASE_URL}/api/access", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "id" in data
        assert data["user_id"] == TEST_USER_ID
        assert data["level_id"] == "level-1"
        assert data["access_type"] == "admin_grant"
        assert data["status"] == "active"
        assert data["granted_at"] is not None  # Should be set for active status
        
        # Store for later tests
        TestAccessCRUD.created_access_id = data["id"]
        print(f"✓ Access created with ID: {data['id']}")
    
    def test_03_get_access_by_id(self):
        """GET /api/access/{id} - Get specific access"""
        assert TestAccessCRUD.created_access_id is not None, "Access not created"
        
        response = requests.get(f"{BASE_URL}/api/access/{TestAccessCRUD.created_access_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == TestAccessCRUD.created_access_id
        assert data["user_id"] == TEST_USER_ID
        print(f"✓ Access retrieved by ID: {data['id']}")
    
    def test_04_get_access_with_filters(self):
        """GET /api/access with query filters"""
        # Filter by user_id
        response = requests.get(f"{BASE_URL}/api/access?user_id={TEST_USER_ID}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert all(a["user_id"] == TEST_USER_ID for a in data)
        print(f"✓ Access filtered by user_id: {len(data)} results")
        
        # Filter by status
        response = requests.get(f"{BASE_URL}/api/access?status=active")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Access filtered by status=active: {len(data)} results")
    
    def test_05_update_access(self):
        """PUT /api/access/{id} - Update access"""
        assert TestAccessCRUD.created_access_id is not None, "Access not created"
        
        update_payload = {
            "status": "pending",
            "access_type": "payment"
        }
        response = requests.put(
            f"{BASE_URL}/api/access/{TestAccessCRUD.created_access_id}",
            json=update_payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "pending"
        assert data["access_type"] == "payment"
        print(f"✓ Access updated: status={data['status']}, type={data['access_type']}")
        
        # Verify with GET
        response = requests.get(f"{BASE_URL}/api/access/{TestAccessCRUD.created_access_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"
        print("✓ Update verified via GET")
    
    def test_06_update_access_back_to_active(self):
        """PUT /api/access/{id} - Update back to active for revoke test"""
        assert TestAccessCRUD.created_access_id is not None, "Access not created"
        
        update_payload = {"status": "active"}
        response = requests.put(
            f"{BASE_URL}/api/access/{TestAccessCRUD.created_access_id}",
            json=update_payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "active"
        print("✓ Access status restored to active")
    
    def test_07_revoke_access(self):
        """POST /api/access/{id}/revoke - Revoke active access"""
        assert TestAccessCRUD.created_access_id is not None, "Access not created"
        
        revoke_payload = {
            "reason": "Test revocation",
            "revoked_by": "admin"
        }
        response = requests.post(
            f"{BASE_URL}/api/access/{TestAccessCRUD.created_access_id}/revoke",
            json=revoke_payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "revoked"
        assert data["revoked_at"] is not None
        assert data["revoked_by"] == "admin"
        assert data["revoke_reason"] == "Test revocation"
        print(f"✓ Access revoked: reason={data['revoke_reason']}")
    
    def test_08_revoke_non_active_fails(self):
        """POST /api/access/{id}/revoke - Cannot revoke non-active access"""
        assert TestAccessCRUD.created_access_id is not None, "Access not created"
        
        # Try to revoke already revoked access
        response = requests.post(
            f"{BASE_URL}/api/access/{TestAccessCRUD.created_access_id}/revoke",
            json={"reason": "Double revoke", "revoked_by": "admin"}
        )
        assert response.status_code == 400
        print("✓ Revoke non-active access correctly rejected")
    
    def test_09_delete_access(self):
        """DELETE /api/access/{id} - Delete access"""
        assert TestAccessCRUD.created_access_id is not None, "Access not created"
        
        response = requests.delete(f"{BASE_URL}/api/access/{TestAccessCRUD.created_access_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✓ Access deleted successfully")
        
        # Verify deletion
        response = requests.get(f"{BASE_URL}/api/access/{TestAccessCRUD.created_access_id}")
        assert response.status_code == 404
        print("✓ Deletion verified - access not found")
    
    def test_10_delete_nonexistent_access(self):
        """DELETE /api/access/{id} - Delete non-existent access returns 404"""
        response = requests.delete(f"{BASE_URL}/api/access/nonexistent-id-12345")
        assert response.status_code == 404
        print("✓ Delete non-existent access correctly returns 404")
    
    def test_11_create_duplicate_access_fails(self):
        """POST /api/access - Cannot create duplicate active access"""
        # First create
        payload = {
            "user_id": TEST_USER_ID_2,
            "level_id": "level-2",
            "access_type": "admin_grant",
            "status": "active"
        }
        response = requests.post(f"{BASE_URL}/api/access", json=payload)
        assert response.status_code == 200
        first_id = response.json()["id"]
        
        # Try duplicate
        response = requests.post(f"{BASE_URL}/api/access", json=payload)
        assert response.status_code == 400
        print("✓ Duplicate active access correctly rejected")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/access/{first_id}")


class TestPaymentHistory:
    """Payment history endpoint tests"""
    
    def test_01_get_payment_history_returns_array(self):
        """GET /api/payments/history should return an array"""
        response = requests.get(f"{BASE_URL}/api/payments/history")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected array, got {type(data)}"
        print(f"✓ GET /api/payments/history returns array with {len(data)} items")
    
    def test_02_get_payment_history_with_filters(self):
        """GET /api/payments/history with query filters"""
        # Filter by status
        response = requests.get(f"{BASE_URL}/api/payments/history?status=pending")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Payment history filtered by status=pending: {len(data)} results")
        
        # Filter by payment_method
        response = requests.get(f"{BASE_URL}/api/payments/history?payment_method=stripe")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Payment history filtered by method=stripe: {len(data)} results")


class TestPaymentInitiation:
    """Payment initiation tests"""
    
    created_transaction_id = None
    
    def test_01_initiate_payment_stripe(self):
        """POST /api/payments/initiate - Initiate Stripe payment"""
        # First ensure level-1 has stripe enabled
        config = {
            "level_id": "level-1",
            "payment_mode": "money",
            "price": 150,
            "currency": "CHF",
            "enabled_payment_methods": ["stripe", "twint"],
            "payment_instructions": {"stripe": "Pay via Stripe", "twint": "Pay via TWINT"},
            "volunteer_description": ""
        }
        requests.post(f"{BASE_URL}/api/level-payment-config", json=config)
        
        # Initiate payment
        payload = {
            "user_id": TEST_USER_ID,
            "level_id": "level-1",
            "payment_method": "stripe"
        }
        response = requests.post(f"{BASE_URL}/api/payments/initiate", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "transaction_id" in data
        assert "external_reference" in data
        assert data["amount"] == 150
        assert data["currency"] == "CHF"
        assert data["payment_method"] == "stripe"
        assert data["status"] == "pending"
        
        TestPaymentInitiation.created_transaction_id = data["transaction_id"]
        print(f"✓ Stripe payment initiated: {data['external_reference']}")
    
    def test_02_initiate_payment_twint(self):
        """POST /api/payments/initiate - Initiate TWINT payment"""
        payload = {
            "user_id": TEST_USER_ID,
            "level_id": "level-1",
            "payment_method": "twint"
        }
        response = requests.post(f"{BASE_URL}/api/payments/initiate", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["payment_method"] == "twint"
        print(f"✓ TWINT payment initiated: {data['external_reference']}")
    
    def test_03_initiate_payment_mobile_money(self):
        """POST /api/payments/initiate - Initiate Mobile Money payment"""
        # Configure level with mobile money
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
            "user_id": TEST_USER_ID,
            "level_id": "level-3",
            "payment_method": "mobile_money_mtn"
        }
        response = requests.post(f"{BASE_URL}/api/payments/initiate", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["payment_method"] == "mobile_money_mtn"
        assert data["currency"] == "XAF"
        assert data["amount"] == 50000
        print(f"✓ MTN Mobile Money payment initiated: {data['external_reference']}")
    
    def test_04_initiate_payment_disabled_method_fails(self):
        """POST /api/payments/initiate - Disabled payment method fails"""
        payload = {
            "user_id": TEST_USER_ID,
            "level_id": "level-1",
            "payment_method": "aggregator_paystack"  # Not enabled for level-1
        }
        response = requests.post(f"{BASE_URL}/api/payments/initiate", json=payload)
        assert response.status_code == 400
        print("✓ Disabled payment method correctly rejected")
    
    def test_05_initiate_payment_unconfigured_level_fails(self):
        """POST /api/payments/initiate - Unconfigured level fails"""
        payload = {
            "user_id": TEST_USER_ID,
            "level_id": "level-99",  # Non-existent level
            "payment_method": "stripe"
        }
        response = requests.post(f"{BASE_URL}/api/payments/initiate", json=payload)
        assert response.status_code == 404
        print("✓ Unconfigured level correctly returns 404")


class TestPaymentWebhook:
    """Payment webhook tests"""
    
    def test_01_webhook_completes_payment_and_creates_access(self):
        """POST /api/payments/webhook - Webhook completes payment and creates access"""
        # First initiate a payment
        config = {
            "level_id": "level-4",
            "payment_mode": "money",
            "price": 100,
            "currency": "EUR",
            "enabled_payment_methods": ["stripe"],
            "payment_instructions": {},
            "volunteer_description": ""
        }
        requests.post(f"{BASE_URL}/api/level-payment-config", json=config)
        
        init_response = requests.post(f"{BASE_URL}/api/payments/initiate", json={
            "user_id": TEST_USER_ID,
            "level_id": "level-4",
            "payment_method": "stripe"
        })
        assert init_response.status_code == 200
        transaction_id = init_response.json()["transaction_id"]
        
        # Simulate webhook
        webhook_payload = {
            "provider": "stripe",
            "event_type": "payment.completed",
            "transaction_id": transaction_id,
            "status": "completed",
            "metadata": {"provider_id": "pi_test_123"}
        }
        response = requests.post(f"{BASE_URL}/api/payments/webhook", json=webhook_payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert data["status"] == "completed"
        print(f"✓ Webhook processed: payment completed")
        
        # Verify access was created
        access_response = requests.get(f"{BASE_URL}/api/access?user_id={TEST_USER_ID}&level_id=level-4")
        assert access_response.status_code == 200
        access_list = access_response.json()
        assert len(access_list) >= 1
        assert any(a["status"] == "active" and a["access_type"] == "payment" for a in access_list)
        print("✓ Access automatically created after payment completion")
    
    def test_02_webhook_failed_payment(self):
        """POST /api/payments/webhook - Failed payment webhook"""
        # Initiate payment
        init_response = requests.post(f"{BASE_URL}/api/payments/initiate", json={
            "user_id": TEST_USER_ID,
            "level_id": "level-4",
            "payment_method": "stripe"
        })
        transaction_id = init_response.json()["transaction_id"]
        
        # Simulate failed webhook
        webhook_payload = {
            "provider": "stripe",
            "event_type": "payment.failed",
            "transaction_id": transaction_id,
            "status": "failed",
            "metadata": {}
        }
        response = requests.post(f"{BASE_URL}/api/payments/webhook", json=webhook_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "failed"
        print("✓ Failed payment webhook processed")
    
    def test_03_webhook_nonexistent_transaction(self):
        """POST /api/payments/webhook - Non-existent transaction returns 404"""
        webhook_payload = {
            "provider": "stripe",
            "event_type": "payment.completed",
            "transaction_id": "nonexistent-tx-12345",
            "status": "completed",
            "metadata": {}
        }
        response = requests.post(f"{BASE_URL}/api/payments/webhook", json=webhook_payload)
        assert response.status_code == 404
        print("✓ Non-existent transaction correctly returns 404")


class TestManualPaymentCompletion:
    """Manual payment completion tests"""
    
    def test_01_complete_pending_payment(self):
        """POST /api/payments/{id}/complete - Complete pending payment"""
        # Initiate payment
        init_response = requests.post(f"{BASE_URL}/api/payments/initiate", json={
            "user_id": TEST_USER_ID,
            "level_id": "level-1",
            "payment_method": "twint"
        })
        assert init_response.status_code == 200
        transaction_id = init_response.json()["transaction_id"]
        
        # Complete manually
        response = requests.post(f"{BASE_URL}/api/payments/{transaction_id}/complete")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert data["status"] == "completed"
        print(f"✓ Payment manually completed: {transaction_id}")
    
    def test_02_complete_nonpending_fails(self):
        """POST /api/payments/{id}/complete - Cannot complete non-pending payment"""
        # Initiate and complete a payment first
        init_response = requests.post(f"{BASE_URL}/api/payments/initiate", json={
            "user_id": TEST_USER_ID,
            "level_id": "level-1",
            "payment_method": "stripe"
        })
        transaction_id = init_response.json()["transaction_id"]
        
        # Complete it
        requests.post(f"{BASE_URL}/api/payments/{transaction_id}/complete")
        
        # Try to complete again
        response = requests.post(f"{BASE_URL}/api/payments/{transaction_id}/complete")
        assert response.status_code == 400
        print("✓ Complete non-pending payment correctly rejected")
    
    def test_03_complete_nonexistent_fails(self):
        """POST /api/payments/{id}/complete - Non-existent transaction returns 404"""
        response = requests.post(f"{BASE_URL}/api/payments/nonexistent-tx-12345/complete")
        assert response.status_code == 404
        print("✓ Complete non-existent transaction correctly returns 404")


class TestBackwardCompatibility:
    """Backward compatibility with user_level_progress tests"""
    
    def test_01_access_creation_updates_progress(self):
        """Creating active access should update user_level_progress"""
        test_user = f"TEST_compat_{uuid.uuid4().hex[:8]}"
        
        # Create access
        payload = {
            "user_id": test_user,
            "level_id": "level-5",
            "access_type": "admin_grant",
            "status": "active"
        }
        response = requests.post(f"{BASE_URL}/api/access", json=payload)
        assert response.status_code == 200
        access_id = response.json()["id"]
        
        # Check user_level_progress
        progress_response = requests.get(f"{BASE_URL}/api/level-progress/{test_user}/level-5")
        assert progress_response.status_code == 200
        progress = progress_response.json()
        
        assert progress["access_granted"] == True
        print("✓ Access creation updated user_level_progress.access_granted")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/access/{access_id}")
    
    def test_02_access_revocation_updates_progress(self):
        """Revoking access should update user_level_progress"""
        test_user = f"TEST_compat_{uuid.uuid4().hex[:8]}"
        
        # Create access
        payload = {
            "user_id": test_user,
            "level_id": "level-5",
            "access_type": "admin_grant",
            "status": "active"
        }
        response = requests.post(f"{BASE_URL}/api/access", json=payload)
        access_id = response.json()["id"]
        
        # Revoke
        requests.post(f"{BASE_URL}/api/access/{access_id}/revoke", json={
            "reason": "Test",
            "revoked_by": "admin"
        })
        
        # Check user_level_progress
        progress_response = requests.get(f"{BASE_URL}/api/level-progress/{test_user}/level-5")
        progress = progress_response.json()
        
        assert progress["access_granted"] == False
        print("✓ Access revocation updated user_level_progress.access_granted to False")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/access/{access_id}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_data(self):
        """Clean up TEST_ prefixed data"""
        # Get all access records
        response = requests.get(f"{BASE_URL}/api/access")
        if response.status_code == 200:
            access_list = response.json()
            for access in access_list:
                if access.get("user_id", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/access/{access['id']}")
        print("✓ Test data cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
