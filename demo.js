#!/usr/bin/env node

/**
 * Script de demostración para GeneReviews Database
 * Ejecuta una demostración completa del sistema
 */

const GeneReviewsScraper = require('./scraper/genereviews-scraper');
const GeneReviewsDatabase = require('./database/database');
const axios = require('axios');

class GeneReviewsDemo {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
        this.scraper = new GeneReviewsScraper();
        this.db = new GeneReviewsDatabase();
    }

    async run() {
        console.log('🧬 Iniciando demostración de GeneReviews Database');
        console.log('=' .repeat(60));

        try {
            // 1. Verificar que el servidor esté funcionando
            await this.checkServer();

            // 2. Ejecutar scraping de demostración
            await this.runScraping();

            // 3. Cargar datos en la base de datos
            await this.loadData();

            // 4. Demostrar funcionalidades de la API
            await this.demonstrateAPI();

            // 5. Mostrar estadísticas finales
            await this.showFinalStats();

            console.log('\n✅ Demostración completada exitosamente!');
            console.log('🌐 Visite http://localhost:3000 para explorar la interfaz web');

        } catch (error) {
            console.error('❌ Error en la demostración:', error.message);
            process.exit(1);
        }
    }

    async checkServer() {
        console.log('\n1️⃣ Verificando servidor...');
        
        try {
            const response = await axios.get(`${this.baseUrl}/api/health`);
            if (response.data.status === 'ok') {
                console.log('   ✅ Servidor funcionando correctamente');
            } else {
                throw new Error('Servidor no responde correctamente');
            }
        } catch (error) {
            throw new Error('Servidor no disponible. Asegúrese de que esté ejecutándose en el puerto 3000');
        }
    }

    async runScraping() {
        console.log('\n2️⃣ Ejecutando web scraping...');
        
        // Crear algunos datos de ejemplo adicionales
        const sampleData = {
            reviews: [
                {
                    url: 'https://www.ncbi.nlm.nih.gov/books/NBK1116/',
                    title: 'GeneReviews Overview',
                    abstract: 'GeneReviews provides clinically relevant and medically actionable information for inherited conditions in a standardized journal-style format, covering diagnosis, management, and genetic counseling for patients and their families.',
                    lastUpdated: '2024-01-15',
                    category: 'General Information',
                    authors: ['Roberta A Pagon', 'Margaret P Adam', 'Holly H Ardinger'],
                    content: {
                        sections: [
                            {
                                level: 2,
                                title: 'Purpose of GeneReviews',
                                id: 'purpose',
                                content: 'GeneReviews is designed to provide clinically relevant and medically actionable information for inherited conditions.'
                            },
                            {
                                level: 2,
                                title: 'Content and Scope',
                                id: 'scope',
                                content: 'Each GeneReview provides information on a single gene or phenotype, including clinical characteristics, diagnosis, management, and genetic counseling.'
                            }
                        ],
                        tables: [
                            {
                                caption: 'GeneReviews Statistics',
                                headers: ['Category', 'Count', 'Percentage'],
                                rows: [
                                    ['Genetic Disorders', '150', '60%'],
                                    ['Cancer Genetics', '50', '20%'],
                                    ['Pharmacogenetics', '25', '10%'],
                                    ['Other', '25', '10%']
                                ]
                            }
                        ],
                        references: [
                            {
                                text: 'Pagon RA, Adam MP, Ardinger HH, et al., editors. GeneReviews® [Internet]. Seattle (WA): University of Washington, Seattle; 1993-2024.',
                                pmid: null
                            }
                        ]
                    },
                    scrapedAt: new Date().toISOString()
                },
                {
                    url: 'https://www.ncbi.nlm.nih.gov/books/NBK1103/',
                    title: 'Cystic Fibrosis',
                    abstract: 'Cystic fibrosis (CF) is characterized by abnormal transport of chloride and sodium across an epithelium, leading to thick, viscous secretions.',
                    lastUpdated: '2023-12-01',
                    category: 'Genetic Disorders',
                    authors: ['Garry R Cutting'],
                    content: {
                        sections: [
                            {
                                level: 2,
                                title: 'Clinical Characteristics',
                                id: 'clinical',
                                content: 'CF is characterized by progressive obstructive lung disease, exocrine pancreatic insufficiency, elevated sweat chloride concentration, and male infertility.'
                            },
                            {
                                level: 2,
                                title: 'Diagnosis',
                                id: 'diagnosis',
                                content: 'Diagnosis is based on clinical features, family history, newborn screening results, and laboratory testing including sweat chloride test and genetic testing.'
                            }
                        ],
                        tables: [
                            {
                                caption: 'CFTR Mutations by Class',
                                headers: ['Class', 'Mechanism', 'Example Mutation'],
                                rows: [
                                    ['I', 'Defective protein synthesis', 'G542X'],
                                    ['II', 'Defective protein processing', 'F508del'],
                                    ['III', 'Defective channel regulation', 'G551D']
                                ]
                            }
                        ],
                        references: [
                            {
                                text: 'Cutting GR. Cystic fibrosis genetics: from molecular understanding to clinical application. Nat Rev Genet. 2015;16(1):45-56.',
                                pmid: '25404111'
                            }
                        ]
                    },
                    scrapedAt: new Date().toISOString()
                },
                {
                    url: 'https://www.ncbi.nlm.nih.gov/books/NBK1410/',
                    title: 'Huntington Disease',
                    abstract: 'Huntington disease (HD) is characterized by progressive motor, cognitive, and psychiatric disorders with a mean age of onset of 35 to 44 years.',
                    lastUpdated: '2023-11-15',
                    category: 'Neurological Disorders',
                    authors: ['Jane S Paulsen', 'Martha Nance', 'Jee Bang'],
                    content: {
                        sections: [
                            {
                                level: 2,
                                title: 'Clinical Features',
                                id: 'features',
                                content: 'HD is characterized by choreiform movements, psychiatric disturbances, and progressive cognitive decline.'
                            },
                            {
                                level: 2,
                                title: 'Genetic Mechanism',
                                id: 'genetics',
                                content: 'HD is caused by expansion of CAG repeats in the HTT gene encoding the huntingtin protein.'
                            }
                        ],
                        tables: [
                            {
                                caption: 'CAG Repeat Length and Disease Risk',
                                headers: ['CAG Repeats', 'Disease Status', 'Age of Onset'],
                                rows: [
                                    ['< 27', 'Normal', 'N/A'],
                                    ['27-35', 'Intermediate', 'Usually no symptoms'],
                                    ['36-39', 'Reduced penetrance', 'Variable'],
                                    ['≥ 40', 'Full penetrance', 'Adult onset']
                                ]
                            }
                        ],
                        references: [
                            {
                                text: 'Paulsen JS, et al. Clinical and biomarker changes in premanifest Huntington disease show trial feasibility. Ann Neurol. 2014;76(1):78-87.',
                                pmid: '24839169'
                            }
                        ]
                    },
                    scrapedAt: new Date().toISOString()
                }
            ],
            categories: [
                { name: 'General Information', reviews: 1 },
                { name: 'Genetic Disorders', reviews: 1 },
                { name: 'Neurological Disorders', reviews: 1 }
            ],
            metadata: {
                scrapedAt: new Date().toISOString(),
                totalReviews: 3,
                totalCategories: 3
            }
        };

        // Guardar datos de demostración
        const fs = require('fs').promises;
        const path = require('path');
        
        const dataPath = path.join(__dirname, 'database', 'genereviews-data.json');
        await fs.writeFile(dataPath, JSON.stringify(sampleData, null, 2));
        
        console.log('   ✅ Datos de demostración creados');
        console.log(`   📊 ${sampleData.reviews.length} reviews`);
        console.log(`   📁 ${sampleData.categories.length} categorías`);
    }

    async loadData() {
        console.log('\n3️⃣ Cargando datos en la base de datos...');
        
        try {
            const response = await axios.post(`${this.baseUrl}/api/admin/load-data`);
            if (response.data.success) {
                console.log('   ✅ Datos cargados exitosamente');
                console.log(`   📊 ${response.data.data.reviewsLoaded} reviews procesados`);
            } else {
                throw new Error('Error cargando datos');
            }
        } catch (error) {
            throw new Error(`Error cargando datos: ${error.message}`);
        }
    }

    async demonstrateAPI() {
        console.log('\n4️⃣ Demostrando funcionalidades de la API...');

        // Obtener estadísticas
        console.log('\n   📈 Estadísticas generales:');
        const stats = await axios.get(`${this.baseUrl}/api/stats`);
        console.log(`      • Total reviews: ${stats.data.data.totalReviews}`);
        console.log(`      • Categorías: ${stats.data.data.totalCategories}`);

        // Listar categorías
        console.log('\n   📁 Categorías disponibles:');
        const categories = await axios.get(`${this.baseUrl}/api/categories`);
        categories.data.data.forEach(cat => {
            console.log(`      • ${cat.name} (${cat.actual_count} reviews)`);
        });

        // Búsqueda de ejemplo
        console.log('\n   🔍 Ejemplos de búsqueda:');
        
        const searches = [
            { query: 'cystic', description: 'Búsqueda por término' },
            { query: 'category:"Genetic Disorders"', description: 'Búsqueda por categoría' },
            { query: 'author:"Cutting"', description: 'Búsqueda por autor' }
        ];

        for (const search of searches) {
            try {
                const results = await axios.get(`${this.baseUrl}/api/search`, {
                    params: { q: search.query }
                });
                console.log(`      • ${search.description}: "${search.query}" → ${results.data.data.length} resultados`);
            } catch (error) {
                console.log(`      • ${search.description}: Error en búsqueda`);
            }
        }

        // Obtener review específico
        console.log('\n   📖 Detalles de review:');
        try {
            const reviews = await axios.get(`${this.baseUrl}/api/reviews`);
            if (reviews.data.data.length > 0) {
                const firstReview = reviews.data.data[0];
                const details = await axios.get(`${this.baseUrl}/api/reviews/${firstReview.id}`);
                console.log(`      • "${details.data.data.title}"`);
                console.log(`      • Categoría: ${details.data.data.category}`);
                console.log(`      • Secciones: ${details.data.data.content.sections.length}`);
                console.log(`      • Tablas: ${details.data.data.content.tables.length}`);
                console.log(`      • Referencias: ${details.data.data.content.references.length}`);
            }
        } catch (error) {
            console.log('      • Error obteniendo detalles');
        }
    }

    async showFinalStats() {
        console.log('\n5️⃣ Estadísticas finales:');
        
        try {
            const stats = await axios.get(`${this.baseUrl}/api/stats`);
            const reviews = await axios.get(`${this.baseUrl}/api/reviews`);
            
            console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('   📊 RESUMEN DE LA BASE DE DATOS');
            console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`   📖 Total de reviews: ${stats.data.data.totalReviews}`);
            console.log(`   📁 Categorías: ${stats.data.data.totalCategories}`);
            console.log(`   🔄 Última actualización: ${new Date(stats.data.data.lastUpdated).toLocaleString()}`);
            
            console.log('\n   📁 Distribución por categorías:');
            stats.data.data.categoriesBreakdown.forEach(cat => {
                const percentage = ((cat.actual_count / stats.data.data.totalReviews) * 100).toFixed(1);
                console.log(`      • ${cat.name}: ${cat.actual_count} reviews (${percentage}%)`);
            });

            console.log('\n   ⚡ Endpoints disponibles:');
            console.log('      • GET /api/health - Estado de la API');
            console.log('      • GET /api/stats - Estadísticas generales');
            console.log('      • GET /api/categories - Lista de categorías');
            console.log('      • GET /api/reviews - Listar todos los reviews');
            console.log('      • GET /api/reviews/:id - Obtener review específico');
            console.log('      • GET /api/search?q=query - Búsqueda de texto completo');
            console.log('      • GET /api/categories/:cat/reviews - Reviews por categoría');

            console.log('\n   🔍 Ejemplos de búsquedas avanzadas:');
            console.log('      • "cystic fibrosis" - Buscar frase exacta');
            console.log('      • category:"Genetic Disorders" - Filtrar por categoría');
            console.log('      • author:"Smith" - Buscar por autor');
            console.log('      • genetics -cancer - Excluir términos');
            console.log('      • category:"Heart" author:"Jones" - Múltiples filtros');

            console.log('\n   ⌨️  Características de la interfaz web:');
            console.log('      • Navegación jerárquica por categorías');
            console.log('      • Búsqueda de texto completo');
            console.log('      • Vista detallada de cada review');
            console.log('      • Estadísticas y análisis visuales');
            console.log('      • Responsive design para móviles');
            console.log('      • Atajos de teclado (Ctrl+K para buscar)');
            
        } catch (error) {
            console.log('   ❌ Error obteniendo estadísticas finales');
        }
    }
}

// Ejecutar demostración si se llama directamente
if (require.main === module) {
    const demo = new GeneReviewsDemo();
    demo.run().catch(error => {
        console.error('Error ejecutando demostración:', error);
        process.exit(1);
    });
}

module.exports = GeneReviewsDemo;