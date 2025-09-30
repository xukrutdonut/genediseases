/**
 * Main Application Controller for GeneReviews Database
 * Coordinates all components and handles application lifecycle
 */
class GeneReviewsApp {
    constructor() {
        this.version = '1.0.0';
        this.initialized = false;
        this.offline = false;
        
        this.bindEvents();
        this.checkSystemRequirements();
    }

    /**
     * Initialize the application
     */
    async initialize() {
        if (this.initialized) return;

        try {
            console.log('🧬 Initializing GeneReviews Database Application v' + this.version);
            
            // Show loading
            window.ui.showLoading(true);

            // Check API health
            await this.checkApiHealth();

            // Initialize data if needed
            await this.initializeData();

            // Load initial data
            await this.loadInitialData();

            // Setup offline detection
            this.setupOfflineDetection();

            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();

            // Load user preferences
            this.loadUserPreferences();

            this.initialized = true;
            console.log('✅ Application initialized successfully');

            // Show welcome message for first-time users
            this.showWelcomeMessage();

        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            window.ui.showToast('Error inicializando la aplicación: ' + error.message, 'error');
        } finally {
            window.ui.showLoading(false);
        }
    }

    /**
     * Check system requirements
     */
    checkSystemRequirements() {
        const requirements = {
            localStorage: typeof(Storage) !== "undefined",
            fetch: typeof(fetch) !== "undefined",
            promise: typeof(Promise) !== "undefined",
            es6: typeof(Map) !== "undefined"
        };

        const failed = Object.entries(requirements)
            .filter(([key, supported]) => !supported)
            .map(([key]) => key);

        if (failed.length > 0) {
            const message = `Su navegador no soporta las siguientes características requeridas: ${failed.join(', ')}`;
            alert(message);
            throw new Error('System requirements not met');
        }
    }

    /**
     * Check API health
     */
    async checkApiHealth() {
        try {
            const health = await window.api.healthCheck();
            if (!health || health.status !== 'ok') {
                throw new Error('API health check failed');
            }
            console.log('✅ API is healthy');
        } catch (error) {
            console.error('❌ API health check failed:', error);
            throw new Error('No se puede conectar con el servidor API');
        }
    }

    /**
     * Initialize data if needed
     */
    async initializeData() {
        try {
            // Check if we have data
            const stats = await window.api.getStats();
            
            if (stats.data.totalReviews === 0) {
                console.log('📊 No data found, attempting to load initial data...');
                
                // Try to load data from JSON
                try {
                    const result = await window.api.loadData();
                    if (result.success) {
                        console.log('✅ Initial data loaded successfully');
                        window.ui.showToast('Datos iniciales cargados correctamente', 'success');
                    }
                } catch (loadError) {
                    console.warn('⚠️ Could not load initial data:', loadError);
                    window.ui.showToast('No se pudieron cargar los datos iniciales. La base de datos está vacía.', 'error');
                }
            }
        } catch (error) {
            console.warn('⚠️ Could not check data status:', error);
        }
    }

    /**
     * Load initial application data
     */
    async loadInitialData() {
        try {
            // Load data for home page
            await window.ui.loadSectionData('home');
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    /**
     * Setup offline detection
     */
    setupOfflineDetection() {
        const updateOnlineStatus = () => {
            this.offline = !navigator.onLine;
            
            if (this.offline) {
                window.ui.showToast('Sin conexión a internet. Algunas funciones pueden estar limitadas.', 'error');
                document.body.classList.add('offline');
            } else {
                document.body.classList.remove('offline');
                if (this.initialized) {
                    window.ui.showToast('Conexión restaurada', 'success');
                }
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        
        // Initial check
        updateOnlineStatus();
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Skip if typing in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Ctrl/Cmd + shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'k': // Search
                        e.preventDefault();
                        this.focusSearch();
                        break;
                    case 'h': // Home
                        e.preventDefault();
                        window.ui.showSection('home');
                        break;
                    case 'b': // Browse
                        e.preventDefault();
                        window.ui.showSection('browse');
                        break;
                    case 's': // Stats
                        e.preventDefault();
                        window.ui.showSection('stats');
                        break;
                }
            }

            // Number shortcuts
            if (e.key >= '1' && e.key <= '4' && !e.ctrlKey && !e.metaKey) {
                const sections = ['home', 'browse', 'search', 'stats'];
                const sectionIndex = parseInt(e.key) - 1;
                if (sections[sectionIndex]) {
                    window.ui.showSection(sections[sectionIndex]);
                }
            }
        });
    }

    /**
     * Focus on search input
     */
    focusSearch() {
        const searchInput = document.getElementById('quickSearchInput') || 
                          document.getElementById('searchQuery');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    /**
     * Load user preferences
     */
    loadUserPreferences() {
        try {
            const prefs = localStorage.getItem('genereviews_preferences');
            if (prefs) {
                this.preferences = JSON.parse(prefs);
                this.applyUserPreferences();
            } else {
                this.preferences = this.getDefaultPreferences();
                this.saveUserPreferences();
            }
        } catch (error) {
            console.error('Error loading user preferences:', error);
            this.preferences = this.getDefaultPreferences();
        }
    }

    /**
     * Get default preferences
     */
    getDefaultPreferences() {
        return {
            theme: 'light',
            itemsPerPage: 20,
            showWelcome: true,
            searchHistory: true,
            autoComplete: true,
            notifications: true
        };
    }

    /**
     * Apply user preferences
     */
    applyUserPreferences() {
        // Apply theme
        if (this.preferences.theme === 'dark') {
            document.body.classList.add('dark-theme');
        }

        // Apply items per page
        if (window.ui) {
            window.ui.itemsPerPage = this.preferences.itemsPerPage;
        }
    }

    /**
     * Save user preferences
     */
    saveUserPreferences() {
        try {
            localStorage.setItem('genereviews_preferences', JSON.stringify(this.preferences));
        } catch (error) {
            console.error('Error saving user preferences:', error);
        }
    }

    /**
     * Show welcome message for first-time users
     */
    showWelcomeMessage() {
        if (this.preferences.showWelcome) {
            setTimeout(() => {
                const message = `
                    ¡Bienvenido a la Base de Datos GeneReviews! 
                    
                    Consejos útiles:
                    • Use Ctrl+K para buscar rápidamente
                    • Navegue con las teclas 1-4
                    • Haga clic en cualquier review para ver detalles completos
                `;
                
                window.ui.showToast(message, 'info');
                
                // Don't show again
                this.preferences.showWelcome = false;
                this.saveUserPreferences();
            }, 2000);
        }
    }

    /**
     * Bind global events
     */
    bindEvents() {
        // Page load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }

        // Page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Error handling
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            window.ui?.showToast('Ha ocurrido un error inesperado', 'error');
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            window.ui?.showToast('Error en la aplicación', 'error');
        });
    }

    /**
     * Cleanup on page unload
     */
    cleanup() {
        // Save any pending data
        this.saveUserPreferences();
        
        // Clear any intervals/timeouts if needed
        console.log('🧹 Cleaning up application...');
    }

    /**
     * Get application info
     */
    getAppInfo() {
        return {
            version: this.version,
            initialized: this.initialized,
            offline: this.offline,
            preferences: this.preferences,
            cacheStats: window.api?.getCacheStats(),
            searchAnalytics: window.search?.getSearchAnalytics()
        };
    }

    /**
     * Export application data
     */
    async exportData() {
        try {
            window.ui.showLoading(true);
            
            const appInfo = this.getAppInfo();
            const exportData = {
                exported: new Date().toISOString(),
                application: appInfo,
                searchHistory: window.search?.searchHistory || [],
                preferences: this.preferences
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `genereviews_export_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            window.ui.showToast('Datos exportados correctamente', 'success');
        } catch (error) {
            console.error('Export error:', error);
            window.ui.showToast('Error exportando datos', 'error');
        } finally {
            window.ui.showLoading(false);
        }
    }

    /**
     * Clear all application data
     */
    clearAllData() {
        if (confirm('¿Está seguro de que desea borrar todos los datos locales? Esta acción no se puede deshacer.')) {
            try {
                localStorage.clear();
                window.api.clearCache();
                window.search.clearSearchHistory();
                
                window.ui.showToast('Datos locales borrados correctamente', 'success');
                
                // Reload page
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } catch (error) {
                console.error('Clear data error:', error);
                window.ui.showToast('Error borrando datos', 'error');
            }
        }
    }

    /**
     * Toggle theme
     */
    toggleTheme() {
        const newTheme = this.preferences.theme === 'light' ? 'dark' : 'light';
        this.preferences.theme = newTheme;
        this.saveUserPreferences();
        this.applyUserPreferences();
        
        window.ui.showToast(`Tema cambiado a ${newTheme}`, 'success');
    }

    /**
     * Show application help
     */
    showHelp() {
        const helpContent = `
            <div class="help-content">
                <h4>Ayuda - Base de Datos GeneReviews</h4>
                
                <h5>Navegación</h5>
                <ul>
                    <li><strong>Teclas 1-4:</strong> Cambiar entre secciones</li>
                    <li><strong>Ctrl+K:</strong> Enfocar búsqueda</li>
                    <li><strong>Ctrl+H:</strong> Ir al inicio</li>
                    <li><strong>Ctrl+B:</strong> Ir a explorar</li>
                    <li><strong>Escape:</strong> Cerrar modal/sugerencias</li>
                </ul>

                <h5>Búsqueda Avanzada</h5>
                <ul>
                    <li><strong>category:"nombre":</strong> Buscar en categoría</li>
                    <li><strong>author:"nombre":</strong> Buscar por autor</li>
                    <li><strong>"frase exacta":</strong> Búsqueda de frase exacta</li>
                    <li><strong>-término:</strong> Excluir término</li>
                </ul>

                <h5>Funciones</h5>
                <ul>
                    <li>Búsqueda de texto completo en reviews</li>
                    <li>Navegación jerárquica por categorías</li>
                    <li>Historial de búsquedas</li>
                    <li>Exportar datos y configuración</li>
                </ul>
            </div>
        `;

        // Create and show help modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Ayuda</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">${helpContent}</div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Add close event
        modal.querySelector('.modal-close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }
}

// Initialize application
window.app = new GeneReviewsApp();

// Add global utilities
window.utils = {
    formatDate: (dateString) => {
        try {
            return new Date(dateString).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return dateString;
        }
    },

    formatNumber: (num) => {
        return new Intl.NumberFormat('es-ES').format(num);
    },

    truncateText: (text, maxLength) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    debounce: (func, wait) => {
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

    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }
};

console.log('🧬 GeneReviews Database Application loaded successfully!');