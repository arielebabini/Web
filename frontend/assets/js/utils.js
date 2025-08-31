/**
 * CoWorkSpace - Utility Functions Module
 */

// ===== FORMATTAZIONE =====

// Formatta prezzo in Euro
function formatPrice(price) {
    return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
    }).format(price);
}

// Formatta data in italiano
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return new Intl.DateTimeFormat('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(d);
}

// Formatta data e ora
function formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return new Intl.DateTimeFormat('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(d);
}

// ===== VALIDAZIONE =====

// Valida email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Valida password (minimo 8 caratteri, almeno una maiuscola, una minuscola e un numero)
function validatePassword(password) {
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return re.test(password);
}

// Valida numero di telefono italiano
function validatePhone(phone) {
    const re = /^(\+39)?\s?3\d{2}\s?\d{6,7}$/;
    return re.test(phone);
}

// Valida codice fiscale
function validateCodiceFiscale(cf) {
    const re = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i;
    return re.test(cf);
}

// ===== STORAGE =====

// Salva dati nel localStorage
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('Errore nel salvataggio:', e);
        return false;
    }
}

// Recupera dati dal localStorage
function getFromStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Errore nel recupero dati:', e);
        return null;
    }
}

// Rimuovi dati dal localStorage
function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (e) {
        console.error('Errore nella rimozione:', e);
        return false;
    }
}

// ===== URL E QUERY PARAMS =====

// Ottieni parametri URL
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    for (const [key, value] of params) {
        result[key] = value;
    }
    return result;
}

// Aggiorna URL senza ricaricare la pagina
function updateUrl(params) {
    const url = new URL(window.location);
    Object.keys(params).forEach(key => {
        if (params[key] === null || params[key] === undefined) {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, params[key]);
        }
    });
    window.history.pushState({}, '', url);
}

// ===== DEBOUNCE E THROTTLE =====

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ===== CALCOLI DATE =====

// Calcola differenza in giorni tra due date
function daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// Aggiungi giorni a una data
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

// Controlla se una data è nel passato
function isPastDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
}

// ===== UTILITY GENERICHE =====

// Genera ID univoco
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Copia testo negli appunti
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('Copiato negli appunti!', 'success');
        return true;
    } catch (err) {
        console.error('Errore nella copia:', err);
        showNotification('Errore nella copia', 'error');
        return false;
    }
}

// Capitalizza prima lettera
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Tronca testo
function truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}

// Randomizza array
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// ===== GESTIONE IMMAGINI =====

// Preload immagini
function preloadImages(urls) {
    const promises = urls.map(url => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
        });
    });
    return Promise.all(promises);
}

// Lazy load immagini
function setupLazyLoad() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// ===== GESTIONE SCROLL =====

// Smooth scroll to element
function scrollToElement(elementId, offset = 80) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
    });
}

// Check if element is in viewport
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// ===== GESTIONE FORM =====

// Serializza form data
function serializeForm(form) {
    const formData = new FormData(form);
    const data = {};
    for (const [key, value] of formData.entries()) {
        if (data[key]) {
            if (!Array.isArray(data[key])) {
                data[key] = [data[key]];
            }
            data[key].push(value);
        } else {
            data[key] = value;
        }
    }
    return data;
}

// Reset form
function resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
        // Rimuovi classi di validazione Bootstrap
        form.classList.remove('was-validated');
        form.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
        form.querySelectorAll('.is-valid').forEach(el => {
            el.classList.remove('is-valid');
        });
    }
}

// Valida form Bootstrap
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;

    form.classList.add('was-validated');
    return form.checkValidity();
}

// ===== GESTIONE COOKIES =====

// Set cookie
function setCookie(name, value, days = 7) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

// Get cookie
function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Delete cookie
function deleteCookie(name) {
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;";
}

// ===== DEVICE DETECTION =====

// Check if mobile device
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Check if touch device
function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Get browser info
function getBrowserInfo() {
    const userAgent = navigator.userAgent;
    let browserName = "Unknown";
    let browserVersion = "Unknown";

    if (userAgent.indexOf("Firefox") > -1) {
        browserName = "Firefox";
        browserVersion = userAgent.match(/Firefox\/(\d+)/)[1];
    } else if (userAgent.indexOf("Chrome") > -1) {
        browserName = "Chrome";
        browserVersion = userAgent.match(/Chrome\/(\d+)/)[1];
    } else if (userAgent.indexOf("Safari") > -1) {
        browserName = "Safari";
        browserVersion = userAgent.match(/Version\/(\d+)/)[1];
    } else if (userAgent.indexOf("Edge") > -1) {
        browserName = "Edge";
        browserVersion = userAgent.match(/Edge\/(\d+)/)[1];
    }

    return {
        name: browserName,
        version: browserVersion,
        userAgent: userAgent
    };
}

// ===== EXPORT =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Formattazione
        formatPrice,
        formatDate,
        formatDateTime,
        // Validazione
        validateEmail,
        validatePassword,
        validatePhone,
        validateCodiceFiscale,
        // Storage
        saveToStorage,
        getFromStorage,
        removeFromStorage,
        // URL
        getUrlParams,
        updateUrl,
        // Timing
        debounce,
        throttle,
        // Date
        daysBetween,
        addDays,
        isPastDate,
        // Utility
        generateId,
        copyToClipboard,
        capitalize,
        truncateText,
        shuffleArray,
        // Immagini
        preloadImages,
        setupLazyLoad,
        // Scroll
        scrollToElement,
        isInViewport,
        // Form
        serializeForm,
        resetForm,
        validateForm,
        // Cookies
        setCookie,
        getCookie,
        deleteCookie,
        // Device
        isMobile,
        isTouchDevice,
        getBrowserInfo
    };
}