# CoWorkSpace Backend API
Sistema completo di gestione spazi di coworking con autenticazione, prenotazioni, pagamenti Stripe e dashboard analytics.

# Team:
757608 --> Babini Ariele
758017 --> Bottaro Federico

Strumenti:
- Docker e Docker Compose
- Node.js
- Bootstrap 5.3.5
- Express.js
- PostgreSQL



## 📋 Indice

- [Caratteristiche](#caratteristiche)
- [Architettura](#architettura)
- [Installazione](#installazione)
- [Configurazione](#configurazione)
- [API Endpoints](#api-endpoints)
- [Autenticazione](#autenticazione)
- [Sistema Pagamenti](#sistema-pagamenti)
- [Analytics Dashboard](#analytics-dashboard)
- [Database](#database)
- [Sviluppo](#sviluppo)


## ✨ Caratteristiche

### Core Features
- **Gestione utenti** con ruoli (client, manager, admin)
- **CRUD spazi di coworking** con immagini e disponibilità
- **Sistema prenotazioni** con controllo conflitti
- **Pagamenti Stripe** integrati (modalità test)
- **Dashboard Analytics** con metriche in tempo reale

### Architettura & Security
- **Docker containerizzato** per sviluppo e produzione
- **PostgreSQL** come database principale
- **Rate limiting** basato su ruoli
- **Validazione input** completa
- **Error handling** professionale
- **CORS** configurabile
- **Helmet** per security headers

## 🏗️ Architettura

```
├── api/                          # Backend Node.js/Express
│   ├── src/
│   │   ├── config/              # Configurazioni (DB, Swagger)
│   │   ├── controllers/         # Logic layer
│   │   ├── middleware/          # Auth, validation, errors
│   │   ├── models/              # Data access layer
│   │   ├── routes/              # API routes
│   │   ├── services/            # Business logic (Stripe, Email)
│   │   ├── utils/               # Utilities & logging
│   │   └── app.js/              # File principale per server
│   └── Dockerfile
├── database/
│   └── init/                    # SQL migration files
├── docker-compose.yml           # Multi-container setup
├── .env                         # Environment variables
└── README.md
```

### Stack Tecnologico
- **Runtime**: Node.js 18+ Alpine
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **Payments**: Stripe API
- **Validation**: express-validator
- **Documentation**: Swagger/OpenAPI

## 🚀 Installazione

### Prerequisiti
- Docker & Docker Compose
- Git

### Quick Start

1. **Clone del repository**
   ```bash
   git clone <repository-url>
   cd coworkspace-backend
   ```

2. **Setup environment**
   ```bash
   cp .env.example .env
   # Modifica .env con le tue configurazioni
   ```

3. **Avvio con Docker**
   ```bash
   docker-compose up --build
   ```

4. **Verifica installazione**
   ```bash
   curl http://localhost:3000/api/health
   ```

## ⚙️ Configurazione

### File .env

```bash
# Application
NODE_ENV=development
PORT=3000

# Database PostgreSQL
DB_HOST=postgres
DB_PORT=5432
DB_NAME=coworkspace
DB_USER=coworkspace_user
DB_PASSWORD=coworkspace_password

# Stripe Payments (TEST MODE)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email Service
EMAIL_FROM=noreply@coworkspace.com
EMAIL_SERVICE=gmail  # opzionale
EMAIL_USER=your-email@gmail.com  # opzionale
EMAIL_PASSWORD=your-app-password  # opzionale

# Security & Features
CORS_ORIGIN=http://localhost:3001
ENABLE_SWAGGER=true
ENABLE_RATE_LIMITING=true
BCRYPT_ROUNDS=12
```

### Chiavi Stripe
Per ottenere le chiavi Stripe test:
1. Registrati su [stripe.com](https://stripe.com)
2. Vai in "Developers" → "API keys"
3. Copia le chiavi test (iniziano con `sk_test_` e `pk_test_`)

## 📚 API Endpoints

### Base URL
```
http://localhost:3000/api
```

### Health Check
```http
GET /health
GET /payments/health
GET /analytics/health
```

### Autenticazione
```http
POST /auth/register          # Registrazione utente
POST /auth/login             # Login
POST /auth/refresh           # Refresh token
POST /auth/logout            # Logout
POST /auth/forgot-password   # Reset password
POST /auth/verify-email      # Verifica email
```

### Utenti
```http
GET    /users                # Lista utenti (admin/manager)
GET    /users/profile        # Profilo corrente
GET    /users/:id            # Dettagli utente
PUT    /users/profile        # Aggiorna profilo
PUT    /users/:id/role       # Cambia ruolo (admin)
DELETE /users/:id            # Elimina utente (admin)
```

### Spazi
```http
GET    /spaces               # Lista spazi pubblici
POST   /spaces               # Crea spazio (manager/admin)
GET    /spaces/:id           # Dettagli spazio
PUT    /spaces/:id           # Aggiorna spazio (owner/admin)
DELETE /spaces/:id           # Elimina spazio (owner/admin)
GET    /spaces/:id/availability  # Disponibilità spazio
```

### Prenotazioni
```http
GET    /bookings             # Liste prenotazioni utente
POST   /bookings             # Crea prenotazione
GET    /bookings/:id         # Dettagli prenotazione
PUT    /bookings/:id         # Modifica prenotazione
DELETE /bookings/:id         # Cancella prenotazione
POST   /bookings/:id/confirm # Conferma (manager)
```

### Pagamenti
```http
GET    /payments/health              # Status servizio
GET    /payments/test-stripe         # Test Stripe (dev)
POST   /payments/create-intent       # Crea payment intent
GET    /payments/:id                 # Stato pagamento
GET    /payments/user/my-payments    # Pagamenti utente
POST   /payments/webhook/stripe      # Webhook Stripe
GET    /payments/admin/stats         # Statistiche (admin)
```

### Analytics
```http
GET    /analytics/health                 # Status servizio
GET    /analytics/dashboard/admin        # Dashboard admin
GET    /analytics/dashboard/manager      # Dashboard manager
GET    /analytics/dashboard/user         # Dashboard utente
GET    /analytics/export                 # Export CSV
```

## 🔐 Autenticazione

### Registrazione
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123",
    "firstName": "Mario",
    "lastName": "Rossi"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com", 
    "password": "Password123"
  }'
```

## 💳 Sistema Pagamenti

### Integrazione Stripe

Il sistema usa Stripe in **modalità test** per sicurezza educativa:

1. **Creazione Payment Intent**
   ```bash
   curl -X POST http://localhost:3000/api/payments/create-intent \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"bookingId": "booking-uuid"}'
   ```

2. **Test Stripe Connection**
   ```bash
   curl http://localhost:3000/api/payments/test-stripe
   ```

3. **Webhook Events**
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`

### Carte Test Stripe
```
Visa:           4242 4242 4242 4242
Visa Debit:     4000 0566 5566 5556
Mastercard:     5555 5555 5555 4444
American Express: 3782 822463 10005
Declined:       4000 0000 0000 0002
```

## 📊 Analytics Dashboard

### Metriche Disponibili

**Admin Dashboard**
- Utenti totali e nuovi registrati
- Ricavi totali e giornalieri  
- Prenotazioni e tasso conversione
- Top spazi per performance
- Metodi di pagamento utilizzati

**Manager Dashboard**
- Performance spazi gestiti
- Tasso occupazione
- Recensioni e rating
- Ricavi per spazio

**User Dashboard**
- Prenotazioni personali
- Spesa totale
- Spazi preferiti
- Storico attività

### Esempio Response Analytics
```json
{
  "success": true,
  "data": {
    "general": {
      "users": {"total": 125, "new": 8},
      "bookings": {"total": 89, "confirmed": 76},
      "revenue": {"total": 2450.00, "payments": 45}
    },
    "topSpaces": [
      {
        "id": "1", 
        "name": "Creative Hub Milano",
        "revenue": 850.00,
        "bookings": {"total": 25, "confirmed": 23}
      }
    ]
  }
}
```

## 💾 Database

### Schema Principale

**users** - Gestione utenti
- `id` (UUID, PK)
- `email` (unique)
- `password_hash`
- `first_name`, `last_name`
- `role` (client/manager/admin)
- `status` (active/inactive/suspended)

**spaces** - Spazi coworking
- `id` (UUID, PK) 
- `name`, `description`
- `type` (hot-desk/private-office/meeting-room/event-space)
- `capacity`, `price_per_day`
- `amenities` (JSONB)
- `images` (JSONB)
- `manager_id` (FK users)

**bookings** - Prenotazioni
- `id` (UUID, PK)
- `user_id` (FK users)
- `space_id` (FK spaces)
- `start_date`, `end_date`
- `base_price`, `fees`,`total_price` 
- `status`, `notes`

**payments** - Transazioni
- `id` (UUID, PK)
- `booking_id` (FK bookings)
- `stripe_payment_intent_id`, `payment_method`
- `amount`, `currency`, `status`

### Migrazioni

```bash
# Le migrazioni sono applicate automaticamente all'avvio
# File: database/init/01-create-tables.sql
```

## 🔧 Sviluppo

### Struttura Progetto

```
api/src/
├── config/
│   ├── database.js          # Connessione PostgreSQL
│   ├── redis.js             # Cache (opzionale)
│   └── stripeConfig.js      # Configurazione per pagamento con Stripe
├── controllers/
│   ├── authController.js    # Autenticazione
│   ├── userController.js    # Gestione utenti
│   ├── spaceController.js   # Spazi coworking
│   ├── bookingController.js # Prenotazioni  
│   ├── paymentController.js # Pagamenti Stripe
│   └── analyticsController.js # Dashboard
├── middleware/
│   ├── auth.js              # JWT authentication
│   ├── roleAuth.js          # Role-based access
│   ├── routeAdapter.js      # Route-based access
│   └── errorHandler.js      # Error management
├── models/
│   ├── User.js              # User data access
│   ├── Space.js             # Space data access
│   ├── Booking.js           # Booking data access
│   └── Payment.js           # Payment data access
├── routes/
│   ├── admin.js             # Admin endpoints
│   ├── auth.js              # Auth endpoints
│   ├── users.js             # User endpoints
│   ├── spaces.js            # Space endpoints
│   ├── bookings.js          # Booking endpoints
│   ├── manager.js           # Manager endpoints
│   ├── payments.js          # Payment endpoints
│   └── analytics.js         # Analytics endpoints
├── services/
│   ├── analyticsService.js  # Analytics notifications
│   ├── emailService.js      # Email notifications
│   └── stripeService.js     # Stripe integration
└── utils/
    ├── logger.js            # Winston logging
    └── validators.js        # Input validation
```

### Comandi Sviluppo

```bash
# Sviluppo con hot reload
npm run dev

# Test
npm test
npm run test:watch
npm run test:coverage

# Linting
npm run lint
npm run lint:fix

# Formato codice
npm run format

# Documentazione
npm run docs
```

### Debug

```bash
# Log in tempo reale
docker-compose logs -f api

# Connessione database
docker exec -it coworkspace_postgres psql -U coworkspace_user -d coworkspace

# Restart singolo servizio
docker-compose restart api

# Reset completo
docker-compose down -v && docker-compose up --build
```

## 🚀 Deploy

### Ambiente Produzione

1. **Environment Variables**
   ```bash
   NODE_ENV=production
   JWT_SECRET=<strong-production-secret>
   DB_PASSWORD=<secure-database-password>
   STRIPE_SECRET_KEY=<live-stripe-key>  # Solo in produzione reale
   ```

2. **Docker Production Build**
   ```bash
   docker build -t coworkspace-api ./api
   docker run -p 3000:3000 coworkspace-api
   ```

3. **Cloud Deploy Options**
   - **Railway** - Deploy automatico da Git
   - **Heroku** - Con PostgreSQL addon
   - **AWS ECS** - Container orchestration
   - **Google Cloud Run** - Serverless containers
   - **DigitalOcean Apps** - Managed containers

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy API
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build & Deploy
        run: |
          docker build -t api ./api
          # Deploy commands
```

## 🧪 Test

### Test Suite

```bash
# Unit tests
npm test

# Integration tests  
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Test Manuali

**Script di test completo:**
```bash
#!/bin/bash
# test-system.sh

API_BASE="http://localhost:3000"

echo "Testing system health..."
curl $API_BASE/api/health

echo "Testing user registration..."
curl -X POST $API_BASE/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123","firstName":"Test","lastName":"User"}'

echo "Testing login..."
curl -X POST $API_BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123"}'
```

### Carte Test

Per testare i pagamenti:
```bash
# Test successful payment
curl -X POST $API_BASE/api/payments/create-intent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"test-booking-uuid"}'
```

## 🎯 Roadmap

### v2.0 Features Planned
- [ ] Sistema recensioni e rating
- [ ] Notifiche push in tempo reale
- [ ] Integrazione calendario (Google/Outlook)
- [ ] Sistema loyalty points
- [ ] Multi-tenancy per catene coworking
- [ ] API GraphQL
- [ ] Mobile app companion

### v1.1 Miglioramenti
- [ ] Cache Redis per performance
- [ ] Rate limiting avanzato
- [ ] Audit logging completo  
- [ ] API versioning
- [ ] Metrics e monitoring
- [ ] Backup automatico DB

---

**CoWorkSpace Backend API v1.0.0**  
Sistema completo di gestione spazi coworking enterprise-ready
