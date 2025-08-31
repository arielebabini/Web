/**
 * CoWorkSpace Authentication Manager
 * Handles user authentication, UI state, and route protection
 */

class AuthManager {
    constructor() {
        this.user = null;
        this.isInitialized = false;
        this.redirectAfterLogin = null;
        this.authChecks = new Set();

        // Bind methods to preserve context
        this.handleLoginForm = this.handleLoginForm.bind(this);
        this.handleRegisterForm = this.handleRegisterForm.bind(this);
        this.handleLogout = this.handleLogout.bind(this);

        this.init();
    }

    // ==================== INITIALIZATION ====================

    async init() {
        console.log('🔐 AuthManager initializing...');

        try {
            // Setup event listeners
            this.setupEventListeners();

            // Check authentication status
            await this.checkAuthStatus();

            // Setup route protection
            this.setupRouteProtection();

            // Setup auto-logout on token expiry
            this.setupTokenExpiryCheck();

            this.isInitialized = true;
            console.log('✅ AuthManager initialized successfully');

        } catch (error) {
            console.error('❌ AuthManager initialization failed:', error);
        }
    }

    setupEventListeners() {
        // API client events
        window.addEventListener('auth:login', (event) => {
            this.handleLoginSuccess(event.detail.user);
        });

        window.addEventListener('auth:logout', () => {
            this.handleLogoutComplete();
        });

        window.addEventListener('auth:failure', (event) => {
            this.handleAuthFailure(event.detail.reason);
        });

        // DOM events - use event delegation for dynamic content
        document.addEventListener('submit', (e) => {
            if (e.target.matches('#loginForm, .login-form')) {
                e.preventDefault();
                this.handleLoginForm(e);
            }

            if (e.target.matches('#registerForm, .register-form')) {
                e.preventDefault();
                this.handleRegisterForm(e);
            }
        });

        document.addEventListener('click', (e) => {
            // Logout buttons
            if (e.target.matches('.logout-btn, #logoutBtn, [data-action="logout"]')) {
                e.preventDefault();
                this.handleLogout();
            }

            // Auth required links
            if (e.target.matches('.auth-required, [data-auth="required"]')) {
                if (!this.isAuthenticated()) {
                    e.preventDefault();
                    this.requireAuth(e.target.getAttribute('href') || window.location.pathname);
                }
            }
        });

        // Real-time form validation
        document.addEventListener('input', (e) => {
            if (e.target.type === 'password' && e.target.closest('form')) {
                this.validatePasswordField(e.target);
            }
            if (e.target.type === 'email' && e.target.closest('form')) {
                this.validateEmailField(e.target);
            }
        });

        // Handle browser navigation
        window.addEventListener('popstate', () => {
            this.checkPageAccess();
        });

        // Handle tab visibility change (for token refresh)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isAuthenticated()) {
                this.refreshTokenIfNeeded();
            }
        });
    }

    // ==================== AUTHENTICATION STATE ====================

    async checkAuthStatus() {
        const token = localStorage.getItem('auth_token');
        const userData = localStorage.getItem('user_data');

        if (token && userData) {
            try {
                this.user = JSON.parse(userData);

                // Verify token is still valid
                if (window.api) {
                    const profile = await window.api.getProfile();
                    if (profile.success) {
                        this.user = profile.data;
                        this.updateStoredUserData(this.user);
                        console.log('✅ User session restored:', this.user.email);
                    } else {
                        throw new Error('Invalid token');
                    }
                }

            } catch (error) {
                console.warn('⚠️ Session restoration failed:', error.message);
                this.clearSession();
            }
        }

        this.updateUI();
        this.checkPageAccess();
    }

    isAuthenticated() {
        return !!this.user && !!localStorage.getItem('auth_token');
    }

    getUser() {
        return this.user;
    }

    hasRole(role) {
        return this.user && this.user.role === role;
    }

    hasAnyRole(roles) {
        if (!this.user || !Array.isArray(roles)) return false;
        return roles.includes(this.user.role);
    }

    canAccess(requiredRole) {
        if (!requiredRole) return true;
        if (!this.isAuthenticated()) return false;

        const roleHierarchy = {
            'user': 1,
            'manager': 2,
            'admin': 3
        };

        const userLevel = roleHierarchy[this.user.role] || 0;
        const requiredLevel = roleHierarchy[requiredRole] || 999;

        return userLevel >= requiredLevel;
    }

    // ==================== LOGIN HANDLING ====================

    async handleLoginForm(event) {
        const form = event.target;
        const formData = new FormData(form);

        const credentials = {
            email: formData.get('email')?.trim(),
            password: formData.get('password')
        };

        // Basic validation
        if (!credentials.email || !credentials.password) {
            this.showFormError(form, 'Email e password sono richiesti');
            return;
        }

        try {
            this.showFormLoading(form, true);
            this.clearFormErrors(form);

            const result = await window.api.login(credentials);

            if (result.success) {
                this.showSuccess('Login effettuato con successo!');

                // Handle "remember me" if present
                const rememberMe = formData.get('rememberMe');
                if (rememberMe) {
                    localStorage.setItem('remember_user', credentials.email);
                }

                // Redirect after short delay
                const redirectTo = this.redirectAfterLogin || this.getDefaultRedirect();
                setTimeout(() => {
                    window.location.href = redirectTo;
                }, 1500);

            } else {
                this.showFormError(form, result.message || 'Credenziali non valide');
            }
        } catch (error) {
            this.showFormError(form, this.getErrorMessage(error));
        } finally {
            this.showFormLoading(form, false);
        }
    }

    async handleRegisterForm(event) {
        const form = event.target;
        const formData = new FormData(form);

        // Collect form data
        const userData = {
            email: formData.get('email')?.trim(),
            password: formData.get('password'),
            firstName: formData.get('firstName')?.trim(),
            lastName: formData.get('lastName')?.trim(),
            phone: formData.get('phone')?.trim(),
            company: formData.get('company')?.trim()
        };

        // Validate form
        const validation = this.validateRegistrationForm(formData);
        if (!validation.isValid) {
            this.showFormError(form, validation.message);
            return;
        }

        try {
            this.showFormLoading(form, true);
            this.clearFormErrors(form);

            const result = await window.api.register(userData);

            if (result.success) {
                this.showSuccess('Registrazione completata! Controlla la tua email per confermare l\'account.');

                // Reset form
                form.reset();

                // Redirect to login
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);

            } else {
                this.showFormError(form, result.message || 'Errore durante la registrazione');
            }
        } catch (error) {
            this.showFormError(form, this.getErrorMessage(error));
        } finally {
            this.showFormLoading(form, false);
        }
    }

    handleLoginSuccess(user) {
        this.user = user;
        this.updateStoredUserData(user);
        this.updateUI();

        console.log('👤 User logged in:', user.email);

        // Clear any pending auth requirements
        this.redirectAfterLogin = null;

        // Track login event
        this.trackEvent('user_login', {
            userId: user.id,
            email: user.email,
            role: user.role
        });
    }

    updateStoredUserData(user) {
        try {
            localStorage.setItem('user_data', JSON.stringify(user));
        } catch (error) {
            console.warn('Could not store user data:', error);
        }
    }

    // ==================== LOGOUT HANDLING ====================

    async handleLogout() {
        try {
            this.showInfo('Disconnessione in corso...');

            // Track logout event
            this.trackEvent('user_logout', {
                userId: this.user?.id,
                sessionDuration: this.getSessionDuration()
            });

            await window.api.logout();

        } catch (error) {
            console.warn('⚠️ Logout error:', error);
        } finally {
            this.handleLogoutComplete();
        }
    }

    handleLogoutComplete() {
        this.clearSession();
        this.showSuccess('Logout effettuato con successo');

        // Redirect if on protected page
        if (this.isProtectedPage()) {
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        }
    }

    handleAuthFailure(reason) {
        console.warn('🔒 Authentication failure:', reason);
        this.clearSession();

        if (reason === 'token_expired') {
            this.showWarning('La tua sessione è scaduta. Effettua nuovamente il login.');
        } else {
            this.showError('Errore di autenticazione. Effettua nuovamente il login.');
        }

        // Redirect to login if on protected page
        if (this.isProtectedPage()) {
            setTimeout(() => {
                this.requireAuth();
            }, 2000);
        }
    }

    clearSession() {
        this.user = null;
        this.redirectAfterLogin = null;

        try {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user_data');
        } catch (error) {
            console.warn('Could not clear localStorage:', error);
        }

        this.updateUI();
    }

    getSessionDuration() {
        try {
            const loginTime = localStorage.getItem('login_time');
            if (loginTime) {
                return Date.now() - parseInt(loginTime);
            }
        } catch (error) {
            // Ignore
        }
        return 0;
    }

    // ==================== ROUTE PROTECTION ====================

    setupRouteProtection() {
        // Define protected pages and their required roles
        this.protectedRoutes = {
            '/dashboard.html': null, // Any authenticated user
            '/profile.html': null,
            '/bookings.html': null,
            '/admin.html': 'admin',
            '/admin/': 'admin',
            '/manager.html': 'manager'
        };

        this.checkPageAccess();
    }

    checkPageAccess() {
        const currentPath = window.location.pathname;

        // Check if current page requires authentication
        for (const [path, requiredRole] of Object.entries(this.protectedRoutes)) {
            if (currentPath.includes(path)) {
                if (!this.isAuthenticated()) {
                    this.requireAuth();
                    return;
                }

                if (requiredRole && !this.canAccess(requiredRole)) {
                    this.showError('Non hai i permessi per accedere a questa pagina');
                    setTimeout(() => {
                        window.location.href = this.getDefaultRedirect();
                    }, 2000);
                    return;
                }
            }
        }
    }

    requireAuth(redirectAfter = null) {
        this.redirectAfterLogin = redirectAfter || window.location.pathname + window.location.search;

        this.showWarning('Devi effettuare il login per accedere a questa pagina');

        setTimeout(() => {
            const loginUrl = new URL('/login.html', window.location.origin);
            if (this.redirectAfterLogin && this.redirectAfterLogin !== '/') {
                loginUrl.searchParams.set('redirect', this.redirectAfterLogin);
            }
            window.location.href = loginUrl.toString();
        }, 2000);
    }

    isProtectedPage() {
        const currentPath = window.location.pathname;
        return Object.keys(this.protectedRoutes).some(path =>
            currentPath.includes(path)
        );
    }

    getDefaultRedirect() {
        const user = this.getUser();
        if (!user) return '/';

        // Role-based default redirects
        switch (user.role) {
            case 'admin':
                return '/admin.html';
            case 'manager':
                return '/manager.html';
            default:
                return '/dashboard.html';
        }
    }

    // ==================== TOKEN MANAGEMENT ====================

    setupTokenExpiryCheck() {
        // Check token expiry every 5 minutes
        setInterval(() => {
            this.checkTokenExpiry();
        }, 5 * 60 * 1000);
    }

    async checkTokenExpiry() {
        if (!this.isAuthenticated()) return;

        try {
            const token = localStorage.getItem('auth_token');
            if (token) {
                // Decode JWT to check expiry (basic check, not cryptographically secure)
                const payload = this.decodeJWTPayload(token);
                if (payload && payload.exp) {
                    const expiryTime = payload.exp * 1000; // Convert to milliseconds
                    const now = Date.now();
                    const timeUntilExpiry = expiryTime - now;

                    // Refresh token if expiring within 10 minutes
                    if (timeUntilExpiry < 10 * 60 * 1000 && timeUntilExpiry > 0) {
                        await this.refreshTokenIfNeeded();
                    }
                }
            }
        } catch (error) {
            console.warn('Token expiry check failed:', error);
        }
    }

    decodeJWTPayload(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            return JSON.parse(jsonPayload);
        } catch (error) {
            return null;
        }
    }

    async refreshTokenIfNeeded() {
        if (this.isRefreshing) return;

        this.isRefreshing = true;
        try {
            // This will be handled by the API client
            const profile = await window.api.getProfile();
            if (profile.success) {
                console.log('✅ Token refresh successful');
            }
        } catch (error) {
            console.warn('Token refresh failed:', error);
        } finally {
            this.isRefreshing = false;
        }
    }

    // ==================== UI MANAGEMENT ====================

    updateUI() {
        if (this.isAuthenticated()) {
            this.showAuthenticatedUI();
        } else {
            this.showGuestUI();
        }
    }

    showAuthenticatedUI() {
        const user = this.getUser();

        // Update navbar with user info
        this.updateNavbarUserInfo(user);

        // Show/hide elements based on authentication
        document.querySelectorAll('.auth-only').forEach(el => {
            el.style.display = '';
            el.classList.remove('hidden');
        });

        document.querySelectorAll('.guest-only').forEach(el => {
            el.style.display = 'none';
            el.classList.add('hidden');
        });

        // Update role-based elements
        this.updateRoleBasedUI(user.role);

        // Update user-specific content
        this.updateUserSpecificContent(user);

        // Show welcome message on first login
        const isFirstLogin = sessionStorage.getItem('first_login');
        if (isFirstLogin === 'true') {
            sessionStorage.removeItem('first_login');
            this.showSuccess(`Benvenuto, ${user.firstName}!`);
        }
    }

    showGuestUI() {
        // Hide authenticated elements
        document.querySelectorAll('.auth-only').forEach(el => {
            el.style.display = 'none';
            el.classList.add('hidden');
        });

        // Show guest elements
        document.querySelectorAll('.guest-only').forEach(el => {
            el.style.display = '';
            el.classList.remove('hidden');
        });

        // Hide all role-based elements
        document.querySelectorAll('.admin-only, .manager-only').forEach(el => {
            el.style.display = 'none';
            el.classList.add('hidden');
        });
    }

    updateNavbarUserInfo(user) {
        // Update user name
        const navUserElements = document.querySelectorAll('#navUser, .nav-user-name');
        navUserElements.forEach(el => {
            el.textContent = `Ciao, ${user.firstName}!`;
        });

        // Update user avatar if present
        const avatarElements = document.querySelectorAll('.user-avatar');
        avatarElements.forEach(el => {
            if (user.avatar) {
                el.src = user.avatar;
            } else {
                // Set default avatar based on initials
                el.src = this.generateAvatarUrl(user.firstName, user.lastName);
            }
            el.alt = `${user.firstName} ${user.lastName}`;
        });
    }

    updateRoleBasedUI(role) {
        // Admin elements
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => {
            const display = role === 'admin' ? '' : 'none';
            el.style.display = display;
            if (display === 'none') {
                el.classList.add('hidden');
            } else {
                el.classList.remove('hidden');
            }
        });

        // Manager elements (includes admin)
        const managerElements = document.querySelectorAll('.manager-only');
        managerElements.forEach(el => {
            const display = (role === 'manager' || role === 'admin') ? '' : 'none';
            el.style.display = display;
            if (display === 'none') {
                el.classList.add('hidden');
            } else {
                el.classList.remove('hidden');
            }
        });
    }

    updateUserSpecificContent(user) {
        // Update email displays
        document.querySelectorAll('.user-email').forEach(el => {
            el.textContent = user.email;
        });

        // Update name displays
        document.querySelectorAll('.user-name').forEach(el => {
            el.textContent = `${user.firstName} ${user.lastName}`;
        });

        // Update company displays
        document.querySelectorAll('.user-company').forEach(el => {
            el.textContent = user.company || '';
        });

        // Update role displays
        document.querySelectorAll('.user-role').forEach(el => {
            el.textContent = this.formatRole(user.role);
        });
    }

    generateAvatarUrl(firstName, lastName) {
        const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
        return `https://ui-avatars.com/api/?name=${initials}&background=random&color=fff&size=40`;
    }

    formatRole(role) {
        const roleMap = {
            'user': 'Utente',
            'manager': 'Gestore',
            'admin': 'Amministratore'
        };
        return roleMap[role] || role;
    }

    // ==================== FORM VALIDATION ====================

    validateRegistrationForm(formData) {
        const email = formData.get('email')?.trim();
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        const firstName = formData.get('firstName')?.trim();
        const lastName = formData.get('lastName')?.trim();

        if (!email) {
            return { isValid: false, message: 'Email è richiesta' };
        }

        if (!this.isValidEmail(email)) {
            return { isValid: false, message: 'Formato email non valido' };
        }

        if (!password) {
            return { isValid: false, message: 'Password è richiesta' };
        }

        if (password.length < 8) {
            return { isValid: false, message: 'La password deve essere di almeno 8 caratteri' };
        }

        if (!this.isValidPassword(password)) {
            return {
                isValid: false,
                message: 'La password deve contenere almeno una maiuscola, una minuscola e un numero'
            };
        }

        if (confirmPassword && password !== confirmPassword) {
            return { isValid: false, message: 'Le password non coincidono' };
        }

        if (!firstName || firstName.length < 2) {
            return { isValid: false, message: 'Nome richiesto (minimo 2 caratteri)' };
        }

        if (!lastName || lastName.length < 2) {
            return { isValid: false, message: 'Cognome richiesto (minimo 2 caratteri)' };
        }

        return { isValid: true };
    }

    validatePasswordField(input) {
        const password = input.value;

        if (password.length === 0) {
            this.clearFieldValidation(input);
            return;
        }

        const checks = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            number: /\d/.test(password)
        };

        const isValid = Object.values(checks).every(check => check);

        let message = '';
        if (!isValid) {
            const missing = [];
            if (!checks.length) missing.push('8 caratteri');
            if (!checks.lowercase) missing.push('una minuscola');
            if (!checks.uppercase) missing.push('una maiuscola');
            if (!checks.number) missing.push('un numero');
            message = `Manca: ${missing.join(', ')}`;
        }

        this.updateFieldValidation(input, isValid, message);
        this.updatePasswordStrength(input, checks);
    }

    validateEmailField(input) {
        const email = input.value.trim();

        if (email.length === 0) {
            this.clearFieldValidation(input);
            return;
        }

        const isValid = this.isValidEmail(email);
        const message = isValid ? '' : 'Formato email non valido';

        this.updateFieldValidation(input, isValid, message);
    }

    updatePasswordStrength(input, checks) {
        const strengthEl = input.parentElement.querySelector('.password-strength');
        if (!strengthEl) return;

        const score = Object.values(checks).filter(check => check).length;
        const levels = ['weak', 'fair', 'good', 'strong'];
        const level = levels[Math.min(score - 1, 3)] || 'weak';

        strengthEl.className = `password-strength ${level}`;
        strengthEl.textContent = {
            weak: 'Debole',
            fair: 'Sufficiente',
            good: 'Buona',
            strong: 'Forte'
        }[level];
    }

    updateFieldValidation(input, isValid, message) {
        const container = input.closest('.form-group') || input.parentElement;
        if (!container) return;

        // Remove existing error
        let errorEl = container.querySelector('.field-error');

        if (!isValid && message) {
            if (!errorEl) {
                errorEl = document.createElement('div');
                errorEl.className = 'field-error';
                container.appendChild(errorEl);
            }
            errorEl.textContent = message;
            input.classList.add('error');
        } else {
            if (errorEl) {
                errorEl.remove();
            }
            input.classList.remove('error');
            if (isValid && input.value.length > 0) {
                input.classList.add('valid');
            }
        }
    }

    clearFieldValidation(input) {
        const container = input.closest('.form-group') || input.parentElement;
        if (!container) return;

        const errorEl = container.querySelector('.field-error');
        if (errorEl) {
            errorEl.remove();
        }

        input.classList.remove('error', 'valid');
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidPassword(password) {
        // At least 8 characters, one lowercase, one uppercase, one number
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        return passwordRegex.test(password);
    }

    // ==================== FORM UI FEEDBACK ====================

    showFormLoading(form, show) {
        const submitBtn = form.querySelector('button[type="submit"], .submit-btn');
        const loadingEl = form.querySelector('.loading-spinner, .loading');

        if (submitBtn) {
            submitBtn.disabled = show;

            const btnText = submitBtn.querySelector('.btn-text');
            if (btnText) {
                btnText.style.display = show ? 'none' : '';
            }

            if (show) {
                submitBtn.classList.add('loading');
            } else {
                submitBtn.classList.remove('loading');
            }
        }

        if (loadingEl) {
            loadingEl.style.display = show ? 'block' : 'none';
        }
    }

    showFormError(form, message) {
        this.clearFormErrors(form);

        const errorEl = document.createElement('div');
        errorEl.className = 'form-error alert alert-error';
        errorEl.innerHTML = `
            <span class="alert-icon">⚠️</span>
            <span class="alert-message">${message}</span>
            <button class="alert-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        // Insert at the top of the form
        form.insertBefore(errorEl, form.firstChild);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (errorEl.parentElement) {
                errorEl.remove();
            }
        }, 10000);
    }

    clearFormErrors(form) {
        const errors = form.querySelectorAll('.form-error');
        errors.forEach(error => error.remove());
    }

    getErrorMessage(error) {
        const message = error.message || 'Si è verificato un errore';

        // User-friendly error messages
        const errorMap = {
            'Network request failed': 'Problema di connessione. Verifica la tua rete.',
            'fetch failed': 'Impossibile contattare il server.',
            'Request timeout': 'Il server non risponde. Riprova più tardi.',
            'Invalid credentials': 'Email o password non corrette.',
            'User already exists': 'Un account con questa email esiste già.',
            'User not found': 'Nessun account trovato con questa email.',
            'Invalid token': 'Token non valido o scaduto.',
            'Account not verified': 'Account non verificato. Controlla la tua email.'
        };

        return errorMap[message] || message;
    }

    // ==================== NOTIFICATIONS ====================

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type = 'info') {
        // Use global notification system if available
        if (window.notifications?.show) {
            window.notifications.show(message, type);
            return;
        }

        // Fallback to simple notification
        this.createSimpleNotification(message, type);
    }

    createSimpleNotification(message, type) {
        // Remove existing notifications of the same type
        const existing = document.querySelectorAll(`.notification-${type}`);
        existing.forEach(el => el.remove());

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        // Styling
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '8px',
            zIndex: '10000',
            maxWidth: '400px',
            minWidth: '300px',
            color: 'white',
            backgroundColor: this.getNotificationColor(type),
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease-in-out'
        });

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Auto-remove and click handler
        const remove = () => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        };

        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', remove);

        setTimeout(remove, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    }

    getNotificationColor(type) {
        const colors = {
            success: '#10B981',
            error: '#EF4444',
            warning: '#F59E0B',
            info: '#3B82F6'
        };
        return colors[type] || '#3B82F6';
    }

    // ==================== UTILITY METHODS ====================

    trackEvent(eventName, data = {}) {
        // Send to analytics service if available
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, data);
        }

        if (window.analytics?.track) {
            window.analytics.track(eventName, data);
        }

        console.log('📊 Event tracked:', eventName, data);
    }

    // ==================== AUTO-FILL FOR DEVELOPMENT ====================

    setupDevelopmentHelpers() {
        if (window.location.hostname !== 'localhost') return;

        // Auto-fill login form with test credentials
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('dev') === '1') {
            setTimeout(() => {
                const emailInput = document.getElementById('email');
                const passwordInput = document.getElementById('password');

                if (emailInput && passwordInput) {
                    emailInput.value = 'test@coworkspace.local';
                    passwordInput.value = 'Test123456';
                }
            }, 500);
        }

        // Remember last used email
        const rememberedEmail = localStorage.getItem('remember_user');
        if (rememberedEmail) {
            setTimeout(() => {
                const emailInput = document.getElementById('email');
                if (emailInput && !emailInput.value) {
                    emailInput.value = rememberedEmail;
                }
            }, 500);
        }
    }
}

// ==================== GLOBAL INITIALIZATION ====================

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.auth = new AuthManager();

    // Development helpers
    if (window.location.hostname === 'localhost') {
        window.auth.setupDevelopmentHelpers();
    }
});

// Export for ES6 modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}