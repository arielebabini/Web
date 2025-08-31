# ===============================================
# CoWorkSpace Backend - Dockerfile Semplificato
# ===============================================

FROM node:18-alpine

# Imposta la directory di lavoro
WORKDIR /app

# Installa curl per health check
RUN apk add --no-cache curl

# Copia tutto il codice prima (senza cambio utente)
COPY . .

# Installa le dipendenze
RUN npm install --omit=dev

# Esponi porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Avvia l'applicazione
CMD ["npm", "start"]