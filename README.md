# CoWorkSpace - Frontend

Frontend moderno per la piattaforma di prenotazione spazi di coworking. Un'applicazione web responsive costruita con Vanilla JavaScript, HTML5, e CSS3 moderni.

## 📋 Indice
- [Caratteristiche](#-caratteristiche)
- [Struttura del Progetto](#-struttura-del-progetto)
- [Installazione](#-installazione)
- [Configurazione](#%EF%B8%8F-configurazione)
- [Utilizzo](#-utilizzo)
- [Architettura](#-architettura)
- [Componenti Principali](#-componenti-principali)
- [API Integration](#-api-integration)
- [Routing](#-routing)
- [Autenticazione](#-autenticazione)
- [Gestione dello Stato](#-gestione-dello-stato)
- [UI/UX Features](#-uiux-features)
- [Testing](#-testing)
- [Deploy](#-deploy)
- [Contribuire](#-contribuire)
- [License](#-license)

## ✨ Caratteristiche

### Funzionalità Core
- **Sistema di Autenticazione** completo (login/registrazione/logout)
- **Ricerca e Filtraggio Spazi** avanzato con parametri multipli
- **Prenotazioni in Real-time** con calendario integrato
- **Dashboard Amministratore** per gestione spazi e utenti
- **Sistema di Pagamenti** integrato con Stripe
- **Notifiche Push** e sistema di messaggistica
- **Visualizzazione Mappa** per localizzare spazi
- **Upload Immagini** con drag & drop

### Caratteristiche Tecniche
- **Design Responsive** ottimizzato per mobile, tablet e desktop
- **Performance Ottimizzate** con lazy loading e caching
- **PWA Ready** con service workers e caching offline
- **SEO Friendly** con meta tags dinamici
- **Accessibilità** conforme alle linee guida WCAG 2.1
- **Modulare Architecture** con componenti riutilizzabili

## 📁 Struttura del Progetto

```
frontend/
├── assets/
│   ├── css/
│   │   ├── admin.css           # Stili admin dashboard
│   │   ├── style.css           # Stili principali
│   │   └── components.css      # Stili componenti
│   ├── js/
│   │   ├── app.js             # Entry point principale
│   │   ├── api.js             # Client API e HTTP requests
│   │   ├── auth.js            # Sistema autenticazione
│   │   ├── components.js      # Componenti UI riutilizzabili
│   │   ├── config.js          # Configurazioni globali
│   │   ├── navigation.js      # Sistema di navigazione
│   │   ├── notification.js    # Sistema notifiche
│   │   ├── spaces.js          # Gestione spazi coworking
│   │   ├── user.js            # Gestione profilo utente
│   │   └── utils.js           # Utility e helpers
│   └── images/
│       ├── icons/             # Icone applicazione
│       ├── logos/             # Logo e branding
│       └── spaces/            # Immagini spazi (placeholder)
├── components/
│   ├── navbar.html            # Barra di navigazione
│   ├── footer.html            # Footer globale
│   ├── modals.html            # Modali riutilizzabili
│   └── sidebar.html           # Sidebar admin
├── pages/
│   ├── index.html             # Homepage
│   ├── spaces.html            # Catalogo spazi
│   ├── booking.html           # Pagina prenotazioni
│   ├── profile.html           # Profilo utente
│   ├── admin-dashboard.html   # Dashboard amministratore
│   └── about.html             # Pagina chi siamo
├── docs/
│   ├── api-reference.md       # Documentazione API
│   ├── components.md          # Guida componenti
│   └── deployment.md          # Guida deploy
├── tests/
│   ├── unit/                  # Test unitari
│   ├── integration/           # Test integrazione
│   └── e2e/                   # Test end-to-end
├── .env.example               # Variabili ambiente example
├── package.json               # Dipendenze e scripts
├── README.md                  # Questo file
└── server.js                  # Server sviluppo (opzionale)
```

## 🚀 Installazione

### Prerequisiti
- Node.js 16+ (per server sviluppo opzionale)
- Browser moderno (Chrome 90+, Firefox 88+, Safari 14+)
- Backend API in esecuzione su porta 3000

### Setup Rapido

```bash
# Clona il repository
git clone https://github.com/yourusername/coworkspace-frontend.git
cd coworkspace-frontend

# Installa dipendenze (opzionale, per server sviluppo)
npm install

# Copia il file di configurazione
cp .env.example .env

# Avvia server sviluppo locale
npm run dev
# OPPURE apri semplicemente index.html nel browser
```

### Configurazione Manuale
Se non usi Node.js, puoi servire i file statici con qualsiasi web server:

```bash
# Con Python
python -m http.server 3001

# Con PHP
php -S localhost:3001

# Con Live Server (VS Code Extension)
# Clicca destro su index.html > "Open with Live Server"
```

## ⚙️ Configurazione

### Variabili di Ambiente
Modifica il file `assets/js/config.js`:

```javascript
const CONFIG = {
    // API Configuration
    API_BASE_URL: 'http://localhost:3000/api',
    API_TIMEOUT: 10000,
    
    // App Settings
    APP_NAME: 'CoWorkSpace',
    APP_VERSION: '1.0.0',
    
    // Features Toggle
    ENABLE_PAYMENTS: true,
    ENABLE_NOTIFICATIONS: true,
    ENABLE_MAP_VIEW: true,
    
    // Third-party Services
    STRIPE_PUBLISHABLE_KEY: 'pk_test_...',
    GOOGLE_MAPS_API_KEY: 'AIzaSy...',
    
    // UI Settings
    ITEMS_PER_PAGE: 12,
    MAX_UPLOAD_SIZE: 5 * 1024 * 1024, // 5MB
    SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp']
};
```

### Configurazione API
Il frontend è configurato per comunicare con il backend su `localhost:3000`. Modifica `API_BASE_URL` in `config.js` per puntare al tuo server di produzione.

## 🎯 Utilizzo

### Avvio Rapido
1. Assicurati che il backend sia in esecuzione
2. Apri `index.html` nel browser
3. L'applicazione si connetterà automaticamente all'API

### Funzionalità Principali

#### Per Utenti
- **Homepage**: Visualizza spazi in evidenza e statistiche
- **Catalogo Spazi**: Cerca e filtra spazi disponibili
- **Prenotazioni**: Gestisci le tue prenotazioni
- **Profilo**: Aggiorna informazioni personali

#### Per Amministratori
- **Dashboard**: Overview delle metriche principali
- **Gestione Spazi**: CRUD completo per spazi coworking
- **Gestione Utenti**: Amministrazione utenti e ruoli
- **Analytics**: Report e statistiche dettagliate

## 🏗 Architettura

### Pattern Architetturale
Il frontend segue un'architettura **modular component-based** con:

- **Separation of Concerns**: Logica separata da UI
- **Component-Based**: Elementi riutilizzabili
- **Event-Driven**: Comunicazione via eventi custom
- **State Management**: Stato centralizzato per dati condivisi

### Flusso Dati
```
User Input → Event Handlers → API Calls → State Update → UI Re-render
```

### Moduli Principali

#### App.js - Orchestratore Principale
```javascript
class CoWorkSpaceApp {
    constructor() {
        this.api = new APIClient(API_CONFIG);
        this.auth = new AuthManager(this.api);
        this.state = new StateManager();
    }
}
```

#### API.js - Client HTTP
```javascript
class APIClient {
    async request(endpoint, options = {}) {
        // Gestione richieste HTTP con retry logic
        // Auto-refresh token
        // Error handling centralizzato
    }
}
```

#### Components.js - UI Components
```javascript
const Components = {
    showModal(id, content, options),
    showNotification(message, type),
    renderSpaceCard(space),
    // ... altri componenti
};
```

## 🧩 Componenti Principali

### Sistema di Navigazione
- **Navbar**: Navigazione responsive con menu mobile
- **Sidebar**: Dashboard amministratore
- **Breadcrumbs**: Navigazione gerarchica
- **Tabs**: Interfacce a schede

### Modali e Overlay
- **Login/Register**: Autenticazione utente
- **Space Details**: Dettagli spazio
- **Booking**: Prenotazione spazio
- **Image Viewer**: Galleria immagini

### Form e Input
- **Smart Forms**: Validazione real-time
- **File Upload**: Drag & drop con preview
- **Date Picker**: Selezione date
- **Search Bar**: Ricerca con autocomplete

### Data Display
- **Space Cards**: Visualizzazione spazi
- **Data Tables**: Tabelle responsive
- **Charts**: Grafici dashboard
- **Map Integration**: Mappa interattiva

## 🔌 API Integration

### Configurazione Client
```javascript
const api = new APIClient({
    baseURL: 'http://localhost:3000/api',
    timeout: 10000,
    retries: 2
});
```

### Endpoints Principali
```javascript
// Autenticazione
api.login(credentials)
api.register(userData)
api.logout()
api.refreshToken()

// Spazi
api.getSpaces(filters)
api.getSpace(id)
api.createSpace(data)
api.updateSpace(id, data)

// Prenotazioni
api.getBookings(userId)
api.createBooking(bookingData)
api.cancelBooking(bookingId)

// Pagamenti
api.createPaymentIntent(amount)
api.confirmPayment(paymentId)
```

### Error Handling
```javascript
api.request('/endpoint').then(response => {
    if (response.success) {
        // Handle success
    } else {
        // Handle API errors
        showNotification(response.message, 'error');
    }
}).catch(error => {
    // Handle network errors
    showNotification('Errore di connessione', 'error');
});
```

## 🛣 Routing

### Client-Side Routing
Il frontend utilizza un sistema di routing basato su hash per la navigazione SPA:

```javascript
// Navigation.js
const routes = {
    '#/': 'homeSection',
    '#/spaces': 'spacesSection',
    '#/bookings': 'bookingsSection',
    '#/profile': 'profileSection',
    '#/admin': 'adminSection'
};

// Gestione cambio route
window.addEventListener('hashchange', handleRouteChange);
```

### Navigazione Programmatica
```javascript
// Cambia pagina
navigateTo('#/spaces');

// Con parametri
navigateTo('#/space/123');

// Con stato
navigateTo('#/bookings', { filter: 'active' });
```

## 🔐 Autenticazione

### Gestione Token JWT
```javascript
class AuthManager {
    constructor(apiClient) {
        this.api = apiClient;
        this.token = localStorage.getItem('auth_token');
        this.user = null;
    }
    
    async login(credentials) {
        const response = await this.api.login(credentials);
        if (response.success) {
            this.setToken(response.token);
            this.user = response.user;
            this.updateUI();
        }
        return response;
    }
    
    setToken(token) {
        this.token = token;
        localStorage.setItem('auth_token', token);
        this.api.setAuthToken(token);
    }
}
```

### Protezione Rotte
```javascript
// Middleware per rotte protette
function requireAuth(callback) {
    if (!auth.isAuthenticated()) {
        showLogin();
        return;
    }
    callback();
}

// Uso
requireAuth(() => {
    showBookingPage();
});
```

### Ruoli Utente
```javascript
const UserRoles = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    CLIENT: 'client'
};

// Controllo permessi
function canAccessAdminArea() {
    return auth.user?.role === UserRoles.ADMIN;
}
```

## 🗃 Gestione dello Stato

### State Manager
```javascript
class StateManager {
    constructor() {
        this.state = {
            user: null,
            spaces: [],
            bookings: [],
            filters: {},
            ui: {
                loading: false,
                modal: null
            }
        };
        this.listeners = new Map();
    }
    
    setState(key, value) {
        this.state[key] = value;
        this.notify(key, value);
    }
    
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);
    }
}
```

### Local Storage Integration
```javascript
// Salvataggio automatico stato
function saveState(key, data) {
    try {
        localStorage.setItem(`cowork_${key}`, JSON.stringify(data));
    } catch (error) {
        console.warn('Could not save to localStorage:', error);
    }
}

// Ripristino stato
function loadState(key) {
    try {
        const data = localStorage.getItem(`cowork_${key}`);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.warn('Could not load from localStorage:', error);
        return null;
    }
}
```

## 🎨 UI/UX Features

### Design System
- **Typography**: Famiglia font Inter per leggibilità
- **Colors**: Palette coerente con variabili CSS custom
- **Spacing**: Sistema basato su rem per scalabilità
- **Animations**: Transizioni fluide con CSS3

### Responsive Design
```css
/* Mobile First Approach */
.container {
    padding: 1rem;
}

@media (min-width: 768px) {
    .container {
        padding: 2rem;
        max-width: 1200px;
        margin: 0 auto;
    }
}
```

### Dark Mode Support
```css
:root {
    --bg-primary: #ffffff;
    --text-primary: #333333;
}

[data-theme="dark"] {
    --bg-primary: #1a1a1a;
    --text-primary: #ffffff;
}
```

### Loading States
```javascript
// Loading component
function showLoading(container) {
    container.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Caricamento in corso...</p>
        </div>
    `;
}
```

### Error States
```javascript
// Error boundary
function showError(container, message, retry = null) {
    container.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Ops! Qualcosa è andato storto</h3>
            <p>${message}</p>
            ${retry ? '<button onclick="' + retry + '">Riprova</button>' : ''}
        </div>
    `;
}
```

## 🧪 Testing

### Test Structure
```
tests/
├── unit/
│   ├── utils.test.js
│   ├── api.test.js
│   └── components.test.js
├── integration/
│   ├── auth-flow.test.js
│   └── booking-flow.test.js
└── e2e/
    ├── user-journey.test.js
    └── admin-workflow.test.js
```

### Running Tests
```bash
# Test unitari
npm run test:unit

# Test integrazione
npm run test:integration

# Test end-to-end
npm run test:e2e

# Tutti i test
npm test

# Test con coverage
npm run test:coverage
```

### Test Examples
```javascript
// Test unitario
describe('Utils', () => {
    test('formatPrice should format correctly', () => {
        expect(formatPrice(1234.56)).toBe('€ 1.234,56');
    });
});

// Test integrazione
describe('Auth Flow', () => {
    test('should login successfully', async () => {
        const response = await api.login({
            email: 'test@example.com',
            password: 'password123'
        });
        expect(response.success).toBe(true);
    });
});
```

## 🚀 Deploy

### Build per Produzione
```bash
# Ottimizzazione assets
npm run build

# Compressione immagini
npm run optimize:images

# Minificazione CSS/JS
npm run minify

# Build completa
npm run build:prod
```

### Deploy su Netlify
```bash
# Installazione CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

### Deploy su Vercel
```bash
# Installazione CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Deploy su AWS S3
```bash
# Sync con S3
aws s3 sync dist/ s3://your-bucket-name --delete

# CloudFront invalidation
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

### Configurazione Nginx
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/coworkspace-frontend;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 🤝 Contribuire

### Getting Started
1. Fork il repository
2. Crea un branch per la tua feature: `git checkout -b feature/amazing-feature`
3. Commita le modifiche: `git commit -m 'Add amazing feature'`
4. Push al branch: `git push origin feature/amazing-feature`
5. Apri una Pull Request

### Coding Standards
- **ESLint**: Configura ESLint per mantenere consistenza del codice
- **Prettier**: Formattazione automatica
- **Naming Conventions**: camelCase per JS, kebab-case per CSS
- **Comments**: JSDoc per funzioni pubbliche

### Git Workflow
```bash
# Mantieni il fork aggiornato
git remote add upstream https://github.com/original/repo.git
git fetch upstream
git checkout main
git merge upstream/main

# Crea feature branch
git checkout -b feature/new-feature

# Commit con conventional commits
git commit -m "feat: add new space filtering option"
git commit -m "fix: resolve booking date validation issue"
git commit -m "docs: update API documentation"
```

### Code Review Process
- Ogni PR deve essere reviewata da almeno 1 maintainer
- Tests devono passare
- Coverage non deve diminuire
- Documentazione deve essere aggiornata se necessario

## 📄 License

Questo progetto è distribuito sotto la licenza MIT. Vedi il file [LICENSE](LICENSE) per i dettagli.

---

## 📞 Supporto

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/coworkspace-frontend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/coworkspace-frontend/discussions)

---

**Made with ❤️ by the CoWorkSpace Team**