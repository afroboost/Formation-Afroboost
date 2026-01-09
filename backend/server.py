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

class Video(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    url: str
    duration: Optional[str] = None  # Format: "10:30"

class LiveSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    time: str
    meeting_link: str
    available_slots: int = 10
    booked_count: int = 0

class LevelContent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    level_id: str  # e.g., "level-1"
    level_name: str
    videos: List[Video] = []
    text_content: str = ""
    live_required: bool = False
    live_sessions: List[LiveSession] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LevelContentCreate(BaseModel):
    level_id: str
    level_name: str
    videos: List[Video] = []
    text_content: str = ""
    live_required: bool = False
    live_sessions: List[LiveSession] = []

class UserLevelProgress(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    level_id: str
    videos_completed: List[str] = []  # List of video IDs
    text_confirmed: bool = False
    live_booked_id: Optional[str] = None
    live_attended: bool = False
    payment_status: str = "pending"  # pending, validated, not_required
    volunteer_status: str = "pending"  # pending, validated, rejected, not_applicable
    access_granted: bool = False
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProgressUpdate(BaseModel):
    user_id: str
    level_id: str
    video_id: Optional[str] = None
    text_confirmed: Optional[bool] = None
    live_booked_id: Optional[str] = None
    live_attended: Optional[bool] = None
    payment_status: Optional[str] = None
    volunteer_status: Optional[str] = None
    access_granted: Optional[bool] = None

class LevelAccessRequest(BaseModel):
    user_id: str
    level_id: str
    request_type: str  # "payment" or "volunteer"

class AdminAuth(BaseModel):
    admin_secret_id: str

class AdminRecovery(BaseModel):
    email: str

# Hardcoded admin secret (in production, use env variable)
ADMIN_SECRET_ID = os.environ.get('ADMIN_SECRET_ID', 'AFRO-ADMIN-2025')

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

@api_router.get("/certificates/verify/{certificate_id}")
async def verify_certificate(certificate_id: str):
    """
    Public endpoint - verify certificate validity by certificate_id
    Returns public certificate info without sensitive data
    """
    # Search by certificate_id field (not internal id)
    cert = await db.certificates.find_one({"certificate_id": certificate_id}, {"_id": 0})
    
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found or invalid")
    
    # Return only public information
    issued_date = cert['issued_at']
    if isinstance(issued_date, str):
        issued_date = datetime.fromisoformat(issued_date)
    
    return {
        "valid": True,
        "certificate_id": cert['certificate_id'],
        "student_name": cert['student_name'],
        "certificate_type": cert['certificate_type'],
        "issued_at": issued_date.strftime('%d/%m/%Y'),
        "status": "VALID"
    }

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
    
    # Fix grammar in skills automatically
    def fix_skill_grammar(skill):
        # Fix common French grammar issues
        skill = skill.replace("de isolation", "d'isolation")
        skill = skill.replace("de improvisation", "d'improvisation")
        skill = skill.replace("de élèves", "d'élèves")
        return skill
    
    # Convert English level names to French for PDF
    level_name_fr = doc['level_name']
    level_name_fr = level_name_fr.replace("Level 1 – Afroboost DNA", "Niveau 1 — Afroboost DNA")
    level_name_fr = level_name_fr.replace("Level 2 – Rhythm Foundation", "Niveau 2 — Rhythm Foundation")
    level_name_fr = level_name_fr.replace("Level 3 – Style & Flow", "Niveau 3 — Style & Flow")
    level_name_fr = level_name_fr.replace("Level 4 – Teaching Fundamentals", "Niveau 4 — Teaching Fundamentals")
    level_name_fr = level_name_fr.replace("Level 5 – Master Instructor", "Niveau 5 — Master Instructor")
    
    # Generate PDF with white background for better printability
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # White background for print readability
    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, fill=True, stroke=False)
    
    # Header rectangle with neon purple gradient effect
    c.setFillColor(colors.HexColor('#a855f7'))
    c.rect(0, height - 6*cm, width, 6*cm, fill=True, stroke=False)
    
    # Lighter purple overlay for gradient effect (using different shade)
    c.setFillColor(colors.HexColor('#c084fc'))
    c.rect(0, height - 6*cm, width, 3*cm, fill=True, stroke=False)
    
    # Title - AFROBOOST in white on purple
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 52)
    c.drawCentredString(width/2, height - 3.5*cm, "AFROBOOST")
    
    # Subtitle
    c.setFont("Helvetica", 16)
    c.drawCentredString(width/2, height - 5*cm, "Document de validation de niveau")
    
    # Main content area
    # Level name with purple accent
    c.setFillColor(colors.HexColor('#a855f7'))
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(width/2, height - 8*cm, level_name_fr.upper())
    
    # Student information section
    c.setFillColor(colors.HexColor('#2d2d2d'))
    c.setFont("Helvetica-Bold", 14)
    
    # Apprenant label
    c.drawString(4*cm, height - 10*cm, "Apprenant :")
    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(colors.HexColor('#1a1a1a'))
    c.drawString(7.5*cm, height - 10*cm, doc['student_name'])
    
    # ID Étudiant
    c.setFillColor(colors.HexColor('#2d2d2d'))
    c.setFont("Helvetica-Bold", 14)
    c.drawString(4*cm, height - 11*cm, "ID Étudiant :")
    c.setFont("Helvetica", 14)
    c.drawString(7.5*cm, height - 11*cm, doc['student_id'])
    
    # Official statement box
    y_pos = height - 13.5*cm
    c.setStrokeColor(colors.HexColor('#a855f7'))
    c.setLineWidth(2)
    c.setFillColor(colors.HexColor('#f9fafb'))
    c.roundRect(3*cm, y_pos - 1*cm, width - 6*cm, 2*cm, 0.3*cm, fill=True, stroke=True)
    
    c.setFillColor(colors.HexColor('#1a1a1a'))
    c.setFont("Helvetica-Oblique", 13)
    c.drawCentredString(width/2, y_pos - 0.3*cm, "Ce document certifie que le niveau ci-dessus")
    c.drawCentredString(width/2, y_pos - 0.8*cm, "a été validé avec succès.")
    
    # Skills section
    skills_y = height - 16*cm
    c.setFillColor(colors.HexColor('#a855f7'))
    c.setFont("Helvetica-Bold", 15)
    c.drawString(3.5*cm, skills_y, "COMPÉTENCES VALIDÉES")
    
    # Underline
    c.setStrokeColor(colors.HexColor('#a855f7'))
    c.setLineWidth(1.5)
    c.line(3.5*cm, skills_y - 0.15*cm, 8*cm, skills_y - 0.15*cm)
    
    # Skills list
    c.setFillColor(colors.HexColor('#2d2d2d'))
    c.setFont("Helvetica", 11)
    y_position = skills_y - 1*cm
    
    for skill in doc['skills']:
        # Fix grammar
        skill_fixed = fix_skill_grammar(skill)
        
        # Draw bullet
        c.setFillColor(colors.HexColor('#a855f7'))
        c.circle(4*cm, y_position + 0.15*cm, 0.08*cm, fill=True)
        
        # Draw skill text
        c.setFillColor(colors.HexColor('#2d2d2d'))
        c.drawString(4.5*cm, y_position, skill_fixed)
        y_position -= 0.65*cm
        
        if y_position < 6*cm:  # Prevent overflow
            break
    
    # Footer verification box
    footer_y = 4*cm
    c.setStrokeColor(colors.HexColor('#e5e7eb'))
    c.setLineWidth(1)
    c.setFillColor(colors.HexColor('#f9fafb'))
    c.rect(2*cm, footer_y - 2.5*cm, width - 4*cm, 2.5*cm, fill=True, stroke=True)
    
    # Footer content
    c.setFillColor(colors.HexColor('#6b7280'))
    c.setFont("Helvetica-Bold", 10)
    c.drawString(2.5*cm, footer_y - 0.8*cm, "ID du document :")
    c.setFont("Helvetica", 10)
    c.drawString(5.5*cm, footer_y - 0.8*cm, doc['document_id'])
    
    c.setFont("Helvetica-Bold", 10)
    c.drawString(2.5*cm, footer_y - 1.4*cm, "Date de validation :")
    
    validated_date = doc['validated_at']
    if isinstance(validated_date, str):
        validated_date = datetime.fromisoformat(validated_date)
    c.setFont("Helvetica", 10)
    c.drawString(5.5*cm, footer_y - 1.4*cm, validated_date.strftime('%d/%m/%Y'))
    
    # Verification text
    c.setFont("Helvetica-Bold", 10)
    c.drawString(2.5*cm, footer_y - 2*cm, "Vérifier :")
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor('#a855f7'))
    verification_url = f"afroboost.com/verify-certificate?id={doc['document_id']}"
    c.drawString(4.2*cm, footer_y - 2*cm, verification_url)
    
    # Bottom footer
    c.setFillColor(colors.HexColor('#9ca3af'))
    c.setFont("Helvetica-Oblique", 9)
    c.drawCentredString(width/2, 1.2*cm, "Formation Officielle Afroboost — Imprimable & Vérifiable")
    
    # Purple accent line at bottom
    c.setStrokeColor(colors.HexColor('#a855f7'))
    c.setLineWidth(2)
    c.line(3*cm, 0.7*cm, width - 3*cm, 0.7*cm)
    
    c.save()
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=afroboost_niveau_{doc['document_id']}.pdf"
        }
    )

# =====================
# LEVEL CONTENT ENDPOINTS
# =====================

@api_router.post("/level-content")
async def create_or_update_level_content(input: LevelContentCreate):
    # Check if content already exists for this level
    existing = await db.level_content.find_one({"level_id": input.level_id})
    
    if existing:
        # Update existing
        update_data = input.model_dump()
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        await db.level_content.update_one(
            {"level_id": input.level_id},
            {"$set": update_data}
        )
        content = await db.level_content.find_one({"level_id": input.level_id}, {"_id": 0})
    else:
        # Create new
        content_obj = LevelContent(**input.model_dump())
        doc = content_obj.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        
        await db.level_content.insert_one(doc)
        content = doc
    
    return content

@api_router.get("/level-content/{level_id}")
async def get_level_content(level_id: str):
    content = await db.level_content.find_one({"level_id": level_id}, {"_id": 0})
    if not content:
        # Return empty content if not found
        return {
            "level_id": level_id,
            "level_name": "",
            "videos": [],
            "text_content": "",
            "live_required": False,
            "live_sessions": []
        }
    return content

@api_router.get("/level-content")
async def get_all_level_content():
    contents = await db.level_content.find({}, {"_id": 0}).to_list(1000)
    return contents

# =====================
# USER LEVEL PROGRESS ENDPOINTS
# =====================

@api_router.post("/level-progress")
async def update_level_progress(input: ProgressUpdate):
    # Find or create progress
    progress = await db.user_level_progress.find_one({
        "user_id": input.user_id,
        "level_id": input.level_id
    })
    
    if not progress:
        # Create new progress
        progress_obj = UserLevelProgress(
            user_id=input.user_id,
            level_id=input.level_id
        )
        progress = progress_obj.model_dump()
        progress['updated_at'] = progress['updated_at'].isoformat()
    
    # Update fields
    if input.video_id and input.video_id not in progress.get('videos_completed', []):
        if 'videos_completed' not in progress:
            progress['videos_completed'] = []
        progress['videos_completed'].append(input.video_id)
    
    if input.text_confirmed is not None:
        progress['text_confirmed'] = input.text_confirmed
    
    if input.live_booked_id:
        progress['live_booked_id'] = input.live_booked_id
    
    if input.live_attended is not None:
        progress['live_attended'] = input.live_attended
    
    if input.payment_status:
        progress['payment_status'] = input.payment_status
        if input.payment_status == 'validated':
            progress['access_granted'] = True
    
    if input.volunteer_status:
        progress['volunteer_status'] = input.volunteer_status
        if input.volunteer_status == 'validated':
            progress['access_granted'] = True
    
    if input.access_granted is not None:
        progress['access_granted'] = input.access_granted
    
    progress['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Upsert
    await db.user_level_progress.update_one(
        {"user_id": input.user_id, "level_id": input.level_id},
        {"$set": progress},
        upsert=True
    )
    
    return progress

@api_router.get("/level-progress/{user_id}/{level_id}")
async def get_level_progress(user_id: str, level_id: str):
    progress = await db.user_level_progress.find_one({
        "user_id": user_id,
        "level_id": level_id
    }, {"_id": 0})
    
    if not progress:
        # Return empty progress
        return {
            "user_id": user_id,
            "level_id": level_id,
            "videos_completed": [],
            "text_confirmed": False,
            "live_booked_id": None,
            "live_attended": False,
            "payment_status": "pending",
            "volunteer_status": "pending",
            "access_granted": False
        }
    
    return progress

@api_router.get("/level-progress/{user_id}")
async def get_user_all_progress(user_id: str):
    progress_list = await db.user_level_progress.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    return progress_list

@api_router.get("/level-progress/admin/all")
async def get_all_progress_admin():
    """Admin endpoint to get all progress records"""
    progress_list = await db.user_level_progress.find({}, {"_id": 0}).to_list(1000)
    return progress_list

@api_router.get("/level-progress/check-unlock/{user_id}/{level_id}")
async def check_level_unlocked(user_id: str, level_id: str):
    # Get level content
    content = await db.level_content.find_one({"level_id": level_id}, {"_id": 0})
    
    # Get user progress
    progress = await db.user_level_progress.find_one({
        "user_id": user_id,
        "level_id": level_id
    }, {"_id": 0})
    
    if not progress:
        return {
            "unlocked": False,
            "access_granted": False,
            "payment_status": "pending",
            "volunteer_status": "pending",
            "reason": "no_progress"
        }
    
    # Check access granted (payment OR volunteer validated)
    access_granted = progress.get('access_granted', False)
    
    if not access_granted:
        return {
            "unlocked": False,
            "access_granted": False,
            "payment_status": progress.get('payment_status', 'pending'),
            "volunteer_status": progress.get('volunteer_status', 'pending'),
            "reason": "access_not_granted"
        }
    
    # If no content, access granted means unlocked
    if not content:
        return {
            "unlocked": True,
            "access_granted": True,
            "reason": "no_content_but_access_granted"
        }
    
    # Check requirements
    videos_done = len(content.get('videos', [])) == 0 or len(progress.get('videos_completed', [])) >= len(content.get('videos', []))
    text_done = not content.get('text_content') or progress.get('text_confirmed', False)
    live_done = not content.get('live_required', False) or progress.get('live_attended', False)
    
    unlocked = videos_done and text_done and live_done
    
    return {
        "unlocked": unlocked,
        "access_granted": True,
        "payment_status": progress.get('payment_status', 'pending'),
        "volunteer_status": progress.get('volunteer_status', 'pending'),
        "videos_done": videos_done,
        "text_done": text_done,
        "live_done": live_done,
        "videos_progress": f"{len(progress.get('videos_completed', []))}/{len(content.get('videos', []))}",
        "live_required": content.get('live_required', False)
    }

@api_router.post("/level-access/request")
async def request_level_access(input: LevelAccessRequest):
    """Request payment or volunteer access to a level"""
    # Get or create progress
    progress = await db.user_level_progress.find_one({
        "user_id": input.user_id,
        "level_id": input.level_id
    })
    
    if not progress:
        progress_obj = UserLevelProgress(
            user_id=input.user_id,
            level_id=input.level_id
        )
        progress = progress_obj.model_dump()
        progress['updated_at'] = progress['updated_at'].isoformat()
    
    if input.request_type == "payment":
        progress['payment_status'] = "pending"
    elif input.request_type == "volunteer":
        progress['volunteer_status'] = "pending"
    
    progress['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.user_level_progress.update_one(
        {"user_id": input.user_id, "level_id": input.level_id},
        {"$set": progress},
        upsert=True
    )
    
    return progress

@api_router.post("/level-access/validate")
async def validate_level_access(input: dict):
    """Admin validates payment or volunteer for level access"""
    user_id = input.get('user_id')
    level_id = input.get('level_id')
    validation_type = input.get('type')  # "payment" or "volunteer"
    
    update_data = {
        "access_granted": True,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if validation_type == "payment":
        update_data["payment_status"] = "validated"
    elif validation_type == "volunteer":
        update_data["volunteer_status"] = "validated"
    
    await db.user_level_progress.update_one(
        {"user_id": user_id, "level_id": level_id},
        {"$set": update_data},
        upsert=True
    )
    
    return {"success": True, "message": "Access validated"}

# Include the router in the main app
app.include_router(api_router)

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
