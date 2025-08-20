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
        console.log('📍 Initializing Spaces module...');

        try {
            this.setupEventListeners();
            this.initializeUI();
            await this.loadSpaces();

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
    async loadSpaces(filters = {}) {
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

                this.applyFiltersAndSort();
                this.renderSpaces();
                this.updateResultsCount();

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

        console.log('🔍 Quick filter clicked:', filter, 'Active:', button.classList.contains('active'));

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

        this.loadSpaces(this.state.currentFilters);
    },

    handleSearch() {
        const searchInput = document.getElementById('searchSpaces');
        const citySelect = document.getElementById('quickCity');
        const typeSelect = document.getElementById('quickSpaceType');

        this.state.currentFilters.search = searchInput?.value || '';
        this.state.currentFilters.city = citySelect?.value || '';
        this.state.currentFilters.type = typeSelect?.value || '';

        console.log('🔍 Search filters:', this.state.currentFilters);

        this.loadSpaces(this.state.currentFilters);
    },

    applyFiltersAndSort() {
        // Il sorting viene gestito dal backend, quindi chiamiamo l'API
        this.loadSpaces({
            ...this.state.currentFilters,
            sortBy: this.state.sortBy,
            sortOrder: this.state.sortOrder
        });
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

// ==================== AUTO-INIZIALIZZAZIONE ====================
document.addEventListener('DOMContentLoaded', function() {
    // Inizializza solo se siamo nella pagina spazi
    if (document.getElementById('spacesContainer')) {
        Spaces.init();
    }
});

console.log('✅ Spaces module loaded and ready');