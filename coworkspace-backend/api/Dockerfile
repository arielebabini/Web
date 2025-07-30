# Usa Node.js LTS come base image
FROM node:18-alpine

# Installa dipendenze sistema per compilazione
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl

# Crea directory app
WORKDIR /app

# Copia package files per layer caching
COPY package*.json ./

# Installa TUTTE le dipendenze (incluse quelle di sviluppo per nodemon)
RUN npm ci && npm cache clean --force

# Copia codice sorgente
COPY --chown=node:node . .

# Esponi porta
EXPOSE 3000

# Cambia a utente non-root (l'utente node esiste già nell'immagine)
USER node

# Comando per avvio in sviluppo
CMD ["npm", "run", "dev"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1