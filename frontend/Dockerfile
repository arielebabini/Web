# =========================================================
# CoWorkSpace Frontend Dockerfile (per Node.js/Express)
# =========================================================

FROM node:18-alpine

WORKDIR /app

# Installa curl per health check
RUN apk add --no-cache curl

# Copia i file package.json dalla sottocartella corretta
COPY frontend/package*.json ./

# Installa le dipendenze
RUN npm install

# Copia il resto del codice sorgente del frontend
# Assicurati che il tuo codice frontend sia in Web/frontend/
COPY frontend/. .

# Debug: lista i file copiati per verificare la struttura
RUN ls -la /app && echo "=== Files in /app ===" && find /app -name "*.js" -o -name "*.json" | head -20

# Crea utente non-root per sicurezza
RUN addgroup -g 1001 -S nodejs && \
    adduser -S frontend -u 1001 -G nodejs && \
    chown -R frontend:nodejs /app

USER frontend

# Esponi la porta su cui la tua app Express è in ascolto
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || curl -f http://localhost:3001/ || exit 1

# Comando per avviare il server Express
# Cerca i possibili file di entry point
CMD if [ -f "app.js" ]; then \
      npm start; \
    elif [ -f "index.js" ]; then \
      node index.js; \
    elif [ -f "server.js" ]; then \
      node server.js; \
    elif [ -f "main.js" ]; then \
      node main.js; \
    else \
      echo "Nessun file di entry point trovato. File disponibili:"; \
      ls -la; \
      echo "Contenuto package.json:"; \
      cat package.json 2>/dev/null || echo "package.json non trovato"; \
      exit 1; \
    fi