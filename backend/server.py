from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, Depends, Header, Cookie
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Stripe integration
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionResponse, 
    CheckoutStatusResponse, 
    CheckoutSessionRequest
)

# Register UTF-8 compatible fonts for French accents
try:
    # Use DejaVuSans which has excellent UTF-8 support
    pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
    # DejaVuSans-Oblique doesn't exist, use regular DejaVuSans for oblique text
    UTF8_FONT = 'DejaVuSans'
    UTF8_FONT_BOLD = 'DejaVuSans-Bold'
    UTF8_FONT_OBLIQUE = 'DejaVuSans'  # Fallback to regular since Oblique doesn't exist
except Exception as e:
    # Fallback to Helvetica if fonts not available
    logging.warning(f"Could not load DejaVuSans fonts: {e}. Using Helvetica (limited UTF-8 support)")
    UTF8_FONT = 'Helvetica'
    UTF8_FONT_BOLD = 'Helvetica-Bold'
    UTF8_FONT_OBLIQUE = 'Helvetica-Oblique'

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
    diagram_url: str = ""  # remplace le visuel integre (carte/anatomie) si renseigne
    images: List[dict] = []  # galerie [{url, caption, credit}] editable en admin
    youtube_url: str = ""  # video principale du niveau (lien YouTube)
    map_markers: List[dict] = []  # carte interactive [{id,country,x,y,style_name,youtube_url,history}]
    muscle_markers: List[dict] = []  # anatomie [{id,name,description,youtube_url,x,y,view:'anterior'|'posterior'}]
    content_modes: dict = {}  # onglets actives {videos:bool, text:bool, live:bool} (vide = tous actifs)
    topic_videos: List[dict] = []  # vidéos thématiques [{id,title,youtube_url}]
    materials: List[dict] = []  # matériel interactif (Niveau 4) [{id,name,description,image_url}]
    help: dict = {}  # bouton aide {enabled:bool, title:str, booking_url:str, allow_request:bool}
    faq: List[dict] = []  # Questions des participants [{id,q,a}]
    quiz: dict = {}  # {pass_score:int, questions:[{id,q,options:[str],correct_index:int,scenario:bool}]}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LevelContentCreate(BaseModel):
    level_id: str
    level_name: str
    videos: List[Video] = []
    text_content: str = ""
    live_required: bool = False
    live_sessions: List[LiveSession] = []
    diagram_url: str = ""
    images: List[dict] = []
    youtube_url: str = ""
    map_markers: List[dict] = []
    muscle_markers: List[dict] = []
    content_modes: dict = {}
    topic_videos: List[dict] = []
    materials: List[dict] = []
    help: dict = {}
    faq: List[dict] = []
    quiz: dict = {}

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

class LevelPaymentConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    level_id: str
    payment_mode: str  # "money", "volunteer", "both"
    price: Optional[float] = None
    currency: str = "CHF"  # CHF, EUR
    enabled_payment_methods: List[str] = []  # twint, stripe, orange_money, mtn_money
    payment_instructions: dict = {}  # {method: instruction_text}
    volunteer_description: str = ""
    engagement_min_events: int = 3  # N evenements requis pour l'acces gratuit-engagement
    engagement_charter_text: str = ""  # texte de la charte d'engagement
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LevelPaymentConfigCreate(BaseModel):
    level_id: str
    payment_mode: str
    price: Optional[float] = None
    currency: str = "CHF"
    enabled_payment_methods: List[str] = []
    payment_instructions: dict = {}
    volunteer_description: str = ""
    engagement_min_events: int = 3
    engagement_charter_text: str = ""

# =====================
# USER ACCESS MODELS (COMPLETE MANAGEMENT)
# =====================

class UserAccess(BaseModel):
    """Complete user access management with status tracking"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    level_id: str
    status: str = "pending"  # active, expired, revoked, pending
    access_type: str = "payment"  # payment, volunteer, admin_grant
    granted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None  # None = permanent
    revoked_at: Optional[datetime] = None
    revoked_by: Optional[str] = None
    revoke_reason: Optional[str] = None
    payment_id: Optional[str] = None  # Link to PaymentTransaction
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserAccessCreate(BaseModel):
    user_id: str
    level_id: str
    access_type: str = "admin_grant"  # payment, volunteer, admin_grant
    status: str = "active"
    expires_at: Optional[str] = None  # ISO date string or None for permanent

class UserAccessUpdate(BaseModel):
    status: Optional[str] = None
    access_type: Optional[str] = None
    expires_at: Optional[str] = None

class UserAccessRevoke(BaseModel):
    reason: Optional[str] = None
    revoked_by: str = "admin"

# =====================
# PAYMENT TRANSACTION MODELS (MULTI-REGION)
# =====================

class PaymentTransaction(BaseModel):
    """Payment transaction with multi-region support (EU/CH/Africa)"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    level_id: str
    amount: float
    currency: str = "CHF"  # CHF, EUR, XAF, XOF, NGN, GHS, KES, etc.
    payment_method: str  # stripe, twint_api, twint_link, mobile_money_mtn, mobile_money_orange, mobile_money_airtel, aggregator_paystack, aggregator_flutterwave, manual
    status: str = "pending"  # pending, completed, failed, refunded
    external_reference: Optional[str] = None  # Our reference for tracking
    provider_transaction_id: Optional[str] = None  # Provider's transaction ID
    stripe_payment_intent_id: Optional[str] = None
    webhook_received: bool = False
    access_id: Optional[str] = None  # Link to UserAccess created after payment
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    metadata: dict = {}

class PaymentInitiate(BaseModel):
    user_id: str
    level_id: str
    payment_method: str  # stripe, twint_api, mobile_money_mtn, mobile_money_orange, etc.
    currency: Optional[str] = None  # Override level config currency if needed
    return_url: Optional[str] = None  # For redirect after payment

class PaymentWebhook(BaseModel):
    provider: str  # stripe, twint, mtn, orange, paystack, flutterwave
    event_type: str
    transaction_id: str
    status: str
    metadata: dict = {}

# Hardcoded admin secret (in production, use env variable)
ADMIN_SECRET_ID = os.environ.get('ADMIN_SECRET_ID', 'AFRO-ADMIN-2025')

# ============================================================================
# Authentification admin UNIFIEE : JWT Supabase (JWKS/ES256) OU secret legacy
# Non destructif : l'ancien secret reste accepte pendant la transition.
# Aucun secret en dur : tout vient de l'environnement.
# ============================================================================
ADMIN_EMAILS = {
    e.strip().lower()
    for e in os.environ.get('ADMIN_EMAILS', 'contact.artboost@gmail.com').split(',')
    if e.strip()
}
SUPABASE_JWKS_URL = os.environ.get('SUPABASE_JWKS_URL', '')
SUPABASE_ISSUER = os.environ.get('SUPABASE_ISSUER', '')

_jwks_client = None


def _get_jwks_client():
    global _jwks_client
    if _jwks_client is None and SUPABASE_JWKS_URL:
        from jwt import PyJWKClient
        _jwks_client = PyJWKClient(SUPABASE_JWKS_URL, cache_keys=True)
    return _jwks_client


def verify_supabase_jwt(token: str) -> dict:
    """Verifie cryptographiquement un access token Supabase (ES256/RS256) via JWKS."""
    import jwt as _pyjwt
    client = _get_jwks_client()
    if client is None:
        raise ValueError("JWKS Supabase non configure")
    signing_key = client.get_signing_key_from_jwt(token)
    payload = _pyjwt.decode(
        token,
        signing_key.key,
        algorithms=["ES256", "RS256"],
        audience="authenticated",
        options={"require": ["exp"]},
    )
    if SUPABASE_ISSUER and payload.get("iss") != SUPABASE_ISSUER:
        raise ValueError("issuer invalide")
    return payload


# --- Firebase (Google securetoken, RS256) — clés publiques uniquement ---
FIREBASE_PROJECT_ID = os.environ.get('FIREBASE_PROJECT_ID', '')
FIREBASE_JWKS_URL = os.environ.get(
    'FIREBASE_JWKS_URL',
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
)

_fb_jwks_client = None


def _get_fb_jwks_client():
    global _fb_jwks_client
    if _fb_jwks_client is None and FIREBASE_JWKS_URL:
        from jwt import PyJWKClient
        _fb_jwks_client = PyJWKClient(FIREBASE_JWKS_URL, cache_keys=True)
    return _fb_jwks_client


def verify_firebase_jwt(token: str) -> dict:
    """Verifie un ID token Firebase (RS256) via les cles publiques Google."""
    import jwt as _pyjwt
    client = _get_fb_jwks_client()
    if client is None or not FIREBASE_PROJECT_ID:
        raise ValueError("Firebase non configure")
    signing_key = client.get_signing_key_from_jwt(token)
    payload = _pyjwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=FIREBASE_PROJECT_ID,
        issuer=f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}",
        options={"require": ["exp"]},
    )
    return payload


# --- Session cookie Firebase (SSO partage .afroboosteur.com) — clés publiques ---
_fb_session_certs = {"data": None, "ts": 0.0}


def _get_session_certs():
    import time as _t
    import requests as _rq
    if _fb_session_certs["data"] is None or (_t.time() - _fb_session_certs["ts"]) > 3600:
        r = _rq.get(
            "https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys",
            timeout=10,
        )
        _fb_session_certs["data"] = r.json()
        _fb_session_certs["ts"] = _t.time()
    return _fb_session_certs["data"]


def verify_firebase_session_cookie(cookie: str) -> dict:
    """Verifie un session cookie Firebase (RS256) via les certificats publics Google."""
    import jwt as _pyjwt
    from cryptography.x509 import load_pem_x509_certificate
    if not FIREBASE_PROJECT_ID:
        raise ValueError("Firebase non configure")
    kid = _pyjwt.get_unverified_header(cookie).get("kid")
    pem = (_get_session_certs() or {}).get(kid)
    if not pem:
        raise ValueError("kid inconnu")
    pub = load_pem_x509_certificate(pem.encode()).public_key()
    return _pyjwt.decode(
        cookie,
        pub,
        algorithms=["RS256"],
        audience=FIREBASE_PROJECT_ID,
        issuer=f"https://session.firebase.google.com/{FIREBASE_PROJECT_ID}",
        options={"require": ["exp"]},
    )


def _supabase_ref() -> str:
    """Ref du projet Supabase (ex. resdgtizfiyfgdhsffuz) depuis SUPABASE_ISSUER."""
    import re as _re
    m = _re.search(r"https?://([a-z0-9]+)\.supabase\.co", os.environ.get("SUPABASE_ISSUER", ""))
    return m.group(1) if m else ""


def supabase_access_token_from_cookies(cookies: dict) -> Optional[str]:
    """Reconstruit l'access_token Supabase depuis le cookie `sb-<ref>-auth-token`
    (cookie de session partage .afroboosteur.com), y compris s'il est decoupe en .0/.1."""
    ref = _supabase_ref()
    if not ref:
        return None
    base = f"sb-{ref}-auth-token"
    parts = []
    if base in cookies:
        parts.append(cookies[base])
    i = 0
    while f"{base}.{i}" in cookies:
        parts.append(cookies[f"{base}.{i}"])
        i += 1
    if not parts:
        return None
    raw = "".join(parts)
    try:
        if raw.startswith("base64-"):
            import base64, json
            data = json.loads(base64.b64decode(raw[len("base64-"):] + "==="))
        else:
            import json, urllib.parse
            data = json.loads(urllib.parse.unquote(raw))
    except Exception:
        return None
    if isinstance(data, dict):
        return data.get("access_token")
    if isinstance(data, list) and data:
        return data[0]
    return None


async def require_admin(
    request: Request,
    authorization: Optional[str] = Header(None),
    x_admin_secret: Optional[str] = Header(None),
    fb_session: Optional[str] = Cookie(None),
):
    """Autorise si secret legacy, ID token Firebase, JWT Supabase (Bearer OU cookie
    partage .afroboosteur.com), ou cookie de session Firebase, email dans ADMIN_EMAILS."""
    # (a) Secret legacy — en-tete X-Admin-Secret
    if x_admin_secret and x_admin_secret == ADMIN_SECRET_ID:
        return {"method": "secret", "sub": "legacy-admin"}
    candidate = None  # (method, payload)
    # (b/c) Jeton porteur : Firebase ID token OU JWT Supabase
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        for name, verifier in (("firebase", verify_firebase_jwt), ("supabase", verify_supabase_jwt)):
            try:
                candidate = (name, verifier(token))
                break
            except Exception:
                continue
    # (d) Cookie de session Firebase partage (SSO Firebase)
    if candidate is None and fb_session:
        try:
            candidate = ("session-cookie", verify_firebase_session_cookie(fb_session))
        except Exception:
            candidate = None
    # (e) Cookie Supabase partage (SSO Supabase .afroboosteur.com)
    if candidate is None:
        sb_token = supabase_access_token_from_cookies(request.cookies)
        if sb_token:
            try:
                candidate = ("supabase-cookie", verify_supabase_jwt(sb_token))
            except Exception:
                candidate = None
    if candidate is None:
        raise HTTPException(status_code=401, detail="Authentification administrateur requise")
    method, payload = candidate
    email = (payload.get("email") or "").lower()
    if email not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Compte non autorise pour l'administration")
    return {"method": method, "sub": email}


@api_router.get("/auth/me")
async def auth_me(
    request: Request,
    authorization: Optional[str] = Header(None),
    x_admin_secret: Optional[str] = Header(None),
    fb_session: Optional[str] = Cookie(None),
):
    """Etat d'authentification admin (utilise par le frontend pour le SSO)."""
    try:
        info = await require_admin(request, authorization, x_admin_secret, fb_session)
        return {"authenticated": True, "admin": True, "email": info.get("sub"), "method": info.get("method")}
    except HTTPException:
        return {"authenticated": False, "admin": False}


# =====================
# EXAM DATES ENDPOINTS
# =====================

@api_router.post("/exam-dates", response_model=ExamDate, dependencies=[Depends(require_admin)])
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

@api_router.delete("/exam-dates/{exam_date_id}", dependencies=[Depends(require_admin)])
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

@api_router.put("/exam-bookings/{booking_id}/result", dependencies=[Depends(require_admin)])
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

@api_router.post("/certificates", response_model=Certificate, dependencies=[Depends(require_admin)])
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
    c.setFont(UTF8_FONT_BOLD, 48)
    c.drawCentredString(width/2, height - 5*cm, "AFROBOOST")
    
    # Subtitle
    c.setFillColor(colors.white)
    c.setFont(UTF8_FONT_BOLD, 32)
    c.drawCentredString(width/2, height - 7*cm, "CERTIFICATION OFFICIELLE")
    
    # Certificate type
    cert_type_text = {
        "online": "INSTRUCTEUR EN LIGNE",
        "in-person": "INSTRUCTEUR EN PRÉSENTIEL",
        "hybrid": "INSTRUCTEUR HYBRIDE"
    }
    c.setFillColor(colors.HexColor('#c084fc'))
    c.setFont(UTF8_FONT_BOLD, 24)
    c.drawCentredString(width/2, height - 9*cm, cert_type_text.get(cert['certificate_type'], 'INSTRUCTEUR'))
    
    # Instructor name
    c.setFillColor(colors.white)
    c.setFont(UTF8_FONT_BOLD, 36)
    c.drawCentredString(width/2, height - 12*cm, cert['student_name'].upper())
    
    # Description based on type
    cert_desc = {
        "online": "Autorisé à enseigner Afroboost en ligne.",
        "in-person": "Autorisé à enseigner Afroboost en présentiel.",
        "hybrid": "Autorisé à enseigner Afroboost en ligne et en présentiel."
    }
    c.setFillColor(colors.HexColor('#e5e5e5'))
    c.setFont(UTF8_FONT, 16)
    c.drawCentredString(width/2, height - 14*cm, cert_desc.get(cert['certificate_type'], ''))
    
    # Certificate details
    c.setFillColor(colors.HexColor('#a855f7'))
    c.setFont(UTF8_FONT_BOLD, 12)
    c.drawString(4*cm, 6*cm, f"ID CERTIFICAT: {cert['certificate_id']}")
    
    issued_date = cert['issued_at']
    if isinstance(issued_date, str):
        issued_date = datetime.fromisoformat(issued_date)
    c.drawString(4*cm, 5*cm, f"DATE D'ÉMISSION: {issued_date.strftime('%d/%m/%Y')}")
    
    # Footer
    c.setFillColor(colors.HexColor('#71717a'))
    c.setFont(UTF8_FONT_OBLIQUE, 10)
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
    c.setFont(UTF8_FONT_BOLD, 52)
    c.drawCentredString(width/2, height - 3.5*cm, "AFROBOOST")
    
    # Subtitle
    c.setFont(UTF8_FONT, 16)
    c.drawCentredString(width/2, height - 5*cm, "Document de validation de niveau")
    
    # Main content area
    # Level name with purple accent
    c.setFillColor(colors.HexColor('#a855f7'))
    c.setFont(UTF8_FONT_BOLD, 24)
    c.drawCentredString(width/2, height - 8*cm, level_name_fr.upper())
    
    # Student information section
    c.setFillColor(colors.HexColor('#2d2d2d'))
    c.setFont(UTF8_FONT_BOLD, 14)
    
    # Apprenant label
    c.drawString(4*cm, height - 10*cm, "Apprenant :")
    c.setFont(UTF8_FONT_BOLD, 18)
    c.setFillColor(colors.HexColor('#1a1a1a'))
    c.drawString(7.5*cm, height - 10*cm, doc['student_name'])
    
    # ID Étudiant
    c.setFillColor(colors.HexColor('#2d2d2d'))
    c.setFont(UTF8_FONT_BOLD, 14)
    c.drawString(4*cm, height - 11*cm, "ID Étudiant :")
    c.setFont(UTF8_FONT, 14)
    c.drawString(7.5*cm, height - 11*cm, doc['student_id'])
    
    # Official statement box
    y_pos = height - 13.5*cm
    c.setStrokeColor(colors.HexColor('#a855f7'))
    c.setLineWidth(2)
    c.setFillColor(colors.HexColor('#f9fafb'))
    c.roundRect(3*cm, y_pos - 1*cm, width - 6*cm, 2*cm, 0.3*cm, fill=True, stroke=True)
    
    c.setFillColor(colors.HexColor('#1a1a1a'))
    c.setFont(UTF8_FONT_OBLIQUE, 13)
    c.drawCentredString(width/2, y_pos - 0.3*cm, "Ce document certifie que le niveau ci-dessus")
    c.drawCentredString(width/2, y_pos - 0.8*cm, "a été validé avec succès.")
    
    # Skills section
    skills_y = height - 16*cm
    c.setFillColor(colors.HexColor('#a855f7'))
    c.setFont(UTF8_FONT_BOLD, 15)
    c.drawString(3.5*cm, skills_y, "COMPÉTENCES VALIDÉES")
    
    # Underline
    c.setStrokeColor(colors.HexColor('#a855f7'))
    c.setLineWidth(1.5)
    c.line(3.5*cm, skills_y - 0.15*cm, 8*cm, skills_y - 0.15*cm)
    
    # Skills list
    c.setFillColor(colors.HexColor('#2d2d2d'))
    c.setFont(UTF8_FONT, 11)
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
    c.setFont(UTF8_FONT_BOLD, 10)
    c.drawString(2.5*cm, footer_y - 0.8*cm, "ID du document :")
    c.setFont(UTF8_FONT, 10)
    c.drawString(5.5*cm, footer_y - 0.8*cm, doc['document_id'])
    
    c.setFont(UTF8_FONT_BOLD, 10)
    c.drawString(2.5*cm, footer_y - 1.4*cm, "Date de validation :")
    
    validated_date = doc['validated_at']
    if isinstance(validated_date, str):
        validated_date = datetime.fromisoformat(validated_date)
    c.setFont(UTF8_FONT, 10)
    c.drawString(5.5*cm, footer_y - 1.4*cm, validated_date.strftime('%d/%m/%Y'))
    
    # Verification text
    c.setFont(UTF8_FONT_BOLD, 10)
    c.drawString(2.5*cm, footer_y - 2*cm, "Vérifier :")
    c.setFont(UTF8_FONT, 9)
    c.setFillColor(colors.HexColor('#a855f7'))
    verification_url = f"afroboost.com/verify-certificate?id={doc['document_id']}"
    c.drawString(4.2*cm, footer_y - 2*cm, verification_url)
    
    # Bottom footer
    c.setFillColor(colors.HexColor('#9ca3af'))
    c.setFont(UTF8_FONT_OBLIQUE, 9)
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

@api_router.post("/level-content", dependencies=[Depends(require_admin)])
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

import copy as _copy

def _public_content(content):
    """Retire les bonnes reponses du quiz (jamais exposees au participant)."""
    if not content:
        return content
    c = _copy.deepcopy(content)
    q = c.get("quiz") or {}
    for question in (q.get("questions") or []):
        question.pop("correct_index", None)
    return c

@api_router.get("/level-content/{level_id}")
async def get_level_content(level_id: str):
    content = await db.level_content.find_one({"level_id": level_id}, {"_id": 0})
    if not content:
        return {
            "level_id": level_id, "level_name": "", "videos": [], "text_content": "",
            "live_required": False, "live_sessions": [], "youtube_url": "",
            "map_markers": [], "quiz": {}
        }
    return _public_content(content)

@api_router.get("/level-content")
async def get_all_level_content():
    contents = await db.level_content.find({}, {"_id": 0}).to_list(1000)
    return [_public_content(c) for c in contents]

@api_router.get("/admin/level-content/{level_id}", dependencies=[Depends(require_admin)])
async def get_level_content_admin(level_id: str):
    """Contenu COMPLET (avec bonnes reponses du quiz) pour l'editeur admin."""
    content = await db.level_content.find_one({"level_id": level_id}, {"_id": 0})
    return content or {"level_id": level_id}

class ContentModesUpdate(BaseModel):
    content_modes: dict = {}

@api_router.post("/admin/level-content/{level_id}/modes", dependencies=[Depends(require_admin)])
async def update_content_modes(level_id: str, input: ContentModesUpdate):
    """Sauvegarde DEDIEE des modes d'onglets (videos/text/live), normalises en
    booleens stricts. Sauvegarde fiable et sans ambiguite (auto-save cote admin)."""
    cm = input.content_modes or {}
    modes = {k: (cm.get(k) is True) for k in ("videos", "text", "live")}
    await db.level_content.update_one(
        {"level_id": level_id},
        {"$set": {"content_modes": modes, "level_id": level_id}},
        upsert=True,
    )
    return {"success": True, "content_modes": modes}

# ---- QUIZ : test de reussite par niveau (correction cote serveur) ----
def _next_level_id(level_id):
    import re
    m = re.match(r"level-(\d+)", level_id or "")
    return f"level-{int(m.group(1)) + 1}" if m else None

class QuizSubmit(BaseModel):
    user_id: str
    level_id: str
    answers: List[int] = []

@api_router.post("/quiz/submit")
async def submit_quiz(input: QuizSubmit, request: Request):
    rate_limit(request, "quiz", limit=20, window=300)
    if not (input.user_id or "").strip():
        raise HTTPException(status_code=400, detail="Identifiant participant manquant")
    content = await db.level_content.find_one({"level_id": input.level_id}, {"_id": 0})
    quiz = (content or {}).get("quiz") or {}
    questions = quiz.get("questions") or []
    if not questions:
        raise HTTPException(status_code=400, detail="Aucun quiz pour ce niveau")
    pass_score = int(quiz.get("pass_score", 80) or 80)
    total = len(questions)
    correct = sum(1 for i, q in enumerate(questions)
                  if (input.answers[i] if i < len(input.answers) else -1) == q.get("correct_index"))
    percent = round(correct * 100 / total) if total else 0
    passed = percent >= pass_score
    now = datetime.now(timezone.utc)
    await db.quiz_results.insert_one({
        "id": str(uuid.uuid4()), "user_id": input.user_id.strip(), "level_id": input.level_id,
        "score": correct, "total": total, "percent": percent, "passed": passed,
        "created_at": now.isoformat(),
    })
    if passed:
        # Valide UNIQUEMENT le niveau courant (quiz reussi). On NE touche PAS a l'acces
        # ni au payment_status du niveau suivant : l'acces reste gere par le paiement/
        # engagement (pas de contournement du paiement Stripe). Le quiz reussi sert de
        # condition de progression (prerequis), pas d'octroi d'acces gratuit.
        await db.user_level_progress.update_one(
            {"user_id": input.user_id, "level_id": input.level_id},
            {"$set": {"quiz_passed": True, "updated_at": now.isoformat()}}, upsert=True)
    return {"passed": passed, "score": correct, "total": total, "percent": percent,
            "pass_score": pass_score, "level_validated": bool(passed)}

@api_router.get("/quiz/result/{user_id}/{level_id}")
async def quiz_result(user_id: str, level_id: str):
    res = await db.quiz_results.find({"user_id": user_id, "level_id": level_id}, {"_id": 0}).sort("percent", -1).to_list(1)
    if not res:
        return {"attempted": False, "passed": False, "best_percent": 0}
    r = res[0]
    return {"attempted": True, "passed": bool(r.get("passed")), "best_percent": r.get("percent", 0)}

class QuizCheck(BaseModel):
    level_id: str
    question_id: str = ""
    question_index: int = -1
    answer: int = -1

@api_router.post("/quiz/check")
async def check_quiz_answer(input: QuizCheck, request: Request):
    """Verifie UNE reponse et renvoie la bonne (pour le quiz question-par-question).
    Ne revele la bonne reponse qu'apres que le participant a repondu."""
    rate_limit(request, "quizcheck", limit=80, window=300)
    content = await db.level_content.find_one({"level_id": input.level_id}, {"_id": 0})
    questions = ((content or {}).get("quiz") or {}).get("questions") or []
    q = None
    if input.question_id:
        q = next((x for x in questions if x.get("id") == input.question_id), None)
    if q is None and 0 <= input.question_index < len(questions):
        q = questions[input.question_index]
    if q is None:
        raise HTTPException(status_code=404, detail="Question introuvable")
    ci = q.get("correct_index")
    return {"correct": input.answer == ci, "correct_index": ci}

# ---- AIDE : reservation 30 min avec un instructeur ----
class HelpRequestCreate(BaseModel):
    user_id: str = ""
    user_name: str = ""
    level_id: str = ""
    preferred: str = ""  # creneau souhaite (texte libre)
    message: str = ""

@api_router.post("/help-request")
async def create_help_request(input: HelpRequestCreate, request: Request):
    rate_limit(request, "help", limit=5, window=300)
    if not (input.preferred or "").strip() and not (input.message or "").strip():
        raise HTTPException(status_code=400, detail="Indiquez un créneau souhaité ou un message")
    now = datetime.now(timezone.utc)
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": (input.user_id or "").strip(), "user_name": (input.user_name or "").strip(),
        "level_id": input.level_id, "preferred": (input.preferred or "").strip()[:500],
        "message": (input.message or "").strip()[:2000],
        "status": "pending", "created_at": now.isoformat(),
    }
    await db.help_requests.insert_one(doc)
    doc.pop("_id", None)
    return {"success": True, "request": doc}

@api_router.get("/help-requests", dependencies=[Depends(require_admin)])
async def list_help_requests():
    return await db.help_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)

@api_router.post("/help-requests/{req_id}/handle", dependencies=[Depends(require_admin)])
async def handle_help_request(req_id: str):
    await db.help_requests.update_one({"id": req_id}, {"$set": {"status": "handled", "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"success": True}

@api_router.delete("/help-requests/{req_id}", dependencies=[Depends(require_admin)])
async def delete_help_request(req_id: str):
    await db.help_requests.delete_one({"id": req_id})
    return {"success": True}

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

@api_router.get("/level-progress/admin/all", dependencies=[Depends(require_admin)])
async def get_all_progress_admin():
    """Admin endpoint to get all progress records - always returns array"""
    try:
        progress_list = await db.user_level_progress.find({}, {"_id": 0}).to_list(1000)
        # Ensure we always return a list, never None or other types
        if progress_list is None:
            return []
        return progress_list
    except Exception as e:
        logging.error(f"Error fetching admin progress: {e}")
        return []

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

def _prev_level_id(level_id: str):
    try:
        n = int(str(level_id).split('-')[1])
        return f"level-{n-1}" if n > 1 else None
    except Exception:
        return None

async def _prerequisite_met(user_id: str, level_id: str) -> bool:
    """Gating sequentiel (option c) : pour acceder a un niveau il faut avoir
    REUSSI le quiz du niveau precedent. Le Niveau 1 est toujours accessible.
    Reussir un quiz ne contourne PAS le paiement (verifie separement)."""
    prev = _prev_level_id(level_id)
    if not prev:
        return True
    prev_content = await db.level_content.find_one({"level_id": prev}, {"_id": 0})
    prev_has_quiz = bool((prev_content or {}).get("quiz", {}).get("questions"))
    prog = await db.user_level_progress.find_one({"user_id": user_id, "level_id": prev}, {"_id": 0})
    if prev_has_quiz:
        return bool(prog and prog.get("quiz_passed", False))
    # pas de quiz au niveau precedent -> prerequis = niveau precedent complete
    chk = await check_level_unlocked(user_id, prev)
    return bool(chk.get("unlocked"))

@api_router.get("/level-progress/check-unlock/{user_id}/{level_id}")
async def check_level_unlocked(user_id: str, level_id: str):
    # Get level content
    content = await db.level_content.find_one({"level_id": level_id}, {"_id": 0})

    # Gating sequentiel : quiz du niveau precedent reussi ? (Niveau 1 = toujours vrai)
    prev_level = _prev_level_id(level_id)
    prerequisite_met = await _prerequisite_met(user_id, level_id)

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
            "prerequisite_met": prerequisite_met,
            "prereq_level": prev_level,
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
            "prerequisite_met": prerequisite_met,
            "prereq_level": prev_level,
            "reason": "access_not_granted"
        }
    
    # If no content, access granted means unlocked
    if not content:
        return {
            "unlocked": True,
            "access_granted": True,
            "prerequisite_met": prerequisite_met,
            "prereq_level": prev_level,
            "reason": "no_content_but_access_granted"
        }
    
    # Check requirements
    videos_done = len(content.get('videos', [])) == 0 or len(progress.get('videos_completed', [])) >= len(content.get('videos', []))
    text_done = not content.get('text_content') or progress.get('text_confirmed', False)
    live_done = not content.get('live_required', False) or progress.get('live_attended', False)
    has_quiz = bool((content.get('quiz') or {}).get('questions'))
    quiz_done = (not has_quiz) or progress.get('quiz_passed', False)

    unlocked = videos_done and text_done and live_done and quiz_done
    
    return {
        "unlocked": unlocked,
        "access_granted": True,
        "payment_status": progress.get('payment_status', 'pending'),
        "volunteer_status": progress.get('volunteer_status', 'pending'),
        "videos_done": videos_done,
        "text_done": text_done,
        "live_done": live_done,
        "videos_progress": f"{len(progress.get('videos_completed', []))}/{len(content.get('videos', []))}",
        "live_required": content.get('live_required', False),
        "content_done": videos_done and text_done and live_done,
        "has_quiz": has_quiz,
        "quiz_passed": bool(progress.get('quiz_passed', False)),
        "prerequisite_met": prerequisite_met,
        "prereq_level": prev_level
    }

@api_router.post("/level-access/request")
async def request_level_access(input: LevelAccessRequest):
    """Request payment or volunteer access to a level"""
    # Gating sequentiel (option c) : prerequis = quiz du niveau precedent reussi
    if not await _prerequisite_met(input.user_id, input.level_id):
        raise HTTPException(status_code=403, detail="Réussissez d'abord le quiz du niveau précédent pour débloquer ce niveau.")
    # Get or create progress
    progress = await db.user_level_progress.find_one({
        "user_id": input.user_id,
        "level_id": input.level_id
    }, {"_id": 0})
    
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
    
    # Fetch clean result without _id
    result = await db.user_level_progress.find_one({
        "user_id": input.user_id,
        "level_id": input.level_id
    }, {"_id": 0})
    
    return result

@api_router.post("/level-access/validate", dependencies=[Depends(require_admin)])
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

# =====================
# ADMIN AUTH ENDPOINTS
# =====================

@api_router.post("/admin/auth")
async def admin_authenticate(auth: AdminAuth):
    """Verify admin secret ID"""
    if auth.admin_secret_id == ADMIN_SECRET_ID:
        return {
            "success": True,
            "admin_id": auth.admin_secret_id,
            "message": "Authentication successful"
        }
    else:
        raise HTTPException(status_code=401, detail="ID administrateur invalide")

@api_router.post("/admin/recovery")
async def admin_recovery_request(recovery: AdminRecovery):
    """Send recovery email to support"""
    # Log the recovery request
    logger.info(f"Admin recovery requested for email: {recovery.email}")
    
    # In production, send email to contact.artboost@gmail.com
    # For now, just return success
    
    return {
        "success": True,
        "message": "Demande envoyée avec succès"
    }

# =====================
# USER ACCESS MANAGEMENT ENDPOINTS (COMPLETE CRUD)
# =====================

@api_router.get("/access", dependencies=[Depends(require_admin)])
async def get_all_access(
    user_id: Optional[str] = None,
    level_id: Optional[str] = None,
    status: Optional[str] = None
):
    """Get all user access records with optional filters"""
    query = {}
    if user_id:
        query["user_id"] = user_id
    if level_id:
        query["level_id"] = level_id
    if status:
        query["status"] = status
    
    access_list = await db.user_access.find(query, {"_id": 0}).to_list(1000)
    
    # Check for expired access and update status
    now = datetime.now(timezone.utc)
    for access in access_list:
        if access.get("status") == "active" and access.get("expires_at"):
            expires_at = access["expires_at"]
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if expires_at < now:
                # Mark as expired
                await db.user_access.update_one(
                    {"id": access["id"]},
                    {"$set": {"status": "expired", "updated_at": now.isoformat()}}
                )
                access["status"] = "expired"
    
    return access_list

@api_router.get("/access/{access_id}", dependencies=[Depends(require_admin)])
async def get_access_by_id(access_id: str):
    """Get a specific access record by ID"""
    access = await db.user_access.find_one({"id": access_id}, {"_id": 0})
    if not access:
        raise HTTPException(status_code=404, detail="Access not found")
    return access

@api_router.post("/access", dependencies=[Depends(require_admin)])
async def create_access(input: UserAccessCreate):
    """Admin creates a new access for a user"""
    # Check if access already exists
    existing = await db.user_access.find_one({
        "user_id": input.user_id,
        "level_id": input.level_id,
        "status": {"$in": ["active", "pending"]}
    })
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="Un accès actif ou en attente existe déjà pour cet utilisateur et ce niveau"
        )
    
    # Create new access
    access = UserAccess(
        user_id=input.user_id,
        level_id=input.level_id,
        access_type=input.access_type,
        status=input.status,
        granted_at=datetime.now(timezone.utc) if input.status == "active" else None,
        expires_at=datetime.fromisoformat(input.expires_at) if input.expires_at else None
    )
    
    doc = access.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    if doc["granted_at"]:
        doc["granted_at"] = doc["granted_at"].isoformat()
    if doc["expires_at"]:
        doc["expires_at"] = doc["expires_at"].isoformat()
    
    await db.user_access.insert_one(doc)
    
    # Also update user_level_progress for backward compatibility
    if input.status == "active":
        await db.user_level_progress.update_one(
            {"user_id": input.user_id, "level_id": input.level_id},
            {"$set": {
                "access_granted": True,
                "payment_status": "validated" if input.access_type == "payment" else "not_required",
                "volunteer_status": "validated" if input.access_type == "volunteer" else "not_applicable",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
    
    result = await db.user_access.find_one({"id": access.id}, {"_id": 0})
    return result

@api_router.put("/access/{access_id}", dependencies=[Depends(require_admin)])
async def update_access(access_id: str, input: UserAccessUpdate):
    """Admin updates an existing access"""
    access = await db.user_access.find_one({"id": access_id})
    if not access:
        raise HTTPException(status_code=404, detail="Access not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if input.status is not None:
        update_data["status"] = input.status
        if input.status == "active" and not access.get("granted_at"):
            update_data["granted_at"] = datetime.now(timezone.utc).isoformat()
    
    if input.access_type is not None:
        update_data["access_type"] = input.access_type
    
    if input.expires_at is not None:
        update_data["expires_at"] = input.expires_at if input.expires_at else None
    
    await db.user_access.update_one({"id": access_id}, {"$set": update_data})
    
    # Update user_level_progress for backward compatibility
    updated_access = await db.user_access.find_one({"id": access_id}, {"_id": 0})
    if updated_access:
        is_active = updated_access.get("status") == "active"
        await db.user_level_progress.update_one(
            {"user_id": updated_access["user_id"], "level_id": updated_access["level_id"]},
            {"$set": {
                "access_granted": is_active,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
    
    return updated_access

@api_router.delete("/access/{access_id}", dependencies=[Depends(require_admin)])
async def delete_access(access_id: str):
    """Admin deletes an access record"""
    access = await db.user_access.find_one({"id": access_id})
    if not access:
        raise HTTPException(status_code=404, detail="Access not found")
    
    # Remove from user_access
    await db.user_access.delete_one({"id": access_id})
    
    # Update user_level_progress - revoke access
    await db.user_level_progress.update_one(
        {"user_id": access["user_id"], "level_id": access["level_id"]},
        {"$set": {
            "access_granted": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Accès supprimé avec succès"}

@api_router.post("/access/{access_id}/revoke", dependencies=[Depends(require_admin)])
async def revoke_access(access_id: str, input: UserAccessRevoke):
    """Admin revokes an active access"""
    access = await db.user_access.find_one({"id": access_id})
    if not access:
        raise HTTPException(status_code=404, detail="Access not found")
    
    if access.get("status") != "active":
        raise HTTPException(status_code=400, detail="Seuls les accès actifs peuvent être révoqués")
    
    now = datetime.now(timezone.utc)
    update_data = {
        "status": "revoked",
        "revoked_at": now.isoformat(),
        "revoked_by": input.revoked_by,
        "revoke_reason": input.reason,
        "updated_at": now.isoformat()
    }
    
    await db.user_access.update_one({"id": access_id}, {"$set": update_data})
    
    # Update user_level_progress - revoke access
    await db.user_level_progress.update_one(
        {"user_id": access["user_id"], "level_id": access["level_id"]},
        {"$set": {
            "access_granted": False,
            "updated_at": now.isoformat()
        }}
    )
    
    result = await db.user_access.find_one({"id": access_id}, {"_id": 0})
    return result

# =====================
# PAYMENT TRANSACTION ENDPOINTS (MULTI-REGION)
# =====================

@api_router.get("/payments/history", dependencies=[Depends(require_admin)])
async def get_payment_history(
    user_id: Optional[str] = None,
    level_id: Optional[str] = None,
    status: Optional[str] = None,
    payment_method: Optional[str] = None
):
    """Get payment transaction history with filters"""
    query = {}
    if user_id:
        query["user_id"] = user_id
    if level_id:
        query["level_id"] = level_id
    if status:
        query["status"] = status
    if payment_method:
        query["payment_method"] = payment_method
    
    transactions = await db.payment_transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return transactions

@api_router.get("/payments/{transaction_id}")
async def get_payment_by_id(transaction_id: str):
    """Get a specific payment transaction"""
    transaction = await db.payment_transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction

@api_router.post("/payments/initiate")
async def initiate_payment(input: PaymentInitiate):
    """Initiate a payment for level access"""
    # Get level payment config
    config = await db.level_payment_config.find_one({"level_id": input.level_id}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=404, detail="Configuration de paiement non trouvée pour ce niveau")
    
    # Check if payment method is enabled
    if input.payment_method not in config.get("enabled_payment_methods", []):
        raise HTTPException(status_code=400, detail="Méthode de paiement non activée pour ce niveau")
    
    # Create transaction record
    currency = input.currency or config.get("currency", "CHF")
    external_ref = f"AFRO-{uuid.uuid4().hex[:8].upper()}"
    
    transaction = PaymentTransaction(
        user_id=input.user_id,
        level_id=input.level_id,
        amount=config.get("price", 0),
        currency=currency,
        payment_method=input.payment_method,
        external_reference=external_ref,
        status="pending",
        metadata={
            "return_url": input.return_url,
            "level_name": config.get("level_name", input.level_id)
        }
    )
    
    doc = transaction.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.payment_transactions.insert_one(doc)
    
    # Generate payment response based on method
    response = {
        "transaction_id": transaction.id,
        "external_reference": external_ref,
        "amount": transaction.amount,
        "currency": currency,
        "payment_method": input.payment_method,
        "status": "pending"
    }
    
    # Add method-specific data
    if input.payment_method == "stripe":
        # In production: create Stripe PaymentIntent here
        response["action"] = "redirect"
        response["message"] = "Stripe integration - créer PaymentIntent avec clé API"
        response["instructions"] = config.get("payment_instructions", {}).get("stripe", "")
    
    elif input.payment_method in ["twint_api", "twint_link"]:
        response["action"] = "qr_code" if input.payment_method == "twint_api" else "link"
        response["instructions"] = config.get("payment_instructions", {}).get("twint", "")
    
    elif input.payment_method.startswith("mobile_money"):
        provider = input.payment_method.replace("mobile_money_", "")
        response["action"] = "ussd_prompt"
        response["provider"] = provider
        response["instructions"] = config.get("payment_instructions", {}).get(input.payment_method, "")
        response["message"] = f"Mobile Money {provider.upper()} - en attente d'intégration API"
    
    elif input.payment_method.startswith("aggregator"):
        aggregator = input.payment_method.replace("aggregator_", "")
        response["action"] = "redirect"
        response["aggregator"] = aggregator
        response["message"] = f"Agrégateur {aggregator.upper()} - en attente d'intégration API"
    
    else:
        response["action"] = "manual"
        response["instructions"] = config.get("payment_instructions", {}).get(input.payment_method, "Paiement manuel")
    
    return response

@api_router.post("/payments/webhook")
async def payment_webhook(input: PaymentWebhook):
    """Handle payment webhook from providers (Stripe, TWINT, Mobile Money, etc.)"""
    # Find transaction
    transaction = await db.payment_transactions.find_one({
        "$or": [
            {"id": input.transaction_id},
            {"external_reference": input.transaction_id},
            {"provider_transaction_id": input.transaction_id}
        ]
    })
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    now = datetime.now(timezone.utc)
    update_data = {
        "webhook_received": True,
        "provider_transaction_id": input.metadata.get("provider_id", input.transaction_id),
        "updated_at": now.isoformat()
    }
    
    if input.status == "completed" or input.status == "succeeded":
        update_data["status"] = "completed"
        update_data["completed_at"] = now.isoformat()
        
        # Create UserAccess automatically
        access = UserAccess(
            user_id=transaction["user_id"],
            level_id=transaction["level_id"],
            status="active",
            access_type="payment",
            granted_at=now,
            payment_id=transaction["id"]
        )
        
        access_doc = access.model_dump()
        access_doc["created_at"] = access_doc["created_at"].isoformat()
        access_doc["updated_at"] = access_doc["updated_at"].isoformat()
        access_doc["granted_at"] = access_doc["granted_at"].isoformat()
        
        await db.user_access.insert_one(access_doc)
        update_data["access_id"] = access.id
        
        # Update user_level_progress for backward compatibility
        await db.user_level_progress.update_one(
            {"user_id": transaction["user_id"], "level_id": transaction["level_id"]},
            {"$set": {
                "access_granted": True,
                "payment_status": "validated",
                "updated_at": now.isoformat()
            }},
            upsert=True
        )
    
    elif input.status == "failed":
        update_data["status"] = "failed"
    
    elif input.status == "refunded":
        update_data["status"] = "refunded"
        # Revoke access if exists
        if transaction.get("access_id"):
            await db.user_access.update_one(
                {"id": transaction["access_id"]},
                {"$set": {
                    "status": "revoked",
                    "revoked_at": now.isoformat(),
                    "revoked_by": "system",
                    "revoke_reason": "Paiement remboursé"
                }}
            )
    
    await db.payment_transactions.update_one(
        {"id": transaction["id"]},
        {"$set": update_data}
    )
    
    return {"success": True, "status": update_data.get("status", input.status)}

@api_router.post("/payments/{transaction_id}/complete", dependencies=[Depends(require_admin)])
async def complete_payment_manual(transaction_id: str):
    """Admin manually completes a payment (for manual verification)"""
    transaction = await db.payment_transactions.find_one({"id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Seules les transactions en attente peuvent être complétées")
    
    # Simulate webhook completion
    webhook_data = PaymentWebhook(
        provider="manual",
        event_type="payment.completed",
        transaction_id=transaction_id,
        status="completed",
        metadata={"completed_by": "admin"}
    )
    
    return await payment_webhook(webhook_data)

# =====================
# STRIPE REAL PAYMENT ENDPOINTS
# =====================

# Stripe API key from environment
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')

class StripeCheckoutRequest(BaseModel):
    """Request to create a Stripe checkout session"""
    user_id: str
    level_id: str
    origin_url: str  # Frontend origin for success/cancel URLs

class StripeCheckoutResponse(BaseModel):
    """Response with Stripe checkout URL"""
    checkout_url: str
    session_id: str
    transaction_id: str

@api_router.post("/stripe/create-checkout")
async def create_stripe_checkout(request: Request, input: StripeCheckoutRequest):
    """Create a Stripe Checkout Session for level payment"""
    
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    # Get level payment config to get the price
    config = await db.level_payment_config.find_one({"level_id": input.level_id}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=404, detail="Configuration de paiement non trouvée pour ce niveau")
    
    if "stripe" not in config.get("enabled_payment_methods", []):
        raise HTTPException(status_code=400, detail="Stripe n'est pas activé pour ce niveau")
    
    price = config.get("price", 0)
    currency = config.get("currency", "CHF").lower()
    
    if price <= 0:
        raise HTTPException(status_code=400, detail="Prix invalide pour ce niveau")

    # Gating sequentiel (option c) : interdit de payer/debloquer un niveau si le quiz
    # du niveau precedent n'est pas reussi. Reussir un quiz ne contourne PAS le paiement.
    if not await _prerequisite_met(input.user_id, input.level_id):
        raise HTTPException(status_code=403, detail="Réussissez d'abord le quiz du niveau précédent pour débloquer ce niveau.")

    # Create internal transaction FIRST (before redirect to Stripe)
    transaction_id = str(uuid.uuid4())
    external_ref = f"AFRO-STRIPE-{uuid.uuid4().hex[:8].upper()}"
    
    transaction = {
        "id": transaction_id,
        "user_id": input.user_id,
        "level_id": input.level_id,
        "amount": float(price),
        "currency": currency.upper(),
        "payment_method": "stripe",
        "status": "pending",
        "external_reference": external_ref,
        "provider_transaction_id": None,
        "stripe_session_id": None,
        "webhook_received": False,
        "access_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "metadata": {
            "level_name": config.get("level_name", input.level_id)
        }
    }
    
    await db.payment_transactions.insert_one(transaction)
    
    # Build success/cancel URLs
    success_url = f"{input.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}&transaction_id={transaction_id}"
    cancel_url = f"{input.origin_url}/levels?payment_cancelled=true"
    
    # Initialize Stripe checkout
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    # Create checkout session
    checkout_request = CheckoutSessionRequest(
        amount=float(price),
        currency=currency,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "transaction_id": transaction_id,
            "user_id": input.user_id,
            "level_id": input.level_id,
            "external_ref": external_ref
        }
    )
    
    try:
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Update transaction with Stripe session ID
        await db.payment_transactions.update_one(
            {"id": transaction_id},
            {"$set": {
                "stripe_session_id": session.session_id,
                "provider_transaction_id": session.session_id
            }}
        )
        
        logger.info(f"Stripe checkout created: session={session.session_id}, transaction={transaction_id}")
        
        return {
            "checkout_url": session.url,
            "session_id": session.session_id,
            "transaction_id": transaction_id
        }
        
    except Exception as e:
        logger.error(f"Stripe checkout creation failed: {e}")
        # Mark transaction as failed
        await db.payment_transactions.update_one(
            {"id": transaction_id},
            {"$set": {"status": "failed", "metadata.error": str(e)}}
        )
        raise HTTPException(status_code=500, detail=f"Erreur Stripe: {str(e)}")


@api_router.get("/stripe/checkout-status/{session_id}")
async def get_stripe_checkout_status(request: Request, session_id: str):
    """Get the status of a Stripe checkout session and update transaction"""
    
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    # Find transaction by session ID
    transaction = await db.payment_transactions.find_one(
        {"stripe_session_id": session_id},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found for this session")
    
    # If already completed, return current status
    if transaction.get("status") == "completed":
        return {
            "status": "completed",
            "payment_status": "paid",
            "transaction_id": transaction["id"],
            "access_status": "pending_admin_validation"
        }
    
    # Poll Stripe for status
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        logger.info(f"Stripe status for {session_id}: {status.payment_status}")
        
        if status.payment_status == "paid":
            # Payment successful - update transaction and create access
            await process_successful_stripe_payment(transaction)
            
            return {
                "status": "completed",
                "payment_status": "paid",
                "transaction_id": transaction["id"],
                "access_status": "pending_admin_validation"
            }
        
        elif status.status == "expired":
            await db.payment_transactions.update_one(
                {"id": transaction["id"]},
                {"$set": {"status": "failed", "metadata.reason": "Session expired"}}
            )
            return {
                "status": "expired",
                "payment_status": "unpaid",
                "transaction_id": transaction["id"]
            }
        
        else:
            return {
                "status": status.status,
                "payment_status": status.payment_status,
                "transaction_id": transaction["id"]
            }
            
    except Exception as e:
        logger.error(f"Error checking Stripe status: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur vérification Stripe: {str(e)}")


async def process_successful_stripe_payment(transaction: dict):
    """Process a successful Stripe payment - create transaction and access"""
    
    now = datetime.now(timezone.utc)
    
    # Check if already processed (prevent duplicate processing)
    current = await db.payment_transactions.find_one({"id": transaction["id"]})
    if current and current.get("status") == "completed":
        logger.info(f"Transaction {transaction['id']} already processed, skipping")
        return
    
    # Update transaction to completed
    await db.payment_transactions.update_one(
        {"id": transaction["id"]},
        {"$set": {
            "status": "completed",
            "completed_at": now.isoformat(),
            "webhook_received": True
        }}
    )
    
    # Create UserAccess ACTIVE immediately: le montant est verifie cote serveur
    # (depuis level_payment_config), donc un paiement reussi donne acces a CE niveau.
    access_id = str(uuid.uuid4())
    access = {
        "id": access_id,
        "user_id": transaction["user_id"],
        "level_id": transaction["level_id"],
        "status": "active",  # paiement verifie => acces immediat
        "access_type": "payment",
        "granted_at": now.isoformat(),
        "expires_at": None,
        "revoked_at": None,
        "revoked_by": None,
        "revoke_reason": None,
        "payment_id": transaction["id"],
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.user_access.insert_one(access)
    
    # Link access to transaction
    await db.payment_transactions.update_one(
        {"id": transaction["id"]},
        {"$set": {"access_id": access_id}}
    )
    
    # Update user_level_progress: acces accorde immediatement (paiement verifie)
    await db.user_level_progress.update_one(
        {"user_id": transaction["user_id"], "level_id": transaction["level_id"]},
        {"$set": {
            "payment_status": "validated",
            "access_granted": True,
            "access_status": "active",
            "updated_at": now.isoformat()
        }},
        upsert=True
    )

    logger.info(f"Stripe payment processed: transaction={transaction['id']}, access={access_id} (active)")


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    # Get raw body for signature verification
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        logger.info(f"Stripe webhook received: event={webhook_response.event_type}, session={webhook_response.session_id}")
        
        if webhook_response.event_type == "checkout.session.completed":
            # Find transaction by session ID
            transaction = await db.payment_transactions.find_one(
                {"stripe_session_id": webhook_response.session_id}
            )
            
            if transaction and transaction.get("status") != "completed":
                if webhook_response.payment_status == "paid":
                    await process_successful_stripe_payment(transaction)
                    logger.info(f"Webhook processed payment for session {webhook_response.session_id}")
        
        return {"received": True, "event": webhook_response.event_type}
        
    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
        # Return 200 to acknowledge receipt even on error (Stripe will retry)
        return {"received": True, "error": str(e)}


# =====================
# PAYREXX (TWINT) ENDPOINTS - STRUCTURE READY
# =====================

@api_router.post("/payrexx/create-payment")
async def create_payrexx_payment(input: PaymentInitiate):
    """Create a Payrexx payment for TWINT (Switzerland)
    
    NOTE: This is a structured placeholder. Real integration requires:
    - Payrexx API key
    - Payrexx instance name
    """
    if not await _prerequisite_met(input.user_id, input.level_id):
        raise HTTPException(status_code=403, detail="Réussissez d'abord le quiz du niveau précédent pour débloquer ce niveau.")
    # Get level payment config
    config = await db.level_payment_config.find_one({"level_id": input.level_id}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=404, detail="Configuration non trouvée")
    
    if "twint_api" not in config.get("enabled_payment_methods", []):
        raise HTTPException(status_code=400, detail="TWINT n'est pas activé pour ce niveau")
    
    price = config.get("price", 0)
    currency = config.get("currency", "CHF")
    
    # Create transaction record (manual mode until Payrexx key provided)
    transaction_id = str(uuid.uuid4())
    external_ref = f"AFRO-TWINT-{uuid.uuid4().hex[:8].upper()}"
    
    transaction = {
        "id": transaction_id,
        "user_id": input.user_id,
        "level_id": input.level_id,
        "amount": float(price),
        "currency": currency,
        "payment_method": "twint_api",
        "status": "pending",
        "external_reference": external_ref,
        "provider_transaction_id": None,
        "webhook_received": False,
        "access_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "metadata": {
            "provider": "payrexx",
            "requires_manual_validation": True,
            "instructions": config.get("payment_instructions", {}).get("twint", "")
        }
    }
    
    await db.payment_transactions.insert_one(transaction)
    
    return {
        "transaction_id": transaction_id,
        "external_reference": external_ref,
        "amount": price,
        "currency": currency,
        "payment_method": "twint_api",
        "status": "pending",
        "action": "manual_validation_required",
        "message": "TWINT Payrexx - En attente d'intégration API. Validation admin requise.",
        "instructions": config.get("payment_instructions", {}).get("twint", "")
    }


# =====================
# FLUTTERWAVE (MOBILE MONEY AFRICA) ENDPOINTS - STRUCTURE READY
# =====================

@api_router.post("/flutterwave/create-payment")
async def create_flutterwave_payment(input: PaymentInitiate):
    """Create a Flutterwave payment for Mobile Money (Africa)
    
    NOTE: This is a structured placeholder. Real integration requires:
    - Flutterwave public key
    - Flutterwave secret key
    """
    if not await _prerequisite_met(input.user_id, input.level_id):
        raise HTTPException(status_code=403, detail="Réussissez d'abord le quiz du niveau précédent pour débloquer ce niveau.")
    # Get level payment config
    config = await db.level_payment_config.find_one({"level_id": input.level_id}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=404, detail="Configuration non trouvée")
    
    # Check if any mobile money method is enabled
    mobile_methods = ["mobile_money_mtn", "mobile_money_orange", "mobile_money_airtel"]
    enabled_methods = config.get("enabled_payment_methods", [])
    
    if not any(m in enabled_methods for m in mobile_methods):
        raise HTTPException(status_code=400, detail="Mobile Money n'est pas activé pour ce niveau")
    
    price = config.get("price", 0)
    currency = input.currency or config.get("currency", "XAF")
    
    # Create transaction record (manual mode until Flutterwave key provided)
    transaction_id = str(uuid.uuid4())
    external_ref = f"AFRO-FLW-{uuid.uuid4().hex[:8].upper()}"
    
    transaction = {
        "id": transaction_id,
        "user_id": input.user_id,
        "level_id": input.level_id,
        "amount": float(price),
        "currency": currency,
        "payment_method": input.payment_method,
        "status": "pending",
        "external_reference": external_ref,
        "provider_transaction_id": None,
        "webhook_received": False,
        "access_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "metadata": {
            "provider": "flutterwave",
            "requires_manual_validation": True,
            "phone_number": input.return_url  # Can be used for phone number in mobile money
        }
    }
    
    await db.payment_transactions.insert_one(transaction)
    
    return {
        "transaction_id": transaction_id,
        "external_reference": external_ref,
        "amount": price,
        "currency": currency,
        "payment_method": input.payment_method,
        "status": "pending",
        "action": "manual_validation_required",
        "message": "Flutterwave Mobile Money - En attente d'intégration API. Validation admin requise."
    }


# =====================
# LEVEL PAYMENT CONFIG ENDPOINTS
# =====================

@api_router.post("/level-payment-config", dependencies=[Depends(require_admin)])
async def create_or_update_payment_config(config: LevelPaymentConfigCreate):
    """Admin creates or updates payment configuration for a level"""
    existing = await db.level_payment_config.find_one({"level_id": config.level_id})
    
    if existing:
        # Update
        update_data = config.model_dump()
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        await db.level_payment_config.update_one(
            {"level_id": config.level_id},
            {"$set": update_data}
        )
        result = await db.level_payment_config.find_one({"level_id": config.level_id}, {"_id": 0})
    else:
        # Create
        config_obj = LevelPaymentConfig(**config.model_dump())
        doc = config_obj.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        
        await db.level_payment_config.insert_one(doc)
        # Fetch without _id to avoid serialization issues
        result = await db.level_payment_config.find_one({"level_id": config.level_id}, {"_id": 0})
    
    return result

@api_router.get("/level-payment-config/{level_id}")
async def get_payment_config(level_id: str):
    """Get payment configuration for a specific level"""
    config = await db.level_payment_config.find_one({"level_id": level_id}, {"_id": 0})
    
    if not config:
        # Return default locked config
        return {
            "level_id": level_id,
            "payment_mode": "both",
            "price": 30,
            "currency": "CHF",
            "enabled_payment_methods": ["stripe", "twint"],
            "payment_instructions": {},
            "volunteer_description": "",
            "engagement_min_events": 3,
            "engagement_charter_text": ""
        }
    
    return config

@api_router.get("/level-payment-config")
async def get_all_payment_configs():
    """Get all payment configurations"""
    configs = await db.level_payment_config.find({}, {"_id": 0}).to_list(1000)
    return configs

# =====================
# ENGAGEMENT (acces gratuit avec engagement benevole) — Phase 1
# =====================

# Rate limiting simple en memoire (anti-abus des endpoints publics sensibles)
_rate_buckets: dict = {}
def rate_limit(request: Request, key: str, limit: int, window: int = 60):
    import time as _t
    ip = (request.client.host if request.client else "unknown")
    now = _t.time()
    bk = f"{key}:{ip}"
    hits = [t for t in _rate_buckets.get(bk, []) if now - t < window]
    if len(hits) >= limit:
        raise HTTPException(status_code=429, detail="Trop de requetes, reessayez dans un instant")
    hits.append(now)
    _rate_buckets[bk] = hits

ENGAGEMENT_EVENT_TYPES = [
    "montage", "demontage", "nettoyage", "rangement",
    "distribution_flyers", "publications_reseaux", "remplacement_formateur",
]

class EngagementCharterCreate(BaseModel):
    user_id: str
    user_name: str = ""
    level_id: str
    signature_name: str
    checkbox_accepted: bool

@api_router.post("/engagement/charter")
async def submit_engagement_charter(input: EngagementCharterCreate, request: Request):
    """Le participant soumet la charte d'engagement (case cochee + signature + horodatage)."""
    rate_limit(request, "charter", limit=5, window=300)
    if not input.checkbox_accepted:
        raise HTTPException(status_code=400, detail="Vous devez accepter la charte d'engagement")
    if not (input.signature_name or "").strip():
        raise HTTPException(status_code=400, detail="La signature (nom) est requise")
    if not (input.user_id or "").strip():
        raise HTTPException(status_code=400, detail="Identifiant participant manquant")

    config = await db.level_payment_config.find_one({"level_id": input.level_id}, {"_id": 0}) or {}
    n_events = int(config.get("engagement_min_events", 3) or 3)
    charter_text = config.get("engagement_charter_text", "")
    now = datetime.now(timezone.utc)

    existing = await db.engagement_charters.find_one(
        {"user_id": input.user_id, "level_id": input.level_id, "status": {"$in": ["pending", "validated"]}},
        {"_id": 0},
    )
    if existing:
        return {"success": True, "already": True, "charter": existing}

    charter = {
        "id": str(uuid.uuid4()),
        "user_id": input.user_id.strip(),
        "user_name": (input.user_name or "").strip(),
        "level_id": input.level_id,
        "events_promised": n_events,
        "charter_text": charter_text,
        "checkbox_accepted": True,
        "signature_name": input.signature_name.strip(),
        "accepted_at": now.isoformat(),
        "status": "pending",
        "events_done": [],
        "validated_at": None,
        "validated_by": None,
        "revoked_at": None,
        "revoke_reason": None,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    await db.engagement_charters.insert_one(charter)
    await db.user_level_progress.update_one(
        {"user_id": input.user_id, "level_id": input.level_id},
        {"$set": {"volunteer_status": "pending", "updated_at": now.isoformat()}},
        upsert=True,
    )
    charter.pop("_id", None)
    return {"success": True, "charter": charter}

@api_router.get("/engagement/me/{user_id}")
async def my_engagement(user_id: str):
    return await db.engagement_charters.find({"user_id": user_id}, {"_id": 0}).to_list(100)

@api_router.get("/engagement/admin/all", dependencies=[Depends(require_admin)])
async def all_engagements():
    return await db.engagement_charters.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)

@api_router.post("/engagement/{charter_id}/validate")
async def validate_engagement(charter_id: str, admin=Depends(require_admin)):
    """Admin valide la charte -> octroie un acces 'volunteer' actif au niveau."""
    charter = await db.engagement_charters.find_one({"id": charter_id})
    if not charter:
        raise HTTPException(status_code=404, detail="Charte introuvable")
    now = datetime.now(timezone.utc)
    await db.engagement_charters.update_one(
        {"id": charter_id},
        {"$set": {"status": "validated", "validated_at": now.isoformat(),
                  "validated_by": admin.get("sub"), "updated_at": now.isoformat()}},
    )
    existing = await db.user_access.find_one(
        {"user_id": charter["user_id"], "level_id": charter["level_id"], "status": "active"})
    if not existing:
        await db.user_access.insert_one({
            "id": str(uuid.uuid4()), "user_id": charter["user_id"], "level_id": charter["level_id"],
            "status": "active", "access_type": "volunteer", "granted_at": now.isoformat(),
            "expires_at": None, "revoked_at": None, "revoked_by": None, "revoke_reason": None,
            "payment_id": None, "created_at": now.isoformat(), "updated_at": now.isoformat(),
        })
    await db.user_level_progress.update_one(
        {"user_id": charter["user_id"], "level_id": charter["level_id"]},
        {"$set": {"volunteer_status": "validated", "access_granted": True,
                  "access_status": "active", "updated_at": now.isoformat()}},
        upsert=True,
    )
    return {"success": True, "message": "Engagement valide, acces accorde"}

@api_router.post("/engagement/{charter_id}/mark-event")
async def mark_engagement_event(charter_id: str, input: dict, admin=Depends(require_admin)):
    """Admin marque un evenement realise par le participant."""
    ev_type = (input.get("type") or "").strip()
    if ev_type not in ENGAGEMENT_EVENT_TYPES:
        raise HTTPException(status_code=400, detail="Type d'evenement invalide")
    charter = await db.engagement_charters.find_one({"id": charter_id})
    if not charter:
        raise HTTPException(status_code=404, detail="Charte introuvable")
    now = datetime.now(timezone.utc)
    event = {"type": ev_type, "date": input.get("date") or now.isoformat(), "marked_by": admin.get("sub")}
    await db.engagement_charters.update_one(
        {"id": charter_id},
        {"$push": {"events_done": event}, "$set": {"updated_at": now.isoformat()}},
    )
    return {"success": True, "charter": await db.engagement_charters.find_one({"id": charter_id}, {"_id": 0})}

@api_router.post("/engagement/{charter_id}/revoke")
async def revoke_engagement(charter_id: str, input: dict = None, admin=Depends(require_admin)):
    charter = await db.engagement_charters.find_one({"id": charter_id})
    if not charter:
        raise HTTPException(status_code=404, detail="Charte introuvable")
    now = datetime.now(timezone.utc)
    reason = (input or {}).get("reason", "")
    await db.engagement_charters.update_one(
        {"id": charter_id},
        {"$set": {"status": "revoked", "revoked_at": now.isoformat(),
                  "revoke_reason": reason, "updated_at": now.isoformat()}},
    )
    await db.user_access.update_many(
        {"user_id": charter["user_id"], "level_id": charter["level_id"],
         "access_type": "volunteer", "status": "active"},
        {"$set": {"status": "revoked", "revoked_at": now.isoformat(),
                  "revoke_reason": reason, "updated_at": now.isoformat()}},
    )
    await db.user_level_progress.update_one(
        {"user_id": charter["user_id"], "level_id": charter["level_id"]},
        {"$set": {"volunteer_status": "rejected", "access_granted": False, "updated_at": now.isoformat()}},
    )
    return {"success": True}

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
    c.setFont(UTF8_FONT_BOLD, 42)
    c.drawCentredString(width/2, height - 4.5*cm, "AFROBOOST")
    
    # Subtitle
    c.setFillColor(colors.white)
    c.setFont(UTF8_FONT_BOLD, 20)
    c.drawCentredString(width/2, height - 6*cm, "Certification Instructeur")
    
    c.setFont(UTF8_FONT, 16)
    c.drawCentredString(width/2, height - 7*cm, "Vue d'Ensemble du Programme Complet")
    
    # Section: What is Afroboost
    y_pos = height - 9*cm
    c.setFillColor(colors.HexColor('#a855f7'))
    c.setFont(UTF8_FONT_BOLD, 14)
    c.drawString(3*cm, y_pos, "QU'EST-CE QU'AFROBOOST ?")
    
    y_pos -= 0.8*cm
    c.setFillColor(colors.white)
    c.setFont(UTF8_FONT, 11)
    text = "Afroboost est une méthode de danse énergique inspirée des rythmes afrobeat,"
    c.drawString(3*cm, y_pos, text)
    y_pos -= 0.5*cm
    text = "combinant fitness, expression corporelle et culture africaine contemporaine."
    c.drawString(3*cm, y_pos, text)
    
    # Section: Training Objectives
    y_pos -= 1.2*cm
    c.setFillColor(colors.HexColor('#a855f7'))
    c.setFont(UTF8_FONT_BOLD, 14)
    c.drawString(3*cm, y_pos, "OBJECTIFS DE LA FORMATION")
    
    y_pos -= 0.8*cm
    c.setFillColor(colors.white)
    c.setFont(UTF8_FONT, 11)
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
    c.setFont(UTF8_FONT_BOLD, 14)
    c.drawString(3*cm, y_pos, "PARCOURS DE FORMATION COMPLET")
    
    y_pos -= 0.8*cm
    c.setFillColor(colors.HexColor('#c084fc'))
    c.setFont(UTF8_FONT_BOLD, 11)
    
    modules = [
        ("Level 1 – Afroboost DNA", "Fondamentaux: mouvements de base, rythme et coordination"),
        ("Level 2 – Rhythm Foundation", "Variations rythmiques, transitions et musicalité avancée"),
        ("Level 3 – Style & Flow", "Expression personnelle, improvisation et performance"),
        ("Level 4 – Teaching Fundamentals", "Pédagogie, communication et structuration de cours"),
        ("Level 5 – Master Instructor", "Chorégraphies originales, mentorat et leadership")
    ]
    
    for module_name, description in modules:
        c.setFillColor(colors.HexColor('#c084fc'))
        c.setFont(UTF8_FONT_BOLD, 11)
        c.drawString(3.5*cm, y_pos, module_name)
        y_pos -= 0.5*cm
        c.setFillColor(colors.white)
        c.setFont(UTF8_FONT, 9)
        c.drawString(3.8*cm, y_pos, description)
        y_pos -= 0.8*cm
    
    # Section: Certification Paths
    y_pos -= 0.6*cm
    c.setFillColor(colors.HexColor('#a855f7'))
    c.setFont(UTF8_FONT_BOLD, 14)
    c.drawString(3*cm, y_pos, "PARCOURS DE CERTIFICATION")
    
    y_pos -= 0.8*cm
    c.setFillColor(colors.white)
    c.setFont(UTF8_FONT_BOLD, 11)
    
    paths = [
        ("CERTIFICATION EN LIGNE", "Autorisé à enseigner Afroboost en ligne"),
        ("CERTIFICATION PRÉSENTIEL", "Autorisé à enseigner Afroboost en présentiel"),
        ("CERTIFICATION HYBRIDE", "Autorisé à enseigner Afroboost en ligne et présentiel")
    ]
    
    for path_name, path_desc in paths:
        c.setFont(UTF8_FONT_BOLD, 11)
        c.drawString(3.5*cm, y_pos, path_name)
        y_pos -= 0.5*cm
        c.setFont(UTF8_FONT, 9)
        c.drawString(3.8*cm, y_pos, path_desc)
        y_pos -= 0.8*cm
    
    # Section: Rights After Certification
    y_pos -= 0.6*cm
    c.setFillColor(colors.HexColor('#a855f7'))
    c.setFont(UTF8_FONT_BOLD, 14)
    c.drawString(3*cm, y_pos, "DROITS APRÈS CERTIFICATION")
    
    y_pos -= 0.8*cm
    c.setFillColor(colors.white)
    c.setFont(UTF8_FONT, 11)
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
    c.setFont(UTF8_FONT_BOLD, 10)
    c.drawString(3.5*cm, y_pos - 0.5*cm, "AVIS IMPORTANT")
    
    c.setFillColor(colors.white)
    c.setFont(UTF8_FONT, 9)
    c.drawString(3.5*cm, y_pos - 0.9*cm, "Ce document est officiel et imprimable.")
    c.drawString(3.5*cm, y_pos - 1.2*cm, "Il ne confère pas de certification. La certification s'obtient après validation.")
    
    # Footer
    c.setFillColor(colors.HexColor('#71717a'))
    c.setFont(UTF8_FONT_OBLIQUE, 10)
    c.drawCentredString(width/2, 2.8*cm, "Programme de Formation Afroboost – Document Officiel")
    c.setFont(UTF8_FONT, 8)
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
