/**
 * Advanced Search Controller for GeneReviews Database
 * Handles complex search functionality and filtering
 */
class SearchController {
    constructor() {
        this.searchHistory = this.loadSearchHistory();
        this.maxHistoryItems = 10;
        this.searchFilters = {
            category: '',
            dateRange: '',
            authors: '',
            contentType: 'all'
        };
    }

    /**
     * Load search history from localStorage
     */
    loadSearchHistory() {
        try {
            const history = localStorage.getItem('genereviews_search_history');
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('Error loading search history:', error);
            return [];
        }
    }

    /**
     * Save search history to localStorage
     */
    saveSearchHistory() {
        try {
            localStorage.setItem('genereviews_search_history', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.error('Error saving search history:', error);
        }
    }

    /**
     * Add search query to history
     */
    addToHistory(query, filters = {}) {
        if (!query.trim()) return;

        const searchItem = {
            query: query.trim(),
            filters: { ...filters },
            timestamp: new Date().toISOString(),
            id: Date.now()
        };

        // Remove duplicate if exists
        this.searchHistory = this.searchHistory.filter(item => 
            item.query !== searchItem.query || 
            JSON.stringify(item.filters) !== JSON.stringify(searchItem.filters)
        );

        // Add to beginning
        this.searchHistory.unshift(searchItem);

        // Limit history size
        if (this.searchHistory.length > this.maxHistoryItems) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistoryItems);
        }

        this.saveSearchHistory();
    }

    /**
     * Get search suggestions based on query
     */
    async getSearchSuggestions(query) {
        if (!query || query.length < 2) return [];

        try {
            // Get suggestions from API
            const results = await window.api.searchReviews(query, { 
                limit: 8 
            });

            // Extract unique titles and keywords
            const suggestions = [];
            const seen = new Set();

            results.data.forEach(review => {
                // Add title if not seen
                const title = review.title.toLowerCase();
                if (!seen.has(title) && title.includes(query.toLowerCase())) {
                    suggestions.push({
                        type: 'title',
                        text: review.title,
                        id: review.id,
                        category: review.category
                    });
                    seen.add(title);
                }

                // Add category if not seen
                if (review.category) {
                    const category = review.category.toLowerCase();
                    if (!seen.has(category) && category.includes(query.toLowerCase())) {
                        suggestions.push({
                            type: 'category',
                            text: review.category,
                            count: 1 // This would need to be calculated properly
                        });
                        seen.add(category);
                    }
                }
            });

            // Add search history suggestions
            const historyMatches = this.searchHistory
                .filter(item => item.query.toLowerCase().includes(query.toLowerCase()))
                .slice(0, 3)
                .map(item => ({
                    type: 'history',
                    text: item.query,
                    timestamp: item.timestamp
                }));

            return [...suggestions.slice(0, 5), ...historyMatches];

        } catch (error) {
            console.error('Error getting search suggestions:', error);
            return [];
        }
    }

    /**
     * Parse search query for advanced operators
     */
    parseSearchQuery(query) {
        const parsed = {
            terms: [],
            category: '',
            author: '',
            title: '',
            exact: [],
            exclude: []
        };

        // Split query into parts
        const parts = query.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
        
        parts.forEach(part => {
            if (part.startsWith('category:')) {
                parsed.category = part.substring(9).replace(/"/g, '');
            } else if (part.startsWith('author:')) {
                parsed.author = part.substring(7).replace(/"/g, '');
            } else if (part.startsWith('title:')) {
                parsed.title = part.substring(6).replace(/"/g, '');
            } else if (part.startsWith('-')) {
                parsed.exclude.push(part.substring(1).replace(/"/g, ''));
            } else if (part.startsWith('"') && part.endsWith('"')) {
                parsed.exact.push(part.slice(1, -1));
            } else {
                parsed.terms.push(part.replace(/"/g, ''));
            }
        });

        return parsed;
    }

    /**
     * Build search query from filters
     */
    buildSearchQuery(baseQuery, filters) {
        let query = baseQuery.trim();

        if (filters.category) {
            query += ` category:"${filters.category}"`;
        }

        if (filters.authors) {
            query += ` author:"${filters.authors}"`;
        }

        return query.trim();
    }

    /**
     * Perform advanced search with filters
     */
    async performAdvancedSearch(query, filters = {}) {
        if (!query.trim()) {
            throw new Error('Search query cannot be empty');
        }

        // Add to search history
        this.addToHistory(query, filters);

        // Build final search query
        const searchQuery = this.buildSearchQuery(query, filters);

        try {
            const results = await window.api.searchReviews(searchQuery, {
                limit: filters.limit || 50,
                offset: filters.offset || 0
            });

            return {
                ...results,
                parsedQuery: this.parseSearchQuery(searchQuery),
                appliedFilters: filters
            };

        } catch (error) {
            console.error('Advanced search error:', error);
            throw error;
        }
    }

    /**
     * Get search analytics
     */
    getSearchAnalytics() {
        const analytics = {
            totalSearches: this.searchHistory.length,
            mostSearchedTerms: {},
            searchesByCategory: {},
            recentSearches: this.searchHistory.slice(0, 5)
        };

        // Analyze search patterns
        this.searchHistory.forEach(search => {
            // Count search terms
            const terms = search.query.toLowerCase().split(' ');
            terms.forEach(term => {
                if (term.length > 2) {
                    analytics.mostSearchedTerms[term] = (analytics.mostSearchedTerms[term] || 0) + 1;
                }
            });

            // Count category searches
            if (search.filters.category) {
                const cat = search.filters.category;
                analytics.searchesByCategory[cat] = (analytics.searchesByCategory[cat] || 0) + 1;
            }
        });

        // Sort most searched terms
        analytics.mostSearchedTerms = Object.entries(analytics.mostSearchedTerms)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .reduce((obj, [term, count]) => {
                obj[term] = count;
                return obj;
            }, {});

        return analytics;
    }

    /**
     * Clear search history
     */
    clearSearchHistory() {
        this.searchHistory = [];
        this.saveSearchHistory();
    }

    /**
     * Export search history
     */
    exportSearchHistory() {
        const data = {
            exported: new Date().toISOString(),
            history: this.searchHistory,
            analytics: this.getSearchAnalytics()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `genereviews_search_history_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Get popular search suggestions
     */
    getPopularSuggestions() {
        const analytics = this.getSearchAnalytics();
        return Object.entries(analytics.mostSearchedTerms)
            .slice(0, 5)
            .map(([term, count]) => ({
                type: 'popular',
                text: term,
                count
            }));
    }

    /**
     * Validate search query
     */
    validateSearchQuery(query) {
        const errors = [];
        
        if (!query || query.trim().length === 0) {
            errors.push('Search query cannot be empty');
        }

        if (query.length > 500) {
            errors.push('Search query is too long (max 500 characters)');
        }

        // Check for potentially problematic patterns
        if (query.includes('*'.repeat(5))) {
            errors.push('Too many wildcard characters');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get search tips
     */
    getSearchTips() {
        return [
            {
                title: 'Búsqueda por categoría',
                description: 'Use "category:nombre" para buscar en una categoría específica',
                example: 'category:"Genetic Disorders"'
            },
            {
                title: 'Búsqueda por autor',
                description: 'Use "author:nombre" para buscar por autor',
                example: 'author:"Smith"'
            },
            {
                title: 'Frases exactas',
                description: 'Use comillas dobles para buscar frases exactas',
                example: '"cystic fibrosis"'
            },
            {
                title: 'Excluir términos',
                description: 'Use el signo menos para excluir términos',
                example: 'genetics -cancer'
            },
            {
                title: 'Combinación de filtros',
                description: 'Combine múltiples operadores para búsquedas precisas',
                example: 'category:"Genetic Disorders" author:"Jones" "muscular dystrophy"'
            }
        ];
    }
}

// Initialize Search Controller
window.search = new SearchController();