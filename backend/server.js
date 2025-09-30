const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const GeneReviewsDatabase = require('../database/database');

class GeneReviewsServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.db = new GeneReviewsDatabase();
        
        // Configuraciones específicas para Raspberry Pi 5
        this.isRaspberryPi = this.detectRaspberryPi();
        if (this.isRaspberryPi) {
            console.log('🍓 Raspberry Pi detected - applying optimizations');
            // Configurar límites más conservadores para RPi
            process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '2';
        }
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    /**
     * Detect if running on Raspberry Pi
     */
    detectRaspberryPi() {
        try {
            const os = require('os');
            const arch = os.arch();
            const platform = os.platform();
            
            // Check for ARM architecture on Linux
            if (platform === 'linux' && (arch === 'arm' || arch === 'arm64' || arch === 'aarch64')) {
                // Additional check for Raspberry Pi specific indicators
                const fs = require('fs');
                try {
                    const cpuinfo = fs.readFileSync('/proc/cpuinfo', 'utf8');
                    return cpuinfo.includes('Raspberry Pi') || cpuinfo.includes('BCM');
                } catch (error) {
                    // If can't read cpuinfo, assume RPi based on ARM + Linux
                    return true;
                }
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    setupMiddleware() {
        // Security and performance middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                }
            }
        }));
        this.app.use(compression());
        this.app.use(cors());
        this.app.use(morgan('combined'));
        
        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // Serve static files
        this.app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));
    }

    setupRoutes() {
        // API Routes
        
        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        });

        // Get all categories
        this.app.get('/api/categories', async (req, res) => {
            try {
                const categories = await this.db.getAllCategories();
                res.json({
                    success: true,
                    data: categories
                });
            } catch (error) {
                console.error('Error fetching categories:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        });

        // Search reviews
        this.app.get('/api/search', async (req, res) => {
            try {
                const { q: query, limit = 20, offset = 0 } = req.query;
                
                if (!query) {
                    return res.status(400).json({
                        success: false,
                        error: 'Query parameter "q" is required'
                    });
                }

                const reviews = await this.db.searchReviews(
                    query, 
                    parseInt(limit), 
                    parseInt(offset)
                );

                res.json({
                    success: true,
                    data: reviews,
                    query,
                    pagination: {
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        count: reviews.length
                    }
                });
            } catch (error) {
                console.error('Error searching reviews:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        });

        // Get reviews by category
        this.app.get('/api/categories/:category/reviews', async (req, res) => {
            try {
                const { category } = req.params;
                const { limit = 50, offset = 0 } = req.query;

                const reviews = await this.db.getReviewsByCategory(
                    category,
                    parseInt(limit),
                    parseInt(offset)
                );

                res.json({
                    success: true,
                    data: reviews,
                    category,
                    pagination: {
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        count: reviews.length
                    }
                });
            } catch (error) {
                console.error('Error fetching reviews by category:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        });

        // Get specific review by ID
        this.app.get('/api/reviews/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const review = await this.db.getReviewById(parseInt(id));

                if (!review) {
                    return res.status(404).json({
                        success: false,
                        error: 'Review not found'
                    });
                }

                res.json({
                    success: true,
                    data: review
                });
            } catch (error) {
                console.error('Error fetching review:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        });

        // Get all reviews (with pagination)
        this.app.get('/api/reviews', async (req, res) => {
            try {
                const { limit = 50, offset = 0 } = req.query;
                
                // Use search with empty query to get all
                const reviews = await this.db.searchReviews(
                    '', 
                    parseInt(limit), 
                    parseInt(offset)
                );

                res.json({
                    success: true,
                    data: reviews,
                    pagination: {
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        count: reviews.length
                    }
                });
            } catch (error) {
                console.error('Error fetching all reviews:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        });

        // Statistics endpoint
        this.app.get('/api/stats', async (req, res) => {
            try {
                // Get basic statistics
                const categories = await this.db.getAllCategories();
                const totalCategories = categories.length;
                const totalReviews = categories.reduce((sum, cat) => sum + (cat.actual_count || 0), 0);

                res.json({
                    success: true,
                    data: {
                        totalReviews,
                        totalCategories,
                        categoriesBreakdown: categories,
                        lastUpdated: new Date().toISOString()
                    }
                });
            } catch (error) {
                console.error('Error fetching statistics:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        });

        // Administrative routes (for data management)
        
        // Load data from JSON (for initial setup)
        this.app.post('/api/admin/load-data', async (req, res) => {
            try {
                const jsonPath = path.join(__dirname, '..', 'database', 'genereviews-data.json');
                const result = await this.db.loadDataFromJSON(jsonPath);
                
                res.json({
                    success: true,
                    message: 'Data loaded successfully',
                    data: result
                });
            } catch (error) {
                console.error('Error loading data:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
    }

    setupErrorHandling() {
        // Global error handler
        this.app.use((err, req, res, next) => {
            console.error('Unhandled error:', err);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        });
        
        // Serve frontend for non-API routes
        this.app.use((req, res, next) => {
            if (req.method === 'GET' && !req.path.startsWith('/api/')) {
                res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'index.html'));
            } else {
                res.status(404).json({
                    success: false,
                    error: 'Endpoint not found'
                });
            }
        });
    }

    async initialize() {
        try {
            await this.db.initialize();
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`🚀 GeneReviews Server running on port ${this.port}`);
            console.log(`📖 API Documentation: http://localhost:${this.port}/api/health`);
            console.log(`🌐 Web Interface: http://localhost:${this.port}`);
        });
    }

    async shutdown() {
        console.log('Shutting down server...');
        await this.db.close();
        process.exit(0);
    }
}

// Graceful shutdown handling
process.on('SIGTERM', async () => {
    if (server) {
        await server.shutdown();
    }
});

process.on('SIGINT', async () => {
    if (server) {
        await server.shutdown();
    }
});

// Start server if called directly
if (require.main === module) {
    const server = new GeneReviewsServer();
    
    server.initialize()
        .then(() => {
            server.start();
        })
        .catch(error => {
            console.error('Failed to start server:', error);
            process.exit(1);
        });
}

module.exports = GeneReviewsServer;