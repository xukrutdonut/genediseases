/**
 * UI Controller for GeneReviews Database
 * Handles DOM manipulation and user interface interactions
 */
class UIController {
    constructor() {
        this.currentSection = 'home';
        this.currentPage = 0;
        this.itemsPerPage = 20;
        this.searchTimeout = null;
        
        this.initializeEventListeners();
    }

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.showSection(section);
            });
        });

        // Quick search
        const quickSearchInput = document.getElementById('quickSearchInput');
        const quickSearchBtn = document.getElementById('quickSearchBtn');
        
        if (quickSearchInput) {
            quickSearchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.handleQuickSearch(e.target.value);
                }, 300);
            });

            quickSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleQuickSearchSubmit(e.target.value);
                }
            });
        }

        if (quickSearchBtn) {
            quickSearchBtn.addEventListener('click', () => {
                const query = quickSearchInput.value.trim();
                if (query) {
                    this.handleQuickSearchSubmit(query);
                }
            });
        }

        // Advanced search
        const advancedSearchBtn = document.getElementById('advancedSearchBtn');
        if (advancedSearchBtn) {
            advancedSearchBtn.addEventListener('click', () => {
                this.handleAdvancedSearch();
            });
        }

        const searchQuery = document.getElementById('searchQuery');
        if (searchQuery) {
            searchQuery.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleAdvancedSearch();
                }
            });
        }

        // Browse filters
        const categoryFilter = document.getElementById('categoryFilter');
        const browseSearch = document.getElementById('browseSearch');
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.handleBrowseFilter();
            });
        }

        if (browseSearch) {
            browseSearch.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.handleBrowseFilter();
                }, 300);
            });
        }

        // Modal
        const modal = document.getElementById('reviewModal');
        const modalClose = document.getElementById('modalClose');
        
        if (modalClose) {
            modalClose.addEventListener('click', () => {
                this.hideModal();
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal();
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
                this.hideSuggestions();
            }
        });
    }

    /**
     * Show specific section
     */
    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        this.currentSection = sectionName;

        // Load section-specific data
        this.loadSectionData(sectionName);
    }

    /**
     * Load data for specific section
     */
    async loadSectionData(sectionName) {
        try {
            switch (sectionName) {
                case 'home':
                    await this.loadHomeData();
                    break;
                case 'browse':
                    await this.loadBrowseData();
                    break;
                case 'search':
                    await this.loadSearchData();
                    break;
                case 'stats':
                    await this.loadStatsData();
                    break;
            }
        } catch (error) {
            this.showToast('Error loading data: ' + error.message, 'error');
        }
    }

    /**
     * Load home page data
     */
    async loadHomeData() {
        this.showLoading(true);
        
        try {
            const [statsData, categoriesData] = await Promise.all([
                window.api.getStats(),
                window.api.getCategories()
            ]);

            // Update quick stats
            this.updateQuickStats(statsData.data);

            // Update categories grid
            this.updateCategoriesGrid(categoriesData.data);

        } catch (error) {
            console.error('Error loading home data:', error);
            this.showToast('Error loading home data', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Update quick stats display
     */
    updateQuickStats(stats) {
        const totalReviews = document.getElementById('totalReviews');
        const totalCategories = document.getElementById('totalCategories');
        const lastUpdated = document.getElementById('lastUpdated');

        if (totalReviews) totalReviews.textContent = stats.totalReviews || 0;
        if (totalCategories) totalCategories.textContent = stats.totalCategories || 0;
        if (lastUpdated) {
            const date = new Date(stats.lastUpdated);
            lastUpdated.textContent = date.toLocaleDateString();
        }
    }

    /**
     * Update categories grid
     */
    updateCategoriesGrid(categories) {
        const grid = document.getElementById('categoriesGrid');
        if (!grid) return;

        grid.innerHTML = '';

        categories.forEach(category => {
            const card = document.createElement('div');
            card.className = 'category-card';
            card.innerHTML = `
                <h4>${category.name}</h4>
                <p class="review-count">${category.actual_count || 0} reviews</p>
            `;
            
            card.addEventListener('click', () => {
                this.showCategoryReviews(category.name);
            });

            grid.appendChild(card);
        });
    }

    /**
     * Show reviews for a specific category
     */
    showCategoryReviews(categoryName) {
        // Switch to browse section
        this.showSection('browse');
        
        // Set category filter
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.value = categoryName;
            this.handleBrowseFilter();
        }
    }

    /**
     * Load browse section data
     */
    async loadBrowseData() {
        try {
            // Load categories for filter
            const categoriesData = await window.api.getCategories();
            this.populateCategoryFilter(categoriesData.data);

            // Load initial reviews
            await this.handleBrowseFilter();

        } catch (error) {
            console.error('Error loading browse data:', error);
            this.showToast('Error loading browse data', 'error');
        }
    }

    /**
     * Populate category filter dropdown
     */
    populateCategoryFilter(categories) {
        const filters = ['categoryFilter', 'searchCategory'];
        
        filters.forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (!filter) return;

            // Clear existing options (except first one)
            while (filter.children.length > 1) {
                filter.removeChild(filter.lastChild);
            }

            // Add category options
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = `${category.name} (${category.actual_count || 0})`;
                filter.appendChild(option);
            });
        });
    }

    /**
     * Handle browse filtering
     */
    async handleBrowseFilter() {
        const categoryFilter = document.getElementById('categoryFilter');
        const browseSearch = document.getElementById('browseSearch');
        
        const category = categoryFilter?.value || '';
        const searchTerm = browseSearch?.value?.trim() || '';

        this.showLoading(true);

        try {
            let reviewsData;
            
            if (category && !searchTerm) {
                // Filter by category only
                reviewsData = await window.api.getReviewsByCategory(category, {
                    limit: this.itemsPerPage,
                    offset: this.currentPage * this.itemsPerPage
                });
            } else if (searchTerm) {
                // Search with optional category filter
                let query = searchTerm;
                if (category) {
                    query += ` category:${category}`;
                }
                
                reviewsData = await window.api.searchReviews(query, {
                    limit: this.itemsPerPage,
                    offset: this.currentPage * this.itemsPerPage
                });
            } else {
                // Get all reviews
                reviewsData = await window.api.getAllReviews({
                    limit: this.itemsPerPage,
                    offset: this.currentPage * this.itemsPerPage
                });
            }

            this.displayReviews(reviewsData.data, 'browseList');
            this.updatePagination('browsePagination', reviewsData.data.length);

        } catch (error) {
            console.error('Error filtering reviews:', error);
            this.showToast('Error filtering reviews', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Display reviews in a container
     */
    displayReviews(reviews, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        if (reviews.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted mt-3">
                    <i class="fas fa-search fa-3x mb-2"></i>
                    <p>No se encontraron reviews.</p>
                </div>
            `;
            return;
        }

        reviews.forEach(review => {
            const reviewElement = this.createReviewElement(review);
            container.appendChild(reviewElement);
        });
    }

    /**
     * Create review element
     */
    createReviewElement(review) {
        const div = document.createElement('div');
        div.className = 'review-item';
        
        const authorsText = review.authors_list ? 
            `Autores: ${review.authors_list}` : 
            (review.authors && Array.isArray(review.authors) ? 
                `Autores: ${review.authors.join(', ')}` : '');

        div.innerHTML = `
            <div class="review-title">${review.title}</div>
            <div class="review-meta">
                ${review.category ? `<span class="review-category">${review.category}</span>` : ''}
                ${authorsText ? `<span class="review-authors">${authorsText}</span>` : ''}
            </div>
            ${review.abstract ? `<div class="review-abstract">${this.truncateText(review.abstract, 200)}</div>` : ''}
            <div class="review-actions">
                <button class="btn btn-primary view-review-btn" data-id="${review.id}">
                    <i class="fas fa-eye"></i> Ver Detalles
                </button>
                <small class="text-muted">
                    ${review.last_updated ? `Actualizado: ${new Date(review.last_updated).toLocaleDateString()}` : ''}
                </small>
            </div>
        `;

        // Add click event for viewing details
        const viewBtn = div.querySelector('.view-review-btn');
        viewBtn.addEventListener('click', () => {
            this.showReviewModal(review.id);
        });

        return div;
    }

    /**
     * Truncate text to specified length
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Show review details in modal
     */
    async showReviewModal(reviewId) {
        this.showLoading(true);

        try {
            const reviewData = await window.api.getReviewById(reviewId);
            const review = reviewData.data;

            // Update modal content
            const modalTitle = document.getElementById('modalTitle');
            const modalBody = document.getElementById('modalBody');

            if (modalTitle) modalTitle.textContent = review.title;

            if (modalBody) {
                modalBody.innerHTML = this.renderReviewContent(review);
            }

            // Show modal
            const modal = document.getElementById('reviewModal');
            if (modal) {
                modal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }

        } catch (error) {
            console.error('Error loading review details:', error);
            this.showToast('Error loading review details', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Render review content for modal
     */
    renderReviewContent(review) {
        let html = `
            <div class="review-content">
                <div class="review-meta mb-3">
                    ${review.category ? `<span class="review-category">${review.category}</span>` : ''}
                    ${review.authors && review.authors.length ? 
                        `<p class="mt-2"><strong>Autores:</strong> ${review.authors.join(', ')}</p>` : ''}
                    ${review.last_updated ? 
                        `<p><strong>Última actualización:</strong> ${new Date(review.last_updated).toLocaleDateString()}</p>` : ''}
                </div>

                ${review.abstract ? `
                    <div class="mb-3">
                        <h4><i class="fas fa-file-alt"></i> Resumen</h4>
                        <p>${review.abstract}</p>
                    </div>
                ` : ''}
        `;

        // Add sections
        if (review.content && review.content.sections && review.content.sections.length > 0) {
            html += `<h4><i class="fas fa-list"></i> Secciones</h4>`;
            
            review.content.sections.forEach(section => {
                if (section.content && section.content.trim()) {
                    html += `
                        <div class="section-content">
                            <h5>${section.title}</h5>
                            <p>${section.content}</p>
                        </div>
                    `;
                }
            });
        }

        // Add tables
        if (review.content && review.content.tables && review.content.tables.length > 0) {
            html += `<h4><i class="fas fa-table"></i> Tablas</h4>`;
            
            review.content.tables.forEach((table, index) => {
                html += `
                    <div class="mb-3">
                        ${table.caption ? `<h5>Tabla ${index + 1}: ${table.caption}</h5>` : `<h5>Tabla ${index + 1}</h5>`}
                        <table>
                            <thead>
                                <tr>
                                    ${table.headers.map(header => `<th>${header}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${table.rows.map(row => `
                                    <tr>
                                        ${row.map(cell => `<td>${cell}</td>`).join('')}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            });
        }

        // Add references
        if (review.content && review.content.references && review.content.references.length > 0) {
            html += `
                <h4><i class="fas fa-book"></i> Referencias</h4>
                <ol>
                    ${review.content.references.map(ref => `
                        <li>
                            ${ref.text}
                            ${ref.pmid ? `<a href="https://pubmed.ncbi.nlm.nih.gov/${ref.pmid}" target="_blank" class="text-primary"> (PMID: ${ref.pmid})</a>` : ''}
                        </li>
                    `).join('')}
                </ol>
            `;
        }

        html += `</div>`;
        return html;
    }

    /**
     * Hide modal
     */
    hideModal() {
        const modal = document.getElementById('reviewModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    /**
     * Handle quick search input
     */
    async handleQuickSearch(query) {
        if (!query || query.length < 2) {
            this.hideSuggestions();
            return;
        }

        try {
            const results = await window.api.searchReviews(query, { limit: 5 });
            this.showSuggestions(results.data);
        } catch (error) {
            console.error('Quick search error:', error);
        }
    }

    /**
     * Handle quick search submit
     */
    handleQuickSearchSubmit(query) {
        if (!query) return;

        // Switch to search section and perform search
        this.showSection('search');
        
        const searchInput = document.getElementById('searchQuery');
        if (searchInput) {
            searchInput.value = query;
            this.handleAdvancedSearch();
        }

        this.hideSuggestions();
    }

    /**
     * Show search suggestions
     */
    showSuggestions(suggestions) {
        const container = document.getElementById('quickSearchSuggestions');
        if (!container) return;

        if (suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        container.innerHTML = '';
        
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
                <div class="fw-bold">${suggestion.title}</div>
                ${suggestion.category ? `<small class="text-muted">${suggestion.category}</small>` : ''}
            `;
            
            item.addEventListener('click', () => {
                this.showReviewModal(suggestion.id);
                this.hideSuggestions();
            });

            container.appendChild(item);
        });

        container.style.display = 'block';
    }

    /**
     * Hide suggestions
     */
    hideSuggestions() {
        const container = document.getElementById('quickSearchSuggestions');
        if (container) {
            container.style.display = 'none';
        }
    }

    /**
     * Handle advanced search
     */
    async handleAdvancedSearch() {
        const query = document.getElementById('searchQuery')?.value?.trim();
        const category = document.getElementById('searchCategory')?.value || '';
        const searchType = document.getElementById('searchType')?.value || 'all';

        if (!query) {
            this.showToast('Por favor ingrese un término de búsqueda', 'error');
            return;
        }

        this.showLoading(true);

        try {
            let searchQuery = query;
            
            // Add category filter if selected
            if (category) {
                searchQuery += ` category:${category}`;
            }

            const results = await window.api.searchReviews(searchQuery, {
                type: searchType,
                limit: this.itemsPerPage,
                offset: 0
            });

            this.displaySearchResults(results);

        } catch (error) {
            console.error('Search error:', error);
            this.showToast('Error en la búsqueda', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Display search results
     */
    displaySearchResults(results) {
        const container = document.getElementById('searchResults');
        if (!container) return;

        container.innerHTML = `
            <div class="mb-3">
                <h4>Resultados de búsqueda</h4>
                <p class="text-muted">Se encontraron ${results.data.length} resultados</p>
            </div>
            <div id="searchResultsList" class="reviews-list"></div>
        `;

        this.displayReviews(results.data, 'searchResultsList');
    }

    /**
     * Load search section data
     */
    async loadSearchData() {
        try {
            const categoriesData = await window.api.getCategories();
            this.populateCategoryFilter(categoriesData.data);
        } catch (error) {
            console.error('Error loading search data:', error);
        }
    }

    /**
     * Load stats section data
     */
    async loadStatsData() {
        this.showLoading(true);

        try {
            const [statsData, categoriesData] = await Promise.all([
                window.api.getStats(),
                window.api.getCategories()
            ]);

            this.renderStatsDashboard(statsData.data, categoriesData.data);

        } catch (error) {
            console.error('Error loading stats:', error);
            this.showToast('Error loading statistics', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Render statistics dashboard
     */
    renderStatsDashboard(stats, categories) {
        const dashboard = document.getElementById('statsDashboard');
        if (!dashboard) return;

        dashboard.innerHTML = `
            <div class="stats-section">
                <h3>Resumen General</h3>
                <div class="quick-stats">
                    <div class="stat-item">
                        <div class="stat-number">${stats.totalReviews}</div>
                        <div class="stat-label">Total Reviews</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${stats.totalCategories}</div>
                        <div class="stat-label">Categorías</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${new Date(stats.lastUpdated).toLocaleDateString()}</div>
                        <div class="stat-label">Última Actualización</div>
                    </div>
                </div>
            </div>

            <div class="stats-section">
                <h3>Distribución por Categorías</h3>
                <div class="categories-grid">
                    ${categories.map(cat => `
                        <div class="category-card">
                            <h4>${cat.name}</h4>
                            <p class="review-count">${cat.actual_count || 0} reviews</p>
                            <div class="mt-2">
                                <div style="width: 100%; background: #e9ecef; border-radius: 10px; height: 8px;">
                                    <div style="width: ${(cat.actual_count / stats.totalReviews * 100).toFixed(1)}%; background: #667eea; height: 100%; border-radius: 10px;"></div>
                                </div>
                                <small class="text-muted">${(cat.actual_count / stats.totalReviews * 100).toFixed(1)}% del total</small>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Update pagination
     */
    updatePagination(containerId, itemsCount) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const hasNext = itemsCount === this.itemsPerPage;
        const hasPrev = this.currentPage > 0;

        container.innerHTML = `
            <button ${!hasPrev ? 'disabled' : ''} data-action="prev">
                <i class="fas fa-chevron-left"></i> Anterior
            </button>
            <button class="active">${this.currentPage + 1}</button>
            <button ${!hasNext ? 'disabled' : ''} data-action="next">
                Siguiente <i class="fas fa-chevron-right"></i>
            </button>
        `;

        // Add event listeners
        container.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.action === 'next' && hasNext) {
                    this.currentPage++;
                } else if (btn.dataset.action === 'prev' && hasPrev) {
                    this.currentPage--;
                }
                
                // Reload current section data
                this.loadSectionData(this.currentSection);
            });
        });
    }

    /**
     * Show/hide loading spinner
     */
    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
            ${message}
        `;

        container.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }
}

// Initialize UI Controller
window.ui = new UIController();