/**
 * CoWorkSpace - Spaces Manager
 * Gestione spazi coworking e ricerca
 */

window.Spaces = {
    /**
     * Stato del modulo
     */
    state: {
        initialized: false,
        loading: false,
        spaces: [],
        filteredSpaces: [],
        currentSpace: null,
        favorites: [],
        filters: {
            city: '',
            type: '',
            capacity: '',
            priceRange: { min: 0, max: 1000 },
            amenities: [],
            rating: 0,
            availability: ''
        },
        pagination: {
            page: 1,
            limit: 12,
            total: 0
        },
        cache: new Map()
    },

    /**
     * Configurazione
     */
    config: {
        endpoints: {
            spaces: '/api/spaces',
            search: '/api/spaces/search',
            details: '/api/spaces/details',
            reviews: '/api/spaces/reviews',
            favorites: '/api/users/favorites'
        },
        defaultFilters: {
            city: '',
            type: '',
            capacity: '',
            priceRange: { min: 0, max: 1000 },
            amenities: [],
            rating: 0,
            availability: ''
        }
    },

    /**
     * Templates HTML
     */
    templates: {
        spaceCard: `
            <div class="space-card" data-space-id="{id}">
                <div class="space-image">
                    <img src="{imageUrl}" alt="{name}" loading="lazy">
                    <div class="space-overlay">
                        <button class="btn-favorite {favoriteClass}" onclick="Spaces.toggleFavorite('{id}')">
                            <i class="fas fa-heart"></i>
                        </button>
                        <div class="space-rating">
                            <i class="fas fa-star"></i>
                            <span>{rating}</span>
                        </div>
                    </div>
                </div>
                <div class="space-content">
                    <div class="space-header">
                        <h5 class="space-name">{name}</h5>
                        <div class="space-price">€{hourlyRate}/ora</div>
                    </div>
                    <div class="space-details">
                        <div class="space-location">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>{city}, {address}</span>
                        </div>
                        <div class="space-capacity">
                            <i class="fas fa-users"></i>
                            <span>Fino a {capacity} persone</span>
                        </div>
                        <div class="space-type">
                            <i class="fas fa-building"></i>
                            <span>{typeLabel}</span>
                        </div>
                    </div>
                    <div class="space-amenities">
                        {amenitiesHTML}
                    </div>
                    <div class="space-actions">
                        <button class="btn btn-outline-primary btn-sm" onclick="Spaces.showSpaceDetails('{id}')">
                            <i class="fas fa-info-circle"></i> Dettagli
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="Spaces.bookSpace('{id}')">
                            <i class="fas fa-calendar-plus"></i> Prenota
                        </button>
                    </div>
                </div>
            </div>
        `,

        spaceModal: `
            <div class="space-modal-content">
                <div class="space-gallery">
                    <div class="main-image">
                        <img src="{mainImage}" alt="{name}" id="main-space-image">
                    </div>
                    <div class="thumbnail-images">
                        {thumbnailsHTML}
                    </div>
                </div>
                <div class="space-info">
                    <div class="space-header">
                        <h3>{name}</h3>
                        <div class="space-price-large">€{hourlyRate}/ora</div>
                    </div>
                    <div class="space-rating-large">
                        <div class="stars">{starsHTML}</div>
                        <span>({reviewCount} recensioni)</span>
                    </div>
                    <div class="space-description">
                        <p>{description}</p>
                    </div>
                    <div class="space-details-grid">
                        <div class="detail-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <div>
                                <strong>Posizione</strong>
                                <p>{fullAddress}</p>
                            </div>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-users"></i>
                            <div>
                                <strong>Capacità</strong>
                                <p>Fino a {capacity} persone</p>
                            </div>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-clock"></i>
                            <div>
                                <strong>Orari</strong>
                                <p>{openingHours}</p>
                            </div>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-building"></i>
                            <div>
                                <strong>Tipo</strong>
                                <p>{typeLabel}</p>
                            </div>
                        </div>
                    </div>
                    <div class="space-amenities-full">
                        <h5>Servizi e Comfort</h5>
                        <div class="amenities-grid">
                            {fullAmenitiesHTML}
                        </div>
                    </div>
                    <div class="space-reviews-preview">
                        <h5>Recensioni Recenti</h5>
                        <div id="reviews-container">
                            {reviewsHTML}
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-outline-secondary" onclick="Utils.modal.hide()">
                        Chiudi
                    </button>
                    <button class="btn btn-outline-primary" onclick="Spaces.toggleFavorite('{id}')">
                        <i class="fas fa-heart"></i> {favoriteText}
                    </button>
                    <button class="btn btn-primary" onclick="Spaces.bookSpace('{id}')">
                        <i class="fas fa-calendar-plus"></i> Prenota Ora
                    </button>
                </div>
            </div>
        `,

        filterForm: `
            <form id="spaces-filter-form" class="spaces-filter-form">
                <div class="row">
                    <div class="col-md-6">
                        <label for="filter-city" class="form-label">Città</label>
                        <select id="filter-city" class="form-select">
                            <option value="">Tutte le città</option>
                            {citiesOptions}
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label for="filter-type" class="form-label">Tipo Spazio</label>
                        <select id="filter-type" class="form-select">
                            <option value="">Tutti i tipi</option>
                            <option value="desk">Postazione Singola</option>
                            <option value="office">Ufficio Privato</option>
                            <option value="meeting">Sala Riunioni</option>
                            <option value="event">Sala Eventi</option>
                            <option value="coworking">Spazio Coworking</option>
                        </select>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-md-6">
                        <label for="filter-capacity" class="form-label">Capacità</label>
                        <select id="filter-capacity" class="form-select">
                            <option value="">Qualsiasi</option>
                            <option value="1-2">1-2 persone</option>
                            <option value="3-5">3-5 persone</option>
                            <option value="6-10">6-10 persone</option>
                            <option value="11-20">11-20 persone</option>
                            <option value="20+">20+ persone</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label for="filter-rating" class="form-label">Valutazione Minima</label>
                        <select id="filter-rating" class="form-select">
                            <option value="0">Qualsiasi</option>
                            <option value="3">3+ stelle</option>
                            <option value="4">4+ stelle</option>
                            <option value="4.5">4.5+ stelle</option>
                        </select>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-md-12">
                        <label for="price-range" class="form-label">Fascia di Prezzo (€/ora)</label>
                        <div class="price-range-container">
                            <input type="range" id="price-range-min" class="form-range" min="0" max="1000" value="0">
                            <input type="range" id="price-range-max" class="form-range" min="0" max="1000" value="1000">
                            <div class="price-range-display">
                                <span id="price-min">€0</span> - <span id="price-max">€1000</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-12">
                        <label class="form-label">Servizi</label>
                        <div class="amenities-checkboxes">
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="checkbox" id="wifi" value="wifi">
                                <label class="form-check-label" for="wifi">Wi-Fi</label>
                            </div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="checkbox" id="coffee" value="coffee">
                                <label class="form-check-label" for="coffee">Caffè</label>
                            </div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="checkbox" id="printer" value="printer">
                                <label class="form-check-label" for="printer">Stampante</label>
                            </div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="checkbox" id="parking" value="parking">
                                <label class="form-check-label" for="parking">Parcheggio</label>
                            </div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="checkbox" id="ac" value="ac">
                                <label class="form-check-label" for="ac">Aria Condizionata</label>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="filter-actions mt-4">
                    <button type="button" class="btn btn-secondary" onclick="Spaces.resetFilters()">
                        <i class="fas fa-undo"></i> Reset
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-search"></i> Applica Filtri
                    </button>
                </div>
            </form>
        `
    },

    /**
     * Inizializza il modulo
     */
    async init() {
        try {
            console.log('🏢 Initializing Spaces Manager...');

            // Verifica dipendenze
            if (!window.API || !window.Utils) {
                throw new Error('Required dependencies not available');
            }

            // Setup event listeners
            this.setupEventListeners();

            // Carica spazi iniziali
            await this.loadSpaces();

            // Carica preferiti utente se autenticato
            if (window.Auth?.isAuthenticated()) {
                await this.loadUserFavorites();
            }

            this.state.initialized = true;
            console.log('✅ Spaces Manager initialized');

            return true;

        } catch (error) {
            console.error('❌ Failed to initialize Spaces Manager:', error);
            return false;
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listener per login/logout
        document.addEventListener('auth:login', () => {
            this.loadUserFavorites();
        });

        document.addEventListener('auth:logout', () => {
            this.state.favorites = [];
        });

        // Listener per sezione spazi
        document.addEventListener('navigation:sectionChanged', (e) => {
            if (e.detail.section === 'spaces') {
                this.handleSpacesSection();
            }
        });
    },

    /**
     * Carica spazi dal server
     */
    async loadSpaces(params = {}) {
        try {
            this.state.loading = true;

            const searchParams = {
                page: this.state.pagination.page,
                limit: this.state.pagination.limit,
                ...this.state.filters,
                ...params
            };

            const response = await window.API.get(this.config.endpoints.search, searchParams);

            if (response.success) {
                this.state.spaces = response.data.spaces || [];
                this.state.pagination.total = response.data.total || 0;
                this.state.filteredSpaces = [...this.state.spaces];

                this.triggerEvent('spaces:loaded');
                return this.state.spaces;
            } else {
                throw new Error(response.message || 'Errore nel caricamento spazi');
            }

        } catch (error) {
            console.error('Error loading spaces:', error);
            window.Utils?.notifications?.show('Errore nel caricamento degli spazi', 'error');
            return [];
        } finally {
            this.state.loading = false;
        }
    },

    /**
     * Carica preferiti utente
     */
    async loadUserFavorites() {
        if (!window.Auth?.isAuthenticated()) return;

        try {
            const response = await window.API.get(this.config.endpoints.favorites);

            if (response.success) {
                this.state.favorites = response.data || [];
                this.triggerEvent('favorites:loaded');
            }

        } catch (error) {
            console.error('Error loading user favorites:', error);
        }
    },

    /**
     * Cerca spazi
     */
    async searchSpaces(query, filters = {}) {
        try {
            this.state.loading = true;

            const searchParams = {
                q: query,
                ...this.state.filters,
                ...filters,
                page: 1 // Reset pagination per nuova ricerca
            };

            this.state.pagination.page = 1;

            const response = await window.API.get(this.config.endpoints.search, searchParams);

            if (response.success) {
                this.state.spaces = response.data.spaces || [];
                this.state.pagination.total = response.data.total || 0;
                this.state.filteredSpaces = [...this.state.spaces];

                this.triggerEvent('spaces:searched', { query, results: this.state.spaces.length });
                return this.state.spaces;
            } else {
                throw new Error(response.message || 'Errore nella ricerca');
            }

        } catch (error) {
            console.error('Error searching spaces:', error);
            window.Utils?.notifications?.show('Errore nella ricerca', 'error');
            return [];
        } finally {
            this.state.loading = false;
        }
    },

    /**
     * Applica filtri
     */
    applyFilters(newFilters) {
        this.state.filters = { ...this.state.filters, ...newFilters };
        this.state.pagination.page = 1; // Reset pagination

        return this.loadSpaces();
    },

    /**
     * Reset filtri
     */
    resetFilters() {
        this.state.filters = { ...this.config.defaultFilters };
        this.state.pagination.page = 1;

        // Reset UI form se presente
        const form = document.getElementById('spaces-filter-form');
        if (form) {
            form.reset();
            this.updatePriceRangeDisplay();
        }

        return this.loadSpaces();
    },

    /**
     * Ottieni dettagli spazio
     */
    async getSpaceDetails(spaceId) {
        try {
            // Controlla cache
            const cacheKey = `space_${spaceId}`;
            if (this.state.cache.has(cacheKey)) {
                const cached = this.state.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < 600000) { // 10 minuti
                    return cached.data;
                }
            }

            const response = await window.API.get(`${this.config.endpoints.details}/${spaceId}`);

            if (response.success) {
                // Salva in cache
                this.state.cache.set(cacheKey, {
                    data: response.data,
                    timestamp: Date.now()
                });

                return response.data;
            } else {
                throw new Error(response.message || 'Errore nel caricamento dettagli');
            }

        } catch (error) {
            console.error('Error loading space details:', error);
            window.Utils?.notifications?.show('Errore nel caricamento dettagli', 'error');
            return null;
        }
    },

    /**
     * Mostra dettagli spazio in modal
     */
    async showSpaceDetails(spaceId) {
        try {
            // Mostra loading
            window.Utils?.modal?.show({
                title: 'Caricamento...',
                content: '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Caricamento dettagli...</div>',
                size: 'xl'
            });

            const spaceDetails = await this.getSpaceDetails(spaceId);

            if (!spaceDetails) {
                window.Utils?.modal?.hide();
                return;
            }

            // Costruisci contenuto modal
            const modalContent = this.buildSpaceModal(spaceDetails);

            // Aggiorna modal
            window.Utils?.modal?.update({
                title: spaceDetails.name,
                content: modalContent,
                size: 'xl'
            });

            // Setup event listeners per il modal
            this.setupSpaceModalListeners(spaceDetails);

        } catch (error) {
            console.error('Error showing space details:', error);
            window.Utils?.modal?.hide();
        }
    },

    /**
     * Costruisce contenuto modal spazio
     */
    buildSpaceModal(space) {
        let modal = this.templates.spaceModal;

        // Sostituzioni base
        modal = modal.replace(/{id}/g, space.id);
        modal = modal.replace(/{name}/g, space.name);
        modal = modal.replace(/{hourlyRate}/g, space.hourlyRate);
        modal = modal.replace(/{description}/g, space.description || '');
        modal = modal.replace(/{capacity}/g, space.capacity);
        modal = modal.replace(/{fullAddress}/g, space.fullAddress || `${space.address}, ${space.city}`);
        modal = modal.replace(/{openingHours}/g, space.openingHours || 'Lun-Ven 8:00-20:00');
        modal = modal.replace(/{typeLabel}/g, this.getTypeLabel(space.type));

        // Immagini
        modal = modal.replace(/{mainImage}/g, space.images?.[0] || '/assets/images/spaces/default.jpg');

        // Thumbnails
        const thumbnailsHTML = space.images?.slice(1, 5).map((img, index) =>
            `<img src="${img}" alt="Immagine ${index + 2}" onclick="Spaces.changeMainImage('${img}')">`
        ).join('') || '';
        modal = modal.replace(/{thumbnailsHTML}/g, thumbnailsHTML);

        // Rating e stelle
        const starsHTML = this.buildStarsHTML(space.rating || 0);
        modal = modal.replace(/{starsHTML}/g, starsHTML);
        modal = modal.replace(/{reviewCount}/g, space.reviewCount || 0);

        // Servizi completi
        const fullAmenitiesHTML = this.buildFullAmenitiesHTML(space.amenities || []);
        modal = modal.replace(/{fullAmenitiesHTML}/g, fullAmenitiesHTML);

        // Recensioni
        const reviewsHTML = this.buildReviewsHTML(space.recentReviews || []);
        modal = modal.replace(/{reviewsHTML}/g, reviewsHTML);

        // Pulsante preferiti
        const isFavorite = this.state.favorites.includes(space.id);
        modal = modal.replace(/{favoriteText}/g, isFavorite ? 'Rimuovi dai Preferiti' : 'Aggiungi ai Preferiti');

        return modal;
    },

    /**
     * Setup listeners per modal spazio
     */
    setupSpaceModalListeners(space) {
        // Listener per cambio immagine
        window.Spaces.changeMainImage = (imageUrl) => {
            const mainImage = document.getElementById('main-space-image');
            if (mainImage) {
                mainImage.src = imageUrl;
            }
        };
    },

    /**
     * Costruisce HTML delle stelle
     */
    buildStarsHTML(rating) {
        let starsHTML = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(rating)) {
                starsHTML += '<i class="fas fa-star"></i>';
            } else if (i - 0.5 <= rating) {
                starsHTML += '<i class="fas fa-star-half-alt"></i>';
            } else {
                starsHTML += '<i class="far fa-star"></i>';
            }
        }
        return starsHTML;
    },

    /**
     * Costruisce HTML servizi completi
     */
    buildFullAmenitiesHTML(amenities) {
        const amenityIcons = {
            wifi: 'fas fa-wifi',
            coffee: 'fas fa-coffee',
            printer: 'fas fa-print',
            parking: 'fas fa-parking',
            ac: 'fas fa-snowflake',
            security: 'fas fa-shield-alt',
            kitchen: 'fas fa-utensils',
            phone: 'fas fa-phone',
            projector: 'fas fa-video',
            whiteboard: 'fas fa-chalkboard'
        };

        return amenities.map(amenity => {
            const icon = amenityIcons[amenity.id] || 'fas fa-check';
            return `
                <div class="amenity-item">
                    <i class="${icon}"></i>
                    <span>${amenity.name}</span>
                </div>
            `;
        }).join('');
    },

    /**
     * Costruisce HTML recensioni
     */
    buildReviewsHTML(reviews) {
        if (!reviews || reviews.length === 0) {
            return '<p class="text-muted">Nessuna recensione disponibile</p>';
        }

        return reviews.slice(0, 3).map(review => `
            <div class="review-item">
                <div class="review-header">
                    <strong>${review.userName}</strong>
                    <div class="review-rating">${this.buildStarsHTML(review.rating)}</div>
                </div>
                <p class="review-text">${review.comment}</p>
                <small class="text-muted">${Utils.formatDate(review.date)}</small>
            </div>
        `).join('');
    },

    /**
     * Gestisce sezione spazi
     */
    async handleSpacesSection() {
        // Carica spazi se necessario
        if (this.state.spaces.length === 0) {
            await this.loadSpaces();
        }

        // Renderizza interfaccia se container presente
        const container = document.getElementById('content-container');
        if (container) {
            this.renderSpacesInterface(container);
        }
    },

    /**
     * Renderizza interfaccia spazi
     */
    renderSpacesInterface(container) {
        const spacesHTML = `
            <div class="spaces-section">
                <div class="spaces-header">
                    <h2>Trova il tuo Spazio Ideale</h2>
                    <p>Scopri spazi coworking, uffici e sale riunioni nella tua città</p>
                </div>
                
                <div class="spaces-search">
                    <div class="search-bar">
                        <input type="text" id="spaces-search-input" class="form-control" 
                               placeholder="Cerca per nome, città o indirizzo...">
                        <button class="btn btn-primary" onclick="Spaces.handleSearch()">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                    <button class="btn btn-outline-secondary" onclick="Spaces.toggleFilters()">
                        <i class="fas fa-filter"></i> Filtri
                    </button>
                </div>

                <div id="spaces-filters" class="spaces-filters" style="display: none;">
                    ${this.templates.filterForm.replace('{citiesOptions}', this.buildCitiesOptions())}
                </div>

                <div class="spaces-results">
                    <div class="results-header">
                        <span id="results-count">0 spazi trovati</span>
                        <div class="view-options">
                            <button class="btn btn-sm btn-outline-secondary active" data-view="grid">
                                <i class="fas fa-th"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" data-view="list">
                                <i class="fas fa-list"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div id="spaces-grid" class="spaces-grid">
                        ${this.buildSpacesGrid()}
                    </div>
                    
                    <div id="spaces-pagination" class="spaces-pagination">
                        ${this.buildPagination()}
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = spacesHTML;
        this.setupSpacesInterfaceListeners();
        this.updateResultsCount();
    },

    /**
     * Costruisce griglia spazi
     */
    buildSpacesGrid() {
        if (this.state.loading) {
            return '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Caricamento...</div>';
        }

        if (this.state.filteredSpaces.length === 0) {
            return `
                <div class="no-results">
                    <i class="fas fa-search fa-3x text-muted"></i>
                    <h4>Nessuno spazio trovato</h4>
                    <p>Prova a modificare i filtri di ricerca</p>
                </div>
            `;
        }

        return this.state.filteredSpaces.map(space => this.buildSpaceCard(space)).join('');
    },

    /**
     * Costruisce card singolo spazio
     */
    buildSpaceCard(space) {
        let card = this.templates.spaceCard;

        // Sostituzioni base
        card = card.replace(/{id}/g, space.id);
        card = card.replace(/{name}/g, space.name);
        card = card.replace(/{imageUrl}/g, space.images?.[0] || '/assets/images/spaces/default.jpg');
        card = card.replace(/{hourlyRate}/g, space.hourlyRate);
        card = card.replace(/{rating}/g, space.rating || '0.0');
        card = card.replace(/{city}/g, space.city);
        card = card.replace(/{address}/g, space.address);
        card = card.replace(/{capacity}/g, space.capacity);
        card = card.replace(/{typeLabel}/g, this.getTypeLabel(space.type));

        // Classe preferiti
        const isFavorite = this.state.favorites.includes(space.id);
        card = card.replace(/{favoriteClass}/g, isFavorite ? 'active' : '');

        // Servizi (primi 3)
        const amenitiesHTML = (space.amenities || []).slice(0, 3).map(amenity =>
            `<span class="amenity-tag">${amenity.name}</span>`
        ).join('');
        card = card.replace(/{amenitiesHTML}/g, amenitiesHTML);

        return card;
    },

    /**
     * Costruisce opzioni città
     */
    buildCitiesOptions() {
        const cities = [...new Set(this.state.spaces.map(space => space.city))];
        return cities.map(city => `<option value="${city}">${city}</option>`).join('');
    },

    /**
     * Costruisce paginazione
     */
    buildPagination() {
        const { page, limit, total } = this.state.pagination;
        const totalPages = Math.ceil(total / limit);

        if (totalPages <= 1) return '';

        let paginationHTML = '<nav><ul class="pagination justify-content-center">';

        // Precedente
        paginationHTML += `
            <li class="page-item ${page === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="Spaces.goToPage(${page - 1})">Precedente</a>
            </li>
        `;

        // Numeri pagina
        for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
            paginationHTML += `
                <li class="page-item ${i === page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="Spaces.goToPage(${i})">${i}</a>
                </li>
            `;
        }

        // Successivo
        paginationHTML += `
            <li class="page-item ${page === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="Spaces.goToPage(${page + 1})">Successivo</a>
            </li>
        `;

        paginationHTML += '</ul></nav>';

        return paginationHTML;
    },

    /**
     * Setup listeners per interfaccia spazi
     */
    setupSpacesInterfaceListeners() {
        // Search input
        const searchInput = document.getElementById('spaces-search-input');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch();
                }
            });
        }

        // Form filtri
        const filterForm = document.getElementById('spaces-filter-form');
        if (filterForm) {
            filterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFilterSubmit();
            });

            // Price range sliders
            this.setupPriceRangeListeners();
        }

        // View options
        const viewButtons = document.querySelectorAll('[data-view]');
        viewButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.changeView(view);
            });
        });
    },

    /**
     * Setup listeners per price range
     */
    setupPriceRangeListeners() {
        const minSlider = document.getElementById('price-range-min');
        const maxSlider = document.getElementById('price-range-max');

        if (minSlider && maxSlider) {
            [minSlider, maxSlider].forEach(slider => {
                slider.addEventListener('input', () => {
                    this.updatePriceRangeDisplay();
                });
            });
        }
    },

    /**
     * Aggiorna display price range
     */
    updatePriceRangeDisplay() {
        const minSlider = document.getElementById('price-range-min');
        const maxSlider = document.getElementById('price-range-max');
        const minDisplay = document.getElementById('price-min');
        const maxDisplay = document.getElementById('price-max');

        if (minSlider && maxSlider && minDisplay && maxDisplay) {
            let min = parseInt(minSlider.value);
            let max = parseInt(maxSlider.value);

            // Assicura che min sia sempre <= max
            if (min > max) {
                if (minSlider === document.activeElement) {
                    max = min;
                    maxSlider.value = max;
                } else {
                    min = max;
                    minSlider.value = min;
                }
            }

            minDisplay.textContent = `€${min}`;
            maxDisplay.textContent = `€${max}`;
        }
    },

    /**
     * Gestisce ricerca
     */
    async handleSearch() {
        const searchInput = document.getElementById('spaces-search-input');
        const query = searchInput?.value.trim() || '';

        await this.searchSpaces(query);
        this.updateSpacesGrid();
    },

    /**
     * Gestisce submit filtri
     */
    async handleFilterSubmit() {
        const form = document.getElementById('spaces-filter-form');
        if (!form) return;

        const formData = new FormData(form);
        const filters = {};

        // Raccogli valori form
        filters.city = formData.get('city') || '';
        filters.type = formData.get('type') || '';
        filters.capacity = formData.get('capacity') || '';
        filters.rating = parseFloat(formData.get('rating')) || 0;

        // Price range
        const minPrice = document.getElementById('price-range-min')?.value || 0;
        const maxPrice = document.getElementById('price-range-max')?.value || 1000;
        filters.priceRange = { min: parseInt(minPrice), max: parseInt(maxPrice) };

        // Amenities
        const checkedAmenities = form.querySelectorAll('.amenities-checkboxes input:checked');
        filters.amenities = Array.from(checkedAmenities).map(cb => cb.value);

        await this.applyFilters(filters);
        this.updateSpacesGrid();
    },

    /**
     * Toggle visualizzazione filtri
     */
    toggleFilters() {
        const filtersDiv = document.getElementById('spaces-filters');
        if (filtersDiv) {
            filtersDiv.style.display = filtersDiv.style.display === 'none' ? 'block' : 'none';
        }
    },

    /**
     * Cambia vista (grid/list)
     */
    changeView(view) {
        const buttons = document.querySelectorAll('[data-view]');
        buttons.forEach(btn => btn.classList.remove('active'));

        const activeButton = document.querySelector(`[data-view="${view}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }

        const grid = document.getElementById('spaces-grid');
        if (grid) {
            grid.className = view === 'list' ? 'spaces-list' : 'spaces-grid';
        }
    },

    /**
     * Va alla pagina specificata
     */
    async goToPage(page) {
        if (page < 1 || page > Math.ceil(this.state.pagination.total / this.state.pagination.limit)) {
            return;
        }

        this.state.pagination.page = page;
        await this.loadSpaces();
        this.updateSpacesGrid();
    },

    /**
     * Aggiorna griglia spazi
     */
    updateSpacesGrid() {
        const grid = document.getElementById('spaces-grid');
        const pagination = document.getElementById('spaces-pagination');

        if (grid) {
            grid.innerHTML = this.buildSpacesGrid();
        }

        if (pagination) {
            pagination.innerHTML = this.buildPagination();
        }

        this.updateResultsCount();
    },

    /**
     * Aggiorna contatore risultati
     */
    updateResultsCount() {
        const counter = document.getElementById('results-count');
        if (counter) {
            const count = this.state.filteredSpaces.length;
            const total = this.state.pagination.total;
            counter.textContent = `${count} di ${total} spazi`;
        }
    },

    /**
     * Toggle preferito
     */
    async toggleFavorite(spaceId) {
        if (!window.Auth?.isAuthenticated()) {
            window.Utils?.notifications?.show('Effettua il login per aggiungere ai preferiti', 'warning');
            return;
        }

        try {
            const isFavorite = this.state.favorites.includes(spaceId);
            const endpoint = isFavorite ? 'DELETE' : 'POST';

            const response = await window.API.request(endpoint, `${this.config.endpoints.favorites}/${spaceId}`);

            if (response.success) {
                if (isFavorite) {
                    this.state.favorites = this.state.favorites.filter(id => id !== spaceId);
                    window.Utils?.notifications?.show('Rimosso dai preferiti', 'success');
                } else {
                    this.state.favorites.push(spaceId);
                    window.Utils?.notifications?.show('Aggiunto ai preferiti', 'success');
                }

                // Aggiorna UI
                this.updateFavoriteButtons(spaceId);
                this.triggerEvent('favorite:toggled', { spaceId, isFavorite: !isFavorite });
            }

        } catch (error) {
            console.error('Error toggling favorite:', error);
            window.Utils?.notifications?.show('Errore nell\'operazione', 'error');
        }
    },

    /**
     * Aggiorna pulsanti preferiti
     */
    updateFavoriteButtons(spaceId) {
        const isFavorite = this.state.favorites.includes(spaceId);
        const buttons = document.querySelectorAll(`[onclick*="toggleFavorite('${spaceId}')"]`);

        buttons.forEach(button => {
            if (isFavorite) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    },

    /**
     * Prenota spazio
     */
    bookSpace(spaceId) {
        const space = this.state.spaces.find(s => s.id === spaceId) ||
            this.state.filteredSpaces.find(s => s.id === spaceId);

        if (!space) {
            window.Utils?.notifications?.show('Spazio non trovato', 'error');
            return;
        }

        if (!window.Auth?.isAuthenticated()) {
            window.Utils?.notifications?.show('Effettua il login per prenotare', 'warning');
            return;
        }

        // Chiudi modal dettagli se aperto
        window.Utils?.modal?.hide();

        // Mostra modal prenotazione
        if (window.Bookings?.showBookingModal) {
            window.Bookings.showBookingModal(spaceId, space);
        } else {
            window.Utils?.notifications?.show('Modulo prenotazioni non disponibile', 'error');
        }
    },

    /**
     * Ottieni etichetta tipo spazio
     */
    getTypeLabel(type) {
        const labels = {
            desk: 'Postazione Singola',
            office: 'Ufficio Privato',
            meeting: 'Sala Riunioni',
            event: 'Sala Eventi',
            coworking: 'Spazio Coworking'
        };
        return labels[type] || type;
    },

    /**
     * Ottieni spazi preferiti
     */
    getFavoriteSpaces() {
        return this.state.spaces.filter(space => this.state.favorites.includes(space.id));
    },

    /**
     * Ottieni spazi per tipo
     */
    getSpacesByType(type) {
        return this.state.spaces.filter(space => space.type === type);
    },

    /**
     * Ottieni spazi per città
     */
    getSpacesByCity(city) {
        return this.state.spaces.filter(space => space.city === city);
    },

    /**
     * Ottieni statistiche spazi
     */
    getSpacesStats() {
        const spaces = this.state.spaces;
        const types = {};
        const cities = {};
        let totalRating = 0;
        let ratedSpaces = 0;

        spaces.forEach(space => {
            // Tipi
            types[space.type] = (types[space.type] || 0) + 1;

            // Città
            cities[space.city] = (cities[space.city] || 0) + 1;

            // Rating
            if (space.rating) {
                totalRating += space.rating;
                ratedSpaces++;
            }
        });

        return {
            total: spaces.length,
            types,
            cities,
            averageRating: ratedSpaces > 0 ? totalRating / ratedSpaces : 0,
            favorites: this.state.favorites.length
        };
    },

    /**
     * Esporta dati spazi
     */
    exportSpaces(format = 'json') {
        const spaces = this.state.filteredSpaces;

        if (format === 'json') {
            const dataStr = JSON.stringify(spaces, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            Utils.download(blob, 'spazi.json');
        } else if (format === 'csv') {
            const csv = this.convertSpacesToCSV(spaces);
            const blob = new Blob([csv], { type: 'text/csv' });
            Utils.download(blob, 'spazi.csv');
        }
    },

    /**
     * Converte spazi in CSV
     */
    convertSpacesToCSV(spaces) {
        const headers = ['ID', 'Nome', 'Tipo', 'Città', 'Indirizzo', 'Capacità', 'Prezzo/Ora', 'Rating'];
        const rows = spaces.map(space => [
            space.id,
            space.name,
            this.getTypeLabel(space.type),
            space.city,
            space.address,
            space.capacity,
            space.hourlyRate,
            space.rating || ''
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    },

    /**
     * Pulisci cache
     */
    clearCache() {
        this.state.cache.clear();
        console.log('Spaces cache cleared');
    },

    /**
     * Refresh spazi
     */
    async refreshSpaces() {
        this.clearCache();
        await this.loadSpaces();

        // Aggiorna UI se presente
        const grid = document.getElementById('spaces-grid');
        if (grid) {
            this.updateSpacesGrid();
        }
    },

    /**
     * Trigger evento custom
     */
    triggerEvent(eventName, data = {}) {
        const event = new CustomEvent(eventName, {
            detail: { ...data, spaces: this }
        });
        document.dispatchEvent(event);
    },

    /**
     * Ottieni raccomandazioni
     */
    getRecommendations(limit = 6) {
        // Algoritmo semplice di raccomandazione basato su:
        // 1. Rating alto
        // 2. Popolarità (numero recensioni)
        // 3. Prezzo competitivo

        return this.state.spaces
            .filter(space => space.rating >= 4.0)
            .sort((a, b) => {
                // Prima per rating, poi per numero recensioni
                if (b.rating !== a.rating) {
                    return b.rating - a.rating;
                }
                return (b.reviewCount || 0) - (a.reviewCount || 0);
            })
            .slice(0, limit);
    },

    /**
     * Cerca spazi nelle vicinanze
     */
    async findNearbySpaces(latitude, longitude, radius = 5000) {
        try {
            const response = await window.API.get('/api/spaces/nearby', {
                lat: latitude,
                lng: longitude,
                radius: radius
            });

            if (response.success) {
                return response.data || [];
            } else {
                throw new Error(response.message || 'Errore nella ricerca spazi vicini');
            }

        } catch (error) {
            console.error('Error finding nearby spaces:', error);
            return [];
        }
    },

    /**
     * Ottieni posizione utente e cerca spazi vicini
     */
    async findSpacesNearMe() {
        if (!navigator.geolocation) {
            window.Utils?.notifications?.show('Geolocalizzazione non supportata', 'error');
            return;
        }

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    timeout: 10000,
                    enableHighAccuracy: true
                });
            });

            const { latitude, longitude } = position.coords;
            const nearbySpaces = await this.findNearbySpaces(latitude, longitude);

            if (nearbySpaces.length > 0) {
                this.state.filteredSpaces = nearbySpaces;
                this.updateSpacesGrid();
                window.Utils?.notifications?.show(`Trovati ${nearbySpaces.length} spazi nelle vicinanze`, 'success');
            } else {
                window.Utils?.notifications?.show('Nessuno spazio trovato nelle vicinanze', 'info');
            }

        } catch (error) {
            console.error('Error getting user location:', error);
            window.Utils?.notifications?.show('Impossibile ottenere la posizione', 'error');
        }
    },

    /**
     * Condividi spazio
     */
    shareSpace(spaceId) {
        const space = this.state.spaces.find(s => s.id === spaceId);
        if (!space) return;

        const shareData = {
            title: space.name,
            text: `Guarda questo spazio coworking: ${space.name} a ${space.city}`,
            url: `${window.location.origin}?space=${spaceId}`
        };

        if (navigator.share) {
            navigator.share(shareData);
        } else {
            // Fallback: copia URL negli appunti
            navigator.clipboard.writeText(shareData.url).then(() => {
                window.Utils?.notifications?.show('Link copiato negli appunti', 'success');
            });
        }
    },

    /**
     * Segnala problema con lo spazio
     */
    async reportSpace(spaceId, reason, description = '') {
        try {
            const response = await window.API.post('/api/spaces/report', {
                spaceId,
                reason,
                description
            });

            if (response.success) {
                window.Utils?.notifications?.show('Segnalazione inviata, grazie!', 'success');
            } else {
                throw new Error(response.message || 'Errore nell\'invio della segnalazione');
            }

        } catch (error) {
            console.error('Error reporting space:', error);
            window.Utils?.notifications?.show('Errore nell\'invio della segnalazione', 'error');
        }
    },

    /**
     * Lascia recensione per spazio
     */
    async reviewSpace(spaceId, rating, comment) {
        if (!window.Auth?.isAuthenticated()) {
            window.Utils?.notifications?.show('Effettua il login per lasciare una recensione', 'warning');
            return;
        }

        try {
            const response = await window.API.post('/api/spaces/reviews', {
                spaceId,
                rating,
                comment
            });

            if (response.success) {
                window.Utils?.notifications?.show('Recensione pubblicata!', 'success');

                // Aggiorna cache dello spazio
                this.state.cache.delete(`space_${spaceId}`);

                // Trigger evento
                this.triggerEvent('review:added', { spaceId, rating, comment });

                return response.data;
            } else {
                throw new Error(response.message || 'Errore nella pubblicazione della recensione');
            }

        } catch (error) {
            console.error('Error submitting review:', error);
            window.Utils?.notifications?.show(error.message, 'error');
        }
    }
};

// Auto-inizializzazione se DOM pronto e dipendenze disponibili
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.API && window.Utils) {
            window.Spaces.init();
        }
    });
} else if (window.API && window.Utils) {
    window.Spaces.init();
}