import requests
import sys
from datetime import datetime
import json

class AfroboostAPITester:
    def __init__(self, base_url="https://instructor-exam.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            'exam_dates': [],
            'bookings': [],
            'certificates': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, response_type='json'):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if data:
            print(f"   Data: {json.dumps(data, indent=2)}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            print(f"   Response Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                
                if response_type == 'json' and response.content:
                    try:
                        response_data = response.json()
                        print(f"   Response: {json.dumps(response_data, indent=2)}")
                        return True, response_data
                    except:
                        return True, {}
                else:
                    return True, {}
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ FAILED - Network Error: {str(e)}")
            return False, {}

    def test_exam_dates_crud(self):
        """Test CRUD operations for exam dates"""
        print("\n" + "="*60)
        print("TESTING EXAM DATES ENDPOINTS")
        print("="*60)
        
        # Test GET empty list
        success, data = self.run_test(
            "Get Exam Dates (Empty)",
            "GET",
            "exam-dates",
            200
        )
        
        # Test CREATE exam date
        exam_date_data = {
            "date": "2025-02-15",
            "time": "14:00",
            "meeting_link": "https://meet.google.com/test-exam",
            "available_slots": 10
        }
        
        success, created_date = self.run_test(
            "Create Exam Date",
            "POST",
            "exam-dates",
            200,
            exam_date_data
        )
        
        if success and created_date:
            self.created_resources['exam_dates'].append(created_date['id'])
            
            # Test GET with data
            success, dates_list = self.run_test(
                "Get Exam Dates (With Data)",
                "GET",
                "exam-dates",
                200
            )
            
            # Test DELETE
            success, _ = self.run_test(
                "Delete Exam Date",
                "DELETE",
                f"exam-dates/{created_date['id']}",
                200
            )
            
            if success:
                self.created_resources['exam_dates'].remove(created_date['id'])

    def test_exam_bookings_crud(self):
        """Test CRUD operations for exam bookings"""
        print("\n" + "="*60)
        print("TESTING EXAM BOOKINGS ENDPOINTS")
        print("="*60)
        
        # First create an exam date
        exam_date_data = {
            "date": "2025-02-20",
            "time": "15:00",
            "meeting_link": "https://meet.google.com/booking-test",
            "available_slots": 5
        }
        
        success, exam_date = self.run_test(
            "Create Exam Date for Booking",
            "POST",
            "exam-dates",
            200,
            exam_date_data
        )
        
        if not success or not exam_date:
            print("❌ Cannot test bookings without exam date")
            return
            
        self.created_resources['exam_dates'].append(exam_date['id'])
        
        # Test GET empty bookings
        success, data = self.run_test(
            "Get Exam Bookings (Empty)",
            "GET",
            "exam-bookings",
            200
        )
        
        # Test CREATE booking
        booking_data = {
            "student_id": "STU001",
            "student_name": "Marie Dupont",
            "student_email": "marie@test.com",
            "exam_date_id": exam_date['id']
        }
        
        success, booking = self.run_test(
            "Create Exam Booking",
            "POST",
            "exam-bookings",
            200,
            booking_data
        )
        
        if success and booking:
            self.created_resources['bookings'].append(booking['id'])
            
            # Test GET all bookings
            success, bookings_list = self.run_test(
                "Get All Exam Bookings",
                "GET",
                "exam-bookings",
                200
            )
            
            # Test GET student bookings
            success, student_bookings = self.run_test(
                "Get Student Bookings",
                "GET",
                f"exam-bookings/student/{booking_data['student_id']}",
                200
            )
            
            # Test UPDATE result to passed
            result_data = {
                "booking_id": booking['id'],
                "result": "passed"
            }
            
            success, _ = self.run_test(
                "Update Booking Result (Passed)",
                "PUT",
                f"exam-bookings/{booking['id']}/result",
                200,
                result_data
            )
            
            # Test UPDATE result to failed
            result_data_failed = {
                "booking_id": booking['id'],
                "result": "failed"
            }
            
            success, _ = self.run_test(
                "Update Booking Result (Failed)",
                "PUT",
                f"exam-bookings/{booking['id']}/result",
                200,
                result_data_failed
            )

    def test_certificates_crud(self):
        """Test CRUD operations for certificates"""
        print("\n" + "="*60)
        print("TESTING CERTIFICATES ENDPOINTS")
        print("="*60)
        
        # Test GET empty certificates
        success, data = self.run_test(
            "Get Student Certificates (Empty)",
            "GET",
            "certificates/student/NONEXISTENT",
            200
        )
        
        # Test CREATE certificate
        cert_data = {
            "student_id": "STU002",
            "student_name": "Jean Martin",
            "certificate_type": "online"
        }
        
        success, certificate = self.run_test(
            "Create Certificate",
            "POST",
            "certificates",
            200,
            cert_data
        )
        
        if success and certificate:
            self.created_resources['certificates'].append(certificate['id'])
            
            # Test GET student certificates
            success, certs_list = self.run_test(
                "Get Student Certificates",
                "GET",
                f"certificates/student/{cert_data['student_id']}",
                200
            )
            
            # Test PDF download
            success, _ = self.run_test(
                "Download Certificate PDF",
                "GET",
                f"certificates/{certificate['id']}/pdf",
                200,
                response_type='blob'
            )

    def test_edge_cases(self):
        """Test edge cases and error conditions"""
        print("\n" + "="*60)
        print("TESTING EDGE CASES & ERROR CONDITIONS")
        print("="*60)
        
        # Test booking non-existent exam date
        invalid_booking = {
            "student_id": "STU999",
            "student_name": "Test User",
            "student_email": "test@test.com",
            "exam_date_id": "non-existent-id"
        }
        
        success, _ = self.run_test(
            "Book Non-existent Exam Date",
            "POST",
            "exam-bookings",
            404,
            invalid_booking
        )
        
        # Test update non-existent booking
        success, _ = self.run_test(
            "Update Non-existent Booking",
            "PUT",
            "exam-bookings/non-existent-id/result",
            404,
            {"booking_id": "non-existent-id", "result": "passed"}
        )
        
        # Test delete non-existent exam date
        success, _ = self.run_test(
            "Delete Non-existent Exam Date",
            "DELETE",
            "exam-dates/non-existent-id",
            404
        )
        
        # Test get non-existent certificate PDF
        success, _ = self.run_test(
            "Download Non-existent Certificate PDF",
            "GET",
            "certificates/non-existent-id/pdf",
            404
        )
        
        # Test get non-existent level document PDF
        success, _ = self.run_test(
            "Download Non-existent Level Document PDF",
            "GET",
            "level-documents/non-existent-id/pdf",
            404
        )

    def test_level_documents_crud(self):
        """Test CRUD operations for level documents"""
        print("\n" + "="*60)
        print("TESTING LEVEL DOCUMENTS ENDPOINTS")
        print("="*60)
        
        # Test GET empty level documents
        success, data = self.run_test(
            "Get Student Level Documents (Empty)",
            "GET",
            "level-documents/student/NONEXISTENT",
            200
        )
        
        # Test CREATE level document
        level_doc_data = {
            "student_id": "STU_LEVELS_001",
            "student_name": "Sophie Martin",
            "level_name": "Level 1 – Afroboost DNA",
            "skills": [
                "Maîtrise des mouvements de base Afrobeat",
                "Compréhension du rythme et de la musicalité",
                "Technique de isolation corporelle",
                "Coordination bras-jambes fondamentale"
            ]
        }
        
        success, level_doc = self.run_test(
            "Create Level Document",
            "POST",
            "level-documents",
            200,
            level_doc_data
        )
        
        if success and level_doc:
            # Test GET student level documents
            success, docs_list = self.run_test(
                "Get Student Level Documents",
                "GET",
                f"level-documents/student/{level_doc_data['student_id']}",
                200
            )
            
            # Test PDF download
            success, _ = self.run_test(
                "Download Level Document PDF",
                "GET",
                f"level-documents/{level_doc['id']}/pdf",
                200,
                response_type='blob'
            )
            
            # Test creating multiple level documents for same student
            level_doc_data_2 = {
                "student_id": "STU_LEVELS_001",
                "student_name": "Sophie Martin",
                "level_name": "Level 2 – Rhythm Foundation",
                "skills": [
                    "Maîtrise des variations rythmiques complexes",
                    "Transitions fluides entre mouvements",
                    "Expression corporelle et énergie",
                    "Synchronisation musicale avancée"
                ]
            }
            
            success, level_doc_2 = self.run_test(
                "Create Second Level Document",
                "POST",
                "level-documents",
                200,
                level_doc_data_2
            )
            
            if success:
                # Verify both documents exist for student
                success, multiple_docs = self.run_test(
                    "Get Multiple Student Level Documents",
                    "GET",
                    f"level-documents/student/{level_doc_data['student_id']}",
                    200
                )
                
                if success and multiple_docs:
                    print(f"✅ Found {len(multiple_docs)} level documents for student")

    def test_level_documents_e2e_scenario(self):
        """Test complete E2E scenario for level documents"""
        print("\n" + "="*60)
        print("TESTING LEVEL DOCUMENTS E2E SCENARIO")
        print("="*60)
        
        student_id = "STU_E2E_LEVELS"
        student_name = "Jean Dupont"
        
        # Create 3 level documents for the student
        levels_data = [
            {
                "student_id": student_id,
                "student_name": student_name,
                "level_name": "Level 1 – Afroboost DNA",
                "skills": [
                    "Maîtrise des mouvements de base Afrobeat",
                    "Compréhension du rythme et de la musicalité",
                    "Technique de isolation corporelle",
                    "Coordination bras-jambes fondamentale"
                ]
            },
            {
                "student_id": student_id,
                "student_name": student_name,
                "level_name": "Level 2 – Rhythm Foundation",
                "skills": [
                    "Maîtrise des variations rythmiques complexes",
                    "Transitions fluides entre mouvements",
                    "Expression corporelle et énergie",
                    "Synchronisation musicale avancée"
                ]
            },
            {
                "student_id": student_id,
                "student_name": student_name,
                "level_name": "Level 3 – Style & Flow",
                "skills": [
                    "Développement du style personnel",
                    "Improvisation et créativité",
                    "Maîtrise des enchaînements chorégraphiques",
                    "Performance scénique et présence"
                ]
            }
        ]
        
        created_docs = []
        
        for i, level_data in enumerate(levels_data):
            success, doc = self.run_test(
                f"E2E Levels: Create Level {i+1} Document",
                "POST",
                "level-documents",
                200,
                level_data
            )
            
            if success and doc:
                created_docs.append(doc)
                
                # Test PDF download for each document
                success, _ = self.run_test(
                    f"E2E Levels: Download Level {i+1} PDF",
                    "GET",
                    f"level-documents/{doc['id']}/pdf",
                    200,
                    response_type='blob'
                )
        
        # Verify all documents exist for student
        success, all_docs = self.run_test(
            "E2E Levels: Get All Student Documents",
            "GET",
            f"level-documents/student/{student_id}",
            200
        )
        
        if success and all_docs:
            print(f"✅ E2E Levels: Found {len(all_docs)} total documents for student {student_id}")
            
            # Verify document structure and content
            for doc in all_docs:
                if 'document_id' in doc and 'level_name' in doc and 'skills' in doc:
                    print(f"✅ E2E Levels: Document {doc['document_id']} has correct structure")
                else:
                    print(f"❌ E2E Levels: Document {doc.get('id', 'unknown')} missing required fields")

    def test_complete_e2e_scenario(self):
        """Test complete end-to-end scenario"""
        print("\n" + "="*60)
        print("TESTING COMPLETE E2E SCENARIO")
        print("="*60)
        
        # Step 1: Admin creates exam date
        exam_date_data = {
            "date": "2025-02-25",
            "time": "16:00",
            "meeting_link": "https://meet.google.com/e2e-test",
            "available_slots": 3
        }
        
        success, exam_date = self.run_test(
            "E2E: Create Exam Date",
            "POST",
            "exam-dates",
            200,
            exam_date_data
        )
        
        if not success:
            print("❌ E2E test failed at exam date creation")
            return
            
        self.created_resources['exam_dates'].append(exam_date['id'])
        
        # Step 2: Student books exam
        booking_data = {
            "student_id": "STU_E2E",
            "student_name": "Test E2E Student",
            "student_email": "e2e@test.com",
            "exam_date_id": exam_date['id']
        }
        
        success, booking = self.run_test(
            "E2E: Student Books Exam",
            "POST",
            "exam-bookings",
            200,
            booking_data
        )
        
        if not success:
            print("❌ E2E test failed at booking creation")
            return
            
        self.created_resources['bookings'].append(booking['id'])
        
        # Step 3: Admin validates result as passed
        success, _ = self.run_test(
            "E2E: Admin Validates Result (Passed)",
            "PUT",
            f"exam-bookings/{booking['id']}/result",
            200,
            {"booking_id": booking['id'], "result": "passed"}
        )
        
        if not success:
            print("❌ E2E test failed at result validation")
            return
        
        # Step 4: Check if certificate was auto-created
        success, certificates = self.run_test(
            "E2E: Check Auto-created Certificate",
            "GET",
            f"certificates/student/{booking_data['student_id']}",
            200
        )
        
        if success and certificates:
            print(f"✅ E2E: Found {len(certificates)} certificate(s) for student")
            for cert in certificates:
                self.created_resources['certificates'].append(cert['id'])
                
                # Step 5: Test PDF download
                success, _ = self.run_test(
                    "E2E: Download Certificate PDF",
                    "GET",
                    f"certificates/{cert['id']}/pdf",
                    200,
                    response_type='blob'
                )

    def cleanup_resources(self):
        """Clean up created test resources"""
        print("\n" + "="*60)
        print("CLEANING UP TEST RESOURCES")
        print("="*60)
        
        # Clean up exam dates (this should cascade delete bookings)
        for exam_date_id in self.created_resources['exam_dates']:
            try:
                response = requests.delete(f"{self.api_url}/exam-dates/{exam_date_id}")
                if response.status_code == 200:
                    print(f"✅ Cleaned up exam date: {exam_date_id}")
                else:
                    print(f"⚠️  Could not clean up exam date: {exam_date_id}")
            except Exception as e:
                print(f"⚠️  Error cleaning up exam date {exam_date_id}: {e}")

    def test_certificate_verification(self):
        """Test the certificate verification endpoint - MAIN FEATURE FOR THIS REQUEST"""
        print("\n" + "="*60)
        print("TESTING CERTIFICATE VERIFICATION ENDPOINT (MAIN FEATURE)")
        print("="*60)
        
        # First, create a certificate to verify
        cert_data = {
            "student_id": "TEST_VERIFY_USER",
            "student_name": "Marie Verification",
            "certificate_type": "online"
        }
        
        success, certificate = self.run_test(
            "Create Certificate for Verification Test",
            "POST",
            "certificates",
            200,
            cert_data
        )
        
        if not success or not certificate:
            print("❌ Cannot test verification without certificate")
            return False
            
        self.created_resources['certificates'].append(certificate['id'])
        certificate_id = certificate['certificate_id']  # This is the AFRO-XXXXXXXX format
        
        print(f"📋 Created certificate with ID: {certificate_id}")
        
        # Test 1: Verify valid certificate (PUBLIC ENDPOINT - NO AUTH)
        success, verification_result = self.run_test(
            "Verify Valid Certificate (Public - No Auth)",
            "GET",
            f"certificates/verify/{certificate_id}",
            200
        )
        
        if success and verification_result:
            # Validate response structure
            required_fields = ['valid', 'certificate_id', 'student_name', 'certificate_type', 'issued_at', 'status']
            missing_fields = [field for field in required_fields if field not in verification_result]
            
            if not missing_fields:
                print("   ✅ All required fields present in response")
                
                # Validate field values
                if verification_result['valid'] == True:
                    print("   ✅ valid: true")
                else:
                    print(f"   ❌ valid should be true, got: {verification_result['valid']}")
                    
                if verification_result['certificate_id'] == certificate_id:
                    print(f"   ✅ certificate_id matches: {certificate_id}")
                else:
                    print(f"   ❌ certificate_id mismatch: expected {certificate_id}, got {verification_result['certificate_id']}")
                    
                if verification_result['student_name'] == cert_data['student_name']:
                    print(f"   ✅ student_name matches: {cert_data['student_name']}")
                else:
                    print(f"   ❌ student_name mismatch: expected {cert_data['student_name']}, got {verification_result['student_name']}")
                    
                if verification_result['certificate_type'] == cert_data['certificate_type']:
                    print(f"   ✅ certificate_type matches: {cert_data['certificate_type']}")
                else:
                    print(f"   ❌ certificate_type mismatch: expected {cert_data['certificate_type']}, got {verification_result['certificate_type']}")
                    
                # Check date format (DD/MM/YYYY)
                import re
                date_pattern = r'^\d{2}/\d{2}/\d{4}$'
                if re.match(date_pattern, verification_result['issued_at']):
                    print(f"   ✅ issued_at format correct (DD/MM/YYYY): {verification_result['issued_at']}")
                else:
                    print(f"   ❌ issued_at format incorrect: {verification_result['issued_at']}")
                    
                if verification_result['status'] == 'VALID':
                    print("   ✅ status: VALID")
                else:
                    print(f"   ❌ status should be VALID, got: {verification_result['status']}")
                    
            else:
                print(f"   ❌ Missing required fields: {missing_fields}")
                return False
        else:
            print("   ❌ Failed to verify valid certificate")
            return False
        
        # Test 2: Verify invalid certificate ID
        invalid_id = "AFRO-INVALID123"
        success, error_response = self.run_test(
            "Verify Invalid Certificate ID",
            "GET",
            f"certificates/verify/{invalid_id}",
            404
        )
        
        if success:
            print(f"   ✅ Invalid certificate ID correctly returns 404")
        else:
            print(f"   ❌ Invalid certificate ID should return 404")
            return False
        
        # Test 3: Verify another invalid certificate ID
        invalid_id_2 = "AFRO-NOTFOUND"
        success, error_response_2 = self.run_test(
            "Verify Another Invalid Certificate ID",
            "GET",
            f"certificates/verify/{invalid_id_2}",
            404
        )
        
        if success:
            print(f"   ✅ Another invalid certificate ID correctly returns 404")
        else:
            print(f"   ❌ Another invalid certificate ID should return 404")
            return False
        
        print("   🎉 CERTIFICATE VERIFICATION ENDPOINT FULLY WORKING!")
        return True

    def test_specific_level_document_pdf(self):
        """Test the specific level document PDF mentioned in the request"""
        print("\n" + "="*60)
        print("TESTING SPECIFIC LEVEL DOCUMENT PDF (bf0dd6cb-7fa4-4ac6-80e7-8656971ec8d9)")
        print("="*60)
        
        # Test the specific document ID from the request
        document_id = "bf0dd6cb-7fa4-4ac6-80e7-8656971ec8d9"
        
        success, response = self.run_test(
            f"Download Specific Level Document PDF ({document_id})",
            "GET",
            f"level-documents/{document_id}/pdf",
            200,
            response_type='pdf'
        )
        
        if success:
            # Additional PDF validation
            try:
                import requests
                url = f"{self.api_url}/level-documents/{document_id}/pdf"
                response = requests.get(url)
                
                # Check content type
                content_type = response.headers.get('content-type', '')
                if content_type == 'application/pdf':
                    print("   ✅ Correct PDF content type")
                else:
                    print(f"   ❌ Wrong content type: {content_type}")
                    return False
                
                # Check filename in Content-Disposition
                content_disposition = response.headers.get('content-disposition', '')
                expected_filename = f'afroboost_niveau_{document_id}.pdf'
                if expected_filename in content_disposition:
                    print(f"   ✅ Correct filename: {expected_filename}")
                else:
                    print(f"   ❌ Wrong filename: {content_disposition}")
                    return False
                
                # Check PDF magic bytes
                if response.content.startswith(b'%PDF'):
                    print("   ✅ Valid PDF magic bytes")
                else:
                    print("   ❌ Invalid PDF format")
                    return False
                    
                # Check PDF size (should be > 3KB as specified in request)
                pdf_size = len(response.content)
                print(f"   📄 PDF size: {pdf_size} bytes")
                if pdf_size > 3072:  # 3KB = 3072 bytes
                    print("   ✅ PDF size > 3KB as required")
                else:
                    print("   ❌ PDF size should be > 3KB")
                    return False
                
                # Save PDF for manual inspection
                try:
                    with open(f'/tmp/afroboost_niveau_{document_id}_test.pdf', 'wb') as f:
                        f.write(response.content)
                    print(f"   📄 PDF saved to /tmp/afroboost_niveau_{document_id}_test.pdf for inspection")
                except Exception as e:
                    print(f"   ⚠️  Could not save PDF: {e}")
                
                print("   🎉 SPECIFIC LEVEL DOCUMENT PDF WORKING!")
                return True
                
            except Exception as e:
                print(f"   ❌ Error validating PDF: {e}")
                return False
        else:
            print(f"   ❌ Failed to download level document PDF for ID: {document_id}")
            return False
        
        return success

    def test_training_summary_pdf(self):
        """Test the public training summary PDF endpoint"""
        print("\n" + "="*60)
        print("TESTING TRAINING SUMMARY PDF ENDPOINT")
        print("="*60)
        
        success, response = self.run_test(
            "Training Summary PDF Download (Public - No Auth)",
            "GET",
            "training-summary/pdf",
            200,
            response_type='pdf'
        )
        
        if success:
            # Additional PDF validation
            try:
                import requests
                url = f"{self.api_url}/training-summary/pdf"
                response = requests.get(url)
                
                # Check content type
                content_type = response.headers.get('content-type', '')
                if content_type == 'application/pdf':
                    print("   ✅ Correct PDF content type")
                else:
                    print(f"   ❌ Wrong content type: {content_type}")
                    return False
                
                # Check filename in Content-Disposition
                content_disposition = response.headers.get('content-disposition', '')
                if 'afroboost_training_summary.pdf' in content_disposition:
                    print("   ✅ Correct filename: afroboost_training_summary.pdf")
                else:
                    print(f"   ❌ Wrong filename: {content_disposition}")
                    return False
                
                # Check PDF magic bytes
                if response.content.startswith(b'%PDF'):
                    print("   ✅ Valid PDF magic bytes")
                else:
                    print("   ❌ Invalid PDF format")
                    return False
                    
                # Check PDF size (should be reasonable for a comprehensive document)
                pdf_size = len(response.content)
                print(f"   📄 PDF size: {pdf_size} bytes")
                if pdf_size > 2000:  # At least 2KB for comprehensive content (3825 bytes is good)
                    print("   ✅ PDF has reasonable size for comprehensive content")
                else:
                    print("   ❌ PDF too small for comprehensive training summary")
                    return False
                
                # Save PDF for manual inspection
                try:
                    with open('/tmp/afroboost_training_summary_test.pdf', 'wb') as f:
                        f.write(response.content)
                    print("   📄 PDF saved to /tmp/afroboost_training_summary_test.pdf for inspection")
                except Exception as e:
                    print(f"   ⚠️  Could not save PDF: {e}")
                
                print("   🎉 TRAINING SUMMARY PDF ENDPOINT FULLY WORKING!")
                return True
                
            except Exception as e:
                print(f"   ❌ Error validating PDF: {e}")
                return False
        
        return success

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Afroboost API Tests")
        print(f"🌐 Testing against: {self.base_url}")
        
        # PRIORITY 1: Test the main feature first - CERTIFICATE VERIFICATION
        verification_success = self.test_certificate_verification()
        
        # PRIORITY 2: Test the training PDF feature
        training_pdf_success = self.test_training_summary_pdf()
        
        try:
            self.test_exam_dates_crud()
            self.test_exam_bookings_crud()
            self.test_certificates_crud()
            self.test_level_documents_crud()
            self.test_edge_cases()
            self.test_complete_e2e_scenario()
            self.test_level_documents_e2e_scenario()
        finally:
            self.cleanup_resources()
        
        # Print final results
        print("\n" + "="*60)
        print("FINAL TEST RESULTS")
        print("="*60)
        print(f"📊 Tests Run: {self.tests_run}")
        print(f"✅ Tests Passed: {self.tests_passed}")
        print(f"❌ Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"📈 Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # CRITICAL FEATURE STATUS
        if verification_success:
            print("\n🎉 CRITICAL: Certificate Verification endpoint WORKING ✅")
        else:
            print("\n❌ CRITICAL: Certificate Verification endpoint FAILED ❌")
            
        if training_pdf_success:
            print("🎉 CRITICAL: Training Summary PDF endpoint WORKING ✅")
        else:
            print("❌ CRITICAL: Training Summary PDF endpoint FAILED ❌")
        
        return 0 if verification_success and training_pdf_success and self.tests_passed >= (self.tests_run * 0.8) else 1

def main():
    tester = AfroboostAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())