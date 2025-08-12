/**
 * CoWorkSpace - Utilities
 * Funzioni di utilità comuni
 */

window.Utils = {
    /**
     * Debug Utilities
     */
    debug: {
        /**
         * Log message if debug enabled
         * @param {...*} args - Argomenti
         */
        log(...args) {
            if (window.CoWorkSpaceConfig?.app?.debug) {
                console.log('[DEBUG]', ...args);
            }
        },

        /**
         * Log warning if debug enabled
         * @param {...*} args - Argomenti
         */
        warn(...args) {
            if (window.CoWorkSpaceConfig?.app?.debug) {
                console.warn('[DEBUG]', ...args);
            }
        },

        /**
         * Log error if debug enabled
         * @param {...*} args - Argomenti
         */
        error(...args) {
            if (window.CoWorkSpaceConfig?.app?.debug) {
                console.error('[DEBUG]', ...args);
            }
        }
    },

    /**
     * Error Handling
     */
    error: {
        /**
         * Handle error
         * @param {Error} error - Errore
         * @param {string} context - Contesto
         */
        handle(error, context = 'Unknown') {
            console.error(`Error in ${context}:`, error);

            if (window.CoWorkSpaceConfig?.app?.debug) {
                console.trace();
            }

            // Mostra notifica di errore se disponibile
            if (window.Utils?.notifications?.show) {
                Utils.notifications.show('Si è verificato un errore', 'error');
            }
        }
    },

    /**
     * Generate UUID
     * @returns {string}
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * Sleep function
     * @param {number} ms - Millisecondi
     * @returns {Promise}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * DOM Utilities
     */
    dom: {
        /**
         * Seleziona un elemento dal DOM
         * @param {string} selector - Selettore CSS
         * @param {Element} context - Contesto di ricerca (default: document)
         * @returns {Element|null}
         */
        $(selector, context = document) {
            return context.querySelector(selector);
        },

        /**
         * Seleziona tutti gli elementi dal DOM
         * @param {string} selector - Selettore CSS
         * @param {Element} context - Contesto di ricerca (default: document)
         * @returns {NodeList}
         */
        $$(selector, context = document) {
            return context.querySelectorAll(selector);
        },

        /**
         * Crea un elemento HTML
         * @param {string} tag - Tag HTML
         * @param {Object} attributes - Attributi dell'elemento
         * @param {string|Element|Array} children - Contenuto dell'elemento
         * @returns {Element}
         */
        createElement(tag, attributes = {}, children = null) {
            const element = document.createElement(tag);

            // Imposta attributi
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'className') {
                    element.className = value;
                } else if (key === 'dataset') {
                    Object.entries(value).forEach(([dataKey, dataValue]) => {
                        element.dataset[dataKey] = dataValue;
                    });
                } else if (key.startsWith('on') && typeof value === 'function') {
                    element.addEventListener(key.substring(2).toLowerCase(), value);
                } else {
                    element.setAttribute(key, value);
                }
            });

            // Aggiungi contenuto
            if (children !== null) {
                if (typeof children === 'string') {
                    element.textContent = children;
                } else if (children instanceof Element) {
                    element.appendChild(children);
                } else if (Array.isArray(children)) {
                    children.forEach(child => {
                        if (typeof child === 'string') {
                            element.appendChild(document.createTextNode(child));
                        } else if (child instanceof Element) {
                            element.appendChild(child);
                        }
                    });
                }
            }

            return element;
        },

        /**
         * Mostra un elemento
         * @param {Element|string} element - Elemento o selettore
         * @param {string} display - Tipo di display (default: block)
         */
        show(element, display = 'block') {
            const el = typeof element === 'string' ? this.$(element) : element;
            if (el) {
                el.style.display = display;
            }
        },

        /**
         * Nascondi un elemento
         * @param {Element|string} element - Elemento o selettore
         */
        hide(element) {
            const el = typeof element === 'string' ? this.$(element) : element;
            if (el) {
                el.style.display = 'none';
            }
        },

        /**
         * Toggle visibilità elemento
         * @param {Element|string} element - Elemento o selettore
         * @param {string} display - Tipo di display quando visibile
         */
        toggle(element, display = 'block') {
            const el = typeof element === 'string' ? this.$(element) : element;
            if (el) {
                if (el.style.display === 'none' || getComputedStyle(el).display === 'none') {
                    el.style.display = display;
                } else {
                    el.style.display = 'none';
                }
            }
        },

        /**
         * Aggiunge una classe
         * @param {Element|string} element - Elemento o selettore
         * @param {string} className - Nome classe
         */
        addClass(element, className) {
            const el = typeof element === 'string' ? this.$(element) : element;
            if (el) {
                el.classList.add(className);
            }
        },

        /**
         * Rimuove una classe
         * @param {Element|string} element - Elemento o selettore
         * @param {string} className - Nome classe
         */
        removeClass(element, className) {
            const el = typeof element === 'string' ? this.$(element) : element;
            if (el) {
                el.classList.remove(className);
            }
        },

        /**
         * Toggle una classe
         * @param {Element|string} element - Elemento o selettore
         * @param {string} className - Nome classe
         */
        toggleClass(element, className) {
            const el = typeof element === 'string' ? this.$(element) : element;
            if (el) {
                el.classList.toggle(className);
            }
        },

        /**
         * Controlla se elemento ha una classe
         * @param {Element|string} element - Elemento o selettore
         * @param {string} className - Nome classe
         * @returns {boolean}
         */
        hasClass(element, className) {
            const el = typeof element === 'string' ? this.$(element) : element;
            return el ? el.classList.contains(className) : false;
        },

        /**
         * Trova il parent più vicino con una certa classe
         * @param {Element} element - Elemento
         * @param {string} className - Nome classe
         * @returns {Element|null}
         */
        closest(element, className) {
            return element.closest(`.${className}`);
        },

        /**
         * Inserisce HTML in un elemento
         * @param {Element|string} element - Elemento o selettore
         * @param {string} html - HTML da inserire
         * @param {string} position - Posizione (beforebegin, afterbegin, beforeend, afterend)
         */
        insertHTML(element, html, position = 'beforeend') {
            const el = typeof element === 'string' ? this.$(element) : element;
            if (el) {
                el.insertAdjacentHTML(position, html);
            }
        }
    },

    /**
     * Event Utilities
     */
    events: {
        /**
         * Aggiunge event listener
         * @param {Element|string} element - Elemento o selettore
         * @param {string} event - Nome evento
         * @param {Function} handler - Function handler
         * @param {Object} options - Opzioni per addEventListener
         */
        on(element, event, handler, options = {}) {
            const el = typeof element === 'string' ? Utils.dom.$(element) : element;
            if (el) {
                el.addEventListener(event, handler, options);
            }
        },

        /**
         * Rimuove event listener
         * @param {Element|string} element - Elemento o selettore
         * @param {string} event - Nome evento
         * @param {Function} handler - Function handler
         */
        off(element, event, handler) {
            const el = typeof element === 'string' ? Utils.dom.$(element) : element;
            if (el) {
                el.removeEventListener(event, handler);
            }
        },

        /**
         * Event delegation
         * @param {Element|string} parent - Elemento parent o selettore
         * @param {string} selector - Selettore per elementi target
         * @param {string} event - Nome evento
         * @param {Function} handler - Function handler
         */
        delegate(parent, selector, event, handler) {
            const parentEl = typeof parent === 'string' ? Utils.dom.$(parent) : parent;
            if (parentEl) {
                parentEl.addEventListener(event, function(e) {
                    if (e.target.matches(selector)) {
                        handler.call(e.target, e);
                    }
                });
            }
        },

        /**
         * Trigger custom event
         * @param {Element|string} element - Elemento o selettore
         * @param {string} eventName - Nome evento
         * @param {Object} detail - Dati evento
         */
        trigger(element, eventName, detail = {}) {
            const el = typeof element === 'string' ? Utils.dom.$(element) : element;
            if (el) {
                const event = new CustomEvent(eventName, { detail });
                el.dispatchEvent(event);
            }
        }
    },

    /**
     * Form Utilities
     */
    form: {
        /**
         * Serializza form in oggetto
         * @param {HTMLFormElement} form - Form element
         * @returns {Object}
         */
        serialize(form) {
            const formData = new FormData(form);
            const data = {};

            for (const [key, value] of formData.entries()) {
                if (data[key]) {
                    if (Array.isArray(data[key])) {
                        data[key].push(value);
                    } else {
                        data[key] = [data[key], value];
                    }
                } else {
                    data[key] = value;
                }
            }

            return data;
        },

        /**
         * Valida form
         * @param {HTMLFormElement} form - Form element
         * @returns {Object}
         */
        validate(form) {
            const errors = [];
            const inputs = form.querySelectorAll('input, textarea, select');

            inputs.forEach(input => {
                if (input.hasAttribute('required') && !input.value.trim()) {
                    errors.push({
                        field: input.name,
                        message: 'Campo obbligatorio'
                    });
                }

                if (input.type === 'email' && input.value && !this.isValidEmail(input.value)) {
                    errors.push({
                        field: input.name,
                        message: 'Email non valida'
                    });
                }
            });

            return {
                isValid: errors.length === 0,
                errors: errors
            };
        },

        /**
         * Reset form
         * @param {HTMLFormElement} form - Form element
         */
        reset(form) {
            form.reset();
            const errorElements = form.querySelectorAll('.error-message');
            errorElements.forEach(el => el.remove());
        }
    },

    /**
     * Validation Utilities
     */
    validation: {
        /**
         * Valida email
         * @param {string} email - Email
         * @returns {boolean}
         */
        isEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },

        /**
         * Valida URL
         * @param {string} url - URL
         * @returns {boolean}
         */
        isUrl(url) {
            try {
                new URL(url);
                return true;
            } catch {
                return false;
            }
        },

        /**
         * Valida telefono
         * @param {string} phone - Numero telefono
         * @returns {boolean}
         */
        isPhone(phone) {
            const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
            return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
        },

        /**
         * Valida password
         * @param {string} password - Password
         * @returns {Object}
         */
        validatePassword(password) {
            const result = {
                isValid: true,
                errors: []
            };

            if (password.length < 8) {
                result.errors.push('Password deve essere di almeno 8 caratteri');
                result.isValid = false;
            }

            if (!/[A-Z]/.test(password)) {
                result.errors.push('Password deve contenere almeno una lettera maiuscola');
                result.isValid = false;
            }

            if (!/[0-9]/.test(password)) {
                result.errors.push('Password deve contenere almeno un numero');
                result.isValid = false;
            }

            return result;
        }
    },

    /**
     * String Utilities
     */
    string: {
        /**
         * Capitalizza prima lettera
         * @param {string} str - Stringa
         * @returns {string}
         */
        capitalize(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        },

        /**
         * Tronca stringa
         * @param {string} str - Stringa
         * @param {number} length - Lunghezza massima
         * @param {string} suffix - Suffisso (default: ...)
         * @returns {string}
         */
        truncate(str, length, suffix = '...') {
            if (str.length <= length) return str;
            return str.substring(0, length) + suffix;
        },

        /**
         * Slug da stringa
         * @param {string} str - Stringa
         * @returns {string}
         */
        slugify(str) {
            return str
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9 -]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim('-');
        },

        /**
         * Escape HTML
         * @param {string} str - Stringa
         * @returns {string}
         */
        escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
    },

    /**
     * Number Utilities
     */
    number: {
        /**
         * Formatta numero
         * @param {number} num - Numero
         * @param {Object} options - Opzioni Intl.NumberFormat
         * @returns {string}
         */
        format(num, options = {}) {
            return new Intl.NumberFormat('it-IT', options).format(num);
        },

        /**
         * Formatta come valuta
         * @param {number} num - Numero
         * @param {string} currency - Valuta (default: EUR)
         * @returns {string}
         */
        formatCurrency(num, currency = 'EUR') {
            return this.format(num, {
                style: 'currency',
                currency: currency
            });
        },

        /**
         * Formatta come percentuale
         * @param {number} num - Numero (0-1)
         * @returns {string}
         */
        formatPercentage(num) {
            return this.format(num, {
                style: 'percent',
                minimumFractionDigits: 1,
                maximumFractionDigits: 1
            });
        },

        /**
         * Clamp numero tra min e max
         * @param {number} num - Numero
         * @param {number} min - Valore minimo
         * @param {number} max - Valore massimo
         * @returns {number}
         */
        clamp(num, min, max) {
            return Math.min(Math.max(num, min), max);
        }
    },

    /**
     * Date Utilities
     */
    date: {
        /**
         * Formatta data
         * @param {Date|string} date - Data
         * @param {Object} options - Opzioni Intl.DateTimeFormat
         * @returns {string}
         */
        format(date, options = {}) {
            const d = date instanceof Date ? date : new Date(date);
            return new Intl.DateTimeFormat('it-IT', options).format(d);
        },

        /**
         * Formatta data relativa (es: 2 ore fa)
         * @param {Date|string} date - Data
         * @returns {string}
         */
        formatRelative(date) {
            const d = date instanceof Date ? date : new Date(date);
            const now = new Date();
            const diff = now - d;

            const minute = 60 * 1000;
            const hour = minute * 60;
            const day = hour * 24;
            const week = day * 7;
            const month = day * 30;
            const year = day * 365;

            if (diff < minute) return 'Ora';
            if (diff < hour) return `${Math.floor(diff / minute)} minuti fa`;
            if (diff < day) return `${Math.floor(diff / hour)} ore fa`;
            if (diff < week) return `${Math.floor(diff / day)} giorni fa`;
            if (diff < month) return `${Math.floor(diff / week)} settimane fa`;
            if (diff < year) return `${Math.floor(diff / month)} mesi fa`;
            return `${Math.floor(diff / year)} anni fa`;
        },

        /**
         * Aggiungi giorni a data
         * @param {Date} date - Data
         * @param {number} days - Giorni da aggiungere
         * @returns {Date}
         */
        addDays(date, days) {
            const result = new Date(date);
            result.setDate(result.getDate() + days);
            return result;
        },

        /**
         * Controlla se data è oggi
         * @param {Date|string} date - Data
         * @returns {boolean}
         */
        isToday(date) {
            const d = date instanceof Date ? date : new Date(date);
            const today = new Date();
            return d.toDateString() === today.toDateString();
        }
    },

    /**
     * Array Utilities
     */
    array: {
        /**
         * Rimuove duplicati
         * @param {Array} arr - Array
         * @param {string|Function} key - Chiave o funzione per confronto
         * @returns {Array}
         */
        unique(arr, key) {
            if (!key) return [...new Set(arr)];

            const seen = new Set();
            return arr.filter(item => {
                const keyValue = typeof key === 'function' ? key(item) : item[key];
                if (seen.has(keyValue)) return false;
                seen.add(keyValue);
                return true;
            });
        },

        /**
         * Raggruppa array per chiave
         * @param {Array} arr - Array
         * @param {string|Function} key - Chiave o funzione
         * @returns {Object}
         */
        groupBy(arr, key) {
            return arr.reduce((groups, item) => {
                const group = typeof key === 'function' ? key(item) : item[key];
                groups[group] = groups[group] || [];
                groups[group].push(item);
                return groups;
            }, {});
        },

        /**
         * Ordina array
         * @param {Array} arr - Array
         * @param {string|Function} key - Chiave o funzione
         * @param {string} direction - Direzione (asc|desc)
         * @returns {Array}
         */
        sortBy(arr, key, direction = 'asc') {
            return [...arr].sort((a, b) => {
                const aVal = typeof key === 'function' ? key(a) : a[key];
                const bVal = typeof key === 'function' ? key(b) : b[key];

                if (direction === 'desc') {
                    return bVal > aVal ? 1 : -1;
                }
                return aVal > bVal ? 1 : -1;
            });
        },

        /**
         * Mescola array (shuffle)
         * @param {Array} arr - Array
         * @returns {Array}
         */
        shuffle(arr) {
            const result = [...arr];
            for (let i = result.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [result[i], result[j]] = [result[j], result[i]];
            }
            return result;
        },

        /**
         * Chunk array
         * @param {Array} arr - Array
         * @param {number} size - Dimensione chunk
         * @returns {Array}
         */
        chunk(arr, size) {
            const chunks = [];
            for (let i = 0; i < arr.length; i += size) {
                chunks.push(arr.slice(i, i + size));
            }
            return chunks;
        }
    },

    /**
     * Storage Utilities
     */
    storage: {
        /**
         * Set item in localStorage
         * @param {string} key - Chiave
         * @param {*} value - Valore
         */
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                console.warn('Storage set failed:', e);
            }
        },

        /**
         * Get item from localStorage
         * @param {string} key - Chiave
         * @param {*} defaultValue - Valore default
         * @returns {*}
         */
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.warn('Storage get failed:', e);
                return defaultValue;
            }
        },

        /**
         * Remove item from localStorage
         * @param {string} key - Chiave
         */
        remove(key) {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.warn('Storage remove failed:', e);
            }
        },

        /**
         * Clear localStorage
         */
        clear() {
            try {
                localStorage.clear();
            } catch (e) {
                console.warn('Storage clear failed:', e);
            }
        }
    },

    /**
     * URL Utilities
     */
    url: {
        /**
         * Get parametri URL
         * @param {string} url - URL (default: current)
         * @returns {Object}
         */
        getParams(url = window.location.href) {
            const urlObj = new URL(url);
            const params = {};
            urlObj.searchParams.forEach((value, key) => {
                params[key] = value;
            });
            return params;
        },

        /**
         * Set parametro URL
         * @param {string} key - Chiave
         * @param {string} value - Valore
         * @param {boolean} pushState - Aggiorna history
         */
        setParam(key, value, pushState = true) {
            const url = new URL(window.location);
            url.searchParams.set(key, value);

            if (pushState) {
                window.history.pushState({}, '', url);
            } else {
                window.history.replaceState({}, '', url);
            }
        },

        /**
         * Remove parametro URL
         * @param {string} key - Chiave
         * @param {boolean} pushState - Aggiorna history
         */
        removeParam(key, pushState = true) {
            const url = new URL(window.location);
            url.searchParams.delete(key);

            if (pushState) {
                window.history.pushState({}, '', url);
            } else {
                window.history.replaceState({}, '', url);
            }
        }
    },

    /**
     * Performance Utilities
     */
    performance: {
        /**
         * Debounce function
         * @param {Function} func - Funzione
         * @param {number} wait - Millisecondi di attesa
         * @returns {Function}
         */
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        /**
         * Throttle function
         * @param {Function} func - Funzione
         * @param {number} limit - Millisecondi limite
         * @returns {Function}
         */
        throttle(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        /**
         * Misura performance di una funzione
         * @param {Function} func - Funzione da misurare
         * @param {string} label - Etichetta per il log
         * @returns {*} - Risultato della funzione
         */
        measure(func, label = 'Function') {
            const start = performance.now();
            const result = func();
            const end = performance.now();
            console.log(`${label} took ${(end - start).toFixed(2)}ms`);
            return result;
        },

        /**
         * Misura performance asincrona
         * @param {Function} func - Funzione async da misurare
         * @param {string} label - Etichetta per il log
         * @returns {Promise<*>} - Risultato della funzione
         */
        async measureAsync(func, label = 'Async Function') {
            const start = performance.now();
            const result = await func();
            const end = performance.now();
            console.log(`${label} took ${(end - start).toFixed(2)}ms`);
            return result;
        }
    },

    /**
     * Device Detection
     */
    device: {
        /**
         * Controlla se è mobile
         * @returns {boolean}
         */
        isMobile() {
            return window.innerWidth <= 768;
        },

        /**
         * Controlla se è tablet
         * @returns {boolean}
         */
        isTablet() {
            return window.innerWidth > 768 && window.innerWidth <= 1024;
        },

        /**
         * Controlla se è desktop
         * @returns {boolean}
         */
        isDesktop() {
            return window.innerWidth > 1024;
        },

        /**
         * Get device type
         * @returns {string}
         */
        getType() {
            if (this.isMobile()) return 'mobile';
            if (this.isTablet()) return 'tablet';
            return 'desktop';
        }
    },

    /**
     * Funzioni di utilità globali per compatibilità
     */
    debounce(func, wait) {
        return this.performance.debounce(func, wait);
    },

    throttle(func, limit) {
        return this.performance.throttle(func, limit);
    }
};

// Freeze utilities to prevent modifications
Object.freeze(Utils);