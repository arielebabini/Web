/**
 * CoWorkSpace - Spaces Management (Integrato con Backend)
 * Sostituisci il contenuto del file assets/js/spaces.js con questo codice
 */

window.Spaces = {
    // ==================== STATO DELL'APPLICAZIONE ====================
    state: {
        spaces: [],
        filteredSpaces: [],
        currentFilters: {
            city: '',
            type: '',
            search: '',
            minPrice: 0,
            maxPrice: 999999,
            rating: 0,
            amenities: []
        },
        currentPage: 1,
        itemsPerPage: 12,
        totalPages: 1,
        viewMode: 'grid',
        sortBy: 'created_at',
        sortOrder: 'DESC',
        loading: false,
        favorites: JSON.parse(localStorage.getItem('spaceFavorites') || '[]')
    },

    // ==================== API CLIENT ====================
    api: {
        baseURL: 'http://localhost:3000/api',

        async request(endpoint, options = {}) {
            const url = `${this.baseURL}${endpoint}`;
            const token = localStorage.getItem('auth_token');

            const config = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && !options.skipAuth ? { 'Authorization': `Bearer ${token}` } : {})
                },
                ...options
            };

            if (options.body && typeof options.body === 'object') {
                config.body = JSON.stringify(options.body);
            }

            try {
                const response = await fetch(url, config);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || `HTTP ${response.status}`);
                }

                return data;
            } catch (error) {
                console.error('API Error:', error);
                throw error;
            }
        },

        buildQueryString(params) {
            const filtered = Object.entries(params)
                .filter(([key, value]) => {
                    // Rimuovi parametri vuoti, nulli, undefined, array vuoti, e valori di default
                    if (value === '' || value == null || value === undefined) return false;
                    if (Array.isArray(value) && value.length === 0) return false;
                    if (key === 'minPrice' && value === 0) return false;
                    if (key === 'maxPrice' && value === 999999) return false;
                    if (key === 'rating' && value === 0) return false;
                    return true;
                })
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
            return filtered.length > 0 ? `?${filtered.join('&')}` : '';
        },

        async getSpaces(filters = {}) {
            const queryString = this.buildQueryString(filters);
            return this.request(`/spaces${queryString}`, { skipAuth: true });
        },

        async getSpace(id) {
            return this.request(`/spaces/${id}`, { skipAuth: true });
        }
    },

    // ==================== INIZIALIZZAZIONE ====================
    async init() {
        console.log('🏢 Initializing Spaces module...');

        try {
            this.setupEventListeners();
            this.initializeUI();

            // Carica senza applicare filtri automaticamente
            await this.loadSpaces({}, true);

            console.log('✅ Spaces module initialized');
        } catch (error) {
            console.error('❌ Error initializing Spaces module:', error);
            this.showError('Errore nell\'inizializzazione del modulo spazi');
        }
    },

    setupEventListeners() {
        // Filtri rapidi
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-filter-btn')) {
                this.handleQuickFilter(e.target);
            }
        });

        // Form di ricerca
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSearch();
            });
        }

        // Bottoni vista
        const gridViewBtn = document.getElementById('gridViewBtn');
        const mapViewBtn = document.getElementById('mapViewBtn');

        if (gridViewBtn) {
            gridViewBtn.addEventListener('click', () => this.setViewMode('grid'));
        }
        if (mapViewBtn) {
            mapViewBtn.addEventListener('click', () => this.setViewMode('map'));
        }

        // Ordinamento
        const sortSelect = document.getElementById('sortSpaces');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                this.state.sortBy = sortBy;
                this.state.sortOrder = sortOrder || 'ASC';
                this.applyFiltersAndSort();
            });
        }
    },

    initializeUI() {
        // Imposta valori iniziali dei filtri
        const urlParams = new URLSearchParams(window.location.search);

        if (urlParams.has('city')) {
            this.state.currentFilters.city = urlParams.get('city');
        }
        if (urlParams.has('type')) {
            this.state.currentFilters.type = urlParams.get('type');
        }

        this.updateFiltersUI();
    },

    // ==================== CARICAMENTO DATI ====================
    async loadSpaces(filters = {}, skipFiltering = false) {
        // Previeni loop infinito
        if (this.state.loading) {
            console.log('⏳ Already loading, skipping...');
            return;
        }

        try {
            this.setLoading(true);
            console.log('📍 Loading spaces with filters:', filters);

            // Combina filtri correnti con quelli passati
            const allFilters = { ...this.state.currentFilters, ...filters };

            const result = await this.api.getSpaces(allFilters);

            if (result.success) {
                this.state.spaces = result.spaces || [];
                this.state.filteredSpaces = [...this.state.spaces];

                // Aggiorna informazioni paginazione se disponibili
                if (result.pagination) {
                    this.state.currentPage = result.pagination.page || 1;
                    this.state.totalPages = result.pagination.totalPages || 1;
                }

                console.log(`✅ Loaded ${this.state.spaces.length} spaces`);

                // IMPORTANTE: Non richiamare applyFiltersAndSort se skipFiltering è true
                if (!skipFiltering) {
                    // Solo renderizza, non riapplica filtri
                    this.renderSpaces();
                    this.updateResultsCount();
                }

            } else {
                throw new Error(result.message || 'Errore nel caricamento degli spazi');
            }

        } catch (error) {
            console.error('❌ Error loading spaces:', error);
            this.showError('Errore nel caricamento degli spazi: ' + error.message);

        } finally {
            this.setLoading(false);
        }
    },

    // ==================== GESTIONE FILTRI ====================
    handleQuickFilter(button) {
        const filter = button.getAttribute('data-filter');
        button.classList.toggle('active');

        console.log('🎯 Quick filter clicked:', filter, 'Active:', button.classList.contains('active'));

        switch (filter) {
            case 'available':
                // Implementare logica disponibilità
                break;
            case 'featured':
                this.state.currentFilters.featured = button.classList.contains('active');
                break;
            case 'hot-desk':
            case 'meeting-room':
            case 'private-office':
            case 'event-space':
                this.state.currentFilters.type = button.classList.contains('active') ? filter : '';
                break;
        }

        // Applica filtri localmente, non ricarica da API
        this.applyFiltersAndSort();
    },

    handleSearch() {
        const searchInput = document.getElementById('searchSpaces');
        const citySelect = document.getElementById('quickCity');
        const typeSelect = document.getElementById('quickSpaceType');

        this.state.currentFilters.search = searchInput?.value || '';
        this.state.currentFilters.city = citySelect?.value || '';
        this.state.currentFilters.type = typeSelect?.value || '';

        console.log('🔍 Search filters:', this.state.currentFilters);

        // Applica filtri localmente, non ricarica da API
        this.applyFiltersAndSort();
    },

    applyFiltersAndSort() {
        // Previeni loop infinito - NON richiamare loadSpaces
        console.log('🎯 Applying filters and sort locally');

        // Applica filtri localmente sui dati già caricati
        let filteredSpaces = [...this.state.spaces];

        // Applica filtri
        const filters = this.state.currentFilters;

        if (filters.search) {
            filteredSpaces = filteredSpaces.filter(space =>
                space.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                space.description.toLowerCase().includes(filters.search.toLowerCase()) ||
                space.city.toLowerCase().includes(filters.search.toLowerCase())
            );
        }

        if (filters.city) {
            filteredSpaces = filteredSpaces.filter(space =>
                space.city.toLowerCase() === filters.city.toLowerCase()
            );
        }

        if (filters.type) {
            filteredSpaces = filteredSpaces.filter(space =>
                space.type === filters.type
            );
        }

        // Applica ordinamento
        if (this.state.sortBy) {
            filteredSpaces.sort((a, b) => {
                let aVal = a[this.state.sortBy];
                let bVal = b[this.state.sortBy];

                // Gestisci valori numerici
                if (typeof aVal === 'string' && !isNaN(aVal)) {
                    aVal = parseFloat(aVal);
                    bVal = parseFloat(bVal);
                }

                if (this.state.sortOrder === 'DESC') {
                    return bVal > aVal ? 1 : -1;
                } else {
                    return aVal > bVal ? 1 : -1;
                }
            });
        }

        // Aggiorna stato e renderizza
        this.state.filteredSpaces = filteredSpaces;
        this.renderSpaces();
        this.updateResultsCount();
    },

    clearFilters() {
        this.state.currentFilters = {
            city: '',
            type: '',
            search: '',
            minPrice: 0,
            maxPrice: 999999,
            rating: 0,
            amenities: []
        };

        this.updateFiltersUI();
        this.loadSpaces();
    },

    updateFiltersUI() {
        const searchInput = document.getElementById('searchSpaces');
        const citySelect = document.getElementById('quickCity');
        const typeSelect = document.getElementById('quickSpaceType');

        if (searchInput) searchInput.value = this.state.currentFilters.search;
        if (citySelect) citySelect.value = this.state.currentFilters.city;
        if (typeSelect) typeSelect.value = this.state.currentFilters.type;
    },

    // ==================== RENDERING ====================
    renderSpaces() {
        const container = document.getElementById('spacesContainer');
        if (!container) {
            console.error('❌ Spaces container not found');
            return;
        }

        if (this.state.spaces.length === 0) {
            container.innerHTML = this.buildNoResultsHTML();
            return;
        }

        const spacesHTML = this.state.spaces.map(space =>
            this.buildSpaceCard(space)
        ).join('');

        container.innerHTML = spacesHTML;
        this.attachSpaceEvents();
    },

    buildSpaceCard(space) {
        const typeLabels = {
            'hot-desk': 'Hot Desk',
            'private-office': 'Ufficio Privato',
            'meeting-room': 'Sala Riunioni',
            'event-space': 'Spazio Eventi'
        };

        const rating = parseFloat(space.rating) || 0;
        const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
        const isFavorite = this.state.favorites.includes(space.id);

        return `
        <div class="col-12 mb-3">
            <div class="space-card-horizontal" data-space-id="${space.id}">
                <div class="space-image-container">
                    <img src="${space.images[0] || '/assets/images/placeholder-space.jpg'}" 
                         alt="${space.name}" class="space-image">
                    <div class="space-badges">
                        ${space.is_featured ? '<span class="badge badge-featured">Featured</span>' : ''}
                        <span class="badge badge-type">${typeLabels[space.type] || space.type}</span>
                    </div>
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                            onclick="Spaces.toggleFavorite('${space.id}', event)">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                
                <div class="space-content">
                    <div class="space-header">
                        <h3 class="space-title">${space.name}</h3>
                        <div class="space-location">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${space.city}</span>
                        </div>
                    </div>
                    
                    <p class="space-description">${this.truncateText(space.description, 120)}</p>
                    
                    <div class="space-details">
                        <div class="space-amenities">
                            ${this.buildAmenities(space.amenities)}
                        </div>
                        
                        <div class="space-meta">
                            <div class="space-capacity">
                                <i class="fas fa-users"></i>
                                <span>${space.capacity} persone</span>
                            </div>
                            <div class="space-price">
                                <strong>€${space.price_per_day}/giorno</strong>
                            </div>
                            <div class="space-rating">
                                <span class="stars">${stars}</span>
                                <small>(${space.total_reviews})</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="space-actions">
                    <button class="btn btn-outline-primary btn-sm" onclick="Spaces.showSpaceDetails('${space.id}')">
                        Dettagli
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="Spaces.bookSpace('${space.id}')">
                        Prenota
                    </button>
                </div>
            </div>
        </div>
    `;
    },

    buildAmenities(amenities) {
        const amenityIcons = {
            'wifi': 'fas fa-wifi',
            'coffee': 'fas fa-coffee',
            'printer': 'fas fa-print',
            'parking': 'fas fa-parking',
            'kitchen': 'fas fa-utensils',
            'lounge_area': 'fas fa-couch',
            'outdoor_space': 'fas fa-tree',
            'air_conditioning': 'fas fa-snowflake',
            'bike_parking': 'fas fa-bicycle',
            'projector': 'fas fa-video',
            'whiteboard': 'fas fa-chalkboard',
            'terrace': 'fas fa-umbrella-beach',
            'meeting_room': 'fas fa-users'
        };

        const visibleAmenities = amenities.slice(0, 4);
        const remainingCount = Math.max(0, amenities.length - 4);

        const amenitiesHTML = visibleAmenities.map(amenity =>
            `<i class="${amenityIcons[amenity] || 'fas fa-check'}" title="${amenity}"></i>`
        ).join(' ');

        return amenitiesHTML + (remainingCount > 0 ?
            ` <span class="text-muted">+${remainingCount}</span>` : '');
    },

    buildNoResultsHTML() {
        return `
            <div class="col-12">
                <div class="text-center py-5">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <h4>Nessuno spazio trovato</h4>
                    <p class="text-muted">Prova a modificare i filtri di ricerca</p>
                    <button class="btn btn-outline-primary" onclick="Spaces.clearFilters()">
                        <i class="fas fa-eraser"></i> Cancella Filtri
                    </button>
                </div>
            </div>
        `;
    },

    // ==================== EVENTI E AZIONI ====================
    attachSpaceEvents() {
        // Eventi già gestiti tramite onclick negli HTML
    },

    async showSpaceDetails(spaceId) {
        try {
            console.log('📍 Loading space details:', spaceId);

            const result = await this.api.getSpace(spaceId);

            if (result.success) {
                this.openSpaceModal(result.space);
            } else {
                this.showError('Errore nel caricamento dei dettagli dello spazio');
            }
        } catch (error) {
            console.error('❌ Error loading space details:', error);
            this.showError('Errore di connessione: ' + error.message);
        }
    },

    openSpaceModal(space) {
        // Implementare modal dettagli spazio
        alert(`Dettagli per: ${space.name}\nDescrizione: ${space.description}\nPrezzo: €${space.price_per_day}/giorno`);
    },

    bookSpace(spaceId) {
        console.log('📅 Booking space:', spaceId);
        this.showNotification('Funzionalità di prenotazione in arrivo!', 'info');
    },

    toggleFavorite(spaceId, event) {
        event.stopPropagation();

        const index = this.state.favorites.indexOf(spaceId);
        if (index > -1) {
            this.state.favorites.splice(index, 1);
        } else {
            this.state.favorites.push(spaceId);
        }

        localStorage.setItem('spaceFavorites', JSON.stringify(this.state.favorites));

        // Aggiorna UI del pulsante
        const button = event.currentTarget;
        button.classList.toggle('active');

        this.showNotification(
            index > -1 ? 'Rimosso dai preferiti' : 'Aggiunto ai preferiti',
            'success',
            2000
        );
    },

    // ==================== UI UTILITIES ====================
    setViewMode(mode) {
        this.state.viewMode = mode;

        // Aggiorna bottoni
        document.getElementById('gridViewBtn')?.classList.toggle('active', mode === 'grid');
        document.getElementById('mapViewBtn')?.classList.toggle('active', mode === 'map');

        // Aggiorna vista
        const spacesContainer = document.getElementById('spacesContainer');
        const mapContainer = document.getElementById('mapContainer');

        if (mode === 'grid') {
            if (spacesContainer) spacesContainer.style.display = 'block';
            if (mapContainer) mapContainer.style.display = 'none';
        } else {
            if (spacesContainer) spacesContainer.style.display = 'none';
            if (mapContainer) mapContainer.style.display = 'block';
            this.showNotification('Vista mappa in arrivo!', 'info');
        }
    },

    setLoading(loading) {
        this.state.loading = loading;

        const container = document.getElementById('spacesContainer');
        if (!container) return;

        if (loading) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Caricamento...</span>
                    </div>
                    <p class="mt-3">Caricamento spazi...</p>
                </div>
            `;
        }
    },

    updateResultsCount() {
        const countElement = document.getElementById('resultsCount');
        if (countElement) {
            const count = this.state.spaces.length;
            countElement.textContent = `${count} spazi trovati`;
        }
    },

    showNotification(message, type = 'info', duration = 5000) {
        // Utilizza il sistema di notifiche dell'app principale se disponibile
        if (window.coworkspaceApp && window.coworkspaceApp.showNotification) {
            window.coworkspaceApp.showNotification(message, type, duration);
        } else {
            // Fallback semplice
            console.log(`[${type.toUpperCase()}] ${message}`);
            alert(message);
        }
    },

    showError(message) {
        this.showNotification(message, 'error');
    },

    // ==================== UTILITY FUNCTIONS ====================
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    formatSpaceType(type) {
        const types = {
            'hot-desk': 'Hot Desk',
            'private-office': 'Ufficio Privato',
            'meeting-room': 'Sala Riunioni',
            'event-space': 'Spazio Eventi'
        };
        return types[type] || type;
    }
};

// assets/js/spaces.js
// JavaScript per la gestione della sezione Spazi

/**
 * Gestione della navigazione tra sezioni spazi
 */
window.showSpacesSection = function(sectionName) {
    console.log('🏢 Showing spaces section:', sectionName);

    const container = document.getElementById('spaces-sections-container');
    if (!container) {
        console.error('❌ Spaces container not found!');
        return;
    }

    // Aggiorna tab attivo
    updateActiveTab(sectionName);

    // Animazione fade out
    container.style.opacity = '0';

    setTimeout(() => {
        // Carica contenuto sezione
        switch(sectionName) {
            case 'ricerca':
                loadRicercaSection(container);
                break;
            case 'mappa':
                loadMappaSection(container);
                break;
            case 'filtri':
                loadFiltriSection(container);
                break;
            case 'preferiti':
                loadPreferitiSection(container);
                break;
            default:
                loadRicercaSection(container);
        }

        // Animazione fade in
        container.style.opacity = '1';
        container.classList.add('fade-in-up');

        // Rimuovi classe animazione dopo completamento
        setTimeout(() => {
            container.classList.remove('fade-in-up');
        }, 500);

    }, 150);
};

/**
 * Aggiorna il tab attivo nella navigazione
 */
function updateActiveTab(sectionName) {
    // Rimuovi classe active da tutti i link
    const navLinks = document.querySelectorAll('.spaces-nav-link');
    navLinks.forEach(link => link.classList.remove('active'));

    // Aggiungi classe active al link selezionato
    const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

/**
 * Carica sezione Ricerca
 */
function loadRicercaSection(container) {
    container.innerHTML = `
        <div class="space-card">
            <h3><i class="fas fa-search text-primary me-2"></i>Ricerca Spazi</h3>
            <p class="text-muted mb-4">Trova il workspace perfetto per le tue esigenze</p>
            
            <div class="row">
                <div class="col-md-4 mb-3">
                    <label class="form-label">Città</label>
                    <select class="form-select" id="city-filter" onchange="filterSpaces()">
                        <option value="">Tutte le città</option>
                        <option value="milano">Milano</option>
                        <option value="roma">Roma</option>
                        <option value="torino">Torino</option>
                        <option value="bologna">Bologna</option>
                        <option value="firenze">Firenze</option>
                        <option value="napoli">Napoli</option>
                    </select>
                </div>
                <div class="col-md-4 mb-3">
                    <label class="form-label">Tipo di Spazio</label>
                    <select class="form-select" id="type-filter" onchange="filterSpaces()">
                        <option value="">Tutti i tipi</option>
                        <option value="desk">Desk condiviso</option>
                        <option value="office">Ufficio privato</option>
                        <option value="meeting">Sala riunioni</option>
                        <option value="event">Spazio eventi</option>
                    </select>
                </div>
                <div class="col-md-4 mb-3">
                    <label class="form-label">Data</label>
                    <input type="date" class="form-control" id="date-filter" 
                           value="${new Date().toISOString().split('T')[0]}" 
                           onchange="filterSpaces()">
                </div>
            </div>
            
            <div class="d-flex gap-2 mb-4">
                <button class="btn btn-gradient btn-lg" onclick="searchSpaces()">
                    <i class="fas fa-search me-2"></i>Cerca Spazi
                </button>
                <button class="btn btn-outline-secondary" onclick="resetFilters()">
                    <i class="fas fa-refresh me-2"></i>Reset
                </button>
            </div>
        </div>

        <!-- Risultati di ricerca -->
        <div id="search-results">
            ${generateSpacesResults()}
        </div>
    `;

    // Carica risultati iniziali
    loadSpacesData();
}

/**
 * Carica sezione Mappa
 */
function loadMappaSection(container) {
    container.innerHTML = `
        <div class="space-card">
            <h3><i class="fas fa-map-marked-alt text-primary me-2"></i>Mappa Spazi</h3>
            <p class="text-muted mb-4">Visualizza tutti gli spazi disponibili sulla mappa</p>
            
            <div class="row">
                <div class="col-lg-3 mb-3">
                    <div class="filter-group">
                        <h6><i class="fas fa-layer-group me-2"></i>Layers Mappa</h6>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="show-available" checked onchange="toggleMapLayer('available')">
                            <label class="form-check-label" for="show-available">
                                <span class="badge bg-success me-2">●</span>Disponibili
                            </label>
                        </div>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="show-busy" onchange="toggleMapLayer('busy')">
                            <label class="form-check-label" for="show-busy">
                                <span class="badge bg-warning me-2">●</span>Occupati
                            </label>
                        </div>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="show-favorites" checked onchange="toggleMapLayer('favorites')">
                            <label class="form-check-label" for="show-favorites">
                                <span class="badge bg-danger me-2">●</span>Preferiti
                            </label>
                        </div>
                    </div>
                    
                    <div class="filter-group">
                        <h6><i class="fas fa-search-location me-2"></i>Ricerca Rapida</h6>
                        <input type="text" class="form-control mb-2" placeholder="Cerca indirizzo..." id="map-search">
                        <button class="btn btn-outline-primary btn-sm w-100" onclick="searchOnMap()">
                            <i class="fas fa-search me-1"></i>Cerca
                        </button>
                    </div>
                </div>
                
                <div class="col-lg-9">
                    <div class="map-container">
                        <div class="map-placeholder">
                            <div>
                                <i class="fas fa-map fa-4x text-primary mb-3"></i>
                                <h5>Mappa Interattiva</h5>
                                <p class="mb-3">Qui verrà integrata Google Maps o Leaflet<br>per mostrare le location degli spazi</p>
                                <button class="btn btn-gradient" onclick="initializeMap()">
                                    <i class="fas fa-play me-2"></i>Carica Mappa
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Carica sezione Filtri
 */
function loadFiltriSection(container) {
    container.innerHTML = `
        <div class="space-card">
            <h3><i class="fas fa-filter text-primary me-2"></i>Filtri Avanzati</h3>
            <p class="text-muted mb-4">Personalizza la tua ricerca con filtri dettagliati</p>
            
            <div class="row">
                <div class="col-lg-6">
                    <div class="filter-group">
                        <h5>💰 Prezzo</h5>
                        <div class="row">
                            <div class="col-6">
                                <label class="form-label">Da</label>
                                <input type="number" class="form-control" placeholder="€ min" id="price-min" onchange="updateFilters()">
                            </div>
                            <div class="col-6">
                                <label class="form-label">A</label>
                                <input type="number" class="form-control" placeholder="€ max" id="price-max" onchange="updateFilters()">
                            </div>
                        </div>
                        <div class="mt-2">
                            <small class="text-muted">Range: €10 - €100 per giorno</small>
                        </div>
                    </div>
                    
                    <div class="filter-group">
                        <h5>⚡ Servizi</h5>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="wifi" checked onchange="updateFilters()">
                            <label class="form-check-label" for="wifi">
                                <i class="fas fa-wifi text-success me-2"></i>Wi-Fi gratuito
                            </label>
                        </div>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="parking" onchange="updateFilters()">
                            <label class="form-check-label" for="parking">
                                <i class="fas fa-parking text-primary me-2"></i>Parcheggio
                            </label>
                        </div>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="meeting" onchange="updateFilters()">
                            <label class="form-check-label" for="meeting">
                                <i class="fas fa-users text-info me-2"></i>Sale riunioni
                            </label>
                        </div>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="coffee" onchange="updateFilters()">
                            <label class="form-check-label" for="coffee">
                                <i class="fas fa-coffee text-warning me-2"></i>Caffè/Ristoro
                            </label>
                        </div>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="printer" onchange="updateFilters()">
                            <label class="form-check-label" for="printer">
                                <i class="fas fa-print text-secondary me-2"></i>Stampante/Scanner
                            </label>
                        </div>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="security" onchange="updateFilters()">
                            <label class="form-check-label" for="security">
                                <i class="fas fa-shield-alt text-success me-2"></i>Accesso sicuro 24/7
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="col-lg-6">
                    <div class="filter-group">
                        <h5>👥 Capacità</h5>
                        <select class="form-select mb-3" id="capacity-filter" onchange="updateFilters()">
                            <option value="">Qualsiasi capacità</option>
                            <option value="1-5">1-5 persone</option>
                            <option value="6-15">6-15 persone</option>
                            <option value="16-30">16-30 persone</option>
                            <option value="30+">30+ persone</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <h5>🕒 Orari</h5>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="h24" onchange="updateFilters()">
                            <label class="form-check-label" for="h24">
                                <i class="fas fa-clock text-success me-2"></i>Accesso 24/7
                            </label>
                        </div>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="weekend" onchange="updateFilters()">
                            <label class="form-check-label" for="weekend">
                                <i class="fas fa-calendar-weekend text-primary me-2"></i>Disponibile weekend
                            </label>
                        </div>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="evening" onchange="updateFilters()">
                            <label class="form-check-label" for="evening">
                                <i class="fas fa-moon text-info me-2"></i>Orario serale (fino 22:00)
                            </label>
                        </div>
                    </div>
                    
                    <div class="filter-group">
                        <h5>⭐ Valutazione</h5>
                        <select class="form-select mb-3" id="rating-filter" onchange="updateFilters()">
                            <option value="">Qualsiasi valutazione</option>
                            <option value="5">⭐⭐⭐⭐⭐ 5 stelle</option>
                            <option value="4">⭐⭐⭐⭐ 4+ stelle</option>
                            <option value="3">⭐⭐⭐ 3+ stelle</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <h5>🏢 Tipo Edificio</h5>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="modern" onchange="updateFilters()">
                            <label class="form-check-label" for="modern">
                                <i class="fas fa-building text-primary me-2"></i>Edificio moderno
                            </label>
                        </div>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="historic" onchange="updateFilters()">
                            <label class="form-check-label" for="historic">
                                <i class="fas fa-landmark text-warning me-2"></i>Edificio storico
                            </label>
                        </div>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="loft" onchange="updateFilters()">
                            <label class="form-check-label" for="loft">
                                <i class="fas fa-home text-info me-2"></i>Loft/Spazio creativo
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mt-4 d-flex gap-2 flex-wrap">
                <button class="btn btn-gradient" onclick="applyFilters()">
                    <i class="fas fa-check me-2"></i>Applica Filtri
                </button>
                <button class="btn btn-outline-secondary" onclick="resetAllFilters()">
                    <i class="fas fa-refresh me-2"></i>Reset Tutto
                </button>
                <button class="btn btn-outline-info" onclick="saveFilters()">
                    <i class="fas fa-save me-2"></i>Salva Filtri
                </button>
                <button class="btn btn-outline-success" onclick="loadSavedFilters()">
                    <i class="fas fa-download me-2"></i>Carica Salvati
                </button>
            </div>
            
            <!-- Filtri attivi -->
            <div id="active-filters" class="mt-3">
                <!-- I filtri attivi verranno mostrati qui -->
            </div>
        </div>
    `;

    // Carica filtri salvati se esistono
    loadSavedFiltersOnInit();
}

/**
 * Carica sezione Preferiti
 */
function loadPreferitiSection(container) {
    const favorites = getFavoriteSpaces();

    container.innerHTML = `
        <div class="space-card">
            <h3><i class="fas fa-heart text-primary me-2"></i>Spazi Preferiti</h3>
            <p class="text-muted mb-4">I tuoi spazi salvati per accesso rapido</p>
            
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <span class="badge bg-primary">${favorites.length} preferiti</span>
                    <span class="text-muted ms-2">Ultimo aggiornamento: ${getLastUpdateTime()}</span>
                </div>
                <div>
                    <button class="btn btn-outline-primary btn-sm me-2" onclick="sortFavorites()">
                        <i class="fas fa-sort me-1"></i>Ordina
                    </button>
                    <button class="btn btn-outline-danger btn-sm" onclick="clearAllFavorites()">
                        <i class="fas fa-trash me-1"></i>Svuota Tutto
                    </button>
                </div>
            </div>
            
            <div id="favorites-container">
                ${favorites.length > 0 ? generateFavoritesHTML(favorites) : generateEmptyFavoritesHTML()}
            </div>
        </div>
    `;
}

/**
 * Genera HTML per i risultati degli spazi
 */
function generateSpacesResults() {
    const sampleSpaces = [
        {
            id: 1,
            name: 'WorkHub Milano Centro',
            location: 'Via Brera 12, Milano',
            price: 25,
            image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&h=200&fit=crop',
            rating: 4.8,
            features: ['wifi', 'parking', 'meeting'],
            type: 'desk',
            city: 'milano'
        },
        {
            id: 2,
            name: 'CreativeSpace Porta Nuova',
            location: 'Corso Como 15, Milano',
            price: 30,
            image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=300&h=200&fit=crop',
            rating: 4.6,
            features: ['wifi', 'coffee', 'printer'],
            type: 'office',
            city: 'milano'
        },
        {
            id: 3,
            name: 'BusinessHub Navigli',
            location: 'Via Naviglio Grande 8, Milano',
            price: 35,
            image: 'https://images.unsplash.com/photo-1571624436279-b272aff752b5?w=300&h=200&fit=crop',
            rating: 4.9,
            features: ['wifi', 'parking', 'meeting', 'coffee'],
            type: 'meeting',
            city: 'milano'
        },
        {
            id: 4,
            name: 'Roma Coworking Centrale',
            location: 'Via del Corso 123, Roma',
            price: 28,
            image: 'https://images.unsplash.com/photo-1525268771113-32d9e9021a97?w=300&h=200&fit=crop',
            rating: 4.5,
            features: ['wifi', 'meeting', 'security'],
            type: 'desk',
            city: 'roma'
        }
    ];

    return `
        <div class="row" id="spaces-grid">
            ${sampleSpaces.map(space => generateSpaceCard(space)).join('')}
        </div>
    `;
}

/**
 * Genera HTML per una singola card spazio
 */
function generateSpaceCard(space) {
    const isFavorite = window.isFavoriteSpace ? window.isFavoriteSpace(space.id) : false;

    return `
        <div class="col-lg-4 col-md-6 mb-4" data-space-id="${space.id}">
            <div class="space-card">
                <div class="space-image">
                    <img src="${space.images?.[0] || '/assets/images/placeholder-space.jpg'}" 
                         alt="${space.name}" class="w-100">
                    <div class="space-overlay">
                        <button class="btn btn-sm btn-light space-favorite-btn ${isFavorite ? 'active' : ''}" 
                                onclick="toggleFavorite('${space.id}')">
                            <i class="fas fa-heart"></i>
                        </button>
                        <span class="badge bg-primary space-type">${getSpaceTypeLabel(space.type)}</span>
                    </div>
                </div>
                <div class="space-content">
                    <h5 class="space-title">${space.name}</h5>
                    <p class="space-location">
                        <i class="fas fa-map-marker-alt me-1"></i>
                        ${space.address}, ${space.city}
                    </p>
                    <p class="space-description">${space.description?.substring(0, 100) || ''}...</p>
                    
                    <div class="space-amenities mb-2">
                        ${buildAmenities(space.amenities || [])}
                    </div>
                    
                    <div class="space-meta">
                        <div class="space-capacity">
                            <i class="fas fa-users me-1"></i>
                            ${space.capacity} persone
                        </div>
                        <div class="space-rating">
                            <i class="fas fa-star text-warning me-1"></i>
                            ${space.avg_rating || 0}/5
                        </div>
                    </div>
                    
                    <div class="space-footer">
                        <div class="space-price">
                            <strong>€${space.price_per_day}/giorno</strong>
                        </div>
                        <div class="space-actions">
                            <button class="btn btn-outline-primary btn-sm me-2" 
                                    onclick="viewSpaceDetails('${space.id}')">
                                <i class="fas fa-eye"></i> Dettagli
                            </button>
                            <!-- QUESTO È IL FIX PRINCIPALE -->
                            <button class="btn btn-primary btn-sm" 
                                    onclick="bookSpace('${space.id}')">
                                <i class="fas fa-calendar-plus"></i> Prenota
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Utilitiy functions
 */
function getFeatureIcon(feature) {
    const icons = {
        wifi: '<span class="badge bg-success me-1"><i class="fas fa-wifi"></i> Wi-Fi</span>',
        parking: '<span class="badge bg-primary me-1"><i class="fas fa-parking"></i> Parking</span>',
        meeting: '<span class="badge bg-info me-1"><i class="fas fa-users"></i> Meeting</span>',
        coffee: '<span class="badge bg-warning me-1"><i class="fas fa-coffee"></i> Caffè</span>',
        printer: '<span class="badge bg-secondary me-1"><i class="fas fa-print"></i> Stampa</span>',
        security: '<span class="badge bg-dark me-1"><i class="fas fa-shield-alt"></i> Sicuro</span>'
    };
    return icons[feature] || `<span class="badge bg-light text-dark me-1">${feature}</span>`;
}

function getSpaceTypeLabel(type) {
    const labels = {
        desk: 'Desk Condiviso',
        office: 'Ufficio Privato',
        meeting: 'Sala Riunioni',
        event: 'Spazio Eventi'
    };
    return labels[type] || type;
}

/**
 * Gestione preferiti
 */
function toggleFavorite(spaceId) {
    let favorites = JSON.parse(localStorage.getItem('coworkspace_favorites') || '[]');
    const index = favorites.indexOf(spaceId);

    if (index === -1) {
        favorites.push(spaceId);
        showNotification('Spazio aggiunto ai preferiti!', 'success');
    } else {
        favorites.splice(index, 1);
        showNotification('Spazio rimosso dai preferiti', 'info');
    }

    localStorage.setItem('coworkspace_favorites', JSON.stringify(favorites));
    updateFavoritesBadge();

    // Aggiorna UI
    const btn = document.querySelector(`[data-space-id="${spaceId}"] .space-favorite-btn`);
    if (btn) {
        btn.classList.toggle('active');
    }
}

function isFavoriteSpace(spaceId) {
    const favorites = JSON.parse(localStorage.getItem('coworkspace_favorites') || '[]');
    return favorites.includes(spaceId);
}

function getFavoriteSpaces() {
    const favoriteIds = JSON.parse(localStorage.getItem('coworkspace_favorites') || '[]');
    // In un'app reale, faresti una chiamata API per ottenere i dettagli
    return favoriteIds.map(id => ({ id, name: `Space ${id}`, location: 'Milano' }));
}

function updateFavoritesBadge() {
    const favorites = JSON.parse(localStorage.getItem('coworkspace_favorites') || '[]');
    const badge = document.getElementById('favorites-badge');
    if (badge) {
        badge.textContent = favorites.length;
        badge.classList.toggle('empty', favorites.length === 0);
    }
}

/**
 * Gestione filtri
 */
function updateFilters() {
    const activeFilters = getActiveFilters();
    updateFiltersBadge(Object.keys(activeFilters).length);
    displayActiveFilters(activeFilters);
}

function getActiveFilters() {
    const filters = {};
    const inputs = document.querySelectorAll('#filtri-section input:checked, #filtri-section select:not([value=""]), #filtri-section input[type="number"]:not([value=""])');

    inputs.forEach(input => {
        if (input.value && input.value !== '') {
            filters[input.id] = input.value;
        }
    });

    return filters;
}

function updateFiltersBadge(count) {
    const badge = document.getElementById('filter-badge');
    if (badge) {
        badge.textContent = count;
        badge.classList.toggle('empty', count === 0);
        badge.classList.toggle('warning', count > 0);
    }
}

function applyFilters() {
    const filters = getActiveFilters();
    console.log('🎛️ Applying filters:', filters);

    // Qui integrerai con la tua API per filtrare i risultati
    showNotification(`${Object.keys(filters).length} filtri applicati!`, 'success');

    // Simula il filtraggio dei risultati
    filterSpacesResults(filters);
}

function resetAllFilters() {
    document.querySelectorAll('#filtri-section input, #filtri-section select').forEach(input => {
        if (input.type === 'checkbox') {
            input.checked = false;
        } else {
            input.value = '';
        }
    });

    updateFiltersBadge(0);
    showNotification('Filtri ripristinati', 'info');
}

/**
 * Azioni principali
 */
function searchSpaces() {
    const city = document.getElementById('city-filter')?.value;
    const type = document.getElementById('type-filter')?.value;
    const date = document.getElementById('date-filter')?.value;

    console.log('🔍 Searching spaces:', { city, type, date });

    showNotification('Ricerca in corso...', 'info');

    // Simula una chiamata API
    setTimeout(() => {
        showNotification('Ricerca completata!', 'success');
    }, 1000);
}

function bookSpace(spaceId) {
    console.log('📅 Booking space:', spaceId);
    showNotification('Reindirizzamento alla prenotazione...', 'info');
    // Qui andresti alla pagina di prenotazione
}

function viewSpaceDetails(spaceId) {
    console.log('👁️ Viewing space details:', spaceId);
    showNotification('Caricamento dettagli...', 'info');
    // Qui apriresti un modal o una nuova pagina con i dettagli
}

/**
 * Gestione notifiche
 */
function showNotification(message, type = 'info') {
    const toast = document.getElementById('notification-toast');
    const toastMessage = document.getElementById('toast-message');

    if (toast && toastMessage) {
        toastMessage.textContent = message;

        // Aggiorna il colore del toast basato sul tipo
        toast.className = `toast show bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} text-white`;

        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    } else {
        // Fallback se il toast non è disponibile
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
    }
}

/**
 * Utility functions varie
 */
function getLastUpdateTime() {
    return new Date().toLocaleString('it-IT');
}

function generateEmptyFavoritesHTML() {
    return `
        <div class="empty-state">
            <i class="fas fa-heart-broken"></i>
            <h5>Nessuno spazio preferito</h5>
            <p>Aggiungi spazi ai preferiti per trovarli rapidamente qui</p>
            <button class="btn btn-gradient" onclick="showSpacesSection('ricerca')">
                <i class="fas fa-search me-2"></i>Cerca Spazi
            </button>
        </div>
    `;
}

/**
 * Inizializzazione
 */
function loadInitialData() {
    updateFavoritesBadge();
    console.log('✅ Spaces page initialized');
}

// Event listeners per inizializzazione
document.addEventListener('DOMContentLoaded', function() {
    loadInitialData();
});

// ==================== FUNZIONI GLOBALI PER HTML ====================
window.showFilters = function() {
    const filtersContainer = document.querySelector('.advanced-filters');
    if (filtersContainer) {
        filtersContainer.style.display =
            filtersContainer.style.display === 'none' ? 'block' : 'none';
    }
};

window.showMapView = function() {
    Spaces.setViewMode('map');
};

window.showGridView = function() {
    Spaces.setViewMode('grid');
};

window.loadMoreSpaces = function() {
    // Implementare caricamento pagina successiva
    Spaces.showNotification('Caricamento pagine multiple in arrivo!', 'info');
};

window.showBookingModal = function(spaceId) {
    console.log('🔄 Redirecting showBookingModal to bookSpace for:', spaceId);
    // Reindirizza alla nuova funzione
    if (window.bookSpace) {
        window.bookSpace(spaceId);
    } else {
        console.error('❌ bookSpace function not found! Make sure booking.js is loaded.');
        alert('Sistema di prenotazione non disponibile. Ricarica la pagina.');
    }
};

window.debugBookingSystem = function() {
    console.log('🔍 Debugging booking system...');
    console.log('- window.bookSpace:', typeof window.bookSpace);
    console.log('- window.BookingManager:', typeof window.BookingManager);
    console.log('- Bootstrap Modal:', typeof bootstrap?.Modal);
    console.log('- Auth token:', localStorage.getItem('auth_token') ? 'Present' : 'Missing');

    const bookingButtons = document.querySelectorAll('[onclick*="bookSpace"]');
    console.log('- Booking buttons found:', bookingButtons.length);

    const showBookingButtons = document.querySelectorAll('[onclick*="showBookingModal"]');
    console.log('- Old showBookingModal buttons found:', showBookingButtons.length);

    return {
        bookSpaceFunction: typeof window.bookSpace,
        bookingManager: typeof window.BookingManager,
        bootstrapModal: typeof bootstrap?.Modal,
        authToken: !!localStorage.getItem('auth_token'),
        bookingButtons: bookingButtons.length,
        oldButtons: showBookingButtons.length
    };
};

window.fixBookingButtons = function() {
    console.log('🔧 Fixing existing booking buttons...');

    // Trova tutti i bottoni con showBookingModal e correggili
    const oldButtons = document.querySelectorAll('[onclick*="showBookingModal"]');

    oldButtons.forEach((button, index) => {
        const onClick = button.getAttribute('onclick');
        const spaceId = onClick.match(/showBookingModal\(['"]([^'"]+)['"]\)/)?.[1];

        if (spaceId) {
            button.setAttribute('onclick', `bookSpace('${spaceId}')`);
            console.log(`✅ Fixed button ${index + 1}: ${spaceId}`);
        }
    });

    console.log(`🎯 Fixed ${oldButtons.length} booking buttons`);
    return oldButtons.length;
};

window.stopSpacesLoop = function() {
    console.log('🚨 Emergency stop requested');

    if (window.Spaces && window.Spaces.stopLoop) {
        return window.Spaces.stopLoop();
    }

    // Fallback
    const containers = document.querySelectorAll('#spacesContainer');
    containers.forEach(container => {
        container.innerHTML = '<div class="text-center p-4"><h5>Sistema fermato per manutenzione</h5><button class="btn btn-primary" onclick="location.reload()">Ricarica Pagina</button></div>';
    });

    return 'Emergency stop executed';
}

window.reloadSpacesClean = function() {
    console.log('🔄 Clean reload requested');

    // Pulisci localStorage
    localStorage.removeItem('searchParams');

    // Ferma il loop
    if (window.stopSpacesLoop) {
        window.stopSpacesLoop();
    }

    // Ricarica la pagina
    setTimeout(() => {
        location.reload();
    }, 1000);
}

console.log('🔧 Loop fix loaded - use stopSpacesLoop() or reloadSpacesClean() if needed');

// ==================== AUTO-INIZIALIZZAZIONE ====================
document.addEventListener('DOMContentLoaded', function() {
    // Inizializza solo se siamo nella pagina spazi
    if (document.getElementById('spacesContainer')) {
        Spaces.init();
    }
});

console.log('✅ Spaces module loaded and ready');