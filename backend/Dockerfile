# ===============================================
# CoWorkSpace Backend Dockerfile
# ===============================================

# Usa un'immagine Node.js leggera basata su Alpine Linux
FROM node:18-alpine

# Metadata dell'immagine
LABEL maintainer="CoWorkSpace Team"
LABEL description="Backend server for CoWorkSpace platform"

# Imposta la directory di lavoro all'interno del container
WORKDIR /app

# Installa dipendenze di sistema necessarie (es. client di PostgreSQL)
RUN apk add --no-cache postgresql-client

# Copia i file package.json e package-lock.json dalla sottocartella corretta
COPY backend/api/package*.json ./

# Installa solo le dipendenze di produzione per un'immagine più leggera
RUN npm ci --only=production

# Crea un utente non-root per motivi di sicurezza
RUN addgroup -g 1001 -S nodejs && \
    adduser -S app -u 1001 -G nodejs

# Copia tutto il codice sorgente dell'applicazione
COPY backend/api/. .

# Crea le cartelle necessarie e assegna i permessi all'utente 'app'
RUN mkdir -p logs uploads temp && \
    chown -R app:nodejs /app

# Cambia l'utente corrente a quello non-root
USER app

# Esponi la porta su cui l'applicazione sarà in ascolto
EXPOSE 3000

# Health check per verificare che il server risponda
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Comando per avviare l'applicazione
CMD ["npm", "start"]