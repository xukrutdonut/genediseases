const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class GeneReviewsDatabase {
    constructor() {
        this.dbPath = path.join(__dirname, 'genereviews.db');
        this.db = null;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    reject(err);
                } else {
                    console.log('Database connected successfully');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    async createTables() {
        const createTablesSQL = `
            -- Tabla principal de reviews
            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                abstract TEXT,
                last_updated TEXT,
                category TEXT,
                scraped_at TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            -- Tabla de autores
            CREATE TABLE IF NOT EXISTS authors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                review_id INTEGER,
                name TEXT NOT NULL,
                FOREIGN KEY (review_id) REFERENCES reviews (id)
            );

            -- Tabla de secciones
            CREATE TABLE IF NOT EXISTS sections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                review_id INTEGER,
                level INTEGER,
                title TEXT NOT NULL,
                content TEXT,
                section_id TEXT,
                order_index INTEGER,
                FOREIGN KEY (review_id) REFERENCES reviews (id)
            );

            -- Tabla de tablas (datos tabulares)
            CREATE TABLE IF NOT EXISTS data_tables (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                review_id INTEGER,
                caption TEXT,
                headers TEXT, -- JSON array
                rows TEXT,    -- JSON array
                table_index INTEGER,
                FOREIGN KEY (review_id) REFERENCES reviews (id)
            );

            -- Tabla de referencias bibliográficas
            CREATE TABLE IF NOT EXISTS review_references (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                review_id INTEGER,
                text TEXT NOT NULL,
                pmid TEXT,
                reference_index INTEGER,
                FOREIGN KEY (review_id) REFERENCES reviews (id)
            );

            -- Tabla de categorías
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                review_count INTEGER DEFAULT 0
            );

            -- Índices para búsquedas rápidas
            CREATE INDEX IF NOT EXISTS idx_reviews_title ON reviews(title);
            CREATE INDEX IF NOT EXISTS idx_reviews_category ON reviews(category);
            CREATE INDEX IF NOT EXISTS idx_sections_title ON sections(title);
            CREATE INDEX IF NOT EXISTS idx_sections_content ON sections(content);
            CREATE INDEX IF NOT EXISTS idx_authors_name ON authors(name);
            
            -- Tabla para búsqueda de texto completo
            CREATE VIRTUAL TABLE IF NOT EXISTS reviews_fts USING fts5(
                title, abstract, content, authors, category,
                content='',
                contentless_delete=1
            );
        `;

        return new Promise((resolve, reject) => {
            this.db.exec(createTablesSQL, (err) => {
                if (err) {
                    console.error('Error creating tables:', err);
                    reject(err);
                } else {
                    console.log('Database tables created successfully');
                    resolve();
                }
            });
        });
    }

    async insertReview(reviewData) {
        const insertReview = `
            INSERT OR REPLACE INTO reviews 
            (url, title, abstract, last_updated, category, scraped_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        return new Promise((resolve, reject) => {
            this.db.run(insertReview, [
                reviewData.url,
                reviewData.title,
                reviewData.abstract,
                reviewData.lastUpdated,
                reviewData.category,
                reviewData.scrapedAt
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    async insertAuthors(reviewId, authors) {
        if (!authors || authors.length === 0) return;

        const insertAuthor = `INSERT INTO authors (review_id, name) VALUES (?, ?)`;
        
        for (const author of authors) {
            await new Promise((resolve, reject) => {
                this.db.run(insertAuthor, [reviewId, author], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
    }

    async insertSections(reviewId, sections) {
        if (!sections || sections.length === 0) return;

        const insertSection = `
            INSERT INTO sections (review_id, level, title, content, section_id, order_index)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            await new Promise((resolve, reject) => {
                this.db.run(insertSection, [
                    reviewId,
                    section.level,
                    section.title,
                    section.content,
                    section.id,
                    i
                ], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
    }

    async insertTables(reviewId, tables) {
        if (!tables || tables.length === 0) return;

        const insertTable = `
            INSERT INTO data_tables (review_id, caption, headers, rows, table_index)
            VALUES (?, ?, ?, ?, ?)
        `;

        for (let i = 0; i < tables.length; i++) {
            const table = tables[i];
            await new Promise((resolve, reject) => {
                this.db.run(insertTable, [
                    reviewId,
                    table.caption,
                    JSON.stringify(table.headers),
                    JSON.stringify(table.rows),
                    i
                ], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
    }

    async insertReferences(reviewId, references) {
        if (!references || references.length === 0) return;

        const insertRef = `
            INSERT INTO review_references (review_id, text, pmid, reference_index)
            VALUES (?, ?, ?, ?)
        `;

        for (let i = 0; i < references.length; i++) {
            const ref = references[i];
            await new Promise((resolve, reject) => {
                this.db.run(insertRef, [
                    reviewId,
                    ref.text,
                    ref.pmid,
                    i
                ], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
    }

    async insertFullReviewData(reviewData) {
        try {
            const reviewId = await this.insertReview(reviewData);
            
            if (reviewData.authors) {
                await this.insertAuthors(reviewId, reviewData.authors);
            }
            
            if (reviewData.content) {
                if (reviewData.content.sections) {
                    await this.insertSections(reviewId, reviewData.content.sections);
                }
                
                if (reviewData.content.tables) {
                    await this.insertTables(reviewId, reviewData.content.tables);
                }
                
                if (reviewData.content.references) {
                    await this.insertReferences(reviewId, reviewData.content.references);
                }
            }

            // Actualizar índice de búsqueda de texto completo
            await this.updateFullTextSearch(reviewId, reviewData);

            return reviewId;
        } catch (error) {
            console.error('Error inserting review data:', error);
            throw error;
        }
    }

    async updateFullTextSearch(reviewId, reviewData) {
        const content = reviewData.content ? 
            reviewData.content.sections?.map(s => s.content).join(' ') || '' : '';
        const authors = reviewData.authors ? reviewData.authors.join(', ') : '';

        const insertFTS = `
            INSERT INTO reviews_fts (rowid, title, abstract, content, authors, category)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        return new Promise((resolve, reject) => {
            this.db.run(insertFTS, [
                reviewId,
                reviewData.title || '',
                reviewData.abstract || '',
                content,
                authors,
                reviewData.category || ''
            ], (err) => {
                if (err && !err.message.includes('UNIQUE constraint failed')) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async loadDataFromJSON(jsonPath) {
        try {
            const data = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
            
            console.log(`Loading ${data.reviews.length} reviews into database...`);
            
            // Insertar categorías
            for (const category of data.categories) {
                await new Promise((resolve, reject) => {
                    this.db.run(
                        'INSERT OR REPLACE INTO categories (name, review_count) VALUES (?, ?)',
                        [category.name, category.reviews],
                        (err) => err ? reject(err) : resolve()
                    );
                });
            }

            // Insertar reviews
            let processed = 0;
            for (const review of data.reviews) {
                await this.insertFullReviewData(review);
                processed++;
                
                if (processed % 10 === 0) {
                    console.log(`Processed ${processed}/${data.reviews.length} reviews`);
                }
            }

            console.log('Data loaded successfully into database');
            return { success: true, reviewsLoaded: processed };

        } catch (error) {
            console.error('Error loading data from JSON:', error);
            throw error;
        }
    }

    // Métodos de consulta
    async searchReviews(query, limit = 20, offset = 0) {
        const searchSQL = `
            SELECT DISTINCT r.*, 
                   GROUP_CONCAT(a.name) as authors_list
            FROM reviews r
            LEFT JOIN authors a ON r.id = a.review_id
            WHERE r.title LIKE ? OR r.abstract LIKE ? OR r.category LIKE ?
               OR EXISTS (
                   SELECT 1 FROM sections s 
                   WHERE s.review_id = r.id AND (s.title LIKE ? OR s.content LIKE ?)
               )
               OR EXISTS (
                   SELECT 1 FROM authors auth 
                   WHERE auth.review_id = r.id AND auth.name LIKE ?
               )
            GROUP BY r.id
            ORDER BY r.title
            LIMIT ? OFFSET ?
        `;

        const searchTerm = `%${query}%`;
        
        return new Promise((resolve, reject) => {
            this.db.all(searchSQL, [
                searchTerm, searchTerm, searchTerm, 
                searchTerm, searchTerm, searchTerm,
                limit, offset
            ], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async getReviewById(id) {
        const reviewSQL = `SELECT * FROM reviews WHERE id = ?`;
        const sectionsSQL = `SELECT * FROM sections WHERE review_id = ? ORDER BY order_index`;
        const authorsSQL = `SELECT * FROM authors WHERE review_id = ?`;
        const tablesSQL = `SELECT * FROM data_tables WHERE review_id = ? ORDER BY table_index`;
        const referencesSQL = `SELECT * FROM review_references WHERE review_id = ? ORDER BY reference_index`;

        const review = await new Promise((resolve, reject) => {
            this.db.get(reviewSQL, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!review) return null;

        const [sections, authors, tables, references] = await Promise.all([
            new Promise((resolve, reject) => {
                this.db.all(sectionsSQL, [id], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            }),
            new Promise((resolve, reject) => {
                this.db.all(authorsSQL, [id], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows.map(r => r.name));
                });
            }),
            new Promise((resolve, reject) => {
                this.db.all(tablesSQL, [id], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows.map(r => ({
                        ...r,
                        headers: JSON.parse(r.headers || '[]'),
                        rows: JSON.parse(r.rows || '[]')
                    })));
                });
            }),
            new Promise((resolve, reject) => {
                this.db.all(referencesSQL, [id], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            })
        ]);

        return {
            ...review,
            authors,
            content: {
                sections,
                tables,
                references
            }
        };
    }

    async getAllCategories() {
        const sql = `
            SELECT c.*, COUNT(r.id) as actual_count 
            FROM categories c 
            LEFT JOIN reviews r ON c.name = r.category 
            GROUP BY c.id
            ORDER BY c.name
        `;
        
        return new Promise((resolve, reject) => {
            this.db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async getReviewsByCategory(category, limit = 50, offset = 0) {
        const sql = `
            SELECT r.*, GROUP_CONCAT(a.name) as authors_list
            FROM reviews r
            LEFT JOIN authors a ON r.id = a.review_id
            WHERE r.category = ?
            GROUP BY r.id
            ORDER BY r.title
            LIMIT ? OFFSET ?
        `;
        
        return new Promise((resolve, reject) => {
            this.db.all(sql, [category, limit, offset], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async close() {
        if (this.db) {
            return new Promise((resolve, reject) => {
                this.db.close((err) => {
                    if (err) reject(err);
                    else {
                        console.log('Database connection closed');
                        resolve();
                    }
                });
            });
        }
    }
}

module.exports = GeneReviewsDatabase;