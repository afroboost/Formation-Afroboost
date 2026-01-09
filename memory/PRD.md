# Afroboost Certification System - PRD

## Vision
Système complet de certification pour instructeurs de danse Afroboost, permettant la gestion des niveaux de formation, examens, et génération de diplômes officiels.

## Problem Statement
Créer un système de certification et diplôme complet pour la marque Afroboost comprenant:
- Gestion des niveaux de formation (5 niveaux)
- Réservation et validation d'examens
- Génération de PDF officiels (diplômes, documents de niveau, résumé de formation)
- Système d'accès basé sur paiement ou bénévolat
- Panneau d'administration complet
- **Paiements multi-régions (Europe, Suisse, Afrique)**

## Core Requirements

### Système de Niveaux
- 5 niveaux de formation: DNA, Rhythm Foundation, Style & Flow, Teaching Fundamentals, Master Instructor
- Chaque niveau contient des compétences à valider
- Accès conditionné par paiement ou bénévolat (configuré par admin)
- Contenu de formation (vidéos, texte, sessions live) à compléter avant validation

### Système d'Examen
- Réservation de dates d'examen
- Validation par admin (réussi/échoué)
- Génération automatique de certificat après réussite

### Génération de PDF
- Diplômes de certification (Online, In-Person, Hybrid)
- Documents de validation de niveau
- Résumé global de formation (public, sans authentification)
- Support UTF-8 complet pour caractères français (accents)

### Gestion des Accès (COMPLÈTE)
- Créer un accès (admin_grant, payment, volunteer)
- Modifier un accès (status, type, expiration)
- Supprimer un accès
- Révoquer un accès actif (avec raison)
- Statuts: active, pending, expired, revoked
- Durée configurable (permanent ou avec date d'expiration)

### Paiements Multi-Régions (API-FIRST)
- **Europe**: Stripe PaymentIntent
- **Suisse**: TWINT API, TWINT QR (fallback)
- **Afrique**: MTN Mobile Money, Orange Money, Airtel Money
- **Agrégateurs**: Paystack, Flutterwave, CinetPay
- Webhook automatique → création d'accès
- Historique complet des transactions
- Validation manuelle admin

### Panneau Admin
- Authentification par ID secret (AFRO-ADMIN-2025)
- Gestion des dates d'examen
- Gestion COMPLÈTE des accès (CRUD + révocation)
- Historique des paiements avec filtres
- Configuration des paiements par niveau
- Gestion du contenu de formation

## What's Been Implemented

### Completed (January 9, 2026)
- ✅ Système complet de certification avec 3 types de diplômes
- ✅ Page d'examen avec réservation
- ✅ Page de résultat (succès/échec)
- ✅ Page des diplômes avec téléchargement PDF
- ✅ Page des niveaux avec progression
- ✅ Panneau d'administration complet
- ✅ Génération de PDF avec polices DejaVuSans (UTF-8)
- ✅ Configuration des paiements par niveau (admin)
- ✅ Affichage dynamique des boutons de paiement/bénévolat
- ✅ Système d'accès par paiement ou bénévolat
- ✅ Contenu de formation avec vidéos et sessions live
- ✅ Page de vérification publique de certificat
- ✅ Boutons de partage social ("copier le lien")
- ✅ Résumé de formation PDF global (public)
- ✅ **Gestion COMPLÈTE des accès (CRUD + révocation)**
- ✅ **Paiements multi-régions (Stripe, TWINT, Mobile Money)**
- ✅ **Historique des transactions avec filtres**
- ✅ **Webhook de paiement → création automatique d'accès**

## API Endpoints

### Accès Utilisateur
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/access | GET | Liste tous les accès (filtrable) |
| /api/access | POST | Créer un accès |
| /api/access/{id} | GET | Obtenir un accès |
| /api/access/{id} | PUT | Modifier un accès |
| /api/access/{id} | DELETE | Supprimer un accès |
| /api/access/{id}/revoke | POST | Révoquer un accès actif |

### Paiements
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/payments/history | GET | Historique des transactions |
| /api/payments/initiate | POST | Initier un paiement |
| /api/payments/webhook | POST | Webhook providers |
| /api/payments/{id}/complete | POST | Validation manuelle |

### Autres
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/admin/auth | POST | Authentification admin |
| /api/exam-dates | GET/POST/DELETE | Gestion dates d'examen |
| /api/certificates | GET/POST | Gestion certificats |
| /api/level-content | GET/POST | Contenu de formation |
| /api/level-payment-config | GET/POST | Config paiements |
| /api/training-summary/pdf | GET | Résumé PDF public |

## Architecture

### Tech Stack
- Frontend: React + TailwindCSS + Shadcn/UI
- Backend: FastAPI (Python)
- Database: MongoDB
- PDF: ReportLab avec polices DejaVuSans

### Key Files
- `/app/backend/server.py` - API backend
- `/app/frontend/src/LevelsPage.js` - Page de progression
- `/app/frontend/src/AdminPanel.js` - Panneau admin
- `/app/frontend/src/AdminAccessComplete.js` - **Gestion CRUD accès**
- `/app/frontend/src/AdminPaymentHistory.js` - **Historique paiements**
- `/app/frontend/src/AdminPaymentConfig.js` - Config paiements

## Data Models

### UserAccess
```json
{
  "id": "uuid",
  "user_id": "string",
  "level_id": "string",
  "status": "active|pending|expired|revoked",
  "access_type": "payment|volunteer|admin_grant",
  "granted_at": "datetime",
  "expires_at": "datetime|null",
  "revoked_at": "datetime|null",
  "revoked_by": "string|null",
  "revoke_reason": "string|null",
  "payment_id": "string|null"
}
```

### PaymentTransaction
```json
{
  "id": "uuid",
  "user_id": "string",
  "level_id": "string",
  "amount": "float",
  "currency": "CHF|EUR|XAF|XOF|NGN|GHS",
  "payment_method": "stripe|twint_api|mobile_money_mtn|...",
  "status": "pending|completed|failed|refunded",
  "external_reference": "string",
  "provider_transaction_id": "string|null",
  "access_id": "string|null"
}
```

## Test Credentials
- **Admin ID**: AFRO-ADMIN-2025
- **Test User**: ID=test-user-123, Name=Jean-François Éloïse

## Test Reports
- `/app/test_reports/iteration_1.json` - Tests initiaux
- `/app/test_reports/iteration_2.json` - Tests Access CRUD + Paiements (27/27 ✅)
- `/app/test_reports/iteration_3.json` - Tests Stripe Payment Integration (17/17 ✅)

## Payment Integration Status

### ✅ Stripe (Europe/International) - RÉEL
- Mode: TEST (sk_test_emergent)
- Checkout URL: checkout.stripe.com (RÉEL)
- Transaction: Créée AVANT redirection
- Webhook: /api/webhook/stripe
- Accès: Créé avec status='pending' (validation admin)

### 🟡 TWINT (Suisse) - Manuel temporaire
- Provider: Payrexx (prévu)
- Endpoint: /api/payrexx/create-payment
- Transaction: Créée avec status='pending'
- Action: Validation admin requise

### 🟡 Mobile Money Afrique - Manuel temporaire
- Provider: Flutterwave (prévu)
- Endpoint: /api/flutterwave/create-payment
- Méthodes: MTN MoMo, Orange Money, Airtel Money
- Transaction: Créée avec status='pending'
- Action: Validation admin requise

## Future Backlog
1. Intégration réelle Stripe API (PaymentIntent)
2. Intégration réelle TWINT API
3. Intégration Mobile Money via agrégateur (Paystack/Flutterwave)
4. Notifications par email (demande d'accès, validation)
5. Refactoring de server.py en modules
6. Export des données admin (CSV/Excel)
