# Guía de Configuración Completa

## Base de Datos de Genética Clínica

Este proyecto combina información de dos fuentes principales:
1. **GeneReviews** (NCBI) - Reviews de enfermedades genéticas
2. **Oxford Desk Reference: Clinical Genetics and Genomics** - Libro de referencia completo

---

## 🚀 Inicio Rápido

### 1. Instalación de Dependencias

```bash
# Dependencias del sistema (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install tesseract-ocr poppler-utils

# Dependencias de Node.js
npm install
```

### 2. Recolección de Datos

```bash
# Opción A: Todo en uno (recomendado)
npm run setup

# Opción B: Paso a paso
npm run scrape        # Scraping de GeneReviews (~5-10 minutos)
npm run process-pdf   # Procesamiento del PDF Oxford (~2-3 minutos)
```

### 3. Iniciar Servidor

```bash
# Terminal 1: Iniciar servidor
npm start

# Terminal 2: Cargar datos en la base de datos
curl -X POST http://localhost:3000/api/admin/load-data
curl -X POST http://localhost:3000/api/admin/load-book-data
```

### 4. Acceder a la Aplicación

Abrir en el navegador: http://localhost:3000

---

## 📊 Datos Procesados

### GeneReviews
- **Fuente**: https://www.ncbi.nlm.nih.gov/books/NBK1116/
- **Contenido**: Reviews estructuradas de enfermedades genéticas
- **Formato**: JSON estructurado con secciones, autores, referencias
- **Ubicación**: `database/genereviews-data.json`

### Oxford Clinical Genetics
- **Fuente**: PDF descargado automáticamente
- **Contenido**: 530+ secciones extraídas del libro
- **Formato**: Texto completo con estructura de capítulos
- **Ubicación**: `data/pdf_extracted/oxford_genetics_data.json`
- **Tamaño**: ~54,000 líneas de texto

---

## 🔍 Uso de la API

### Búsqueda Global (todas las fuentes)
```bash
curl "http://localhost:3000/api/search/all?q=cystic+fibrosis&limit=10"
```

### Búsqueda en GeneReviews
```bash
curl "http://localhost:3000/api/search?q=genetics&limit=20"
```

### Búsqueda en Libros
```bash
curl "http://localhost:3000/api/books/search?q=chromosome&limit=20"
```

### Estadísticas
```bash
curl http://localhost:3000/api/stats
```

---

## 📁 Estructura de la Base de Datos

### Tabla: book_sections
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER | ID único |
| source | TEXT | Fuente del contenido |
| title | TEXT | Título de la sección |
| content | TEXT | Contenido completo |
| page | INTEGER | Número de página |
| section_order | INTEGER | Orden de la sección |

### FTS (Full Text Search)
- `reviews_fts`: Índice de búsqueda para GeneReviews
- `book_sections_fts`: Índice de búsqueda para libros

---

## 🛠️ Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm start` | Iniciar servidor (puerto 3000) |
| `npm run dev` | Modo desarrollo con nodemon |
| `npm run scrape` | Scraping de GeneReviews |
| `npm run process-pdf` | Procesar PDF con extracción de texto |
| `npm run process-pdf:ocr` | Procesar PDF con OCR (más lento) |
| `npm run setup` | Ejecutar scraping + procesamiento |

---

## 🔧 Troubleshooting

### Error: tesseract no encontrado
```bash
sudo apt-get install tesseract-ocr tesseract-ocr-eng
```

### Error: pdftotext no encontrado
```bash
sudo apt-get install poppler-utils
```

### Error: out of memory
Reducir tamaño de batch en `pdf-ocr-processor.js` o usar:
```bash
NODE_OPTIONS='--max-old-space-size=4096' npm run process-pdf
```

### Base de datos bloqueada
```bash
# Detener servidor y reiniciar
pkill -f "node backend/server.js"
npm start
```

---

## 📈 Métricas del Sistema

### Datos Procesados
- **GeneReviews**: Variable (depende del scraping)
- **Oxford Genetics**: 530 secciones, ~54,000 líneas
- **Base de datos**: ~10-50 MB (SQLite)

### Rendimiento
- **Búsqueda FTS**: <100ms para consultas típicas
- **Carga de página**: <50ms
- **Scraping inicial**: 5-15 minutos
- **Procesamiento PDF**: 2-5 minutos

---

## 🔐 Seguridad y Privacidad

- No se almacenan credenciales
- Datos médicos de dominio público
- API REST sin autenticación (añadir en producción)
- Rate limiting en el scraper para respetar servidores

---

## 📝 Notas Importantes

1. El PDF se descarga automáticamente la primera vez
2. El procesamiento usa extracción directa (no OCR) por defecto
3. Los datos se mantienen localmente en SQLite
4. La búsqueda de texto completo usa SQLite FTS5
5. El scraping respeta los límites del servidor NCBI

---

## 🎯 Próximos Pasos

1. Implementar frontend completo con React/Vue
2. Añadir autenticación y control de acceso
3. Implementar caché de búsquedas
4. Añadir más fuentes de datos médicos
5. Crear API GraphQL alternativa
6. Implementar exportación de datos

---

## 📞 Soporte

Para problemas o preguntas, revisar:
- `README.md` - Documentación general
- `package.json` - Scripts disponibles
- `backend/server.js` - API endpoints
- `database/database.js` - Esquema de datos
