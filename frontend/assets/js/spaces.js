/**
 * CoWorkSpace - Gestione Spazi
 * Gestisce ricerca, filtri, visualizzazione e prenotazione spazi
 */

window.Spaces = {
    // ==================== STATO INTERNO ====================
    state: {
        spaces: [],
        filteredSpaces: [],
        currentFilters: {
            search: '',
            city: '',
            type: '',
            priceMin: 0,
            priceMax: 1000,
            amenities: [],
            rating: 0
        },
        currentPage: 1,
        itemsPerPage: 12,
        sortBy: 'name',
        sortOrder: 'asc',
        isLoading: false,
        selectedSpace: null,
        favorites: [],
        viewMode: 'grid' // 'grid' or 'list'
    },

    // ==================== INIZIALIZZAZIONE ====================
    async init() {
        console.log('🏢 Spaces module initializing...');

        // Carica favoriti dal localStorage
        this.loadFavorites();

        // Setup event listeners
        this.setupEventListeners();

        // Carica spazi se la sezione è visibile
        if (this.isSpacesSection()) {
            await this.loadSpaces();
        }

        // Listener per cambio sezione
        document.addEventListener('sectionChanged', (e) => {
            if (e.detail.section === 'spaces') {
                this.loadSpaces();
            }
        });

        console.log('✅ Spaces module initialized');
    },

    // ==================== CARICAMENTO DATI ====================
    async loadSpaces(refresh = false) {
        if (this.state.isLoading && !refresh) return;

        this.state.isLoading = true;
        this.showLoadingState();

        try {
            console.log('📡 Loading spaces from API...');
            const response = await window.api.getSpaces(this.currentFilters);

            if (response.success) {
                this.state.spaces = response.data.spaces || response.data;
                this.state.filteredSpaces = [...this.state.spaces];
                this.applyFiltersAndSort();
                this.renderSpaces();
                console.log(`✅ Loaded ${this.state.spaces.length} spaces`);
            } else {
                throw new Error(response.message || 'Errore nel caricamento spazi');
            }
        } catch (error) {
            console.error('❌ Error loading spaces:', error);
            this.showErrorState(error.message);

            // Fallback a dati mock se disponibili
            this.loadMockSpaces();
        } finally {
            this.state.isLoading = false;
        }
    },

    // ==================== RICERCA E FILTRI ====================
    async searchSpaces(query = '') {
        this.state.currentFilters.search = query;
        this.state.currentPage = 1;

        if (query.length >= 2) {
            try {
                const response = await window.api.searchSpaces({
                    query,
                    ...this.state.currentFilters
                });

                if (response.success) {
                    this.state.filteredSpaces = response.data.spaces || response.data;
                    this.renderSpaces();
                }
            } catch (error) {
                console.error('❌ Search error:', error);
                this.applyFiltersAndSort();
            }
        } else {
            this.applyFiltersAndSort();
        }
    },

    applyFilters(filters = {}) {
        Object.assign(this.state.currentFilters, filters);
        this.state.currentPage = 1;
        this.applyFiltersAndSort();
        this.renderSpaces();
        this.updateFiltersUI();
    },

    applyFiltersAndSort() {
        let filtered = [...this.state.spaces];

        // Applica filtri
        const { search, city, type, priceMin, priceMax, amenities, rating } = this.state.currentFilters;

        if (search) {
            filtered = filtered.filter(space =>
                space.name.toLowerCase().includes(search.toLowerCase()) ||
                space.description.toLowerCase().includes(search.toLowerCase()) ||
                space.address.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (city) {
            filtered = filtered.filter(space => space.city === city);
        }

        if (type) {
            filtered = filtered.filter(space => space.type === type);
        }

        if (priceMin > 0) {
            filtered = filtered.filter(space => space.pricePerHour >= priceMin);
        }

        if (priceMax < 1000) {
            filtered = filtered.filter(space => space.pricePerHour <= priceMax);
        }

        if (amenities.length > 0) {
            filtered = filtered.filter(space =>
                amenities.every(amenity => space.amenities.includes(amenity))
            );
        }

        if (rating > 0) {
            filtered = filtered.filter(space => space.rating >= rating);
        }

        // Applica ordinamento
        filtered.sort((a, b) => {
            let aVal = a[this.state.sortBy];
            let bVal = b[this.state.sortBy];

            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (this.state.sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        this.state.filteredSpaces = filtered;
    },

    // ==================== RENDERING ====================
    renderSpaces() {
        const container = document.getElementById('spaces-container');
        if (!container) return;

        // Calcola paginazione
        const startIndex = (this.state.currentPage - 1) * this.state.itemsPerPage;
        const endIndex = startIndex + this.state.itemsPerPage;
        const paginatedSpaces = this.state.filteredSpaces.slice(startIndex, endIndex);

        if (paginatedSpaces.length === 0) {
            container.innerHTML = this.buildNoResultsHTML();
            return;
        }

        const spacesHTML = paginatedSpaces.map(space =>
            this.state.viewMode === 'grid' ? this.buildSpaceCard(space) : this.buildSpaceListItem(space)
        ).join('');

        container.innerHTML = `
            <div class="spaces-header">
                ${this.buildSpacesHeader()}
            </div>
            <div class="spaces-grid ${this.state.viewMode}-view">
                ${spacesHTML}
            </div>
            <div class="spaces-pagination">
                ${this.buildPagination()}
            </div>
        `;

        this.attachSpaceEvents();
    },

    buildSpaceCard(space) {
        const isFavorite = this.state.favorites.includes(space.id);
        const availabilityClass = space.available ? 'available' : 'unavailable';

        return `
            <div class="space-card ${availabilityClass}" data-space-id="${space.id}">
                <div class="space-card-image">
                    <img src="${space.images?.[0] || '/assets/images/placeholder-space.jpg'}" 
                         alt="${space.name}" loading="lazy">
                    <div class="space-card-overlay">
                        <button class="btn btn-sm btn-outline-light space-favorite-btn ${isFavorite ? 'active' : ''}"
                                onclick="Spaces.toggleFavorite('${space.id}', event)">
                            <i class="fas fa-heart"></i>
                        </button>
                        <div class="space-rating">
                            <i class="fas fa-star"></i>
                            <span>${space.rating?.toFixed(1) || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="space-card-content">
                    <div class="space-card-header">
                        <h5 class="space-name">${space.name}</h5>
                        <span class="space-type">${this.formatSpaceType(space.type)}</span>
                    </div>
                    
                    <p class="space-description">${this.truncateText(space.description, 100)}</p>
                    
                    <div class="space-details">
                        <div class="space-location">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${space.city}</span>
                        </div>
                        
                        <div class="space-capacity">
                            <i class="fas fa-users"></i>
                            <span>${space.capacity} persone</span>
                        </div>
                    </div>
                    
                    <div class="space-amenities">
                        ${space.amenities.slice(0, 3).map(amenity =>
            `<span class="amenity-tag">${amenity}</span>`
        ).join('')}
                        ${space.amenities.length > 3 ? `<span class="amenity-more">+${space.amenities.length - 3}</span>` : ''}
                    </div>
                    
                    <div class="space-card-footer">
                        <div class="space-price">
                            <span class="price-amount">€${space.pricePerHour}</span>
                            <span class="price-unit">/ora</span>
                        </div>
                        
                        <div class="space-actions">
                            <button class="btn btn-outline-primary btn-sm" 
                                    onclick="Spaces.showSpaceDetail('${space.id}')">
                                Dettagli
                            </button>
                            <button class="btn btn-primary btn-sm ${!space.available ? 'disabled' : ''}"
                                    onclick="Spaces.quickBook('${space.id}')"
                                    ${!space.available ? 'disabled' : ''}>
                                ${space.available ? 'Prenota' : 'Non disponibile'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    buildSpaceListItem(space) {
        const isFavorite = this.state.favorites.includes(space.id);

        return `
            <div class="space-list-item" data-space-id="${space.id}">
                <div class="space-list-image">
                    <img src="${space.images?.[0] || '/assets/images/placeholder-space.jpg'}" 
                         alt="${space.name}">
                </div>
                
                <div class="space-list-content">
                    <div class="space-list-header">
                        <h5 class="space-name">${space.name}</h5>
                        <div class="space-rating">
                            <i class="fas fa-star"></i>
                            <span>${space.rating?.toFixed(1) || 'N/A'}</span>
                        </div>
                    </div>
                    
                    <p class="space-description">${space.description}</p>
                    
                    <div class="space-meta">
                        <span class="space-type">${this.formatSpaceType(space.type)}</span>
                        <span class="space-location">
                            <i class="fas fa-map-marker-alt"></i> ${space.city}
                        </span>
                        <span class="space-capacity">
                            <i class="fas fa-users"></i> ${space.capacity} persone
                        </span>
                    </div>
                    
                    <div class="space-amenities">
                        ${space.amenities.map(amenity =>
            `<span class="amenity-tag">${amenity}</span>`
        ).join('')}
                    </div>
                </div>
                
                <div class="space-list-actions">
                    <div class="space-price-block">
                        <div class="space-price">
                            <span class="price-amount">€${space.pricePerHour}</span>
                            <span class="price-unit">/ora</span>
                        </div>
                    </div>
                    
                    <div class="space-buttons">
                        <button class="btn btn-sm btn-outline-light space-favorite-btn ${isFavorite ? 'active' : ''}"
                                onclick="Spaces.toggleFavorite('${space.id}', event)">
                            <i class="fas fa-heart"></i>
                        </button>
                        <button class="btn btn-outline-primary" 
                                onclick="Spaces.showSpaceDetail('${space.id}')">
                            Dettagli
                        </button>
                        <button class="btn btn-primary ${!space.available ? 'disabled' : ''}"
                                onclick="Spaces.quickBook('${space.id}')"
                                ${!space.available ? 'disabled' : ''}>
                            ${space.available ? 'Prenota' : 'Non disponibile'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // ==================== DETTAGLI SPAZIO ====================
    async showSpaceDetail(spaceId) {
        try {
            const response = await window.api.getSpace(spaceId);

            if (response.success) {
                this.state.selectedSpace = response.data;
                this.openSpaceModal(response.data);
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('❌ Error loading space details:', error);
            window.notifications?.show('Errore nel caricamento dettagli spazio', 'error');
        }
    },

    openSpaceModal(space) {
        const modal = this.createSpaceModal(space);
        document.body.appendChild(modal);

        // Bootstrap modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        // Cleanup on close
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    },

    createSpaceModal(space) {
        const modalHTML = `
            <div class="modal fade" id="spaceDetailModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${space.name}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        
                        <div class="modal-body">
                            ${this.buildSpaceDetailContent(space)}
                        </div>
                        
                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                                Chiudi
                            </button>
                            <button type="button" class="btn btn-primary" 
                                    onclick="Spaces.bookSpace('${space.id}')">
                                <i class="fas fa-calendar-plus"></i> Prenota Ora
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modalElement = document.createElement('div');
        modalElement.innerHTML = modalHTML;
        return modalElement.firstElementChild;
    },

    // ==================== PRENOTAZIONE ====================
    async quickBook(spaceId) {
        const space = this.state.spaces.find(s => s.id === spaceId);
        if (!space) {
            console.error('Space not found:', spaceId);
            return;
        }

        // Redirect to booking with pre-selected space
        window.Navigation.showSection('bookings', { spaceId });
    },

    async bookSpace(spaceId) {
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('spaceDetailModal'));
        modal?.hide();

        // Navigate to booking
        this.quickBook(spaceId);
    },

    // ==================== FAVORITI ====================
    toggleFavorite(spaceId, event) {
        event?.stopPropagation();

        const index = this.state.favorites.indexOf(spaceId);
        if (index > -1) {
            this.state.favorites.splice(index, 1);
        } else {
            this.state.favorites.push(spaceId);
        }

        this.saveFavorites();
        this.updateFavoriteButtons(spaceId);

        window.notifications?.show(
            index > -1 ? 'Rimosso dai preferiti' : 'Aggiunto ai preferiti',
            'success'
        );
    },

    // ==================== UTILITY METHODS ====================
    isSpacesSection() {
        return document.getElementById('spaces-container') !== null;
    },

    formatSpaceType(type) {
        const types = {
            'desk': 'Postazione',
            'office': 'Ufficio',
            'meeting-room': 'Sala Riunioni',
            'event-space': 'Spazio Eventi',
            'workshop': 'Workshop'
        };
        return types[type] || type;
    },

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    },

    saveFavorites() {
        localStorage.setItem('coworkspace_favorites', JSON.stringify(this.state.favorites));
    },

    loadFavorites() {
        try {
            const saved = localStorage.getItem('coworkspace_favorites');
            if (saved) {
                this.state.favorites = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading favorites:', error);
            this.state.favorites = [];
        }
    },

    // ==================== EVENTI ====================
    setupEventListeners() {
        // Search input
        document.addEventListener('input', (e) => {
            if (e.target.id === 'spaces-search') {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.searchSpaces(e.target.value);
                }, 300);
            }
        });

        // Filter changes
        document.addEventListener('change', (e) => {
            if (e.target.matches('.space-filter')) {
                this.handleFilterChange(e.target);
            }
        });
    },

    handleFilterChange(element) {
        const filterType = element.dataset.filter;
        const value = element.value;

        if (filterType) {
            this.applyFilters({ [filterType]: value });
        }
    },

    // ==================== MOCK DATA FALLBACK ====================
    loadMockSpaces() {
        console.log('📊 Loading mock spaces data...');

        this.state.spaces = [
            {
                id: '1',
                name: 'Spazio Creativo Milano',
                type: 'desk',
                description: 'Postazione in open space moderno nel cuore di Milano',
                city: 'Milano',
                address: 'Via Torino 40, Milano',
                pricePerHour: 15,
                capacity: 1,
                rating: 4.5,
                available: true,
                amenities: ['WiFi', 'Stampante', 'Caffè', 'Aria Condizionata'],
                images: ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=400']
            },
            {
                id: '2',
                name: 'Meeting Room Executive',
                type: 'meeting-room',
                description: 'Sala riunioni completamente attrezzata con vista panoramica',
                city: 'Roma',
                address: 'Via del Corso 100, Roma',
                pricePerHour: 50,
                capacity: 12,
                rating: 4.8,
                available: true,
                amenities: ['Proiettore', 'WiFi', 'Lavagna', 'Videoconferenza'],
                images: ['https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400']
            }
        ];

        this.state.filteredSpaces = [...this.state.spaces];
        this.renderSpaces();
    }
};

// Auto-inizializzazione
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.api) {
            window.Spaces.init();
        }
    });
} else if (window.api) {
    window.Spaces.init();
}