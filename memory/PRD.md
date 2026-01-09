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

### Panneau Admin
- Authentification par ID secret (AFRO-ADMIN-2025)
- Gestion des dates d'examen
- Validation des paiements/bénévolat
- Configuration des paiements par niveau
- Gestion du contenu de formation

## What's Been Implemented

### Completed (January 2026)
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

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/admin/auth | POST | Authentification admin |
| /api/exam-dates | GET/POST/DELETE | Gestion dates d'examen |
| /api/exam-bookings | GET/POST | Réservations d'examen |
| /api/certificates | GET/POST | Gestion certificats |
| /api/certificates/verify/{id} | GET | Vérification publique |
| /api/level-documents | GET/POST | Documents de niveau |
| /api/level-content | GET/POST | Contenu de formation |
| /api/level-progress | GET/POST | Progression utilisateur |
| /api/level-payment-config | GET/POST | Config paiements par niveau |
| /api/level-access/request | POST | Demande d'accès |
| /api/level-access/validate | POST | Validation admin |
| /api/training-summary/pdf | GET | Résumé PDF public |

## Architecture

### Tech Stack
- Frontend: React + TailwindCSS + Shadcn/UI
- Backend: FastAPI (Python)
- Database: MongoDB
- PDF: ReportLab avec polices DejaVuSans

### Key Files
- `/app/backend/server.py` - API backend monolithique
- `/app/frontend/src/LevelsPage.js` - Page de progression
- `/app/frontend/src/AdminPanel.js` - Panneau admin
- `/app/frontend/src/AdminPaymentConfig.js` - Config paiements

## Test Credentials
- **Admin ID**: AFRO-ADMIN-2025
- **Test User**: ID=test-user-123, Name=Jean-François Éloïse

## Known Issues (Minor)
- Le checkbox des méthodes de paiement dans AdminPaymentConfig peut nécessiter un rechargement après sauvegarde

## Future Backlog
1. Refactoring de server.py (>1000 lignes) en modules séparés
2. Extraction des composants de App.js vers des fichiers séparés
3. Amélioration de l'UX mobile
