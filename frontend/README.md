# CoWorkSpace Frontend 
Frontend moderno per la piattaforma di prenotazione spazi di coworking. Un'applicazione web responsive costruita con Vanilla JavaScript, HTML5, e CSS3 moderni.

# Team:
757608 --> Babini Ariele<br>
758017 --> Bottaro Federico

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

## ✨ Caratteristiche

### Funzionalità Core
- **Sistema di Autenticazione** completo (login/registrazione/logout)
- **Ricerca e Filtraggio Spazi** avanzato con parametri multipli
- **Prenotazioni in Real-time** con calendario integrato
- **Dashboard Amministratore** per gestione spazi e utenti
- **Sistema di Pagamenti** integrato con Stripe
- **Notifiche Push** e sistema di messaggistica
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
│   │   ├── variables.css       # Definizione variabili globali
│   │   ├── spaces.css          # Stili per gli spazi
│   │   ├── responsive.css      # Stili per responsive pagna
│   │   ├── layout.css          # Stili layout pagina
│   │   ├── animation.css       # Stili per animazione
│   │   ├── style.css           # Stili principali
│   │   └── components.css      # Stili componenti
│   ├── js/
│   │   ├── app.js                                 # Entry point principale
│   │   ├── admin.js                               # Sistema gestione admin
│   │   ├── admin-controller.js                    # Controller dell'admin
│   │   ├── admin-dashboard-loader.js              # Sistema dashboard per admin
│   │   ├── api.js                                 # Client API e HTTP requests
│   │   ├── auth.js                # Sistema autenticazione
│   │   ├── booking.js             # Componente gestione prenotazione
│   │   ├── booking-payment.js     # Componente per gestione pagamenti
│   │   ├── components.js          # Componenti UI riutilizzabili
│   │   ├── config.js              # Configurazioni globali
│   │   ├── dashboard.js           # Sistema di controllo
│   │   ├── navigation.js          # Sistema di navigazione
│   │   ├── notification.js        # Sistema notifiche
│   │   ├── spaces.js              # Gestione spazi coworking
│   │   ├── support.js            # Sistema per il supporto
│   │   ├── user.js                # Gestione profilo utente
│   │   └── utils.js               # Utility e helpers
├── components/
│   ├── navbar.html            # Barra di navigazione
│   ├── footer.html            # Footer globale
├── template/
│   ├── spaces.html            # Catalogo spazi
│   ├── about.html             # Pagina informazioni
│   ├── dashboard.html         # Pagina home
│   ├── manager-dashboard.html # Controllo dashboard
│   ├── support.html           # Pagina supporto utente
│   ├── admin-dashboard.html   # Dashboard amministratore
│   └── about.html             # Pagina chi siamo
├── index.html                 # Homepage
├── README.md                  # Questo file
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
- **Homepage**: Menu rapido per filtraggio con reindirizzamento al catalogo spazi
- **Catalogo Spazi**: Cerca e prenota spazi disponibili
- **Prenotazioni**: Visualizza le tue prenotazioni
- **Profilo**: Visualizza informazioni personali

#### Per Amministratori
- **Dashboard**: Overview delle metriche principali
- **Gestione Spazi**: CRUD completo per spazi coworking
- **Gestione Utenti**: Amministrazione utenti e ruoli
- **Prenotazioni**: Gestione delle prenotazioni

#### Per Manager
- **Dashboard**: Overview delle metriche principali
- **Gestione Spazi**: CRUD completo per spazi coworking
- **Prenotazioni**: Gestione delle prenotazioni

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
