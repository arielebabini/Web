/**
 * CoWorkSpace - Versione Semplificata e Funzionante
 */

// ===== VARIABILI GLOBALI =====
let currentUser = null;
let isAuthenticated = false;
let currentSpaces = [];
let activeSection = 'home';

// ===== DATI MOCK =====
const mockSpaces = [
    {
        id: 1,
        name: "Milano Business Hub",
        type: "private-office",
        city: "Milano",
        address: "Via Brera 12, Milano",
        price: 85,
        capacity: 12,
        rating: 4.8,
        reviews: 124,
        description: "Ufficio privato nel cuore di Milano, completamente attrezzato per team fino a 12 persone.",
        amenities: ["wifi", "parking", "coffee", "printer"],
        image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600",
        available: true,
        featured: true
    },
    {
        id: 2,
        name: "Roma Creative Space",
        type: "hot-desk",
        city: "Roma",
        address: "Via di Trastevere 85, Roma",
        price: 35,
        capacity: 25,
        rating: 4.6,
        reviews: 89,
        description: "Spazio di coworking dinamico nel caratteristico quartiere di Trastevere.",
        amenities: ["wifi", "coffee", "printer"],
        image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600",
        available: true,
        featured: false
    },
    {
        id: 3,
        name: "Torino Executive Meeting",
        type: "meeting-room",
        city: "Torino",
        address: "Corso Francia 23, Torino",
        price: 120,
        capacity: 16,
        rating: 4.9,
        reviews: 67,
        description: "Sala riunioni di alto livello con vista panoramica sulla città.",
        amenities: ["wifi", "parking", "printer", "projector"],
        image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600",
        available: false,
        featured: true
    },
    {
        id: 4,
        name: "Bologna Open Workspace",
        type: "hot-desk",
        city: "Bologna",
        address: "Via Indipendenza 45, Bologna",
        price: 28,
        capacity: 35,
        rating: 4.3,
        reviews: 156,
        description: "Ampio spazio aperto nel centro di Bologna, ideale per networking.",
        amenities: ["wifi", "coffee", "kitchen"],
        image: "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=600",
        available: true,
        featured: false
    }
];

const mockBookings = [];

// ===== FUNZIONI UTILITY =====
function showNotification(message, type = 'info') {
    const container = $('#notificationContainer');
    if (container.length === 0) {
        $('body').append('<div id="notificationContainer" class="notification-container"></div>');
    }

    const iconClass = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-circle',
        'warning': 'fas fa-exclamation-triangle',
        'info': 'fas fa-info-circle'
    }[type] || 'fas fa-info-circle';

    const notification = $(`
        <div class="notification alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show" role="alert">
            <i class="${iconClass} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `);

    $('#notificationContainer').append(notification);

    setTimeout(() => {
        notification.alert('close');
    }, 4000);
}

function formatPrice(price) {
    return '€' + price;
}

function getAmenityLabel(amenity) {
    const labels = {
        'wifi': 'WiFi',
        'parking': 'Parcheggio',
        'coffee': 'Caffè',
        'printer': 'Stampante',
        'projector': 'Proiettore',
        'kitchen': 'Cucina'
    };
    return labels[amenity] || amenity;
}

// ===== FUNZIONE PRINCIPALE NAVIGAZIONE =====
function showSection(sectionName) {
    console.log('Mostrando sezione:', sectionName);

    // Nascondi tutte le sezioni
    $('section[id$="Section"]').hide();

    // Mostra la sezione richiesta
    $('#' + sectionName + 'Section').show();

    activeSection = sectionName;

    // Azioni specifiche per sezione
    if (sectionName === 'spaces') {
        loadSpaces();
    } else if (sectionName === 'profile' && !isAuthenticated) {
        showNotification('Devi effettuare il login per accedere al profilo', 'warning');
        showSection('home');
        return;
    } else if (sectionName === 'bookings' && !isAuthenticated) {
        showNotification('Devi effettuare il login per vedere le prenotazioni', 'warning');
        showSection('home');
        return;
    } else if (sectionName === 'dashboard' && (!isAuthenticated || !currentUser || currentUser.accountType === 'client')) {
        showNotification('Non hai i permessi per accedere alla dashboard', 'warning');
        showSection('home');
        return;
    }

    if (sectionName === 'bookings') {
        loadBookings();
    } else if (sectionName === 'dashboard') {
        loadDashboard();
    } else if (sectionName === 'profile') {
        loadProfile();
    }
}

// ===== GESTIONE SPAZI =====
function loadSpaces() {
    console.log('Caricando spazi...');
    const container = $('#spacesContainer');
    container.empty();

    if (currentSpaces.length === 0) {
        currentSpaces = [...mockSpaces];
    }

    currentSpaces.forEach(space => {
        const spaceCard = createSpaceCard(space);
        container.append(spaceCard);
    });

    $('#resultsCount').text(currentSpaces.length + ' spazi trovati');
}

function createSpaceCard(space) {
    const availabilityClass = space.available ? 'available' : 'busy';
    const availabilityText = space.available ? 'Disponibile' : 'Non Disponibile';
    const featuredBadge = space.featured ? '<div class="space-badge featured">In Evidenza</div>' : '';

    return $(`
        <div class="space-card">
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
                    ${space.amenities.slice(0, 3).map(amenity =>
        `<span class="amenity badge me-1">${getAmenityLabel(amenity)}</span>`
    ).join('')}
                    ${space.amenities.length > 3 ? `<span class="badge bg-secondary">+${space.amenities.length - 3}</span>` : ''}
                </div>
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div class="space-price">
                        <strong class="text-primary fs-4">${formatPrice(space.price)}<small class="fs-6 text-muted">/giorno</small></strong>
                    </div>
                    <div class="space-capacity text-muted">
                        <i class="fas fa-users me-1"></i>${space.capacity} persone
                    </div>
                </div>
                <button class="btn btn-primary w-100 btn-lg" onclick="showSpaceDetail(${space.id})" 
                        ${!space.available ? 'disabled' : ''}>
                    ${space.available ? '<i class="fas fa-calendar-plus me-2"></i>Prenota Ora' : '<i class="fas fa-times me-2"></i>Non Disponibile'}
                </button>
            </div>
        </div>
    `);
}

function showSpaceDetail(spaceId) {
    const space = mockSpaces.find(s => s.id === spaceId);
    if (!space) {
        showNotification('Spazio non trovato', 'error');
        return;
    }

    $('#spaceDetailModal').data('space-id', spaceId);
    $('#spaceDetailTitle').text(space.name);

    $('#spaceDetailImages').html(`
        <img src="${space.image}" class="img-fluid rounded" alt="${space.name}" 
             style="width: 100%; height: 300px; object-fit: cover;">
    `);

    $('#spaceDetailDescription').html(`
        <h6><i class="fas fa-info-circle text-primary"></i> Descrizione</h6>
        <p>${space.description}</p>
        <div class="row mt-3">
            <div class="col-md-4"><strong>Capacità:</strong> ${space.capacity} persone</div>
            <div class="col-md-4"><strong>Prezzo:</strong> ${formatPrice(space.price)}/giorno</div>
            <div class="col-md-4"><strong>Rating:</strong> ${space.rating} ⭐ (${space.reviews} recensioni)</div>
        </div>
    `);

    $('#spaceDetailAmenities .amenities-list').html(
        `<div class="row">` +
        space.amenities.map(amenity => `
            <div class="col-md-6 mb-2">
                <i class="fas fa-check text-success"></i>
                <span class="ms-2">${getAmenityLabel(amenity)}</span>
            </div>
        `).join('') +
        `</div>`
    );

    $('#spaceDetailLocation').html(`
        <h6><i class="fas fa-map-marker-alt text-primary"></i> Posizione</h6>
        <p><strong>${space.address}</strong></p>
        <p>Città: ${space.city}</p>
    `);

    $('#spaceDetailReviews').html(`
        <h6><i class="fas fa-star text-primary"></i> Recensioni</h6>
        <div class="d-flex align-items-center mb-3">
            <span class="fs-4 me-2">${space.rating}</span>
            <div class="stars me-2">
                ${Array(5).fill().map((_, i) => `
                    <i class="fas fa-star ${i < Math.floor(space.rating) ? 'text-warning' : 'text-muted'}"></i>
                `).join('')}
            </div>
            <span class="text-muted">${space.reviews} recensioni</span>
        </div>
        <div class="alert alert-info">
            <i class="fas fa-info-circle"></i>
            Le recensioni dettagliate saranno disponibili nella versione completa della piattaforma.
        </div>
    `);

    const today = new Date().toISOString().split('T')[0];
    $('#bookingStartDate').val(today);
    $('#bookingEndDate').val(today);
    updateBookingPrice(space);

    $('#spaceDetailModal').modal('show');
}

function updateBookingPrice(space) {
    if (!space) return;

    const startDate = $('#bookingStartDate').val();
    const endDate = $('#bookingEndDate').val();

    if (!startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);

    const basePrice = space.price * daysDiff;
    const fees = Math.round(basePrice * 0.1);
    const totalPrice = basePrice + fees;

    $('#basePrice').text(formatPrice(space.price));
    $('#totalDays').text(daysDiff);
    $('#fees').text(formatPrice(fees));
    $('#totalPrice').text(formatPrice(totalPrice));
}

// ===== AUTENTICAZIONE =====
function showLogin() {
    $('#loginModal').modal('show');
}

function showRegister() {
    $('#registerModal').modal('show');
}

function switchToRegister() {
    $('#loginModal').modal('hide');
    setTimeout(() => $('#registerModal').modal('show'), 300);
}

function switchToLogin() {
    $('#registerModal').modal('hide');
    setTimeout(() => $('#loginModal').modal('show'), 300);
}

function logout() {
    currentUser = null;
    isAuthenticated = false;
    localStorage.removeItem('coworkspace_user');
    updateAuthUI();
    showSection('home');
    showNotification('Logout effettuato con successo', 'success');
}

function updateAuthUI() {
    if (isAuthenticated && currentUser) {
        $('#authButtons').hide();
        $('#userMenu').show();
        $('#userName').text(currentUser.name + ' ' + currentUser.surname);
    } else {
        $('#authButtons').show();
        $('#userMenu').hide();
    }
}

// ===== GESTIONE PROFILO =====
function loadProfile() {
    if (!currentUser) return;

    $('#profileName').val(currentUser.name || '');
    $('#profileSurname').val(currentUser.surname || '');
    $('#profileEmail').val(currentUser.email || '');
    $('#profilePhone').val(currentUser.phone || '');
    $('#profileCompany').val(currentUser.company || '');
    $('#profileAccountType').val(currentUser.accountType || 'client');
}

function showProfile() {
    showSection('profile');
}

function cancelProfileEdit() {
    loadProfile();
    showNotification('Modifiche annullate', 'info');
}

// ===== GESTIONE PRENOTAZIONI =====
function loadBookings() {
    if (!currentUser) return;

    const container = $('#bookingsContainer');
    const userBookings = mockBookings.filter(b => b.userId === currentUser.id);

    if (userBookings.length === 0) {
        container.html(`
            <div class="text-center py-5">
                <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                <h4>Nessuna prenotazione trovata</h4>
                <p class="text-muted">Non hai ancora effettuato nessuna prenotazione</p>
                <button class="btn btn-primary" onclick="showSection('spaces')">
                    <i class="fas fa-search"></i> Esplora Spazi
                </button>
            </div>
        `);
        return;
    }

    const bookingsHtml = userBookings.map(booking => `
        <div class="col-md-6 mb-4">
            <div class="card">
                <div class="card-header d-flex justify-content-between">
                    <h6 class="mb-0">${booking.spaceName}</h6>
                    <span class="badge bg-success">Confermata</span>
                </div>
                <div class="card-body">
                    <p><strong>Data:</strong> ${booking.startDate}</p>
                    <p><strong>Orario:</strong> ${booking.startTime} - ${booking.endTime}</p>
                    <p><strong>Persone:</strong> ${booking.people}</p>
                    <p><strong>Prezzo:</strong> ${formatPrice(booking.totalPrice)}</p>
                    ${booking.notes ? `<p><strong>Note:</strong> ${booking.notes}</p>` : ''}
                </div>
            </div>
        </div>
    `).join('');

    container.html('<div class="row">' + bookingsHtml + '</div>');
}

function showBookings() {
    showSection('bookings');
}

// ===== DASHBOARD =====
function loadDashboard() {
    if (!currentUser || currentUser.accountType === 'client') return;
    showDashboardTab('overview');
}

function showDashboard() {
    showSection('dashboard');
}

function showDashboardTab(tabName) {
    $('.sidebar-menu a').removeClass('active');
    $(`.sidebar-menu a[onclick*="${tabName}"]`).addClass('active');

    const content = $('#dashboardTabsContent');

    switch(tabName) {
        case 'overview':
            content.html(`
                <h3 class="mb-4">Panoramica</h3>
                <div class="row">
                    <div class="col-md-3 mb-4">
                        <div class="stats-card text-center p-4">
                            <div class="stats-icon bg-primary text-white rounded-circle mx-auto mb-3" style="width: 60px; height: 60px; line-height: 60px;">
                                <i class="fas fa-calendar-check"></i>
                            </div>
                            <h4>15</h4>
                            <p>Prenotazioni Totali</p>
                        </div>
                    </div>
                    <div class="col-md-3 mb-4">
                        <div class="stats-card text-center p-4">
                            <div class="stats-icon bg-success text-white rounded-circle mx-auto mb-3" style="width: 60px; height: 60px; line-height: 60px;">
                                <i class="fas fa-euro-sign"></i>
                            </div>
                            <h4>€2,450</h4>
                            <p>Ricavi Totali</p>
                        </div>
                    </div>
                    <div class="col-md-3 mb-4">
                        <div class="stats-card text-center p-4">
                            <div class="stats-icon bg-warning text-white rounded-circle mx-auto mb-3" style="width: 60px; height: 60px; line-height: 60px;">
                                <i class="fas fa-building"></i>
                            </div>
                            <h4>3</h4>
                            <p>Spazi Gestiti</p>
                        </div>
                    </div>
                    <div class="col-md-3 mb-4">
                        <div class="stats-card text-center p-4">
                            <div class="stats-icon bg-info text-white rounded-circle mx-auto mb-3" style="width: 60px; height: 60px; line-height: 60px;">
                                <i class="fas fa-star"></i>
                            </div>
                            <h4>4.7</h4>
                            <p>Rating Medio</p>
                        </div>
                    </div>
                </div>
            `);
            break;
        default:
            content.html(`
                <h3 class="mb-4">${tabName.charAt(0).toUpperCase() + tabName.slice(1)}</h3>
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    Sezione ${tabName} in sviluppo per questa demo.
                </div>
            `);
    }
}

// ===== MAPPA =====
function showMapView() {
    $('#spacesContainer').hide();
    $('#mapContainer').show();
    $('.view-toggle .btn').removeClass('active');
    $('#mapViewBtn').addClass('active');

    if ($('#mapContainer').is(':empty')) {
        initializeMap();
    }

    showNotification('Vista mappa attivata', 'info');
}

function showGridView() {
    $('#mapContainer').hide();
    $('#spacesContainer').show();
    $('.view-toggle .btn').removeClass('active');
    $('#gridViewBtn').addClass('active');

    showNotification('Vista griglia attivata', 'info');
}

function initializeMap() {
    $('#mapContainer').html(`
        <div class="map-view">
            <div class="map-header">
                <h4><i class="fas fa-map text-primary"></i> Mappa degli Spazi</h4>
                <div class="map-controls">
                    <button class="btn btn-sm btn-outline-primary" onclick="zoomIn()">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary" onclick="zoomOut()">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary" onclick="centerMap()">
                        <i class="fas fa-crosshairs"></i>
                    </button>
                </div>
            </div>
            <div class="map-container" id="mapDisplay">
                <div class="map-background">
                    <div class="map-grid"></div>
                    <div id="mapPins" class="map-pins"></div>
                </div>
            </div>
            <div class="map-footer">
                <span>${currentSpaces.length} spazi sulla mappa</span>
            </div>
        </div>
    `);

    updateMapMarkers();
}

function updateMapMarkers() {
    const pinsContainer = $('#mapPins');
    if (pinsContainer.length === 0) return;

    pinsContainer.empty();

    const cityPositions = {
        'Milano': { x: '45%', y: '30%' },
        'Roma': { x: '50%', y: '55%' },
        'Torino': { x: '35%', y: '25%' },
        'Bologna': { x: '55%', y: '40%' },
        'Firenze': { x: '52%', y: '45%' }
    };

    currentSpaces.forEach(space => {
        const position = cityPositions[space.city] || { x: '50%', y: '50%' };
        const markerClass = space.featured ? 'featured' : space.available ? 'available' : 'busy';

        const marker = $(`
            <div class="map-pin ${markerClass}" 
                 style="left: ${position.x}; top: ${position.y};">
                <div class="pin-icon">
                    <i class="fas fa-map-marker-alt"></i>
                </div>
                <div class="pin-popup">
                    <div class="pin-info">
                        <h6>${space.name}</h6>
                        <p class="mb-1">${space.city}</p>
                        <p class="mb-1"><strong>${formatPrice(space.price)}/giorno</strong></p>
                        <button class="btn btn-sm btn-primary w-100" onclick="showSpaceDetail(${space.id})">
                            Dettagli
                        </button>
                    </div>
                </div>
            </div>
        `);

        pinsContainer.append(marker);
    });
}

function zoomIn() {
    $('#mapDisplay').addClass('zoomed-in');
    showNotification('Zoom avvicinato', 'info');
}

function zoomOut() {
    $('#mapDisplay').removeClass('zoomed-in');
    showNotification('Zoom allontanato', 'info');
}

function centerMap() {
    $('#mapDisplay').removeClass('zoomed-in');
    showNotification('Mappa centrata', 'info');
}

// ===== FILTRI =====
function showFilters() {
    $('#filtersModal').modal('show');
}

function clearFilters() {
    $('#filtersForm')[0]?.reset();
    $('#quickCity').val('');
    $('#quickSpaceType').val('');
    $('#quickCapacity').val('');
    $('#searchSpaces').val('');

    $('.quick-filter-btn').removeClass('active');

    currentSpaces = [...mockSpaces];
    loadSpaces();

    showNotification('Filtri cancellati', 'info');
}

// ===== INIZIALIZZAZIONE =====
$(document).ready(function() {
    console.log('CoWorkSpace inizializzato');

    // Inizializza spazi
    currentSpaces = [...mockSpaces];

    // Controlla utente salvato
    const savedUser = localStorage.getItem('coworkspace_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            isAuthenticated = true;
            updateAuthUI();
        } catch (e) {
            localStorage.removeItem('coworkspace_user');
        }
    }

    // Setup form handlers
    $('#loginForm').on('submit', function(e) {
        e.preventDefault();
        const email = $('#loginEmail').val();
        const password = $('#loginPassword').val();

        if (!email || !password) {
            showNotification('Inserisci email e password', 'warning');
            return;
        }

        currentUser = {
            id: 1,
            name: "Mario",
            surname: "Rossi",
            email: email,
            accountType: email.includes('manager') ? 'manager' : 'client'
        };
        isAuthenticated = true;

        if ($('#rememberMe').is(':checked')) {
            localStorage.setItem('coworkspace_user', JSON.stringify(currentUser));
        }

        $('#loginModal').modal('hide');
        updateAuthUI();
        showNotification('Login effettuato con successo', 'success');

        if (currentUser.accountType === 'manager') {
            showSection('dashboard');
        }
    });

    $('#registerForm').on('submit', function(e) {
        e.preventDefault();
        const name = $('#registerName').val();
        const surname = $('#registerSurname').val();
        const email = $('#registerEmail').val();
        const password = $('#registerPassword').val();
        const confirmPassword = $('#confirmPassword').val();
        const accountType = $('#registerAccountType').val();

        if (!name || !surname || !email || !password || !accountType) {
            showNotification('Compila tutti i campi obbligatori', 'warning');
            return;
        }

        if (password !== confirmPassword) {
            showNotification('Le password non coincidono', 'error');
            return;
        }

        if (!$('#acceptTerms').is(':checked')) {
            showNotification('Devi accettare i termini e condizioni', 'warning');
            return;
        }

        currentUser = {
            id: Date.now(),
            name: name,
            surname: surname,
            email: email,
            accountType: accountType
        };
        isAuthenticated = true;

        localStorage.setItem('coworkspace_user', JSON.stringify(currentUser));

        $('#registerModal').modal('hide');
        updateAuthUI();
        showNotification('Registrazione completata con successo', 'success');
    });

    $('#quickSearchForm').on('submit', function(e) {
        e.preventDefault();
        showSection('spaces');
    });

    $('#bookingForm').on('submit', function(e) {
        e.preventDefault();

        if (!isAuthenticated) {
            showNotification('Devi effettuare il login per prenotare', 'warning');
            $('#spaceDetailModal').modal('hide');
            setTimeout(() => showLogin(), 300);
            return;
        }

        const spaceId = parseInt($('#spaceDetailModal').data('space-id'));
        const booking = {
            id: Date.now(),
            spaceId: spaceId,
            userId: currentUser.id,
            spaceName: $('#spaceDetailTitle').text(),
            startDate: $('#bookingStartDate').val(),
            endDate: $('#bookingEndDate').val(),
            startTime: $('#bookingStartTime').val(),
            endTime: $('#bookingEndTime').val(),
            people: $('#bookingPeople').val(),
            notes: $('#bookingNotes').val(),
            totalPrice: parseFloat($('#totalPrice').text().replace('€', '')),
            status: 'confirmed'
        };

        mockBookings.push(booking);

        $('#spaceDetailModal').modal('hide');
        showNotification('Prenotazione effettuata con successo!', 'success');

        setTimeout(() => showSection('bookings'), 1000);
    });

    $('#profileForm').on('submit', function(e) {
        e.preventDefault();

        currentUser.name = $('#profileName').val();
        currentUser.surname = $('#profileSurname').val();
        currentUser.email = $('#profileEmail').val();
        currentUser.phone = $('#profilePhone').val();
        currentUser.company = $('#profileCompany').val();

        localStorage.setItem('coworkspace_user', JSON.stringify(currentUser));
        updateAuthUI();
        showNotification('Profilo aggiornato con successo', 'success');
    });

    // Update prezzo quando cambiano le date
    $('#bookingStartDate, #bookingEndDate').on('change', function() {
        const spaceId = parseInt($('#spaceDetailModal').data('space-id'));
        const space = mockSpaces.find(s => s.id === spaceId);
        if (space) updateBookingPrice(space);
    });

    // Quick filters
    $(document).on('click', '.quick-filter-btn', function() {
        const filter = $(this).data('filter');
        $(this).toggleClass('active');

        if (filter === 'featured') {
            currentSpaces = $(this).hasClass('active')
                ? mockSpaces.filter(s => s.featured)
                : [...mockSpaces];
            loadSpaces();
            if ($('#mapContainer').is(':visible')) {
                updateMapMarkers();
            }
        }
    });

    // Search with debounce
    let searchTimeout;
    $('#searchSpaces').on('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const searchTerm = $(this).val().toLowerCase();
            if (searchTerm) {
                currentSpaces = mockSpaces.filter(space =>
                    space.name.toLowerCase().includes(searchTerm) ||
                    space.city.toLowerCase().includes(searchTerm) ||
                    space.description.toLowerCase().includes(searchTerm)
                );
            } else {
                currentSpaces = [...mockSpaces];
            }
            loadSpaces();
        }, 300);
    });

    // Filters form
    $('#filtersForm').on('submit', function(e) {
        e.preventDefault();

        const city = $('#quickCity').val();
        const spaceType = $('#quickSpaceType').val();
        const minPrice = parseInt($('#minPrice').val()) || 0;
        const maxPrice = parseInt($('#maxPrice').val()) || 999999;
        const onlyAvailable = $('#onlyAvailable').is(':checked');

        currentSpaces = mockSpaces.filter(space => {
            if (city && space.city !== city) return false;
            if (spaceType && space.type !== spaceType) return false;
            if (space.price < minPrice || space.price > maxPrice) return false;
            if (onlyAvailable && !space.available) return false;
            return true;
        });

        loadSpaces();
        $('#filtersModal').modal('hide');
        showNotification('Filtri applicati con successo', 'success');
    });

    // Imposta data minima
    const today = new Date().toISOString().split('T')[0];
    $('input[type="date"]').attr('min', today);

    console.log('Setup completato');
});