/**
 * CoWorkSpace - JavaScript Vanilla
 */

// ===== VARIABILI GLOBALI =====
let currentUser = null;
let isAuthenticated = false;
let currentSpaces = [];
let activeSection = 'home';
let mapZoomLevel = 1;
let selectedCity = null;

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
        featured: true,
        coordinates: { x: 320, y: 200 }
    },
    {
        id: 2,
        name: "Milano Creative Space",
        type: "hot-desk",
        city: "Milano",
        address: "Via Navigli 45, Milano",
        price: 45,
        capacity: 20,
        rating: 4.5,
        reviews: 98,
        description: "Spazio creativo nei Navigli, perfetto per freelancer e startup.",
        amenities: ["wifi", "coffee", "kitchen"],
        image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600",
        available: true,
        featured: false,
        coordinates: { x: 325, y: 205 }
    },
    {
        id: 3,
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
        featured: false,
        coordinates: { x: 380, y: 500 }
    },
    {
        id: 4,
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
        featured: true,
        coordinates: { x: 280, y: 180 }
    },
    {
        id: 5,
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
        featured: false,
        coordinates: { x: 360, y: 320 }
    }
];

const mockBookings = [];

// ===== FUNZIONI UTILITY =====
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) {
        const newContainer = document.createElement('div');
        newContainer.id = 'notificationContainer';
        newContainer.className = 'notification-container';
        document.body.appendChild(newContainer);
    }

    const iconClass = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-circle',
        'warning': 'fas fa-exclamation-triangle',
        'info': 'fas fa-info-circle'
    }[type] || 'fas fa-info-circle';

    const notification = document.createElement('div');
    notification.className = `notification alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
    notification.innerHTML = `
        <i class="${iconClass} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.getElementById('notificationContainer').appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
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
    const sections = document.querySelectorAll('section[id$="Section"]');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    // Mostra la sezione richiesta
    const targetSection = document.getElementById(sectionName + 'Section');
    if (targetSection) {
        targetSection.style.display = 'block';
    }

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
    const container = document.getElementById('spacesContainer');
    container.innerHTML = '';

    if (currentSpaces.length === 0) {
        currentSpaces = [...mockSpaces];
    }

    currentSpaces.forEach(space => {
        const spaceCard = createSpaceCard(space);
        container.appendChild(spaceCard);
    });

    document.getElementById('resultsCount').textContent = currentSpaces.length + ' spazi trovati';
}

function createSpaceCard(space) {
    const availabilityClass = space.available ? 'available' : 'busy';
    const availabilityText = space.available ? 'Disponibile' : 'Non Disponibile';
    const featuredBadge = space.featured ? '<div class="space-badge featured">In Evidenza</div>' : '';

    const cardElement = document.createElement('div');
    cardElement.className = 'space-card';
    cardElement.innerHTML = `
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
    `;

    return cardElement;
}

function showSpaceDetail(spaceId) {
    const space = mockSpaces.find(s => s.id === spaceId);
    if (!space) {
        showNotification('Spazio non trovato', 'error');
        return;
    }

    const modal = document.getElementById('spaceDetailModal');
    modal.setAttribute('data-space-id', spaceId);
    document.getElementById('spaceDetailTitle').textContent = space.name;

    document.getElementById('spaceDetailImages').innerHTML = `
        <img src="${space.image}" class="img-fluid rounded" alt="${space.name}" 
             style="width: 100%; height: 300px; object-fit: cover;">
    `;

    document.getElementById('spaceDetailDescription').innerHTML = `
        <h6><i class="fas fa-info-circle text-primary"></i> Descrizione</h6>
        <p>${space.description}</p>
        <div class="row mt-3">
            <div class="col-md-4"><strong>Capacità:</strong> ${space.capacity} persone</div>
            <div class="col-md-4"><strong>Prezzo:</strong> ${formatPrice(space.price)}/giorno</div>
            <div class="col-md-4"><strong>Rating:</strong> ${space.rating} ⭐ (${space.reviews} recensioni)</div>
        </div>
    `;

    document.querySelector('#spaceDetailAmenities .amenities-list').innerHTML =
        `<div class="row">` +
        space.amenities.map(amenity => `
            <div class="col-md-6 mb-2">
                <i class="fas fa-check text-success"></i>
                <span class="ms-2">${getAmenityLabel(amenity)}</span>
            </div>
        `).join('') +
        `</div>`;

    document.getElementById('spaceDetailLocation').innerHTML = `
        <h6><i class="fas fa-map-marker-alt text-primary"></i> Posizione</h6>
        <p><strong>${space.address}</strong></p>
        <p>Città: ${space.city}</p>
    `;

    document.getElementById('spaceDetailReviews').innerHTML = `
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
    `;

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('bookingStartDate').value = today;
    document.getElementById('bookingEndDate').value = today;
    updateBookingPrice(space);

    // Mostra il modal usando Bootstrap
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

function updateBookingPrice(space) {
    if (!space) return;

    const startDate = document.getElementById('bookingStartDate').value;
    const endDate = document.getElementById('bookingEndDate').value;

    if (!startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);

    const basePrice = space.price * daysDiff;
    const fees = Math.round(basePrice * 0.1);
    const totalPrice = basePrice + fees;

    document.getElementById('basePrice').textContent = formatPrice(space.price);
    document.getElementById('totalDays').textContent = daysDiff;
    document.getElementById('fees').textContent = formatPrice(fees);
    document.getElementById('totalPrice').textContent = formatPrice(totalPrice);
}

// ===== MAPPA CUSTOM =====
function showMapView() {
    document.getElementById('spacesContainer').style.display = 'none';
    document.getElementById('mapContainer').style.display = 'block';

    document.querySelectorAll('.view-toggle .btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('mapViewBtn').classList.add('active');

    initializeCustomMap();
    showNotification('Vista mappa attivata', 'info');
}

function showGridView() {
    document.getElementById('mapContainer').style.display = 'none';
    document.getElementById('spacesContainer').style.display = 'block';

    document.querySelectorAll('.view-toggle .btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('gridViewBtn').classList.add('active');

    showNotification('Vista griglia attivata', 'info');
}

function initializeCustomMap() {
    updateMapMarkers();
    setupMapInteractions();
}

function updateMapMarkers() {
    // Aggiorna il contatore degli spazi sulla mappa
    document.getElementById('mapSpaceCount').textContent = `${currentSpaces.length} spazi sulla mappa`;

    // Setup degli event listeners per i marker delle città
    const cityMarkers = document.querySelectorAll('.city-marker');
    cityMarkers.forEach(marker => {
        marker.addEventListener('click', function(e) {
            const cityName = this.getAttribute('data-city');
            const spaceCount = this.getAttribute('data-count');
            showCityPopup(e, cityName, spaceCount);
        });

        marker.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.5)';
            this.style.filter = 'brightness(1.2)';
        });

        marker.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            this.style.filter = 'brightness(1)';
        });
    });
}

function showCityPopup(event, cityName, spaceCount) {
    const popup = document.getElementById('cityPopup');
    const citySpaces = currentSpaces.filter(space => space.city === cityName);

    document.getElementById('popupCityName').textContent = cityName;
    document.getElementById('popupSpaceCount').textContent = `${citySpaces.length} spazi disponibili`;

    // Posiziona il popup vicino al marker
    const rect = event.target.getBoundingClientRect();
    const mapRect = document.getElementById('italyMap').getBoundingClientRect();

    popup.style.left = (rect.left - mapRect.left + 20) + 'px';
    popup.style.top = (rect.top - mapRect.top - 80) + 'px';
    popup.style.display = 'block';

    selectedCity = cityName;

    // Nascondi il popup dopo 3 secondi
    setTimeout(() => {
        popup.style.display = 'none';
    }, 3000);
}

function filterByCity() {
    if (selectedCity) {
        currentSpaces = mockSpaces.filter(space => space.city === selectedCity);
        showGridView();
        loadSpaces();
        document.getElementById('cityPopup').style.display = 'none';
        showNotification(`Filtrati spazi per ${selectedCity}`, 'success');
    }
}

function setupMapInteractions() {
    const italyMap = document.getElementById('italyMap');

    // Click fuori dal popup per nasconderlo
    italyMap.addEventListener('click', function(e) {
        if (!e.target.classList.contains('city-marker')) {
            document.getElementById('cityPopup').style.display = 'none';
        }
    });
}

function zoomIn() {
    mapZoomLevel = Math.min(mapZoomLevel + 0.2, 2);
    updateMapZoom();
    showNotification('Zoom avvicinato', 'info');
}

function zoomOut() {
    mapZoomLevel = Math.max(mapZoomLevel - 0.2, 0.8);
    updateMapZoom();
    showNotification('Zoom allontanato', 'info');
}

function centerMap() {
    mapZoomLevel = 1;
    updateMapZoom();
    showNotification('Mappa centrata', 'info');
}

function updateMapZoom() {
    const mapSvg = document.querySelector('.italy-svg');
    if (mapSvg) {
        mapSvg.style.transform = `scale(${mapZoomLevel})`;
        mapSvg.style.transition = 'transform 0.3s ease';
    }
}

// ===== AUTENTICAZIONE =====
function showLogin() {
    const modal = new bootstrap.Modal(document.getElementById('loginModal'));
    modal.show();
}

function showRegister() {
    const modal = new bootstrap.Modal(document.getElementById('registerModal'));
    modal.show();
}

function switchToRegister() {
    const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
    loginModal.hide();
    setTimeout(() => {
        const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
        registerModal.show();
    }, 300);
}

function switchToLogin() {
    const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
    registerModal.hide();
    setTimeout(() => {
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
    }, 300);
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
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');

    if (isAuthenticated && currentUser) {
        authButtons.style.display = 'none';
        userMenu.style.display = 'block';
        userName.textContent = currentUser.name + ' ' + currentUser.surname;
    } else {
        authButtons.style.display = 'block';
        userMenu.style.display = 'none';
    }
}

// ===== GESTIONE PROFILO =====
function loadProfile() {
    if (!currentUser) return;

    document.getElementById('profileName').value = currentUser.name || '';
    document.getElementById('profileSurname').value = currentUser.surname || '';
    document.getElementById('profileEmail').value = currentUser.email || '';
    document.getElementById('profilePhone').value = currentUser.phone || '';
    document.getElementById('profileCompany').value = currentUser.company || '';
    document.getElementById('profileAccountType').value = currentUser.accountType || 'client';
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

    const container = document.getElementById('bookingsContainer');
    const userBookings = mockBookings.filter(b => b.userId === currentUser.id);

    if (userBookings.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                <h4>Nessuna prenotazione trovata</h4>
                <p class="text-muted">Non hai ancora effettuato nessuna prenotazione</p>
                <button class="btn btn-primary" onclick="showSection('spaces')">
                    <i class="fas fa-search"></i> Esplora Spazi
                </button>
            </div>
        `;
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

    container.innerHTML = '<div class="row">' + bookingsHtml + '</div>';
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
    document.querySelectorAll('.sidebar-menu a').forEach(link => link.classList.remove('active'));
    const activeLink = document.querySelector(`.sidebar-menu a[onclick*="${tabName}"]`);
    if (activeLink) activeLink.classList.add('active');

    const content = document.getElementById('dashboardTabsContent');

    switch(tabName) {
        case 'overview':
            content.innerHTML = `
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
            `;
            break;
        default:
            content.innerHTML = `
                <h3 class="mb-4">${tabName.charAt(0).toUpperCase() + tabName.slice(1)}</h3>
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    Sezione ${tabName} in sviluppo per questa demo.
                </div>
            `;
    }
}

// ===== FILTRI =====
function showFilters() {
    const modal = new bootstrap.Modal(document.getElementById('filtersModal'));
    modal.show();
}

function clearFilters() {
    const form = document.getElementById('filtersForm');
    if (form) form.reset();

    document.getElementById('quickCity').value = '';
    document.getElementById('quickSpaceType').value = '';
    document.getElementById('quickCapacity').value = '';
    document.getElementById('searchSpaces').value = '';

    document.querySelectorAll('.quick-filter-btn').forEach(btn => btn.classList.remove('active'));

    currentSpaces = [...mockSpaces];
    loadSpaces();

    showNotification('Filtri cancellati', 'info');
}

// ===== RICERCA E FILTRI =====
function setupSearch() {
    let searchTimeout;
    const searchInput = document.getElementById('searchSpaces');

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const searchTerm = this.value.toLowerCase();
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
                if (document.getElementById('mapContainer').style.display !== 'none') {
                    updateMapMarkers();
                }
            }, 300);
        });
    }
}

function setupQuickFilters() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('quick-filter-btn')) {
            const filter = e.target.getAttribute('data-filter');
            e.target.classList.toggle('active');

            if (filter === 'featured') {
                currentSpaces = e.target.classList.contains('active')
                    ? mockSpaces.filter(s => s.featured)
                    : [...mockSpaces];
                loadSpaces();
                if (document.getElementById('mapContainer').style.display !== 'none') {
                    updateMapMarkers();
                }
            } else if (filter === 'available') {
                currentSpaces = e.target.classList.contains('active')
                    ? mockSpaces.filter(s => s.available)
                    : [...mockSpaces];
                loadSpaces();
                if (document.getElementById('mapContainer').style.display !== 'none') {
                    updateMapMarkers();
                }
            } else if (filter === 'hot-desk') {
                currentSpaces = e.target.classList.contains('active')
                    ? mockSpaces.filter(s => s.type === 'hot-desk')
                    : [...mockSpaces];
                loadSpaces();
                if (document.getElementById('mapContainer').style.display !== 'none') {
                    updateMapMarkers();
                }
            } else if (filter === 'meeting-room') {
                currentSpaces = e.target.classList.contains('active')
                    ? mockSpaces.filter(s => s.type === 'meeting-room')
                    : [...mockSpaces];
                loadSpaces();
                if (document.getElementById('mapContainer').style.display !== 'none') {
                    updateMapMarkers();
                }
            }
        }
    });
}

// ===== INIZIALIZZAZIONE =====
document.addEventListener('DOMContentLoaded', function() {
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
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

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

            if (document.getElementById('rememberMe').checked) {
                localStorage.setItem('coworkspace_user', JSON.stringify(currentUser));
            }

            const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            loginModal.hide();

            updateAuthUI();
            showNotification('Login effettuato con successo', 'success');

            if (currentUser.accountType === 'manager') {
                showSection('dashboard');
            }
        });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('registerName').value;
            const surname = document.getElementById('registerSurname').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const accountType = document.getElementById('registerAccountType').value;

            if (!name || !surname || !email || !password || !accountType) {
                showNotification('Compila tutti i campi obbligatori', 'warning');
                return;
            }

            if (password !== confirmPassword) {
                showNotification('Le password non coincidono', 'error');
                return;
            }

            if (!document.getElementById('acceptTerms').checked) {
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

            const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
            registerModal.hide();

            updateAuthUI();
            showNotification('Registrazione completata con successo', 'success');
        });
    }

    const quickSearchForm = document.getElementById('quickSearchForm');
    if (quickSearchForm) {
        quickSearchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            showSection('spaces');
        });
    }

    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();

            if (!isAuthenticated) {
                showNotification('Devi effettuare il login per prenotare', 'warning');
                const spaceModal = bootstrap.Modal.getInstance(document.getElementById('spaceDetailModal'));
                spaceModal.hide();
                setTimeout(() => showLogin(), 300);
                return;
            }

            const spaceId = parseInt(document.getElementById('spaceDetailModal').getAttribute('data-space-id'));
            const booking = {
                id: Date.now(),
                spaceId: spaceId,
                userId: currentUser.id,
                spaceName: document.getElementById('spaceDetailTitle').textContent,
                startDate: document.getElementById('bookingStartDate').value,
                endDate: document.getElementById('bookingEndDate').value,
                startTime: document.getElementById('bookingStartTime').value,
                endTime: document.getElementById('bookingEndTime').value,
                people: document.getElementById('bookingPeople').value,
                notes: document.getElementById('bookingNotes').value,
                totalPrice: parseFloat(document.getElementById('totalPrice').textContent.replace('€', '')),
                status: 'confirmed'
            };

            mockBookings.push(booking);

            const spaceModal = bootstrap.Modal.getInstance(document.getElementById('spaceDetailModal'));
            spaceModal.hide();

            showNotification('Prenotazione effettuata con successo!', 'success');

            setTimeout(() => showSection('bookings'), 1000);
        });
    }

    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();

            currentUser.name = document.getElementById('profileName').value;
            currentUser.surname = document.getElementById('profileSurname').value;
            currentUser.email = document.getElementById('profileEmail').value;
            currentUser.phone = document.getElementById('profilePhone').value;
            currentUser.company = document.getElementById('profileCompany').value;

            localStorage.setItem('coworkspace_user', JSON.stringify(currentUser));
            updateAuthUI();
            showNotification('Profilo aggiornato con successo', 'success');
        });
    }

    // Update prezzo quando cambiano le date
    const startDateInput = document.getElementById('bookingStartDate');
    const endDateInput = document.getElementById('bookingEndDate');

    if (startDateInput && endDateInput) {
        [startDateInput, endDateInput].forEach(input => {
            input.addEventListener('change', function() {
                const spaceId = parseInt(document.getElementById('spaceDetailModal').getAttribute('data-space-id'));
                const space = mockSpaces.find(s => s.id === spaceId);
                if (space) updateBookingPrice(space);
            });
        });
    }

    // Filters form
    const filtersForm = document.getElementById('filtersForm');
    if (filtersForm) {
        filtersForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const city = document.getElementById('quickCity').value;
            const spaceType = document.getElementById('quickSpaceType').value;
            const minPrice = parseInt(document.getElementById('minPrice').value) || 0;
            const maxPrice = parseInt(document.getElementById('maxPrice').value) || 999999;
            const onlyAvailable = document.getElementById('onlyAvailable').checked;

            currentSpaces = mockSpaces.filter(space => {
                if (city && space.city !== city) return false;
                if (spaceType && space.type !== spaceType) return false;
                if (space.price < minPrice || space.price > maxPrice) return false;
                if (onlyAvailable && !space.available) return false;
                return true;
            });

            loadSpaces();

            const filtersModal = bootstrap.Modal.getInstance(document.getElementById('filtersModal'));
            filtersModal.hide();

            showNotification('Filtri applicati con successo', 'success');
        });
    }

    // Imposta data minima
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        input.setAttribute('min', today);
    });

    // Setup search e quick filters
    setupSearch();
    setupQuickFilters();

    // Setup iniziale UI
    updateAuthUI();

    console.log('Setup completato');
});
