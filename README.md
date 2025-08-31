# 🏢 CoWorkSpace Backend - FUNZIONANTE ✅

API REST completa per la gestione di spazi di coworking costruita con Node.js, Express e PostgreSQL.

## ✅ STATO ATTUALE - COMPLETATO

- ✅ **Database PostgreSQL** connesso e funzionante
- ✅ **API di Autenticazione** complete (register, login, refresh, logout)
- ✅ **Email Service** in modalità mock per sviluppo
- ✅ **Validazioni robuste** password e email
- ✅ **Logging completo** con Winston
- ✅ **Error handling** professionale
- ✅ **Docker setup** funzionante
- ✅ **Health checks** implementati

## 🚀 Quick Start

```bash
# 1. Clona il repository e entra nella directory
cd coworkspace-backend

# 2. Copia il file ambiente
cp .env.example .env

# 3. Avvia tutti i servizi
docker-compose up --build

# 4. Verifica che tutto funzioni
curl http://localhost:3000/api/health
```

## 🧪 Test delle API

### Test di connessione
```bash
curl http://localhost:3000/api/auth/test
# Risposta: {"success":true,"message":"Auth working!"}
```

### Registrazione utente
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123",
    "firstName": "Mario",
    "lastName": "Rossi",
    "phone": "+39 123 456 7890",
    "company": "Example Corp"
  }'
```

### Login utente
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123"
  }'
```

### Refresh token
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your-refresh-token-here"
  }'
```

## 📋 API Endpoints Disponibili

### Autenticazione
- `GET /api/auth/test` - Test connessione
- `POST /api/auth/register` - Registrazione utente
- `POST /api/auth/login` - Login utente
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout utente
- `POST /api/auth/forgot-password` - Reset password

### Sistema
- `GET /api/health` - Health check dell'API
- `GET /api/docs` - Documentazione Swagger (se abilitata)

## 🏗️ Architettura

```
coworkspace-backend/
├── api/                    # Applicazione Node.js/Express
│   ├── src/
│   │   ├── config/        # Database e configurazioni
│   │   ├── controllers/   # Logica business (in sviluppo)
│   │   ├── middleware/    # Auth e error handling
│   │   ├── models/        # Modelli database (User completo)
│   │   ├── routes/        # Route API (auth funzionanti)
│   │   ├── services/      # Email service (mock mode)
│   │   └── utils/         # Logger e utilità
│   ├── package.json       # Dipendenze aggiornate
│   └── Dockerfile
├── database/              # Schema SQL PostgreSQL
│   └── init/              # Script di inizializzazione
├── docker-compose.yml     # Orchestrazione servizi
├── .env.example           # Template variabili ambiente
└── README.md              # Questa guida
```

## 🔧 Configurazione Ambiente

### Variabili principali (.env)
```bash
# Database
DB_HOST=postgres
DB_NAME=coworkspace
DB_USER=coworkspace_user
DB_PASSWORD=coworkspace_password

# Email (modalità mock per sviluppo)
EMAIL_FROM=noreply@coworkspace.com
```

## 📊 Database Schema

### Tabella Users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    company VARCHAR(255),
    role user_role NOT NULL DEFAULT 'client',
    status account_status NOT NULL DEFAULT 'active',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Enums disponibili
- `user_role`: 'client', 'manager', 'admin'
- `account_status`: 'active', 'inactive', 'suspended'


### Headers richiesti per API protette
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

## 📧 Email Service

Attualmente in **modalità mock** per sviluppo:
- ✅ Simula invio email senza connessioni esterne
- ✅ Log delle email "inviate"
- ✅ Non richiede configurazione SMTP

Per abilitare email reali in produzione:
```bash
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

## 🔍 Monitoring e Logs

### Health Check
```bash
curl http://localhost:3000/api/health
```

Risposta:
```json
{
  "status": "healthy",
  "timestamp": "2025-08-02T07:51:36.165Z",
  "services": {
    "database": "connected",
    "redis": "connected", 
    "email": "mock_mode"
  }
}
```

### Log Format
```
2025-08-02 07:51:36 [info]: User registered: mario.rossi@example.com
2025-08-02 07:51:36 [debug]: 📝 Executing query: SELECT * FROM users...
2025-08-02 07:51:36 [info]: 📧 [MOCK] Email simulata inviata...
```

## 🐳 Docker

### Servizi attivi
- **postgres** (port 5432) - Database PostgreSQL 15
- **redis** (port 6379) - Cache e sessioni
- **api** (port 3000) - API Node.js/Express

### Comandi utili
```bash
# Stato servizi
docker-compose ps

# Log specifico servizio
docker-compose logs -f api

# Restart singolo servizio  
docker-compose restart api

# Clean rebuild
docker-compose down -v && docker-compose up --build
```

## 🛠️ Sviluppo

### Aggiungere nuove route
1. Crea file in `api/src/routes/`
2. Importa in `api/src/app.js`
3. Aggiungi middleware auth se necessario

### Validazioni password
Attualmente richieste:
- ✅ Minimo 8 caratteri
- ✅ Almeno una lettera minuscola
- ✅ Almeno una lettera maiuscola
- ✅ Almeno un numero

### Error Handling
Formato standard risposta errore:
```json
{
  "success": false,
  "message": "Descrizione errore user-friendly",
  "error": {
    "type": "ERROR_TYPE",
    "details": "..."
  }
}
```

## 📈 Prossimi Passi

### Fase 2 - Core Features
- [ ] CRUD Spazi di coworking
- [ ] Sistema prenotazioni
- [ ] Gestione utenti/ruoli avanzata
- [ ] Upload immagini spazi

### Fase 3 - Funzionalità Avanzate
- [ ] Integrazione Stripe pagamenti
- [ ] Sistema notifiche real-time
- [ ] Dashboard analytics
- [ ] Sistema recensioni

## 💡 Tips

### Test rapidi durante sviluppo
```bash
# Registra utente test
curl -X POST localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"Test123","firstName":"Test","lastName":"User"}'

# Login test
curl -X POST localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"Test123"}'
```

### Debug database
```bash
# Connetti a PostgreSQL
docker-compose exec postgres psql -U coworkspace_user -d coworkspace

# Query utenti
SELECT id, email, first_name, last_name, role, created_at FROM users;
```

---

## 🎉 Sistema Pronto!

Il backend CoWorkSpace è ora **completamente funzionante** con:
- ✅ Database PostgreSQL connesso
- ✅ API di autenticazione complete
- ✅ Email service (mock mode)
- ✅ Logging professionale
- ✅ Docker environment

