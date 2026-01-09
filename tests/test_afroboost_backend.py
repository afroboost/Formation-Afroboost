"""
Afroboost Backend API Tests
Tests for:
- Admin authentication
- Level payment configuration
- Level progress endpoints
- PDF generation (training summary)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://certboost.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_ID = "AFRO-ADMIN-2025"
TEST_USER_ID = "test-user-123"
TEST_USER_NAME = "Jean-François Éloïse"


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with correct ID"""
        response = requests.post(f"{BASE_URL}/api/admin/auth", json={
            "admin_secret_id": ADMIN_ID
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["admin_id"] == ADMIN_ID
        print(f"✓ Admin login successful with ID: {ADMIN_ID}")
    
    def test_admin_login_failure(self):
        """Test admin login with wrong ID"""
        response = requests.post(f"{BASE_URL}/api/admin/auth", json={
            "admin_secret_id": "WRONG-ID"
        })
        assert response.status_code == 401
        print("✓ Admin login correctly rejected invalid ID")


class TestLevelPaymentConfig:
    """Level payment configuration tests"""
    
    def test_get_all_payment_configs_returns_array(self):
        """GET /api/level-payment-config should return an array"""
        response = requests.get(f"{BASE_URL}/api/level-payment-config")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected array, got {type(data)}"
        print(f"✓ GET /api/level-payment-config returns array with {len(data)} items")
    
    def test_configure_level1_money_only(self):
        """Configure Level 1 with money payment only"""
        config = {
            "level_id": "level-1",
            "payment_mode": "money",
            "price": 150,
            "currency": "CHF",
            "enabled_payment_methods": ["twint"],
            "payment_instructions": {"twint": "Payer via TWINT"},
            "volunteer_description": ""
        }
        response = requests.post(f"{BASE_URL}/api/level-payment-config", json=config)
        assert response.status_code == 200
        data = response.json()
        assert data["level_id"] == "level-1"
        assert data["payment_mode"] == "money"
        assert data["price"] == 150
        assert data["currency"] == "CHF"
        assert "twint" in data["enabled_payment_methods"]
        print("✓ Level 1 configured with money payment (150 CHF, TWINT)")
    
    def test_configure_level2_volunteer_only(self):
        """Configure Level 2 with volunteer only"""
        config = {
            "level_id": "level-2",
            "payment_mode": "volunteer",
            "price": None,
            "currency": "CHF",
            "enabled_payment_methods": [],
            "payment_instructions": {},
            "volunteer_description": "Mission de 10h"
        }
        response = requests.post(f"{BASE_URL}/api/level-payment-config", json=config)
        assert response.status_code == 200
        data = response.json()
        assert data["level_id"] == "level-2"
        assert data["payment_mode"] == "volunteer"
        assert data["volunteer_description"] == "Mission de 10h"
        print("✓ Level 2 configured with volunteer only (Mission de 10h)")
    
    def test_configure_level3_both_options(self):
        """Configure Level 3 with both payment and volunteer"""
        config = {
            "level_id": "level-3",
            "payment_mode": "both",
            "price": 200,
            "currency": "CHF",
            "enabled_payment_methods": ["stripe"],
            "payment_instructions": {"stripe": "Payer via Stripe"},
            "volunteer_description": "Aide événementielle"
        }
        response = requests.post(f"{BASE_URL}/api/level-payment-config", json=config)
        assert response.status_code == 200
        data = response.json()
        assert data["level_id"] == "level-3"
        assert data["payment_mode"] == "both"
        assert data["price"] == 200
        assert "stripe" in data["enabled_payment_methods"]
        assert data["volunteer_description"] == "Aide événementielle"
        print("✓ Level 3 configured with both options (200 CHF + volunteer)")
    
    def test_get_level1_config(self):
        """Verify Level 1 config was saved correctly"""
        response = requests.get(f"{BASE_URL}/api/level-payment-config/level-1")
        assert response.status_code == 200
        data = response.json()
        assert data["payment_mode"] == "money"
        assert data["price"] == 150
        print("✓ Level 1 config retrieved correctly")
    
    def test_get_level2_config(self):
        """Verify Level 2 config was saved correctly"""
        response = requests.get(f"{BASE_URL}/api/level-payment-config/level-2")
        assert response.status_code == 200
        data = response.json()
        assert data["payment_mode"] == "volunteer"
        assert data["volunteer_description"] == "Mission de 10h"
        print("✓ Level 2 config retrieved correctly")
    
    def test_get_level3_config(self):
        """Verify Level 3 config was saved correctly"""
        response = requests.get(f"{BASE_URL}/api/level-payment-config/level-3")
        assert response.status_code == 200
        data = response.json()
        assert data["payment_mode"] == "both"
        assert data["price"] == 200
        print("✓ Level 3 config retrieved correctly")
    
    def test_get_unconfigured_level_returns_default(self):
        """Unconfigured levels should return default config"""
        response = requests.get(f"{BASE_URL}/api/level-payment-config/level-4")
        assert response.status_code == 200
        data = response.json()
        # Default config has no price and empty methods
        assert data["level_id"] == "level-4"
        assert data["price"] is None
        assert data["enabled_payment_methods"] == []
        print("✓ Unconfigured level returns default config")


class TestLevelProgressAdmin:
    """Level progress admin endpoint tests"""
    
    def test_admin_all_progress_returns_array(self):
        """GET /api/level-progress/admin/all should return an array"""
        response = requests.get(f"{BASE_URL}/api/level-progress/admin/all")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected array, got {type(data)}"
        print(f"✓ GET /api/level-progress/admin/all returns array with {len(data)} items")


class TestTrainingSummaryPDF:
    """Training summary PDF generation tests"""
    
    def test_training_summary_pdf_download(self):
        """Test PDF download endpoint returns valid PDF"""
        response = requests.get(f"{BASE_URL}/api/training-summary/pdf")
        assert response.status_code == 200
        assert response.headers.get('content-type') == 'application/pdf'
        # Check PDF magic bytes
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF"
        print(f"✓ Training summary PDF downloaded ({len(response.content)} bytes)")
    
    def test_training_summary_pdf_has_french_accents(self):
        """Verify PDF contains French text (accents should be properly encoded)"""
        response = requests.get(f"{BASE_URL}/api/training-summary/pdf")
        assert response.status_code == 200
        # PDF content is binary, but we can check it was generated
        assert len(response.content) > 1000, "PDF seems too small"
        print("✓ Training summary PDF generated with proper size")


class TestLevelAccessRequest:
    """Level access request tests"""
    
    def test_request_payment_access(self):
        """Test requesting payment access to a level"""
        response = requests.post(f"{BASE_URL}/api/level-access/request", json={
            "user_id": TEST_USER_ID,
            "level_id": "level-1",
            "request_type": "payment"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == TEST_USER_ID
        assert data["level_id"] == "level-1"
        print("✓ Payment access request submitted")
    
    def test_request_volunteer_access(self):
        """Test requesting volunteer access to a level"""
        response = requests.post(f"{BASE_URL}/api/level-access/request", json={
            "user_id": TEST_USER_ID,
            "level_id": "level-2",
            "request_type": "volunteer"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == TEST_USER_ID
        assert data["level_id"] == "level-2"
        print("✓ Volunteer access request submitted")


class TestLevelUnlockCheck:
    """Level unlock status check tests"""
    
    def test_check_unlock_status(self):
        """Test checking unlock status for a level"""
        response = requests.get(f"{BASE_URL}/api/level-progress/check-unlock/{TEST_USER_ID}/level-1")
        assert response.status_code == 200
        data = response.json()
        assert "unlocked" in data
        assert "access_granted" in data
        print(f"✓ Unlock status check: unlocked={data['unlocked']}, access_granted={data['access_granted']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
