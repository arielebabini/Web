# 🏢 CoWorkSpace Backend

API REST per la gestione di spazi di coworking costruita con Node.js, Express e PostgreSQL.

## 📋 Indice

- [Requisiti](#-requisiti)
- [Setup Rapido](#-setup-rapido)
- [Architettura](#-architettura)
- [API Endpoints](#-api-endpoints)
- [Database](#-database)
- [Autenticazione](#-autenticazione)
- [Testing](#-testing)
- [Deploy](#-deploy)
- [Contribuire](#-contribuire)

## 🛠 Requisiti

- **Docker** e **Docker Compose** (raccomandato)
- **Node.js** 18+ e **npm** (per sviluppo locale)
- **PostgreSQL** 15+ (se non usi Docker)
- **Redis** 7+ (per sessioni e cache)

## 🚀 Setup Rapido

### Con Docker (Raccomandato)

```bash
# 1. Clona il repository
git clone <repository-url>
cd coworkspace-backend

# 2. Rendi eseguibile lo script di setup
chmod +x scripts/setup.sh

# 3. Esegui setup automatico
./scripts/setup.sh

# 4. Verifica che tutto funzioni
curl http://localhost:3000/api/health
```

### Setup Manuale

```bash
# 1. Crea file ambiente
cp .env.example .env
# Modifica .env con le tue configurazioni

# 2. Avvia servizi database
docker-compose up -d postgres redis

# 3. Installa dipendenze
cd api && npm install

# 4. Avvia API in sviluppo
npm run dev
```

## 🏗 Architettura

```
coworkspace-backend/
├── api/                    # Applicazione Node.js/Express
│   ├── src/
│   │   ├── config/        # Configurazioni (DB, Redis, etc.)
│   │   ├── controllers/   # Logica business
│   │   ├── middleware/    # Middleware personalizzati
│   │   ├── models/        # Modelli database
│   │   ├── routes/        # Definizione rotte API
│   │   ├── services/      # Servizi esterni (email, pagamenti)
│   │   └── utils/         # Utilità (logger, validators)
│   ├── package.json
│   └── Dockerfile
├── database/              # Script SQL e migration
├── nginx/                 # Reverse proxy (produzione)
├── scripts/               # Script di utility
└── docker-compose.yml     # Orchestrazione servizi
```

### Stack Tecnologico

- **Runtime**: Node.js 18 + Express.js 4
- **Database**: PostgreSQL 15 con pool di connessioni
- **Cache**: Redis 7 per sessioni e caching
- **Autenticazione**: JWT con refresh token
- **Validazione**: Joi per validazione input
- **Documentazione**: Swagger/OpenAPI 3.0
- **Logging**: Winston con rotazione log
- **Testing**: Jest + Supertest
- **Containerization**: Docker + Docker Compose

## 🔌 API Endpoints

### Base URL
```
http://localhost:3000/api
```

### Autenticazione
```http
POST   /api/auth/register     # Registrazione utente
POST   /api/auth/login        # Login
POST   /api/auth/refresh      # Refresh token
POST   /api/auth/logout       # Logout
POST   /api/auth/forgot       # Password dimenticata
POST   /api/auth/reset        # Reset password
```

### Utenti
```http
GET    /api/users/profile     # Profilo utente corrente
PUT    /api/users/profile     # Aggiorna profilo
GET    /api/users/:id         # Dettagli utente (admin)
PUT    /api/users/:id         # Aggiorna utente (admin)
DELETE /api/users/:id         # Elimina utente (admin)
```

### Spazi
```http
GET    /api/spaces           # Lista spazi con filtri
POST   /api/spaces           # Crea nuovo spazio (manager)
GET    /api/spaces/:id       # Dettagli spazio
PUT    /api/spaces/:id       # Aggiorna spazio (manager)
DELETE /api/spaces/:id       # Elimina spazio (manager)
GET    /api/spaces/:id/availability  # Disponibilità spazio
```

### Prenotazioni
```http
GET    /api/bookings         # Lista prenotazioni utente
POST   /api/bookings         # Crea prenotazione
GET    /api/bookings/:id     # Dettagli prenotazione
PUT    /api/bookings/:id     # Aggiorna prenotazione
DELETE /api/bookings/:id     # Cancella prenotazione
```

### Pagamenti
```http
POST   /api/payments/intent  # Crea Payment Intent (Stripe)
POST   /api/payments/confirm # Conferma pagamento
GET    /api/payments/:id     # Dettagli pagamento
POST   /api/payments/webhook # Webhook Stripe
```

### Documentazione Completa
Visita `http://localhost:3000/api/docs` per la documentazione interattiva Swagger.

## 🗄 Database

### Schema Principale

- **users**: Utenti del sistema (clienti, manager, admin)
- **spaces**: Spazi di coworking
- **bookings**: Prenotazioni
- **payments**: Transazioni di pagamento
- **reviews**: Recensioni degli spazi
- **notifications**: Notifiche utente
- **space_availability**: Gestione disponibilità complessa
- **audit_logs**: Log delle modifiche importanti

### Tipi di Utente

- **client**: Può prenotare spazi
- **manager**: Gestisce spazi, visualizza prenotazioni
- **admin**: Accesso completo al sistema

### Migration e Seed

```bash
# Esegui migration manualmente
docker-compose exec postgres psql -U coworkspace_user -d coworkspace -f /docker-entrypoint-initdb.d/01-create-tables.sql

# Inserisci dati di esempio
docker-compose exec postgres psql -U coworkspace_user -d coworkspace -f /docker-entrypoint-initdb.d/02-insert-data.sql
```

### Utenti di Test

- **Admin**: `admin@coworkspace.com` / `admin123`
- **Manager Milano**: `manager.milano@coworkspace.com` / `admin123`
- **Client**: `client1@example.com` / `admin123`

## 🔐 Autenticazione

### JWT Token Strategy

1. **Access Token**: Scade dopo 24h
2. **Refresh Token**: Scade dopo 7 giorni
3. **Session Storage**: Redis per gestione sessioni attive

### Middleware di Protezione

```javascript
// Richiede autenticazione
app.use('/api/protected', requireAuth);

// Richiede ruolo specifico
app.use('/api/admin', requireRole(['admin']));

// Richiede ownership o admin
app.use('/api/users/:id', requireOwnership);
```

### Headers Richiesti

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

## 🧪 Testing

```bash
# Test completi
npm test

# Test con coverage
npm run test:coverage

# Test in watch mode
npm run test:watch

# Test specifico
npm test -- --grep "auth"
```

### Struttura Test

```
api/tests/
├── unit/          # Test unitari
├── integration/   # Test di integrazione
├── e2e/          # Test end-to-end
└── fixtures/     # Dati di test
```

## 🚀 Deploy

### Sviluppo Locale

```bash
# Avvio completo con hot reload
docker-compose up

# Solo database (per sviluppo API locale)
docker-compose up postgres redis
cd api && npm run dev
```

### Staging/Produzione

```bash
# Build produzione
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Deploy produzione
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Railway Deploy

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login e deploy
railway login
railway link
railway up
```

### Variabili Ambiente Produzione

Assicurati di configurare:
- `JWT_SECRET`: Chiave robusta per JWT
- `DB_PASSWORD`: Password sicura database
- `STRIPE_SECRET_KEY`: Chiave Stripe production
- `EMAIL_*`: Configurazione email provider

## 📊 Monitoring e Logging

### Logs

```bash
# Visualizza logs in tempo reale
docker-compose logs -f api

# Logs specifici
docker-compose logs postgres
docker-compose logs redis

# Logs con timestamp
docker-compose logs -t api
```

### Health Check

```bash
# Verifica stato servizi
curl http://localhost:3000/api/health

# Statistiche database
curl http://localhost:3000/api/admin/stats
```

### Metriche

Il sistema logga automaticamente:
- Performance delle query database
- Metriche di business (registrazioni, prenotazioni)
- Errori e eccezioni
- Statistiche uso memoria

## 🔧 Sviluppo

### Struttura Codice

- **Controllers**: Logica di business, validazione input
- **Services**: Interazione con servizi esterni
- **Models**: Logica di accesso ai dati
- **Middleware**: Autenticazione, validazione, logging
- **Utils**: Funzioni di utilità riusabili

### Coding Standards

- **ESLint**: Standard JavaScript
- **Prettier**: Formattazione codice
- **Husky**: Git hooks per qualità
- **Conventional Commits**: Standard commit message

### Git Workflow

```bash
# Feature branch
git checkout -b feature/nome-feature

# Commit con standard
git commit -m "feat: aggiungi endpoint prenotazioni"

# Push e pull request
git push origin feature/nome-feature
```

## 🤝 Contribuire

1. Fork del repository
2. Crea feature branch (`git checkout -b feature/amazing-feature`)
3. Commit delle modifiche (`git commit -m 'feat: add amazing feature'`)
4. Push al branch (`git push origin feature/amazing-feature`)
5. Apri Pull Request

### Linee Guida

- Scrivi test per nuove funzionalità
- Aggiorna documentazione se necessario
- Segui gli standard di codice esistenti
- Descrivi chiaramente le modifiche nella PR

## 📝 License

Questo progetto è sotto licenza MIT. Vedi file `LICENSE` per dettagli.

## 🆘 Supporto

- 📧 Email: support@coworkspace.com
- 📚 Documentazione: [Wiki del progetto](./docs/)
- 🐛 Bug Report: [GitHub Issues](./issues)
- 💬 Discussioni: [GitHub Discussions](./discussions)

## 🔍 Troubleshooting

### Problemi Comuni

#### Database non si connette
```bash
# Verifica che PostgreSQL sia avviato
docker-compose ps

# Controlla logs database
docker-compose logs postgres

# Reset completo database
docker-compose down -v
docker-compose up -d postgres
```

#### API non risponde
```bash
# Verifica porta 3000 libera
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Riavvia API
docker-compose restart api

# Controlla logs API
docker-compose logs -f api
```

#### Redis non funziona
```bash
# Test connessione Redis
docker-compose exec redis redis-cli ping

# Flush cache Redis
docker-compose exec redis redis-cli flushall
```

#### Errori di permessi
```bash
# Fix permessi directory
sudo chown -R $USER:$USER ./api/logs
sudo chown -R $USER:$USER ./api/uploads

# Permessi script
chmod +x scripts/*.sh
```

### Performance Tuning

#### Database
```sql
-- Ottimizzazioni PostgreSQL
EXPLAIN ANALYZE SELECT * FROM spaces WHERE city = 'Milano';

-- Aggiungi indici se necessario
CREATE INDEX CONCURRENTLY idx_spaces_city_type ON spaces(city, type);
```

#### Redis
```bash
# Monitora Redis
docker-compose exec redis redis-cli monitor

# Statistiche memoria
docker-compose exec redis redis-cli info memory
```

#### Node.js
```bash
# Profiling memoria
NODE_OPTIONS="--max-old-space-size=4096" npm start

# Debug performance
NODE_ENV=development DEBUG=* npm run dev
```

## 📈 Roadmap

### Fase 1 - MVP ✅
- [x] Autenticazione JWT
- [x] CRUD Spazi e Prenotazioni
- [x] Integrazione Stripe
- [x] Database PostgreSQL
- [x] Containerizzazione Docker

### Fase 2 - Miglioramenti 🚧
- [ ] Sistema notifiche real-time (WebSocket)
- [ ] Upload immagini con CDN
- [ ] Search avanzata con filtri geografici
- [ ] Sistema recensioni e rating
- [ ] Dashboard analytics avanzata

### Fase 3 - Scale 📋
- [ ] Microservizi architecture
- [ ] Caching multi-layer
- [ ] Load balancing
- [ ] Monitoring APM
- [ ] CI/CD pipeline completa

### Fase 4 - Features Avanzate 💡
- [ ] AI per raccomandazioni spazi
- [ ] Integrazione calendari esterni
- [ ] Sistema loyalty e sconti
- [ ] App mobile React Native
- [ ] Integrazione IoT per controllo spazi

## 🌟 Contributors

Grazie a tutti i contributori del progetto!

<a href="https://github.com/coworkspace/backend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=coworkspace/backend" />
</a>

## 📊 Project Stats

![GitHub issues](https://img.shields.io/github/issues/coworkspace/backend)
![GitHub pull requests](https://img.shields.io/github/issues-pr/coworkspace/backend)
![GitHub stars](https://img.shields.io/github/stars/coworkspace/backend)
![GitHub forks](https://img.shields.io/github/forks/coworkspace/backend)

## 🏆 Acknowledgments

- [Express.js](https://expressjs.com/) - Framework web
- [PostgreSQL](https://www.postgresql.org/) - Database relazionale
- [Redis](https://redis.io/) - Cache e sessioni
- [Stripe](https://stripe.com/) - Sistema pagamenti
- [Docker](https://www.docker.com/) - Containerizzazione
- [Winston](https://github.com/winstonjs/winston) - Logging
- [Jest](https://jestjs.io/) - Testing framework

---

<div align="center">
  <strong>Fatto con ❤️ dal team CoWorkSpace</strong>
  <br>
  <sub>Supporta il progetto dando una ⭐ se ti è utile!</sub>
</div>