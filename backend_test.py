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

    def test_level_content_crud(self):
        """Test CRUD operations for level content - NEW TRAINING SYSTEM"""
        print("\n" + "="*60)
        print("TESTING LEVEL CONTENT ENDPOINTS - NEW TRAINING SYSTEM")
        print("="*60)
        
        # Test 1: GET empty level content
        success, empty_content = self.run_test(
            "Get Level Content (Empty)",
            "GET",
            "level-content/level-1",
            200
        )
        
        if success and empty_content:
            print(f"   ✅ Empty content structure: {empty_content}")
        
        # Test 2: CREATE level content
        level_content_data = {
            "level_id": "level-1",
            "level_name": "Level 1 – Afroboost DNA",
            "videos": [
                {
                    "title": "Introduction aux mouvements de base",
                    "url": "https://youtube.com/watch?v=test1",
                    "duration": "10:30"
                },
                {
                    "title": "Rythme et coordination",
                    "url": "https://youtube.com/watch?v=test2",
                    "duration": "8:45"
                }
            ],
            "text_content": "Bienvenue dans le Level 1 d'Afroboost. Ce niveau couvre les fondamentaux...",
            "live_required": False,
            "live_sessions": []
        }
        
        success, created_content = self.run_test(
            "Create Level Content",
            "POST",
            "level-content",
            200,
            level_content_data
        )
        
        if not success:
            print("❌ Cannot continue level content tests without creation")
            return False
        
        # Test 3: GET created level content
        success, retrieved_content = self.run_test(
            "Get Created Level Content",
            "GET",
            "level-content/level-1",
            200
        )
        
        if success and retrieved_content:
            # Validate structure
            required_fields = ['level_id', 'level_name', 'videos', 'text_content', 'live_required', 'live_sessions']
            missing_fields = [field for field in required_fields if field not in retrieved_content]
            
            if not missing_fields:
                print("   ✅ All required fields present in level content")
                
                # Validate videos structure
                if len(retrieved_content['videos']) == 2:
                    print("   ✅ Correct number of videos")
                    for i, video in enumerate(retrieved_content['videos']):
                        if 'id' in video and 'title' in video and 'url' in video:
                            print(f"   ✅ Video {i+1} has correct structure")
                        else:
                            print(f"   ❌ Video {i+1} missing required fields")
                else:
                    print(f"   ❌ Expected 2 videos, got {len(retrieved_content['videos'])}")
            else:
                print(f"   ❌ Missing required fields: {missing_fields}")
                return False
        
        # Test 4: UPDATE level content (should update existing)
        updated_content_data = {
            "level_id": "level-1",
            "level_name": "Level 1 – Afroboost DNA (Updated)",
            "videos": [
                {
                    "title": "Introduction aux mouvements de base (Updated)",
                    "url": "https://youtube.com/watch?v=test1-updated",
                    "duration": "12:00"
                }
            ],
            "text_content": "Contenu mis à jour pour le Level 1...",
            "live_required": True,
            "live_sessions": [
                {
                    "date": "2025-02-20",
                    "time": "18:00",
                    "meeting_link": "https://meet.google.com/level1-live",
                    "available_slots": 15,
                    "booked_count": 0
                }
            ]
        }
        
        success, updated_content = self.run_test(
            "Update Level Content",
            "POST",
            "level-content",
            200,
            updated_content_data
        )
        
        if success:
            print("   ✅ Level content updated successfully")
        
        # Test 5: GET all level content
        success, all_content = self.run_test(
            "Get All Level Content",
            "GET",
            "level-content",
            200
        )
        
        if success and all_content:
            print(f"   ✅ Found {len(all_content)} level content entries")
        
        return True

    def test_level_progress_crud(self):
        """Test CRUD operations for level progress - NEW TRAINING SYSTEM"""
        print("\n" + "="*60)
        print("TESTING LEVEL PROGRESS ENDPOINTS - NEW TRAINING SYSTEM")
        print("="*60)
        
        user_id = "TEST_FLOW_001"
        level_id = "level-1"
        
        # Test 1: GET empty progress
        success, empty_progress = self.run_test(
            "Get Level Progress (Empty)",
            "GET",
            f"level-progress/{user_id}/{level_id}",
            200
        )
        
        if success and empty_progress:
            print(f"   ✅ Empty progress structure: {empty_progress}")
        
        # Test 2: UPDATE progress - mark video completed
        video_progress_data = {
            "user_id": user_id,
            "level_id": level_id,
            "video_id": "video-1"
        }
        
        success, video_progress = self.run_test(
            "Update Progress - Video Completed",
            "POST",
            "level-progress",
            200,
            video_progress_data
        )
        
        if success and video_progress:
            if "video-1" in video_progress.get('videos_completed', []):
                print("   ✅ Video marked as completed")
            else:
                print("   ❌ Video not marked as completed")
                return False
        
        # Test 3: UPDATE progress - confirm text read
        text_progress_data = {
            "user_id": user_id,
            "level_id": level_id,
            "text_confirmed": True
        }
        
        success, text_progress = self.run_test(
            "Update Progress - Text Confirmed",
            "POST",
            "level-progress",
            200,
            text_progress_data
        )
        
        if success and text_progress:
            if text_progress.get('text_confirmed') == True:
                print("   ✅ Text marked as confirmed")
            else:
                print("   ❌ Text not marked as confirmed")
                return False
        
        # Test 4: GET updated progress
        success, updated_progress = self.run_test(
            "Get Updated Level Progress",
            "GET",
            f"level-progress/{user_id}/{level_id}",
            200
        )
        
        if success and updated_progress:
            # Validate progress structure
            required_fields = ['user_id', 'level_id', 'videos_completed', 'text_confirmed']
            missing_fields = [field for field in required_fields if field not in updated_progress]
            
            if not missing_fields:
                print("   ✅ All required fields present in progress")
                
                # Check values
                if "video-1" in updated_progress.get('videos_completed', []):
                    print("   ✅ Video completion persisted")
                else:
                    print("   ❌ Video completion not persisted")
                    
                if updated_progress.get('text_confirmed') == True:
                    print("   ✅ Text confirmation persisted")
                else:
                    print("   ❌ Text confirmation not persisted")
            else:
                print(f"   ❌ Missing required fields: {missing_fields}")
                return False
        
        # Test 5: GET all user progress
        success, all_progress = self.run_test(
            "Get All User Progress",
            "GET",
            f"level-progress/{user_id}",
            200
        )
        
        if success and all_progress:
            print(f"   ✅ Found {len(all_progress)} progress entries for user")
        
        return True

    def test_level_unlock_check(self):
        """Test level unlock check functionality - CORE TRAINING SYSTEM"""
        print("\n" + "="*60)
        print("TESTING LEVEL UNLOCK CHECK - CORE TRAINING SYSTEM")
        print("="*60)
        
        user_id = "TEST_UNLOCK_001"
        level_id = "level-1"
        
        # Test 1: Check unlock with no content (should be unlocked)
        success, unlock_result = self.run_test(
            "Check Unlock - No Content",
            "GET",
            f"level-progress/check-unlock/{user_id}/{level_id}",
            200
        )
        
        if success and unlock_result:
            if unlock_result.get('unlocked') == True and unlock_result.get('reason') == 'no_content':
                print("   ✅ Level unlocked when no content exists")
            else:
                print(f"   ❌ Expected unlocked=True with reason=no_content, got: {unlock_result}")
        
        # Test 2: Create level content first
        level_content_data = {
            "level_id": level_id,
            "level_name": "Level 1 – Test Unlock",
            "videos": [
                {
                    "title": "Test Video 1",
                    "url": "https://youtube.com/watch?v=test1"
                },
                {
                    "title": "Test Video 2", 
                    "url": "https://youtube.com/watch?v=test2"
                }
            ],
            "text_content": "Test content for unlock check",
            "live_required": False,
            "live_sessions": []
        }
        
        success, created_content = self.run_test(
            "Create Content for Unlock Test",
            "POST",
            "level-content",
            200,
            level_content_data
        )
        
        if not success:
            print("❌ Cannot test unlock without content")
            return False
        
        # Test 3: Check unlock with content but no progress (should be locked)
        success, locked_result = self.run_test(
            "Check Unlock - Content Exists, No Progress",
            "GET",
            f"level-progress/check-unlock/{user_id}/{level_id}",
            200
        )
        
        if success and locked_result:
            if locked_result.get('unlocked') == False:
                print("   ✅ Level locked when content exists but no progress")
                print(f"   📊 Progress details: {locked_result}")
            else:
                print(f"   ❌ Expected unlocked=False, got: {locked_result}")
        
        # Test 4: Complete partial progress
        # Complete only 1 video
        video1_progress = {
            "user_id": user_id,
            "level_id": level_id,
            "video_id": created_content['videos'][0]['id']
        }
        
        success, _ = self.run_test(
            "Complete First Video",
            "POST",
            "level-progress",
            200,
            video1_progress
        )
        
        # Check unlock (should still be locked)
        success, partial_result = self.run_test(
            "Check Unlock - Partial Progress",
            "GET",
            f"level-progress/check-unlock/{user_id}/{level_id}",
            200
        )
        
        if success and partial_result:
            if partial_result.get('unlocked') == False:
                print("   ✅ Level still locked with partial progress")
                print(f"   📊 Partial progress: {partial_result}")
            else:
                print(f"   ❌ Expected unlocked=False with partial progress, got: {partial_result}")
        
        # Test 5: Complete all requirements
        # Complete second video
        video2_progress = {
            "user_id": user_id,
            "level_id": level_id,
            "video_id": created_content['videos'][1]['id']
        }
        
        success, _ = self.run_test(
            "Complete Second Video",
            "POST",
            "level-progress",
            200,
            video2_progress
        )
        
        # Confirm text
        text_progress = {
            "user_id": user_id,
            "level_id": level_id,
            "text_confirmed": True
        }
        
        success, _ = self.run_test(
            "Confirm Text Read",
            "POST",
            "level-progress",
            200,
            text_progress
        )
        
        # Check unlock (should now be unlocked)
        success, unlocked_result = self.run_test(
            "Check Unlock - All Requirements Met",
            "GET",
            f"level-progress/check-unlock/{user_id}/{level_id}",
            200
        )
        
        if success and unlocked_result:
            if unlocked_result.get('unlocked') == True:
                print("   ✅ Level unlocked when all requirements met")
                print(f"   🎉 Final unlock status: {unlocked_result}")
                
                # Validate detailed progress
                if unlocked_result.get('videos_done') == True:
                    print("   ✅ Videos requirement met")
                if unlocked_result.get('text_done') == True:
                    print("   ✅ Text requirement met")
                if unlocked_result.get('live_done') == True:
                    print("   ✅ Live requirement met (not required)")
                    
                return True
            else:
                print(f"   ❌ Expected unlocked=True when all requirements met, got: {unlocked_result}")
                return False
        
        return False

    def test_complete_training_flow_e2e(self):
        """Test complete training flow end-to-end - MAIN FEATURE"""
        print("\n" + "="*60)
        print("TESTING COMPLETE TRAINING FLOW E2E - MAIN FEATURE")
        print("="*60)
        
        user_id = "TEST_E2E_FLOW"
        level_id = "level-1"
        
        # Step 1: Admin creates level content
        print("\n📝 STEP 1: Admin creates level content")
        level_content_data = {
            "level_id": level_id,
            "level_name": "Level 1 – Afroboost DNA",
            "videos": [
                {
                    "title": "Mouvements de base Afrobeat",
                    "url": "https://youtube.com/watch?v=afrobeat-basics",
                    "duration": "15:30"
                },
                {
                    "title": "Coordination et rythme",
                    "url": "https://youtube.com/watch?v=coordination",
                    "duration": "12:45"
                }
            ],
            "text_content": "Bienvenue dans le Level 1 d'Afroboost. Ce niveau vous enseigne les fondamentaux de la danse Afrobeat...",
            "live_required": False,
            "live_sessions": []
        }
        
        success, content = self.run_test(
            "E2E: Admin Creates Level Content",
            "POST",
            "level-content",
            200,
            level_content_data
        )
        
        if not success:
            print("❌ E2E test failed at content creation")
            return False
        
        print(f"   ✅ Content created with {len(content['videos'])} videos")
        
        # Step 2: Student checks initial unlock status (should be locked)
        print("\n🔒 STEP 2: Student checks initial unlock status")
        success, initial_unlock = self.run_test(
            "E2E: Check Initial Unlock Status",
            "GET",
            f"level-progress/check-unlock/{user_id}/{level_id}",
            200
        )
        
        if success and initial_unlock:
            if initial_unlock.get('unlocked') == False:
                print("   ✅ Level initially locked (correct)")
            else:
                print(f"   ❌ Level should be initially locked, got: {initial_unlock}")
        
        # Step 3: Student completes training progressively
        print("\n📚 STEP 3: Student completes training")
        
        # Complete first video
        success, _ = self.run_test(
            "E2E: Complete Video 1",
            "POST",
            "level-progress",
            200,
            {
                "user_id": user_id,
                "level_id": level_id,
                "video_id": content['videos'][0]['id']
            }
        )
        
        # Check progress after first video
        success, progress_1 = self.run_test(
            "E2E: Check Progress After Video 1",
            "GET",
            f"level-progress/{user_id}/{level_id}",
            200
        )
        
        if success and progress_1:
            print(f"   📊 Progress after video 1: {len(progress_1.get('videos_completed', []))}/2 videos")
        
        # Complete second video
        success, _ = self.run_test(
            "E2E: Complete Video 2",
            "POST",
            "level-progress",
            200,
            {
                "user_id": user_id,
                "level_id": level_id,
                "video_id": content['videos'][1]['id']
            }
        )
        
        # Confirm text read
        success, _ = self.run_test(
            "E2E: Confirm Text Read",
            "POST",
            "level-progress",
            200,
            {
                "user_id": user_id,
                "level_id": level_id,
                "text_confirmed": True
            }
        )
        
        # Step 4: Check final unlock status (should be unlocked)
        print("\n🔓 STEP 4: Check final unlock status")
        success, final_unlock = self.run_test(
            "E2E: Check Final Unlock Status",
            "GET",
            f"level-progress/check-unlock/{user_id}/{level_id}",
            200
        )
        
        if success and final_unlock:
            if final_unlock.get('unlocked') == True:
                print("   🎉 Level successfully unlocked after completing training!")
                print(f"   📊 Final status: {final_unlock}")
                
                # Step 5: Student can now validate level (simulate level document creation)
                print("\n🏆 STEP 5: Student validates level")
                level_doc_data = {
                    "student_id": user_id,
                    "student_name": "Test E2E Student",
                    "level_name": content['level_name'],
                    "skills": [
                        "Maîtrise des mouvements de base Afrobeat",
                        "Compréhension du rythme et de la musicalité",
                        "Technique d'isolation corporelle",
                        "Coordination bras-jambes fondamentale"
                    ]
                }
                
                success, level_doc = self.run_test(
                    "E2E: Create Level Document (Validation)",
                    "POST",
                    "level-documents",
                    200,
                    level_doc_data
                )
                
                if success and level_doc:
                    print(f"   🎉 Level document created: {level_doc['document_id']}")
                    
                    # Test PDF generation
                    success, _ = self.run_test(
                        "E2E: Generate Level Document PDF",
                        "GET",
                        f"level-documents/{level_doc['id']}/pdf",
                        200,
                        response_type='blob'
                    )
                    
                    if success:
                        print("   📄 Level document PDF generated successfully")
                        print("   🎉 COMPLETE TRAINING FLOW E2E TEST PASSED!")
                        return True
                    else:
                        print("   ❌ Failed to generate level document PDF")
                        return False
                else:
                    print("   ❌ Failed to create level document")
                    return False
            else:
                print(f"   ❌ Level should be unlocked after training, got: {final_unlock}")
                return False
        
        return False

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Afroboost API Tests - TRAINING SYSTEM FOCUS")
        print(f"🌐 Testing against: {self.base_url}")
        
        # PRIORITY 1: Test NEW TRAINING SYSTEM - Level Content & Progress
        print("\n🎯 PRIORITY 1: TESTING NEW TRAINING SYSTEM")
        level_content_success = self.test_level_content_crud()
        level_progress_success = self.test_level_progress_crud()
        unlock_check_success = self.test_level_unlock_check()
        training_flow_success = self.test_complete_training_flow_e2e()
        
        # PRIORITY 2: Test existing features
        print("\n🎯 PRIORITY 2: TESTING EXISTING FEATURES")
        specific_level_pdf_success = self.test_specific_level_document_pdf()
        verification_success = self.test_certificate_verification()
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
        print("FINAL TEST RESULTS - TRAINING SYSTEM FOCUS")
        print("="*60)
        print(f"📊 Tests Run: {self.tests_run}")
        print(f"✅ Tests Passed: {self.tests_passed}")
        print(f"❌ Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"📈 Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # NEW TRAINING SYSTEM STATUS
        print("\n🎯 NEW TRAINING SYSTEM STATUS:")
        if level_content_success:
            print("✅ Level Content CRUD: WORKING")
        else:
            print("❌ Level Content CRUD: FAILED")
            
        if level_progress_success:
            print("✅ Level Progress Tracking: WORKING")
        else:
            print("❌ Level Progress Tracking: FAILED")
            
        if unlock_check_success:
            print("✅ Level Unlock Check: WORKING")
        else:
            print("❌ Level Unlock Check: FAILED")
            
        if training_flow_success:
            print("✅ Complete Training Flow E2E: WORKING")
        else:
            print("❌ Complete Training Flow E2E: FAILED")
        
        # EXISTING FEATURES STATUS
        print("\n🎯 EXISTING FEATURES STATUS:")
        if specific_level_pdf_success:
            print("✅ Level Document PDF: WORKING")
        else:
            print("❌ Level Document PDF: FAILED")
            
        if verification_success:
            print("✅ Certificate Verification: WORKING")
        else:
            print("❌ Certificate Verification: FAILED")
            
        if training_pdf_success:
            print("✅ Training Summary PDF: WORKING")
        else:
            print("❌ Training Summary PDF: FAILED")
        
        # Overall success criteria
        training_system_working = level_content_success and level_progress_success and unlock_check_success and training_flow_success
        existing_features_working = specific_level_pdf_success and verification_success and training_pdf_success
        
        if training_system_working:
            print("\n🎉 NEW TRAINING SYSTEM: FULLY FUNCTIONAL ✅")
        else:
            print("\n❌ NEW TRAINING SYSTEM: HAS ISSUES ❌")
        
        return 0 if training_system_working and self.tests_passed >= (self.tests_run * 0.8) else 1

def main():
    tester = AfroboostAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())