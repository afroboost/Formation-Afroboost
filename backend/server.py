from fastapi import FastAPI, APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.lib import colors

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# =====================
# MODELS
# =====================

class ExamDate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    time: str
    meeting_link: str = ""
    available_slots: int = 10
    booked_slots: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExamDateCreate(BaseModel):
    date: str
    time: str
    meeting_link: str = ""
    available_slots: int = 10

class ExamBooking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    student_name: str
    student_email: str
    exam_date_id: str
    exam_date: str
    exam_time: str
    meeting_link: str = ""
    status: str = "booked"  # booked, completed, cancelled
    result: Optional[str] = None  # passed, failed
    booked_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExamBookingCreate(BaseModel):
    student_id: str
    student_name: str
    student_email: str
    exam_date_id: str

class ExamResult(BaseModel):
    booking_id: str
    result: str  # passed or failed

class Certificate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    certificate_id: str = Field(default_factory=lambda: f"AFRO-{uuid.uuid4().hex[:8].upper()}")
    student_id: str
    student_name: str
    certificate_type: str  # online, in-person, hybrid
    issued_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    exam_booking_id: Optional[str] = None

class CertificateCreate(BaseModel):
    student_id: str
    student_name: str
    certificate_type: str
    exam_booking_id: Optional[str] = None

class LevelDocument(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_id: str = Field(default_factory=lambda: f"LEVEL-{uuid.uuid4().hex[:8].upper()}")
    student_id: str
    student_name: str
    level_name: str
    skills: List[str]
    validated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LevelDocumentCreate(BaseModel):
    student_id: str
    student_name: str
    level_name: str
    skills: List[str]

# =====================
# EXAM DATES ENDPOINTS
# =====================

@api_router.post("/exam-dates", response_model=ExamDate)
async def create_exam_date(input: ExamDateCreate):
    exam_date_dict = input.model_dump()
    exam_date_obj = ExamDate(**exam_date_dict)
    
    doc = exam_date_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.exam_dates.insert_one(doc)
    return exam_date_obj

@api_router.get("/exam-dates", response_model=List[ExamDate])
async def get_exam_dates():
    exam_dates = await db.exam_dates.find({}, {"_id": 0}).to_list(1000)
    
    for exam_date in exam_dates:
        if isinstance(exam_date['created_at'], str):
            exam_date['created_at'] = datetime.fromisoformat(exam_date['created_at'])
    
    return exam_dates

@api_router.delete("/exam-dates/{exam_date_id}")
async def delete_exam_date(exam_date_id: str):
    result = await db.exam_dates.delete_one({"id": exam_date_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Exam date not found")
    return {"message": "Exam date deleted successfully"}

# =====================
# EXAM BOOKINGS ENDPOINTS
# =====================

@api_router.post("/exam-bookings", response_model=ExamBooking)
async def create_exam_booking(input: ExamBookingCreate):
    # Get exam date
    exam_date = await db.exam_dates.find_one({"id": input.exam_date_id}, {"_id": 0})
    if not exam_date:
        raise HTTPException(status_code=404, detail="Exam date not found")
    
    # Check availability
    if exam_date['booked_slots'] >= exam_date['available_slots']:
        raise HTTPException(status_code=400, detail="No available slots")
    
    # Check if student already booked
    existing = await db.exam_bookings.find_one({
        "student_id": input.student_id,
        "exam_date_id": input.exam_date_id,
        "status": "booked"
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already booked for this date")
    
    # Create booking
    booking_dict = input.model_dump()
    booking_dict['exam_date'] = exam_date['date']
    booking_dict['exam_time'] = exam_date['time']
    booking_dict['meeting_link'] = exam_date.get('meeting_link', '')
    
    booking_obj = ExamBooking(**booking_dict)
    
    doc = booking_obj.model_dump()
    doc['booked_at'] = doc['booked_at'].isoformat()
    
    await db.exam_bookings.insert_one(doc)
    
    # Update exam date booked slots
    await db.exam_dates.update_one(
        {"id": input.exam_date_id},
        {"$inc": {"booked_slots": 1}}
    )
    
    return booking_obj

@api_router.get("/exam-bookings", response_model=List[ExamBooking])
async def get_exam_bookings():
    bookings = await db.exam_bookings.find({}, {"_id": 0}).to_list(1000)
    
    for booking in bookings:
        if isinstance(booking['booked_at'], str):
            booking['booked_at'] = datetime.fromisoformat(booking['booked_at'])
    
    return bookings

@api_router.get("/exam-bookings/student/{student_id}", response_model=List[ExamBooking])
async def get_student_bookings(student_id: str):
    bookings = await db.exam_bookings.find({"student_id": student_id}, {"_id": 0}).to_list(1000)
    
    for booking in bookings:
        if isinstance(booking['booked_at'], str):
            booking['booked_at'] = datetime.fromisoformat(booking['booked_at'])
    
    return bookings

@api_router.put("/exam-bookings/{booking_id}/result")
async def update_exam_result(booking_id: str, result: ExamResult):
    booking = await db.exam_bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Update booking
    await db.exam_bookings.update_one(
        {"id": booking_id},
        {"$set": {"result": result.result, "status": "completed"}}
    )
    
    # If passed, create certificate
    if result.result == "passed":
        cert_dict = {
            "student_id": booking['student_id'],
            "student_name": booking['student_name'],
            "certificate_type": "online",  # Default type
            "exam_booking_id": booking_id
        }
        cert = Certificate(**cert_dict)
        cert_doc = cert.model_dump()
        cert_doc['issued_at'] = cert_doc['issued_at'].isoformat()
        await db.certificates.insert_one(cert_doc)
    
    return {"message": "Exam result updated successfully"}

# =====================
# CERTIFICATES ENDPOINTS
# =====================

@api_router.post("/certificates", response_model=Certificate)
async def create_certificate(input: CertificateCreate):
    cert_obj = Certificate(**input.model_dump())
    
    doc = cert_obj.model_dump()
    doc['issued_at'] = doc['issued_at'].isoformat()
    
    await db.certificates.insert_one(doc)
    return cert_obj

@api_router.get("/certificates/student/{student_id}", response_model=List[Certificate])
async def get_student_certificates(student_id: str):
    certificates = await db.certificates.find({"student_id": student_id}, {"_id": 0}).to_list(1000)
    
    for cert in certificates:
        if isinstance(cert['issued_at'], str):
            cert['issued_at'] = datetime.fromisoformat(cert['issued_at'])
    
    return certificates

@api_router.get("/certificates/{certificate_id}/pdf")
async def download_certificate_pdf(certificate_id: str):
    cert = await db.certificates.find_one({"id": certificate_id}, {"_id": 0})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    # Generate PDF
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # Background - Deep Black
    c.setFillColor(colors.HexColor('#0a0a0a'))
    c.rect(0, 0, width, height, fill=True, stroke=False)
    
    # Neon Purple border
    c.setStrokeColor(colors.HexColor('#a855f7'))
    c.setLineWidth(3)
    c.rect(2*cm, 2*cm, width - 4*cm, height - 4*cm, fill=False, stroke=True)
    
    # Inner border glow effect
    c.setStrokeColor(colors.HexColor('#c084fc'))
    c.setLineWidth(1)
    c.rect(2.2*cm, 2.2*cm, width - 4.4*cm, height - 4.4*cm, fill=False, stroke=True)
    
    # Title - AFROBOOST in neon purple
    c.setFillColor(colors.HexColor('#a855f7'))
    c.setFont("Helvetica-Bold", 48)
    c.drawCentredString(width/2, height - 5*cm, "AFROBOOST")
    
    # Subtitle
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 32)
    c.drawCentredString(width/2, height - 7*cm, "CERTIFICATION OFFICIELLE")
    
    # Certificate type
    cert_type_text = {
        "online": "INSTRUCTEUR EN LIGNE",
        "in-person": "INSTRUCTEUR EN PRÉSENTIEL",
        "hybrid": "INSTRUCTEUR HYBRIDE"
    }
    c.setFillColor(colors.HexColor('#c084fc'))
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(width/2, height - 9*cm, cert_type_text.get(cert['certificate_type'], 'INSTRUCTEUR'))
    
    # Instructor name
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 36)
    c.drawCentredString(width/2, height - 12*cm, cert['student_name'].upper())
    
    # Description based on type
    cert_desc = {
        "online": "Autorisé à enseigner Afroboost en ligne.",
        "in-person": "Autorisé à enseigner Afroboost en présentiel.",
        "hybrid": "Autorisé à enseigner Afroboost en ligne et en présentiel."
    }
    c.setFillColor(colors.HexColor('#e5e5e5'))
    c.setFont("Helvetica", 16)
    c.drawCentredString(width/2, height - 14*cm, cert_desc.get(cert['certificate_type'], ''))
    
    # Certificate details
    c.setFillColor(colors.HexColor('#a855f7'))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(4*cm, 6*cm, f"ID CERTIFICAT: {cert['certificate_id']}")
    
    issued_date = cert['issued_at']
    if isinstance(issued_date, str):
        issued_date = datetime.fromisoformat(issued_date)
    c.drawString(4*cm, 5*cm, f"DATE D'ÉMISSION: {issued_date.strftime('%d/%m/%Y')}")
    
    # Footer
    c.setFillColor(colors.HexColor('#71717a'))
    c.setFont("Helvetica-Oblique", 10)
    c.drawCentredString(width/2, 3*cm, "Certification Officielle Afroboost – Vérifiable")
    
    c.save()
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=afroboost_certificate_{cert['certificate_id']}.pdf"
        }
    )

# =====================
# LEVEL DOCUMENTS ENDPOINTS
# =====================

@api_router.post("/level-documents", response_model=LevelDocument)
async def create_level_document(input: LevelDocumentCreate):
    doc_obj = LevelDocument(**input.model_dump())
    
    doc = doc_obj.model_dump()
    doc['validated_at'] = doc['validated_at'].isoformat()
    
    await db.level_documents.insert_one(doc)
    return doc_obj

@api_router.get("/level-documents/student/{student_id}", response_model=List[LevelDocument])
async def get_student_level_documents(student_id: str):
    documents = await db.level_documents.find({"student_id": student_id}, {"_id": 0}).to_list(1000)
    
    for doc in documents:
        if isinstance(doc['validated_at'], str):
            doc['validated_at'] = datetime.fromisoformat(doc['validated_at'])
    
    return documents

@api_router.get("/level-documents/{document_id}/pdf")
async def download_level_document_pdf(document_id: str):
    doc = await db.level_documents.find_one({"id": document_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Level document not found")
    
    # Generate PDF
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # Background - Deep Black
    c.setFillColor(colors.HexColor('#0a0a0a'))
    c.rect(0, 0, width, height, fill=True, stroke=False)
    
    # Neon Purple border
    c.setStrokeColor(colors.HexColor('#a855f7'))
    c.setLineWidth(3)
    c.rect(2*cm, 2*cm, width - 4*cm, height - 4*cm, fill=False, stroke=True)
    
    # Inner border glow effect
    c.setStrokeColor(colors.HexColor('#c084fc'))
    c.setLineWidth(1)
    c.rect(2.2*cm, 2.2*cm, width - 4.4*cm, height - 4.4*cm, fill=False, stroke=True)
    
    # Title - AFROBOOST in neon purple
    c.setFillColor(colors.HexColor('#a855f7'))
    c.setFont("Helvetica-Bold", 48)
    c.drawCentredString(width/2, height - 5*cm, "AFROBOOST")
    
    # Document type
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 28)
    c.drawCentredString(width/2, height - 7*cm, "DOCUMENT DE VALIDATION DE NIVEAU")
    
    # Level name
    c.setFillColor(colors.HexColor('#c084fc'))
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(width/2, height - 9.5*cm, doc['level_name'].upper())
    
    # Student name
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 32)
    c.drawCentredString(width/2, height - 12*cm, doc['student_name'].upper())
    
    # Statement
    c.setFillColor(colors.HexColor('#e5e5e5'))
    c.setFont("Helvetica", 14)
    c.drawCentredString(width/2, height - 14*cm, "Ce document certifie que le niveau ci-dessus a été")
    c.drawCentredString(width/2, height - 14.7*cm, "validé avec succès.")
    
    # Skills validated title
    c.setFillColor(colors.HexColor('#a855f7'))
    c.setFont("Helvetica-Bold", 16)
    c.drawString(4*cm, height - 17*cm, "COMPÉTENCES VALIDÉES:")
    
    # Skills list
    c.setFillColor(colors.white)
    c.setFont("Helvetica", 12)
    y_position = height - 18.5*cm
    for skill in doc['skills']:
        c.drawString(4.5*cm, y_position, f"• {skill}")
        y_position -= 0.6*cm
        if y_position < 8*cm:  # Prevent overflow
            break
    
    # Document details
    c.setFillColor(colors.HexColor('#a855f7'))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(4*cm, 6*cm, f"ID DOCUMENT: {doc['document_id']}")
    c.drawString(4*cm, 5.3*cm, f"ID ÉTUDIANT: {doc['student_id']}")
    
    validated_date = doc['validated_at']
    if isinstance(validated_date, str):
        validated_date = datetime.fromisoformat(validated_date)
    c.drawString(4*cm, 4.6*cm, f"DATE DE VALIDATION: {validated_date.strftime('%d/%m/%Y')}")
    
    # Footer
    c.setFillColor(colors.HexColor('#71717a'))
    c.setFont("Helvetica-Oblique", 10)
    c.drawCentredString(width/2, 3*cm, "Formation Officielle Afroboost – Imprimable & Vérifiable")
    
    c.save()
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=afroboost_level_{doc['document_id']}.pdf"
        }
    )

# =====================
# TRAINING SUMMARY PDF (PUBLIC - NO AUTH)
# =====================

@api_router.get("/training-summary/pdf")
async def download_training_summary_pdf():
    """
    Public endpoint - generates comprehensive training overview PDF
    No authentication required
    """
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # Background - Deep Black
    c.setFillColor(colors.HexColor('#0a0a0a'))
    c.rect(0, 0, width, height, fill=True, stroke=False)
    
    # Neon Purple border
    c.setStrokeColor(colors.HexColor('#a855f7'))
    c.setLineWidth(3)
    c.rect(2*cm, 2*cm, width - 4*cm, height - 4*cm, fill=False, stroke=True)
    
    # Inner border glow effect
    c.setStrokeColor(colors.HexColor('#c084fc'))
    c.setLineWidth(1)
    c.rect(2.2*cm, 2.2*cm, width - 4.4*cm, height - 4.4*cm, fill=False, stroke=True)
    
    # Title - AFROBOOST
    c.setFillColor(colors.HexColor('#a855f7'))
    c.setFont("Helvetica-Bold", 42)
    c.drawCentredString(width/2, height - 4.5*cm, "AFROBOOST")
    
    # Subtitle
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(width/2, height - 6*cm, "Certification Instructeur")
    
    c.setFont("Helvetica", 16)
    c.drawCentredString(width/2, height - 7*cm, "Vue d'Ensemble du Programme Complet")
    
    # Section: What is Afroboost
    y_pos = height - 9*cm
    c.setFillColor(colors.HexColor('#a855f7'))
    c.setFont("Helvetica-Bold", 14)
    c.drawString(3*cm, y_pos, "QU'EST-CE QU'AFROBOOST ?")
    
    y_pos -= 0.8*cm
    c.setFillColor(colors.white)
    c.setFont("Helvetica", 11)
    text = "Afroboost est une méthode de danse énergique inspirée des rythmes afrobeat,"
    c.drawString(3*cm, y_pos, text)
    y_pos -= 0.5*cm
    text = "combinant fitness, expression corporelle et culture africaine contemporaine."
    c.drawString(3*cm, y_pos, text)
    
    # Section: Training Objectives
    y_pos -= 1.2*cm
    c.setFillColor(colors.HexColor('#a855f7'))
    c.setFont("Helvetica-Bold", 14)
    c.drawString(3*cm, y_pos, "OBJECTIFS DE LA FORMATION")
    
    y_pos -= 0.8*cm
    c.setFillColor(colors.white)
    c.setFont("Helvetica", 11)
    objectives = [
        "• Maîtriser la technique et la pédagogie Afroboost",
        "• Développer votre style personnel et votre présence scénique",
        "• Apprendre à enseigner et animer des cours de qualité",
        "• Obtenir une certification officielle reconnue"
    ]
    for obj in objectives:
        c.drawString(3.5*cm, y_pos, obj)
        y_pos -= 0.6*cm
    
    # Section: Full Module List
    y_pos -= 0.8*cm
    c.setFillColor(colors.HexColor('#a855f7'))
    c.setFont("Helvetica-Bold", 14)
    c.drawString(3*cm, y_pos, "PARCOURS DE FORMATION COMPLET")
    
    y_pos -= 0.8*cm
    c.setFillColor(colors.HexColor('#c084fc'))
    c.setFont("Helvetica-Bold", 11)
    
    modules = [
        ("Level 1 – Afroboost DNA", "Fondamentaux: mouvements de base, rythme et coordination"),
        ("Level 2 – Rhythm Foundation", "Variations rythmiques, transitions et musicalité avancée"),
        ("Level 3 – Style & Flow", "Expression personnelle, improvisation et performance"),
        ("Level 4 – Teaching Fundamentals", "Pédagogie, communication et structuration de cours"),
        ("Level 5 – Master Instructor", "Chorégraphies originales, mentorat et leadership")
    ]
    
    for module_name, description in modules:
        c.setFillColor(colors.HexColor('#c084fc'))
        c.setFont("Helvetica-Bold", 11)
        c.drawString(3.5*cm, y_pos, module_name)
        y_pos -= 0.5*cm
        c.setFillColor(colors.white)
        c.setFont("Helvetica", 9)
        c.drawString(3.8*cm, y_pos, description)
        y_pos -= 0.8*cm
    
    # Section: Certification Paths
    y_pos -= 0.6*cm
    c.setFillColor(colors.HexColor('#a855f7'))
    c.setFont("Helvetica-Bold", 14)
    c.drawString(3*cm, y_pos, "PARCOURS DE CERTIFICATION")
    
    y_pos -= 0.8*cm
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 11)
    
    paths = [
        ("🌐 CERTIFICATION EN LIGNE", "Autorisé à enseigner Afroboost en ligne"),
        ("🏢 CERTIFICATION PRÉSENTIEL", "Autorisé à enseigner Afroboost en présentiel"),
        ("🌟 CERTIFICATION HYBRIDE", "Autorisé à enseigner Afroboost en ligne et présentiel")
    ]
    
    for path_name, path_desc in paths:
        c.setFont("Helvetica-Bold", 11)
        c.drawString(3.5*cm, y_pos, path_name)
        y_pos -= 0.5*cm
        c.setFont("Helvetica", 9)
        c.drawString(3.8*cm, y_pos, path_desc)
        y_pos -= 0.8*cm
    
    # Section: Rights After Certification
    y_pos -= 0.6*cm
    c.setFillColor(colors.HexColor('#a855f7'))
    c.setFont("Helvetica-Bold", 14)
    c.drawString(3*cm, y_pos, "DROITS APRÈS CERTIFICATION")
    
    y_pos -= 0.8*cm
    c.setFillColor(colors.white)
    c.setFont("Helvetica", 11)
    rights = [
        "• Utiliser le titre d'Instructeur Certifié Afroboost",
        "• Enseigner la méthode Afroboost selon votre certification",
        "• Accès à la communauté des instructeurs certifiés",
        "• Diplômes officiels imprimables et vérifiables"
    ]
    for right in rights:
        c.drawString(3.5*cm, y_pos, right)
        y_pos -= 0.6*cm
    
    # Important Notice Box
    y_pos -= 1*cm
    c.setStrokeColor(colors.HexColor('#a855f7'))
    c.setFillColor(colors.HexColor('#1a0a2e'))
    c.roundRect(3*cm, y_pos - 1.5*cm, width - 6*cm, 1.8*cm, 0.2*cm, fill=True, stroke=True)
    
    c.setFillColor(colors.HexColor('#fbbf24'))
    c.setFont("Helvetica-Bold", 10)
    c.drawString(3.5*cm, y_pos - 0.5*cm, "⚠️ AVIS IMPORTANT")
    
    c.setFillColor(colors.white)
    c.setFont("Helvetica", 9)
    c.drawString(3.5*cm, y_pos - 0.9*cm, "Ce document est officiel et imprimable.")
    c.drawString(3.5*cm, y_pos - 1.2*cm, "Il ne confère pas de certification. La certification s'obtient après validation.")
    
    # Footer
    c.setFillColor(colors.HexColor('#71717a'))
    c.setFont("Helvetica-Oblique", 10)
    c.drawCentredString(width/2, 2.8*cm, "Programme de Formation Afroboost – Document Officiel")
    c.setFont("Helvetica", 8)
    c.drawCentredString(width/2, 2.3*cm, "Pour plus d'informations: afroboost.com")
    
    c.save()
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=afroboost_training_summary.pdf"
        }
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
