#!/bin/bash

echo "🔧 Fixing Swagger duplication issue..."

# Backup del file originale
cp api/app.js api/app.js.backup

echo "✅ Backup creato: api/app.js.backup"

# Creazione del file corretto senza duplicazione
cat > temp_fix.js << 'EOF'
// Trova e rimuovi la sezione duplicata di Swagger
const fs = require('fs');

const content = fs.readFileSync('api/app.js', 'utf8');

// Rimuovi la seconda sezione Swagger (quella originale che causa problemi)
const lines = content.split('\n');
let newLines = [];
let skipLines = false;
let skipCount = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Cerca l'inizio della sezione duplicata
    if (line.includes('// ===== DOCUMENTAZIONE API =====') && skipCount === 0) {
        skipCount++;
        continue; // Salta questa sezione
    }

    // Cerca la fine della sezione da rimuovere
    if (skipCount > 0 && line.includes('logger.info(\'Swagger documentation available at /api/docs\');')) {
        skipCount = 0;
        skipLines = false;
        continue;
    }

    // Se siamo nella sezione da saltare
    if (skipCount > 0) {
        continue;
    }

    newLines.push(line);
}

fs.writeFileSync('api/app.js', newLines.join('\n'));
console.log('✅ Swagger duplication removed');
EOF

node temp_fix.js
rm temp_fix.js

echo "🔄 Restart container..."
docker-compose restart api

echo "⏳ Waiting for restart..."
sleep 10

echo "🧪 Testing fixed Swagger UI..."
curl -s -I http://localhost:3000/api/docs/ | head -5

echo -e "\n✨ Fix completato!"
echo "🌐 Prova ora: http://localhost:3000/api/docs/"
echo "📚 Alternative: http://localhost:3000/api/docs/static"