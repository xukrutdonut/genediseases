const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

class GeneReviewsScraper {
    constructor() {
        this.baseUrl = 'https://www.ncbi.nlm.nih.gov';
        this.startUrl = 'https://www.ncbi.nlm.nih.gov/books/NBK1116/';
        this.data = {
            categories: [],
            reviews: [],
            metadata: {
                scrapedAt: new Date().toISOString(),
                totalReviews: 0,
                totalCategories: 0
            }
        };
        this.visited = new Set();
        this.delay = process.env.SCRAPER_DELAY || 2000; // 2 segundos para RPi5 (más conservador)
        this.maxRetries = process.env.SCRAPER_MAX_RETRIES || 2; // Menos reintentos en RPi5
        this.timeout = process.env.SCRAPER_TIMEOUT || 15000; // 15 segundos timeout para RPi5
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async fetchWithRetry(url, maxRetries = null) {
        const retries = maxRetries || this.maxRetries;
        for (let i = 0; i < retries; i++) {
            try {
                console.log(`Fetching: ${url} (attempt ${i + 1}/${retries})`);
                const response = await axios.get(url, {
                    timeout: this.timeout,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; GeneReviewsBot/1.0; Educational Purpose)'
                    }
                });
                return response.data;
            } catch (error) {
                console.error(`Attempt ${i + 1} failed for ${url}:`, error.message);
                if (i === maxRetries - 1) throw error;
                await this.sleep(2000 * (i + 1));
            }
        }
    }

    extractMetadata($) {
        const title = $('h1').first().text().trim();
        const lastUpdated = $('.last-update').text().trim() || 
                          $('meta[name="last-updated"]').attr('content') || '';
        const authors = [];
        
        // Extraer autores
        $('.author, .authors').each((i, el) => {
            const author = $(el).text().trim();
            if (author) authors.push(author);
        });

        // Extraer abstract/summary
        const abstract = $('.summary, .abstract, .description').first().text().trim();
        
        return {
            title,
            lastUpdated,
            authors,
            abstract
        };
    }

    async scrapeReviewPage(url) {
        if (this.visited.has(url)) return null;
        this.visited.add(url);

        try {
            const html = await this.fetchWithRetry(url);
            const $ = cheerio.load(html);
            
            const metadata = this.extractMetadata($);
            
            // Extraer contenido principal
            const content = {
                sections: [],
                tables: [],
                figures: [],
                references: []
            };

            // Extraer secciones
            $('h2, h3, h4').each((i, el) => {
                const $el = $(el);
                const level = parseInt(el.tagName.charAt(1));
                const title = $el.text().trim();
                const id = $el.attr('id') || `section-${i}`;
                
                // Obtener contenido de la sección
                let sectionContent = '';
                let $next = $el.next();
                while ($next.length && !$next.is('h1,h2,h3,h4,h5,h6')) {
                    sectionContent += $next.text() + '\n';
                    $next = $next.next();
                }

                content.sections.push({
                    level,
                    title,
                    id,
                    content: sectionContent.trim()
                });
            });

            // Extraer tablas
            $('table').each((i, el) => {
                const $table = $(el);
                const caption = $table.find('caption').text().trim();
                const headers = [];
                const rows = [];

                $table.find('thead tr th, tbody tr:first-child th').each((j, th) => {
                    headers.push($(th).text().trim());
                });

                $table.find('tbody tr').each((j, tr) => {
                    const row = [];
                    $(tr).find('td').each((k, td) => {
                        row.push($(td).text().trim());
                    });
                    if (row.length > 0) rows.push(row);
                });

                content.tables.push({
                    caption,
                    headers,
                    rows
                });
            });

            // Extraer referencias
            $('#references li, .reference-list li, .references li').each((i, el) => {
                const $el = $(el);
                const text = $el.text().trim();
                const pmid = $el.find('a[href*="pubmed"]').attr('href')?.match(/\/(\d+)\/?$/)?.[1];
                
                if (text) {
                    content.references.push({
                        text,
                        pmid: pmid || null
                    });
                }
            });

            return {
                url,
                ...metadata,
                content,
                scrapedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error(`Error scraping review ${url}:`, error.message);
            return null;
        }
    }

    async scrapeTableOfContents() {
        try {
            const html = await this.fetchWithRetry(this.startUrl);
            const $ = cheerio.load(html);
            
            console.log('Scraping table of contents...');
            
            // Buscar enlaces a reviews individuales
            const reviewLinks = [];
            
            // Diferentes selectores para encontrar los enlaces
            const selectors = [
                'a[href*="/books/NBK"]',
                '.toc a',
                '.content-area a[href*="NBK"]',
                'ul li a[href*="/books/NBK"]'
            ];

            selectors.forEach(selector => {
                $(selector).each((i, el) => {
                    const $link = $(el);
                    const href = $link.attr('href');
                    const text = $link.text().trim();
                    
                    if (href && text && href.includes('NBK') && !href.includes('NBK1116')) {
                        const fullUrl = href.startsWith('http') ? href : this.baseUrl + href;
                        reviewLinks.push({
                            title: text,
                            url: fullUrl,
                            category: $link.closest('ul').prev('h2, h3').text().trim() || 'General'
                        });
                    }
                });
            });

            // Remover duplicados
            const uniqueLinks = reviewLinks.filter((link, index, self) => 
                index === self.findIndex(l => l.url === link.url)
            );

            console.log(`Found ${uniqueLinks.length} review links`);
            return uniqueLinks;

        } catch (error) {
            console.error('Error scraping table of contents:', error);
            return [];
        }
    }

    async scrapeAll() {
        console.log('Starting GeneReviews scraping...');
        
        try {
            // Obtener tabla de contenidos
            const reviewLinks = await this.scrapeTableOfContents();
            
            if (reviewLinks.length === 0) {
                console.log('No review links found. Trying alternative approach...');
                // Approach alternativo: scraper más básico
                return await this.basicScrape();
            }

            // Organizar por categorías
            const categories = {};
            reviewLinks.forEach(link => {
                if (!categories[link.category]) {
                    categories[link.category] = [];
                }
                categories[link.category].push(link);
            });

            this.data.categories = Object.keys(categories).map(cat => ({
                name: cat,
                reviews: categories[cat].length
            }));

            // Scraper un subconjunto para testing (primeros 20)
            const linksToScrape = reviewLinks.slice(0, 20);
            console.log(`Scraping ${linksToScrape.length} reviews (limited for testing)...`);

            for (const [index, link] of linksToScrape.entries()) {
                console.log(`Processing ${index + 1}/${linksToScrape.length}: ${link.title}`);
                
                const reviewData = await this.scrapeReviewPage(link.url);
                if (reviewData) {
                    reviewData.category = link.category;
                    this.data.reviews.push(reviewData);
                }
                
                // Delay entre requests
                await this.sleep(this.delay);
                
                // Progress update
                if ((index + 1) % 5 === 0) {
                    await this.saveProgress();
                }
            }

            this.data.metadata.totalReviews = this.data.reviews.length;
            this.data.metadata.totalCategories = this.data.categories.length;
            
            console.log('Scraping completed successfully!');
            return this.data;

        } catch (error) {
            console.error('Error during scraping:', error);
            throw error;
        }
    }

    async basicScrape() {
        console.log('Using basic scraping approach...');
        
        try {
            const html = await this.fetchWithRetry(this.startUrl);
            const $ = cheerio.load(html);
            
            // Extraer información básica de la página principal
            const mainContent = {
                title: $('h1').first().text().trim() || 'GeneReviews',
                description: $('.summary, .description, .overview').first().text().trim(),
                lastUpdated: new Date().toISOString()
            };

            // Crear una entrada básica
            this.data.reviews.push({
                url: this.startUrl,
                ...mainContent,
                content: {
                    sections: [{
                        level: 1,
                        title: mainContent.title,
                        content: mainContent.description
                    }],
                    tables: [],
                    figures: [],
                    references: []
                },
                category: 'Main',
                scrapedAt: new Date().toISOString()
            });

            this.data.categories.push({
                name: 'Main',
                reviews: 1
            });

            this.data.metadata.totalReviews = 1;
            this.data.metadata.totalCategories = 1;

            return this.data;

        } catch (error) {
            console.error('Basic scraping failed:', error);
            throw error;
        }
    }

    async saveProgress() {
        const outputPath = path.join(__dirname, '..', 'database', 'genereviews-data.json');
        await fs.writeFile(outputPath, JSON.stringify(this.data, null, 2));
        console.log(`Progress saved: ${this.data.reviews.length} reviews scraped`);
    }

    async saveData() {
        try {
            await fs.mkdir(path.join(__dirname, '..', 'database'), { recursive: true });
            
            const outputPath = path.join(__dirname, '..', 'database', 'genereviews-data.json');
            await fs.writeFile(outputPath, JSON.stringify(this.data, null, 2));
            
            console.log(`Data saved to: ${outputPath}`);
            console.log(`Total reviews: ${this.data.reviews.length}`);
            console.log(`Total categories: ${this.data.categories.length}`);
            
            return outputPath;
        } catch (error) {
            console.error('Error saving data:', error);
            throw error;
        }
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const scraper = new GeneReviewsScraper();
    
    scraper.scrapeAll()
        .then(() => scraper.saveData())
        .then(() => {
            console.log('Scraping process completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Scraping failed:', error);
            process.exit(1);
        });
}

module.exports = GeneReviewsScraper;