#!/bin/bash

# ===============================================
# CoWorkSpace Backend Setup Script
# ===============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}"
    echo "==============================================="
    echo "🏢 CoWorkSpace Backend Setup"
    echo "==============================================="
    echo -e "${NC}"
}

print_step() {
    echo -e "${YELLOW}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Docker is installed
check_docker() {
    print_step "Controllo Docker..."

    if ! command -v docker &> /dev/null; then
        print_error "Docker non trovato. Installa Docker prima di continuare."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose non trovato. Installa Docker Compose prima di continuare."
        exit 1
    fi

    print_success "Docker e Docker Compose trovati"
}

# Check if Node.js is installed (for local development)
check_node() {
    print_step "Controllo Node.js (opzionale per sviluppo locale)..."

    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js trovato: $NODE_VERSION"

        if command -v npm &> /dev/null; then
            NPM_VERSION=$(npm --version)
            print_success "npm trovato: v$NPM_VERSION"
        fi
    else
        print_info "Node.js non trovato (opzionale se usi solo Docker)"
    fi
}

# Create .env file from template
setup_env() {
    print_step "Configurazione file ambiente..."

    # Trova la directory root del progetto
    if [ -f "../.env.example" ]; then
        # Siamo in scripts/, spostiamoci in root
        cd ..
    elif [ ! -f ".env.example" ]; then
        print_error "File .env.example non trovato. Assicurati di essere nella directory root del progetto."
        print_info "Esegui lo script dalla directory coworkspace-backend/, non da scripts/"
        exit 1
    fi

    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            print_success "File .env creato da .env.example"
            print_info "Modifica il file .env con le tue configurazioni specifiche"
        else
            print_error "File .env.example non trovato"
            exit 1
        fi
    else
        print_info "File .env già esistente"
    fi
}

# Create necessary directories
create_directories() {
    print_step "Creazione directory necessarie..."

    # Create logs directory
    mkdir -p api/logs

    # Create uploads directory
    mkdir -p api/uploads
    mkdir -p api/uploads/profiles
    mkdir -p api/uploads/spaces

    # Create SSL directory for nginx
    mkdir -p nginx/ssl

    print_success "Directory create"
}

# Install Node.js dependencies (if Node.js is available)
install_dependencies() {
    print_step "Installazione dipendenze Node.js..."

    if command -v npm &> /dev/null; then
        cd api

        if [ ! -f package.json ]; then
            print_error "File package.json non trovato in ./api"
            exit 1
        fi

        print_info "Installazione dipendenze npm..."
        npm install

        cd ..
        print_success "Dipendenze npm installate"
    else
        print_info "npm non disponibile - dipendenze saranno installate nel container Docker"
    fi
}

# Build Docker images
build_images() {
    print_step "Build delle immagini Docker..."

    # Build only the API image initially
    docker-compose build api

    print_success "Immagini Docker create"
}

# Start services
start_services() {
    print_step "Avvio servizi..."

    # Start database and Redis first
    print_info "Avvio database e Redis..."
    docker-compose up -d postgres redis

    # Wait for database to be ready
    print_info "Attesa inizializzazione database..."
    sleep 10

    # Start API
    print_info "Avvio API..."
    docker-compose up -d api

    print_success "Servizi avviati"
}

# Check services health
check_health() {
    print_step "Controllo salute servizi..."

    # Wait a bit for services to start
    sleep 5

    # Check PostgreSQL
    if docker-compose exec -T postgres pg_isready -U coworkspace_user -d coworkspace > /dev/null 2>&1; then
        print_success "PostgreSQL: Operativo"
    else
        print_error "PostgreSQL: Non operativo"
    fi

    # Check Redis
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        print_success "Redis: Operativo"
    else
        print_error "Redis: Non operativo"
    fi

    # Check API
    sleep 5
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        print_success "API: Operativa"
    else
        print_error "API: Non operativa (potrebbe aver bisogno di più tempo)"
    fi
}

# Display useful information
show_info() {
    echo
    echo -e "${GREEN}==============================================="
    echo "🎉 Setup completato!"
    echo "===============================================${NC}"
    echo
    echo -e "${BLUE}📍 Endpoints utili:${NC}"
    echo "   🌐 API Base:        http://localhost:3000/api"
    echo "   📚 Documentazione:  http://localhost:3000/api/docs"
    echo "   💚 Health Check:    http://localhost:3000/api/health"
    echo
    echo -e "${BLUE}🐘 Database PostgreSQL:${NC}"
    echo "   🔌 Host: localhost:5432"
    echo "   📊 Database: coworkspace"
    echo "   👤 User: coworkspace_user"
    echo
    echo -e "${BLUE}🔴 Redis:${NC}"
    echo "   🔌 Host: localhost:6379"
    echo
    echo -e "${YELLOW}📋 Comandi utili:${NC}"
    echo "   📊 Logs:            docker-compose logs -f"
    echo "   🔄 Restart:         docker-compose restart"
    echo "   🛑 Stop:            docker-compose down"
    echo "   🗑️  Reset completo:  docker-compose down -v"
    echo
    echo -e "${BLUE}⚙️  Per modifiche al codice:${NC}"
    echo "   Il codice in ./api viene sincronizzato automaticamente"
    echo "   Nodemon riavvierà l'API automaticamente"
    echo
}

# Main execution
main() {
    print_header

    check_docker
    check_node
    setup_env
    create_directories
    install_dependencies
    build_images
    start_services
    check_health
    show_info

    echo -e "${GREEN}✨ Setup completato con successo!${NC}"
}

# Run main function
main "$@"