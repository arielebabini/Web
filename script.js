/**
 * CoWorkSpace - Script completo con implementazione mappa Leaflet
 */

// ===== VARIABILI GLOBALI =====
let currentUser = null;
let isAuthenticated = false;
let currentSpaces = [];
let activeSection = 'home';

// ===== VARIABILI MAPPA =====
let map = null;
let markersLayer = null;
let currentBasemap = 'osm';

// ===== COORDINATE CITTÀ ITALIANE =====
const cityCoordinates = {
    'Milano': [45.4642, 9.1900],
    'Roma': [41.9028, 12.4964],
    'Torino': [45.0703, 7.6869],
    'Bologna': [44.4949, 11.3426],
    'Firenze': [43.7696, 11.2558],
    'Napoli': [40.8518, 14.2681],
    'Venezia': [45.4408, 12.3155],
    'Genova': [44.4056, 8.9463]
};

// ===== DATI MOCK MIGLIORATI =====
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
        coordinates: [45.4642, 9.1900]
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
        featured: false,
        coordinates: [41.8902, 12.4696]
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
        featured: true,
        coordinates: [45.0703, 7.6869]
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
        featured: false,
        coordinates: [44.4949, 11.3426]
    },
    {
        id: 5,
        name: "Firenze Art Coworking",
        type: "hot-desk",
        city: "Firenze",
        address: "Piazza Santa Croce 16, Firenze",
        price: 45,
        capacity: 20,
        rating: 4.7,
        reviews: 98,
        description: "Coworking creativo nel centro storico di Firenze, perfetto per artisti e designer.",
        amenities: ["wifi", "coffee", "printer", "projector"],
        image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600",
        available: true,
        featured: true,
        coordinates: [43.7696, 11.2558]
    },
    {
        id: 6,
        name: "Napoli Bay Office",
        type: "private-office",
        city: "Napoli",
        address: "Via Chiaia 149, Napoli",
        price: 65,
        capacity: 8,
        rating: 4.4,
        reviews: 76,
        description: "Ufficio privato con vista sul Golfo di Napoli, ambiente professionale e accogliente.",
        amenities: ["wifi", "parking", "coffee"],
        image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600",
        available: true,
        featured: false,
        coordinates: [40.8518, 14.2681]
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

function getAmenityIcon(amenity) {
    const icons = {
        'wifi': 'fas fa-wifi',
        'parking': 'fas fa-car',
        'coffee': 'fas fa-coffee',
        'printer': 'fas fa-print',
        'projector': 'fas fa-video',
        'kitchen': 'fas fa-utensils'
    };
    return icons[amenity] || 'fas fa-check';
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

    // Aggiorna navbar attiva
    $('.navbar-nav .nav-link').removeClass('active');
    $(`.navbar-nav .nav-link[onclick*="${sectionName}"]`).addClass('active');
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
        `<span class="amenity badge me-1"><i class="${getAmenityIcon(amenity)} me-1"></i>${getAmenityLabel(amenity)}</span>`
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
        <button class="btn btn-outline-primary btn-sm" onclick="showOnMap(${space.id})">
            <i class="fas fa-map"></i> Mostra sulla Mappa
        </button>
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

function showOnMap(spaceId) {
    $('#spaceDetailModal').modal('hide');

    setTimeout(() => {
        showSection('spaces');
        setTimeout(() => {
            showMapView();
            setTimeout(() => {
                if (map && markersLayer) {
                    const space = mockSpaces.find(s => s.id === spaceId);
                    if (space && space.coordinates) {
                        map.setView(space.coordinates, 15);

                        // Trova e apri il popup del marker corrispondente
                        markersLayer.eachLayer((marker) => {
                            if (marker.options.spaceId === spaceId) {
                                marker.openPopup();
                            }
                        });

                        showNotification(`Spazio "${space.name}" localizzato sulla mappa`, 'success');
                    }
                }
            }, 500);
        }, 300);
    }, 300);
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

// ===== IMPLEMENTAZIONE MAPPA LEAFLET =====
function initializeMap() {
    console.log('Inizializzando mappa Leaflet...');

    // Sostituisci il contenuto HTML esistente con una mappa reale
    $('#mapContainer').html(`
        <div class="map-view">
            <div class="map-header">
                <h4><i class="fas fa-map text-primary"></i> Mappa degli Spazi</h4>
                <div class="map-controls">
                    <button class="btn btn-sm btn-outline-primary" onclick="zoomToItaly()">
                        <i class="fas fa-globe-europe"></i> Italia
                    </button>
                    <button class="btn btn-sm btn-outline-primary" onclick="toggleSatellite()">
                        <i class="fas fa-satellite"></i> Satellite
                    </button>
                    <button class="btn btn-sm btn-outline-primary" onclick="locateUser()">
                        <i class="fas fa-crosshairs"></i> Posizione
                    </button>
                </div>
            </div>
            <div id="leafletMap" style="height: 500px; width: 100%;"></div>
            <div class="map-footer">
                <div class="d-flex justify-content-between align-items-center">
                    <span><i class="fas fa-map-marker-alt text-primary"></i> ${currentSpaces.length} spazi sulla mappa</span>
                    <div class="map-legend">
                        <span class="legend-item">
                            <span class="legend-dot available"></span> Disponibile
                        </span>
                        <span class="legend-item">
                            <span class="legend-dot featured"></span> In Evidenza
                        </span>
                        <span class="legend-item">
                            <span class="legend-dot busy"></span> Occupato
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `);

    // Inizializza la mappa Leaflet
    if (map) {
        map.remove();
    }

    // Centra la mappa sull'Italia
    map = L.map('leafletMap').setView([41.8719, 12.5674], 6);

    // Aggiungi layer delle tile
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    // Layer di default
    osmLayer.addTo(map);
    currentBasemap = 'osm';

    // Controllo per switchare tra layer
    const baseMaps = {
        "Mappa Stradale": osmLayer,
        "Vista Satellite": satelliteLayer
    };

    const layerControl = L.control.layers(baseMaps).addTo(map);

    // Inizializza il layer per i marker
    markersLayer = L.layerGroup().addTo(map);

    // Aggiungi i marker degli spazi
    updateMapMarkers();

    // Aggiungi controlli personalizzati
    addCustomMapControls();

    console.log('Mappa inizializzata con successo');
}

function updateMapMarkers() {
    if (!markersLayer) return;

    console.log('Aggiornando marker sulla mappa...');

    // Pulisci i marker esistenti
    markersLayer.clearLayers();

    currentSpaces.forEach(space => {
        const coords = space.coordinates || cityCoordinates[space.city];
        if (!coords) return;

        // Determina l'icona in base allo stato
        let iconClass = 'fa-map-marker-alt';
        let iconColor = '#667eea';

        if (!space.available) {
            iconColor = '#ef4444';
        } else if (space.featured) {
            iconColor = '#f093fb';
            iconClass = 'fa-star';
        }

        // Crea icona personalizzata
        const customIcon = L.divIcon({
            html: `
                <div class="custom-marker ${space.available ? 'available' : 'busy'} ${space.featured ? 'featured' : ''}">
                    <i class="fas ${iconClass}"></i>
                    <div class="marker-label">${formatPrice(space.price)}</div>
                </div>
            `,
            className: 'custom-div-icon',
            iconSize: [40, 50],
            iconAnchor: [20, 50],
            popupAnchor: [0, -50]
        });

        // Crea il marker
        const marker = L.marker(coords, {
            icon: customIcon,
            spaceId: space.id
        });

        // Crea il popup
        const popupContent = `
            <div class="map-popup">
                <div class="popup-header">
                    <h6>${space.name}</h6>
                    <span class="badge ${space.available ? 'bg-success' : 'bg-danger'}">
                        ${space.available ? 'Disponibile' : 'Non Disponibile'}
                    </span>
                </div>
                <div class="popup-body">
                    <div class="popup-image" style="background-image: url('${space.image}')"></div>
                    <p class="popup-address">
                        <i class="fas fa-map-marker-alt text-primary"></i> ${space.address}
                    </p>
                    <p class="popup-description">${space.description}</p>
                    <div class="popup-details">
                        <div class="detail-item">
                            <i class="fas fa-users text-muted"></i>
                            <span>${space.capacity} persone</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-star text-warning"></i>
                            <span>${space.rating} (${space.reviews})</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-euro-sign text-success"></i>
                            <span><strong>${formatPrice(space.price)}/giorno</strong></span>
                        </div>
                    </div>
                    <div class="popup-amenities">
                        ${space.amenities.slice(0, 4).map(amenity =>
            `<span class="amenity-tag"><i class="${getAmenityIcon(amenity)} me-1"></i>${getAmenityLabel(amenity)}</span>`
        ).join('')}
                    </div>
                </div>
                <div class="popup-footer">
                    <button class="btn btn-primary btn-sm w-100" onclick="showSpaceDetail(${space.id})" 
                            ${!space.available ? 'disabled' : ''}>
                        ${space.available ? '<i class="fas fa-calendar-plus"></i> Dettagli e Prenota' : '<i class="fas fa-times"></i> Non Disponibile'}
                    </button>
                </div>
            </div>
        `;

        marker.bindPopup(popupContent, {
            maxWidth: 320,
            className: 'custom-popup'
        });

        // Aggiungi tooltip
        marker.bindTooltip(`${space.name} - ${formatPrice(space.price)}/giorno`, {
            direction: 'top',
            offset: [0, -50]
        });

        // Aggiungi eventi
        marker.on('mouseover', function() {
            this.openTooltip();
        });

        marker.on('click', function() {
            // Centra la mappa sul marker
            map.setView(coords, 15);
        });

        // Aggiungi il marker al layer
        markersLayer.addLayer(marker);
    });

    // Se ci sono spazi, adatta la vista per mostrarli tutti
    if (currentSpaces.length > 0 && markersLayer.getLayers().length > 0) {
        const group = new L.featureGroup(markersLayer.getLayers());
        try {
            if (group.getBounds().isValid()) {
                map.fitBounds(group.getBounds().pad(0.1));
            }
        } catch (e) {
            console.log('Errore nel calcolo bounds:', e);
        }
    }

    console.log(`${markersLayer.getLayers().length} marker aggiunti alla mappa`);
}

function addCustomMapControls() {
    // Controllo per filtrare i marker
    const filterControl = L.control({ position: 'topright' });

    filterControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        div.innerHTML = `
            <div class="map-filter-control">
                <button class="map-filter-btn active" data-filter="all">
                    <i class="fas fa-th"></i> Tutti
                </button>
                <button class="map-filter-btn" data-filter="available">
                    <i class="fas fa-check-circle"></i> Disponibili
                </button>
                <button class="map-filter-btn" data-filter="featured">
                    <i class="fas fa-star"></i> In Evidenza
                </button>
            </div>
        `;

        // Previeni la propagazione degli eventi
        L.DomEvent.disableClickPropagation(div);

        return div;
    };

    filterControl.addTo(map);

    // Aggiungi event listener per i filtri (delegato)
    $(document).off('click.mapFilter').on('click.mapFilter', '.map-filter-btn', function() {
        $('.map-filter-btn').removeClass('active');
        $(this).addClass('active');

        const filter = $(this).data('filter');
        filterMapSpaces(filter);
    });
}

function filterMapSpaces(filter) {
    let filteredSpaces = [...mockSpaces];

    switch(filter) {
        case 'available':
            filteredSpaces = mockSpaces.filter(space => space.available);
            break;
        case 'featured':
            filteredSpaces = mockSpaces.filter(space => space.featured);
            break;
        case 'all':
        default:
            filteredSpaces = [...mockSpaces];
            break;
    }

    // Aggiorna temporaneamente currentSpaces per la mappa
    const originalSpaces = [...currentSpaces];
    currentSpaces = filteredSpaces;
    updateMapMarkers();

    // Ripristina currentSpaces originale (per non interferire con la griglia)
    currentSpaces = originalSpaces;

    showNotification(`Filtro applicato: ${filteredSpaces.length} spazi mostrati`, 'info');
}

// ===== FUNZIONI CONTROLLI MAPPA =====
function zoomToItaly() {
    if (map) {
        map.setView([41.8719, 12.5674], 6);
        showNotification('Vista centrata sull\'Italia', 'info');
    }
}

function toggleSatellite() {
    showNotification('Usa il controllo layer in alto a destra per cambiare vista', 'info');
}

function locateUser() {
    if (!map) return;

    if (navigator.geolocation) {
        showNotification('Ricerca della tua posizione in corso...', 'info');

        map.locate({
            setView: true,
            maxZoom: 13,
            enableHighAccuracy: true,
            timeout: 10000
        });

        map.on('locationfound', function(e) {
            // Rimuovi marker precedenti della posizione utente
            map.eachLayer(function(layer) {
                if (layer.options && layer.options.isUserLocation) {
                    map.removeLayer(layer);
                }
            });

            // Aggiungi nuovo marker per la posizione utente
            const userMarker = L.marker(e.latlng, {
                isUserLocation: true
            }).addTo(map);

            userMarker.bindPopup('<div class="text-center"><i class="fas fa-user-circle text-primary fa-2x mb-2"></i><br><strong>La tua posizione</strong></div>').openPopup();

            // Aggiungi cerchio di accuratezza
            L.circle(e.latlng, {
                radius: e.accuracy,
                color: '#667eea',
                fillColor: '#667eea',
                fillOpacity: 0.1,
                weight: 2
            }).addTo(map);

            showNotification('Posizione trovata!', 'success');
        });

        map.on('locationerror', function(e) {
            console.error('Errore geolocalizzazione:', e);
            showNotification('Impossibile trovare la tua posizione: ' + e.message, 'warning');
        });
    } else {
        showNotification('Geolocalizzazione non supportata dal browser', 'warning');
    }
}

// ===== AGGIORNA LE FUNZIONI ESISTENTI =====

// Modifica la funzione showMapView esistente
function showMapView() {
    $('#spacesContainer').hide();
    $('#mapContainer').show();
    $('.view-toggle .btn').removeClass('active');
    $('#mapViewBtn').addClass('active');

    // Inizializza la mappa se non esiste
    if (!map || $('#leafletMap').length === 0) {
        setTimeout(() => {
            initializeMap();
        }, 100);
    } else {
        // Aggiorna solo i marker se la mappa esiste già
        setTimeout(() => {
            updateMapMarkers();
            map.invalidateSize(); // Necessario quando si mostra/nasconde il container
        }, 100);
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

// Modifica le funzioni di zoom esistenti per funzionare con Leaflet
function zoomIn() {
    if (map) {
        map.zoomIn();
        showNotification('Zoom avvicinato', 'info');
    } else {
        showNotification('Mappa non ancora caricata', 'warning');
    }
}

function zoomOut() {
    if (map) {
        map.zoomOut();
        showNotification('Zoom allontanato', 'info');
    } else {
        showNotification('Mappa non ancora caricata', 'warning');
    }
}

function centerMap() {
    zoomToItaly();
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
    $('#profileBirthDate').val(currentUser.birthDate || '');
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
            <div class="card booking-card">
                <div class="card-header d-flex justify-content-between">
                    <h6 class="mb-0">${booking.spaceName}</h6>
                    <span class="badge booking-status ${booking.status}">${booking.status === 'confirmed' ? 'Confermata' : 'Pending'}</span>
                </div>
                <div class="card-body">
                    <p><i class="fas fa-calendar me-2"></i><strong>Data:</strong> ${booking.startDate}</p>
                    <p><i class="fas fa-clock me-2"></i><strong>Orario:</strong> ${booking.startTime} - ${booking.endTime}</p>
                    <p><i class="fas fa-users me-2"></i><strong>Persone:</strong> ${booking.people}</p>
                    <p><i class="fas fa-euro-sign me-2"></i><strong>Prezzo:</strong> ${formatPrice(booking.totalPrice)}</p>
                    ${booking.notes ? `<p><i class="fas fa-sticky-note me-2"></i><strong>Note:</strong> ${booking.notes}</p>` : ''}
                    <div class="mt-3">
                        <button class="btn btn-outline-primary btn-sm me-2" onclick="modifyBooking(${booking.id})">
                            <i class="fas fa-edit"></i> Modifica
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="cancelBooking(${booking.id})">
                            <i class="fas fa-times"></i> Cancella
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    container.html('<div class="row">' + bookingsHtml + '</div>');
}

function showBookings() {
    showSection('bookings');
}

function modifyBooking(bookingId) {
    showNotification('Funzionalità di modifica prenotazione in sviluppo', 'info');
}

function cancelBooking(bookingId) {
    if (confirm('Sei sicuro di voler cancellare questa prenotazione?')) {
        const bookingIndex = mockBookings.findIndex(b => b.id === bookingId);
        if (bookingIndex !== -1) {
            mockBookings.splice(bookingIndex, 1);
            loadBookings();
            showNotification('Prenotazione cancellata con successo', 'success');
        }
    }
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
                            <div class="stats-icon bg-primary-gradient text-white rounded-circle mx-auto mb-3" style="width: 60px; height: 60px; line-height: 60px;">
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
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <h5><i class="fas fa-chart-line me-2"></i>Andamento Prenotazioni</h5>
                            </div>
                            <div class="card-body">
                                <div class="alert alert-info">
                                    <i class="fas fa-info-circle"></i>
                                    Grafici e statistiche dettagliate saranno disponibili nella versione completa.
                                </div>
                            </div>
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

    // Aggiorna anche la mappa se visibile
    if ($('#mapContainer').is(':visible') && map) {
        updateMapMarkers();
    }

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
            phone: $('#registerPhone').val(),
            company: $('#registerCompany').val(),
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
        const city = $('#quickCity').val();
        const spaceType = $('#quickSpaceType').val();

        // Applica filtri dalla ricerca rapida
        if (city || spaceType) {
            currentSpaces = mockSpaces.filter(space => {
                if (city && space.city !== city) return false;
                if (spaceType && space.type !== spaceType) return false;
                return true;
            });
        }

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
        currentUser.birthDate = $('#profileBirthDate').val();

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

        let filteredSpaces = [...mockSpaces];

        // Applica tutti i filtri attivi
        $('.quick-filter-btn.active').each(function() {
            const activeFilter = $(this).data('filter');
            switch(activeFilter) {
                case 'available':
                    filteredSpaces = filteredSpaces.filter(s => s.available);
                    break;
                case 'featured':
                    filteredSpaces = filteredSpaces.filter(s => s.featured);
                    break;
                case 'hot-desk':
                    filteredSpaces = filteredSpaces.filter(s => s.type === 'hot-desk');
                    break;
                case 'meeting-room':
                    filteredSpaces = filteredSpaces.filter(s => s.type === 'meeting-room');
                    break;
            }
        });

        currentSpaces = filteredSpaces;
        loadSpaces();

        // Aggiorna la mappa se visibile
        if ($('#mapContainer').is(':visible') && map) {
            setTimeout(() => {
                updateMapMarkers();
            }, 100);
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
                    space.description.toLowerCase().includes(searchTerm) ||
                    space.amenities.some(amenity =>
                        getAmenityLabel(amenity).toLowerCase().includes(searchTerm)
                    )
                );
            } else {
                currentSpaces = [...mockSpaces];
            }
            loadSpaces();

            // Aggiorna la mappa se visibile
            if ($('#mapContainer').is(':visible') && map) {
                setTimeout(() => {
                    updateMapMarkers();
                }, 100);
            }
        }, 300);
    });

    // Filters form
    $('#filtersForm').on('submit', function(e) {
        e.preventDefault();

        const city = $('#quickCity').val();
        const spaceType = $('#quickSpaceType').val();
        const minPrice = parseInt($('#minPrice').val()) || 0;
        const maxPrice = parseInt($('#maxPrice').val()) || 999999;
        const capacity = $('#filterCapacity').val();
        const onlyAvailable = $('#onlyAvailable').is(':checked');
        const minRating = parseFloat($('#minRating').val()) || 0;

        // Ottieni servizi selezionati
        const selectedAmenities = [];
        $('#filtersForm input[type="checkbox"]:checked').each(function() {
            const value = $(this).val();
            if (value && value !== 'on') {
                selectedAmenities.push(value);
            }
        });

        currentSpaces = mockSpaces.filter(space => {
            if (city && space.city !== city) return false;
            if (spaceType && space.type !== spaceType) return false;
            if (space.price < minPrice || space.price > maxPrice) return false;
            if (onlyAvailable && !space.available) return false;
            if (space.rating < minRating) return false;

            // Filtra per capacità
            if (capacity) {
                const [min, max] = capacity.includes('-') ? capacity.split('-').map(Number) : [parseInt(capacity.replace('+', '')), Infinity];
                if (space.capacity < min || (max !== Infinity && space.capacity > max)) return false;
            }

            // Filtra per servizi
            if (selectedAmenities.length > 0) {
                if (!selectedAmenities.every(amenity => space.amenities.includes(amenity))) return false;
            }

            return true;
        });

        loadSpaces();
        $('#filtersModal').modal('hide');
        showNotification(`Filtri applicati: ${currentSpaces.length} spazi trovati`, 'success');

        // Aggiorna la mappa se visibile
        if ($('#mapContainer').is(':visible') && map) {
            setTimeout(() => {
                updateMapMarkers();
            }, 100);
        }
    });

    // Imposta data minima
    const today = new Date().toISOString().split('T')[0];
    $('input[type="date"]').attr('min', today);

    // Event listeners per filtri booking
    $(document).on('click', '.booking-filters .btn-group .btn', function() {
        $('.booking-filters .btn-group .btn').removeClass('active');
        $(this).addClass('active');

        const filter = $(this).data('filter');
        // Implementa filtro prenotazioni se necessario
        showNotification(`Filtro prenotazioni: ${filter}`, 'info');
    });

    // Load more spaces
    $('#loadMoreSpaces').on('click', function() {
        showNotification('Funzionalità "Carica Altri Spazi" in sviluppo', 'info');
    });

    console.log('Setup completato con mappa Leaflet');
});

// ===== FUNZIONI GLOBALI PER COMPATIBILITÀ =====
window.showSection = showSection;
window.showLogin = showLogin;
window.showRegister = showRegister;
window.switchToRegister = switchToRegister;
window.switchToLogin = switchToLogin;
window.logout = logout;
window.showProfile = showProfile;
window.showBookings = showBookings;
window.showDashboard = showDashboard;
window.showDashboardTab = showDashboardTab;
window.cancelProfileEdit = cancelProfileEdit;
window.showSpaceDetail = showSpaceDetail;
window.showOnMap = showOnMap;
window.showMapView = showMapView;
window.showGridView = showGridView;
window.showFilters = showFilters;
window.clearFilters = clearFilters;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.centerMap = centerMap;
window.zoomToItaly = zoomToItaly;
window.toggleSatellite = toggleSatellite;
window.locateUser = locateUser;