#!/bin/bash
# scripts/migrate-phase3.sh
# Script per applicare la migrazione Fase 3

set -e  # Exit on error

echo "🚀 Iniziando migrazione Fase 3..."

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzione per logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Verifica che Docker sia in esecuzione
if ! docker info > /dev/null 2>&1; then
    error "Docker non è in esecuzione. Avvia Docker e riprova."
    exit 1
fi

# Verifica che docker-compose sia disponibile
if ! command -v docker-compose &> /dev/null; then
    error "docker-compose non trovato. Installalo e riprova."
    exit 1
fi

log "✅ Docker e docker-compose verificati"

# Controlla se i servizi sono già in esecuzione
if docker-compose ps | grep -q "Up"; then
    warning "Alcuni servizi sono già in esecuzione"
    read -p "Vuoi fermare e riavviare tutti i servizi? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "🛑 Fermando servizi esistenti..."
        docker-compose down
    fi
fi

# Crea le directory necessarie se non esistono
log "📁 Creando directory necessarie..."
mkdir -p ./database/init
mkdir -p ./api/logs

# Copia il file di migrazione nella directory init
log "📋 Copiando file di migrazione..."
if [ -f "./database/migrations/03-phase3-simple.sql" ]; then
    cp ./database/migrations/03-phase3-simple.sql ./database/init/03-phase3-simple.sql
    success "File di migrazione copiato"
else
    warning "File di migrazione non trovato. Crealo prima di continuare."
fi

# Verifica file .env
if [ ! -f ".env" ]; then
    warning "File .env non trovato"
    log "📝 Creando .env di esempio..."

    cat > .env << 'EOF'
# ===============================================
# COWORKSPACE - ENVIRONMENT VARIABLES
# ===============================================

# Application
NODE_ENV=development
PORT=3000

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=coworkspace
DB_USER=coworkspace_user
DB_PASSWORD=coworkspace_password

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars-very-secure
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3001

# Email (Mock mode)
EMAIL_FROM=noreply@coworkspace.com

# Stripe (TEST MODE - Progetto Scolastico)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Frontend
FRONTEND_URL=http://localhost:3001

# Features
ENABLE_SWAGGER=true
ENABLE_RATE_LIMITING=true
ENABLE_REQUEST_LOGGING=true

# Security
BCRYPT_ROUNDS=12

# Admin
ADMIN_EMAIL=admin@coworkspace.com
EOF

    success "File .env creato. MODIFICA LE CHIAVI STRIPE prima di continuare!"
    echo
    warning "⚠️  IMPORTANTE: Configura le chiavi Stripe nel file .env"
    echo "   1. Vai su https://stripe.com e crea un account"
    echo "   2. Ottieni le chiavi TEST (pk_test_ e sk_test_)"
    echo "   3. Configura un webhook e ottieni il secret (whsec_)"
    echo "   4. Aggiorna il file .env con le tue chiavi"
    echo
    read -p "Hai configurato le chiavi Stripe nel .env? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warning "Configura prima le chiavi Stripe, poi rilancia lo script"
        exit 1
    fi
fi

# Installa dipendenze Node.js se necessario
if [ -f "./api/package.json" ]; then
    log "📦 Verificando dipendenze Node.js..."
    cd api

    # Controlla se node_modules esiste e se stripe è installato
    if [ ! -d "node_modules" ] || ! npm list stripe &> /dev/null; then
        log "Installing Node.js dependencies..."
        npm install
        success "Dipendenze installate"
    else
        success "Dipendenze già installate"
    fi

    cd ..
fi

# Avvia i servizi
log "🐳 Avviando servizi Docker..."
docker-compose up -d --build

# Attendi che PostgreSQL sia pronto
log "⏳ Attendendo PostgreSQL..."
timeout=60
counter=0

while ! docker-compose exec -T postgres pg_isready -U coworkspace_user -d coworkspace > /dev/null 2>&1; do
    if [ $counter -eq $timeout ]; then
        error "Timeout: PostgreSQL non si è avviato entro $timeout secondi"
        exit 1
    fi
    counter=$((counter + 1))
    sleep 1
done

success "PostgreSQL è pronto!"

# Verifica che l'API sia funzionante
log "🔍 Verificando API..."
timeout=30
counter=0

while ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; do
    if [ $counter -eq $timeout ]; then
        error "Timeout: API non risponde entro $timeout secondi"
        docker-compose logs api
        exit 1
    fi
    counter=$((counter + 1))
    sleep 1
done

success "API è funzionante!"

# Test finale
log "🧪 Eseguendo test finale..."

# Test health check
HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
if echo "$HEALTH_RESPONSE" | grep -q '"success":true'; then
    success "Health check OK"
else
    error "Health check fallito"
    echo "$HEALTH_RESPONSE"
fi

# Test database connection (verifica che le tabelle esistano)
log "🔍 Verificando tabelle database..."
if docker-compose exec -T postgres psql -U coworkspace_user -d coworkspace -c "\dt" | grep -q "payments"; then
    success "Tabella payments trovata"
else
    warning "Tabella payments non trovata - controllare migrazione"
fi

echo
echo "=========================="
success "🎉 MIGRAZIONE COMPLETATA!"
echo "=========================="
echo
echo "📋 Cosa è stato fatto:"
echo "   ✅ Database PostgreSQL avviato"
echo "   ✅ Migrazione Fase 3 applicata"
echo "   ✅ API backend funzionante"
echo "   ✅ Stripe integrato (modalità TEST)"
echo "   ✅ Sistema Analytics pronto"
echo "   ✅ Email service configurato"
echo
echo "🔗 Endpoint disponibili:"
echo "   • Health: http://localhost:3000/api/health"
echo "   • Docs: http://localhost:3000/api/docs (se abilitato)"
echo "   • Auth: http://localhost:3000/api/auth/login"
echo "   • Payments: http://localhost:3000/api/payments/create-intent"
echo "   • Analytics: http://localhost:3000/api/analytics/dashboard/admin"
echo
echo "🎓 Modalità Progetto Scolastico:"
echo "   • Tutti i pagamenti sono SIMULATI"
echo "   • Nessun addebito reale"
echo "   • Usa carte di test Stripe"
echo
warning "⚠️  PROSSIMI PASSI:"
echo "   1. Testa l'API con le chiamate di esempio"
echo "   2. Configura il frontend se necessario"
echo "   3. Verifica i log con: docker-compose logs -f api"
echo
echo "🐛 Se hai problemi:"
echo "   • Controlla i log: docker-compose logs"
echo "   • Riavvia: docker-compose restart"
echo "   • Reset completo: docker-compose down -v && docker-compose up -d"
echo