/**
 * CoWorkSpace - Spaces Management
 * Gestione spazi coworking
 */

window.Spaces = {
    currentSpaces: [],
    filters: {},
    sortBy: 'relevance',
    viewMode: 'grid',
    mapZoomLevel: 1,
    selectedCity: null,

    /**
     * Inizializza la gestione spazi
     */
    init() {
        console.log('🏢 Spaces module initialized');
        this.loadSpaces();
        this.setupEventListeners();
        this.setupSearch();
        this.setupQuickFilters();
        this.initializeMap();
    },

    /**
     * Carica gli spazi
     */
    async loadSpaces() {
        try {
            App.utils.showLoading();

            // Simula chiamata API
            await App.utils.delay(500);

            // Carica spazi mock
            this.currentSpaces = [...App.api.mockData.spaces];
            this.renderSpaces();
            this.updateResultsCount();

            App.utils.hideLoading();
            console.log(`📊 Caricati ${this.currentSpaces.length} spazi`);
        } catch (error) {
            console.error('Errore caricamento spazi:', error);
            App.utils.showNotification('Errore nel caricamento degli spazi', 'error');
            App.utils.hideLoading();
        }
    },

    /**
     * Renderizza gli spazi
     */
    renderSpaces() {
        const container = document.getElementById('spacesContainer');
        if (!container) return;

        if (this.currentSpaces.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

        container.innerHTML = this.currentSpaces.map(space => this.createSpaceCard(space)).join('');
        this.setupSpaceCardEvents();
    },

    /**
     * Crea card dello spazio
     */
    createSpaceCard(space) {
        const availabilityClass = space.available ? 'available' : 'busy';
        const availabilityText = space.available ? 'Disponibile' : 'Non Disponibile';
        const featuredBadge = space.featured ? '<div class="space-badge featured">In Evidenza</div>' : '';

        return `
            <div class="space-card" data-space-id="${space.id}">
                <div class="space-image" style="background-image: url('${space.image}');">
                    ${featuredBadge}
                    <div class="availability-badge ${availabilityClass}">
                        <i class="fas fa-${space.available ? 'check-circle' : 'times-circle'}"></i>
                        ${availabilityText}
                    </div>
                </div>
                <div class="space-info">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="space-title">${space.name}</h5>
                        <div class="rating">
                            <i class="fas fa-star text-warning"></i>
                            <span class="fw-bold">${space.rating}</span>
                            <small class="text-muted ms-1">(${space.reviews})</small>
                        </div>
                    </div>
                    <div class="space-location mb-2">
                        <i class="fas fa-map-marker-alt text-primary"></i>
                        <span class="ms-1">${space.address}</span>
                    </div>
                    <p class="space-description text-muted mb-3">${space.description}</p>
                    <div class="amenities mb-3">
                        ${this.renderAmenities(space.amenities)}
                    </div>
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div class="space-price">
                            <strong class="text-primary fs-4">${App.utils.formatPrice(space.price)}<small class="fs-6 text-muted">/giorno</small></strong>
                        </div>
                        <div class="space-capacity text-muted">
                            <i class="fas fa-users me-1"></i>${space.capacity} persone
                        </div>
                    </div>
                    <button class="btn btn-primary w-100 btn-lg space-book-btn" 
                            data-space-id="${space.id}"
                            ${!space.available ? 'disabled' : ''}>
                        ${space.available ? '<i class="fas fa-calendar-plus me-2"></i>Prenota Ora' : '<i class="fas fa-times me-2"></i>Non Disponibile'}
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Renderizza servizi
     */
    renderAmenities(amenities) {
        const maxVisible = 3;
        const visibleAmenities = amenities.slice(0, maxVisible);
        const hiddenCount = amenities.length - maxVisible;

        let html = visibleAmenities.map(amenity =>
            `<span class="amenity badge me-1">${App.utils.getAmenityLabel(amenity)}</span>`
        ).join('');

        if (hiddenCount > 0) {
            html += `<span class="badge bg-secondary">+${hiddenCount}</span>`;
        }

        return html;
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Sort change
        const sortSelect = document.getElementById('sortSpaces');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.applySorting();
            });
        }

        // View toggle
        const gridBtn = document.getElementById('gridViewBtn');
        const mapBtn = document.getElementById('mapViewBtn');

        if (gridBtn) {
            gridBtn.addEventListener('click', () => this.showGridView());
        }
        if (mapBtn) {
            mapBtn.addEventListener('click', () => this.showMapView());
        }

        // Load more
        const loadMoreBtn = document.getElementById('loadMoreSpaces');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMoreSpaces());
        }
    },

    /**
     * Setup search
     */
    setupSearch() {
        const searchInput = document.getElementById('searchSpaces');
        if (!searchInput) return;

        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 300);
        });
    },

    /**
     * Esegui ricerca
     */
    performSearch(query) {
        if (!query.trim()) {
            this.currentSpaces = [...App.api.mockData.spaces];
        } else {
            const searchTerm = query.toLowerCase();
            this.currentSpaces = App.api.mockData.spaces.filter(space =>
                space.name.toLowerCase().includes(searchTerm) ||
                space.city.toLowerCase().includes(searchTerm) ||
                space.description.toLowerCase().includes(searchTerm) ||
                space.amenities.some(amenity =>
                    App.utils.getAmenityLabel(amenity).toLowerCase().includes(searchTerm)
                )
            );
        }

        this.renderSpaces();
        this.updateResultsCount();
        this.updateMapMarkers();
    },

    /**
     * Setup filtri rapidi
     */
    setupQuickFilters() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-filter-btn')) {
                const filter = e.target.getAttribute('data-filter');
                e.target.classList.toggle('active');
                this.applyQuickFilter(filter, e.target.classList.contains('active'));
            }
        });
    },

    /**
     * Applica filtro rapido
     */
    applyQuickFilter(filter, active) {
        let filteredSpaces = [...App.api.mockData.spaces];

        // Raccoglie tutti i filtri attivi
        const activeFilters = [];
        document.querySelectorAll('.quick-filter-btn.active').forEach(btn => {
            activeFilters.push(btn.getAttribute('data-filter'));
        });

        // Applica filtri
        if (activeFilters.includes('available')) {
            filteredSpaces = filteredSpaces.filter(s => s.available);
        }
        if (activeFilters.includes('featured')) {
            filteredSpaces = filteredSpaces.filter(s => s.featured);
        }
        if (activeFilters.includes('hot-desk')) {
            filteredSpaces = filteredSpaces.filter(s => s.type === 'hot-desk');
        }
        if (activeFilters.includes('meeting-room')) {
            filteredSpaces = filteredSpaces.filter(s => s.type === 'meeting-room');
        }

        this.currentSpaces = filteredSpaces;
        this.renderSpaces();
        this.updateResultsCount();
        this.updateMapMarkers();
    },

    /**
     * Applica ordinamento
     */
    applySorting() {
        switch (this.sortBy) {
            case 'rating':
                this.currentSpaces.sort((a, b) => b.rating - a.rating);
                break;
            case 'price-low':
                this.currentSpaces.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                this.currentSpaces.sort((a, b) => b.price - a.price);
                break;
            case 'distance':
                // Simulazione ordinamento per distanza
                this.currentSpaces.sort(() => Math.random() - 0.5);
                break;
            default: // relevance
                this.currentSpaces.sort((a, b) => {
                    // Ordina per featured prima, poi per rating
                    if (a.featured && !b.featured) return -1;
                    if (!a.featured && b.featured) return 1;
                    return b.rating - a.rating;
                });
        }

        this.renderSpaces();
    },

    /**
     * Mostra vista griglia
     */
    showGridView() {
        document.getElementById('spacesContainer').style.display = 'block';
        document.getElementById('mapContainer').style.display = 'none';

        document.querySelectorAll('.view-toggle .btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('gridViewBtn').classList.add('active');

        this.viewMode = 'grid';
        App.utils.showNotification('Vista griglia attivata', 'info');
    },

    /**
     * Mostra vista mappa
     */
    showMapView() {
        document.getElementById('spacesContainer').style.display = 'none';
        document.getElementById('mapContainer').style.display = 'block';

        document.querySelectorAll('.view-toggle .btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('mapViewBtn').classList.add('active');

        this.viewMode = 'map';
        this.updateMapMarkers();
        App.utils.showNotification('Vista mappa attivata', 'info');
    },

    /**
     * Inizializza mappa
     */
    initializeMap() {
        this.setupMapInteractions();
    },

    /**
     * Setup interazioni mappa
     */
    setupMapInteractions() {
        // Setup dei marker delle città
        const cityMarkers = document.querySelectorAll('.city-marker');
        cityMarkers.forEach(marker => {
            marker.addEventListener('click', (e) => {
                const cityName = marker.getAttribute('data-city');
                const spaceCount = marker.getAttribute('data-count');
                this.showCityPopup(e, cityName, spaceCount);
            });

            marker.addEventListener('mouseenter', () => {
                marker.style.transform = 'scale(1.5)';
                marker.style.filter = 'brightness(1.2)';
            });

            marker.addEventListener('mouseleave', () => {
                marker.style.transform = 'scale(1)';
                marker.style.filter = 'brightness(1)';
            });
        });

        // Controlli zoom
        window.zoomIn = () => {
            this.mapZoomLevel = Math.min(this.mapZoomLevel + 0.2, 2);
            this.updateMapZoom();
            App.utils.showNotification('Zoom avvicinato', 'info');
        };

        window.zoomOut = () => {
            this.mapZoomLevel = Math.max(this.mapZoomLevel - 0.2, 0.8);
            this.updateMapZoom();
            App.utils.showNotification('Zoom allontanato', 'info');
        };

        window.centerMap = () => {
            this.mapZoomLevel = 1;
            this.updateMapZoom();
            App.utils.showNotification('Mappa centrata', 'info');
        };

        window.filterByCity = () => {
            if (this.selectedCity) {
                this.currentSpaces = App.api.mockData.spaces.filter(space => space.city === this.selectedCity);
                this.showGridView();
                this.renderSpaces();
                this.updateResultsCount();
                document.getElementById('cityPopup').style.display = 'none';
                App.utils.showNotification(`Filtrati spazi per ${this.selectedCity}`, 'success');
            }
        };
    },

    /**
     * Mostra popup città
     */
    showCityPopup(event, cityName, spaceCount) {
        const popup = document.getElementById('cityPopup');
        const citySpaces = this.currentSpaces.filter(space => space.city === cityName);

        document.getElementById('popupCityName').textContent = cityName;
        document.getElementById('popupSpaceCount').textContent = `${citySpaces.length} spazi disponibili`;

        // Posiziona il popup
        const rect = event.target.getBoundingClientRect();
        const mapRect = document.getElementById('italyMap').getBoundingClientRect();

        popup.style.left = (rect.left - mapRect.left + 20) + 'px';
        popup.style.top = (rect.top - mapRect.top - 80) + 'px';
        popup.style.display = 'block';

        this.selectedCity = cityName;

        // Nascondi dopo 3 secondi
        setTimeout(() => {
            popup.style.display = 'none';
        }, 3000);
    },

    /**
     * Aggiorna zoom mappa
     */
    updateMapZoom() {
        const mapSvg = document.querySelector('.italy-svg');
        if (mapSvg) {
            mapSvg.style.transform = `scale(${this.mapZoomLevel})`;
            mapSvg.style.transition = 'transform 0.3s ease';
        }
    },

    /**
     * Aggiorna marker mappa
     */
    updateMapMarkers() {
        const mapSpaceCount = document.getElementById('mapSpaceCount');
        if (mapSpaceCount) {
            mapSpaceCount.textContent = `${this.currentSpaces.length} spazi sulla mappa`;
        }
    },

    /**
     * Setup eventi card spazi
     */
    setupSpaceCardEvents() {
        document.querySelectorAll('.space-book-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const spaceId = parseInt(e.target.getAttribute('data-space-id'));
                this.showSpaceDetail(spaceId);
            });
        });
    },

    /**
     * Mostra dettagli spazio
     */
    showSpaceDetail(spaceId) {
        const space = App.api.mockData.spaces.find(s => s.id === spaceId);
        if (!space) {
            App.utils.showNotification('Spazio non trovato', 'error');
            return;
        }

        // Crea e mostra modal
        this.createSpaceDetailModal(space);
    },

    /**
     * Crea modal dettagli spazio
     */
    createSpaceDetailModal(space) {
        const modalHtml = `
            <div class="modal fade" id="spaceDetailModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${space.name}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-8">
                                    <img src="${space.image}" class="img-fluid rounded mb-4" alt="${space.name}">
                                    <h6><i class="fas fa-info-circle text-primary"></i> Descrizione</h6>
                                    <p>${space.description}</p>
                                    <div class="row mt-3 mb-4">
                                        <div class="col-md-4"><strong>Capacità:</strong> ${space.capacity} persone</div>
                                        <div class="col-md-4"><strong>Prezzo:</strong> ${App.utils.formatPrice(space.price)}/giorno</div>
                                        <div class="col-md-4"><strong>Rating:</strong> ${space.rating} ⭐ (${space.reviews} recensioni)</div>
                                    </div>
                                    <h6><i class="fas fa-list-ul text-primary"></i> Servizi Inclusi</h6>
                                    <div class="row mb-4">
                                        ${space.amenities.map(amenity => `
                                            <div class="col-md-6 mb-2">
                                                <i class="fas fa-check text-success"></i>
                                                <span class="ms-2">${App.utils.getAmenityLabel(amenity)}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <h6><i class="fas fa-map-marker-alt text-primary"></i> Posizione</h6>
                                    <p><strong>${space.address}</strong></p>
                                    <p>Città: ${space.city}</p>
                                </div>
                                <div class="col-md-4">
                                    <div class="booking-form">
                                        <h5><i class="fas fa-calendar-plus text-primary"></i> Prenota Ora</h5>
                                        <div class="alert alert-info">
                                            <i class="fas fa-info-circle"></i>
                                            Demo: La prenotazione è simulata
                                        </div>
                                        <button class="btn btn-primary w-100 btn-lg" onclick="Spaces.simulateBooking(${space.id})">
                                            <i class="fas fa-calendar-check"></i> Prenota Demo
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Rimuovi modal esistente
        const existingModal = document.getElementById('spaceDetailModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Aggiungi nuovo modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Mostra modal
        const modal = new bootstrap.Modal(document.getElementById('spaceDetailModal'));
        modal.show();
    },

    /**
     * Simula prenotazione
     */
    simulateBooking(spaceId) {
        const space = App.api.mockData.spaces.find(s => s.id === spaceId);
        if (!space) return;

        if (!App.auth.isAuthenticated()) {
            App.utils.showNotification('Devi effettuare il login per prenotare', 'warning');
            const modal = bootstrap.Modal.getInstance(document.getElementById('spaceDetailModal'));
            modal.hide();
            setTimeout(() => App.auth.showLogin(), 300);
            return;
        }

        // Simula prenotazione
        App.utils.showNotification(`Prenotazione simulata per ${space.name}!`, 'success');
        const modal = bootstrap.Modal.getInstance(document.getElementById('spaceDetailModal'));
        modal.hide();
    },

    /**
     * Carica più spazi
     */
    loadMoreSpaces() {
        App.utils.showNotification('Nessun altro spazio da caricare in questa demo', 'info');
    },

    /**
     * Aggiorna contatore risultati
     */
    updateResultsCount() {
        const counter = document.getElementById('resultsCount');
        if (counter) {
            counter.textContent = `${this.currentSpaces.length} spazi trovati`;
        }
    },

    /**
     * HTML stato vuoto
     */
    getEmptyStateHTML() {
        return `
            <div class="text-center py-5">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <h4>Nessuno spazio trovato</h4>
                <p class="text-muted">Prova a modificare i filtri di ricerca</p>
                <button class="btn btn-outline-primary" onclick="Spaces.clearAllFilters()">
                    <i class="fas fa-refresh"></i> Azzera Filtri
                </button>
            </div>
        `;
    },

    /**
     * Cancella tutti i filtri
     */
    clearAllFilters() {
        // Reset filtri UI
        document.getElementById('searchSpaces').value = '';
        document.querySelectorAll('.quick-filter-btn').forEach(btn => btn.classList.remove('active'));

        // Reset spazi
        this.currentSpaces = [...App.api.mockData.spaces];
        this.renderSpaces();
        this.updateResultsCount();
        this.updateMapMarkers();

        App.utils.showNotification('Filtri cancellati', 'info');
    }
};

// Funzioni globali per compatibilità
window.showFilters = () => {
    App.utils.showNotification('Modal filtri avanzati disponibile nella versione completa', 'info');
};

window.showGridView = () => Spaces.showGridView();
window.showMapView = () => Spaces.showMapView();

console.log('🏢 Spaces module loaded');