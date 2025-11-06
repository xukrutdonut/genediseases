# Base de Datos de Genética Clínica - Explorador Interactivo

Una aplicación web completa que extrae, almacena y presenta de forma explorable datos de múltiples fuentes de genética clínica:
- **GeneReviews de NCBI**: Reviews completas de enfermedades genéticas
- **Oxford Desk Reference: Clinical Genetics and Genomics**: Contenido completo del libro de referencia

## 🧬 Características

### Funcionalidades Principales
- **Web Scraping Inteligente**: Extrae automáticamente datos de GeneReviews respetando los límites del servidor
- **Procesamiento OCR de PDFs**: Extrae y procesa texto de libros de referencia médicos
- **Base de Datos Unificada**: Almacenamiento eficiente en SQLite con índices optimizados para búsquedas
- **Búsqueda Avanzada**: Sistema de búsqueda de texto completo (FTS5) que busca en todas las fuentes
- **Interfaz Explorable**: Navegación jerárquica por categorías y contenido
- **API REST**: Endpoints completos para acceso programático a los datos

### Características Técnicas
- **Backend**: Node.js con Express, SQLite, Puppeteer
- **Frontend**: JavaScript vanilla con diseño responsive
- **Scraping**: Rate limiting inteligente y manejo de errores
- **OCR**: Tesseract + Poppler para procesamiento de PDFs
- **Base de Datos**: SQLite con FTS5 (Full Text Search) y índices optimizados
- **Cache**: Sistema de caché en memoria para mejores rendimientos

## 🚀 Instalación y Configuración

### Prerrequisitos
```bash
- Node.js v14+ 
- npm v6+
- tesseract-ocr (para procesamiento de PDFs)
- poppler-utils (para extracción de PDFs)
- Al menos 2GB de espacio libre
```

### Instalación de dependencias del sistema
```bash
# Ubuntu/Debian
sudo apt-get install tesseract-ocr poppler-utils

# macOS
brew install tesseract poppler

# Fedora/RHEL
sudo dnf install tesseract poppler-utils
```

### Instalación Rápida
```bash
# 1. Clonar o crear el proyecto
cd genediseases

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno (opcional)
cp .env.example .env

# 4. Ejecutar scraping inicial y procesamiento de PDF (puede tardar 10-20 minutos)
npm run setup

# 5. Iniciar el servidor
npm start

# 6. En otra terminal, cargar datos en la base de datos
curl -X POST http://localhost:3000/api/admin/load-data
curl -X POST http://localhost:3000/api/admin/load-book-data

# 7. Abrir en el navegador
open http://localhost:3000
```

## 📊 Uso de la Aplicación

### Navegación Principal
1. **Inicio**: Vista general con estadísticas y acceso rápido
2. **Explorar**: Navegación por categorías con filtros
3. **Buscar**: Búsqueda avanzada con operadores especiales
4. **Estadísticas**: Análisis detallado de la base de datos

### Búsqueda Avanzada
```
# Ejemplos de consultas:
"cystic fibrosis"                    # Frase exacta
category:"Genetic Disorders"         # Por categoría
author:"Smith"                       # Por autor
genetics -cancer                     # Excluir términos
category:"Heart" author:"Jones"      # Múltiples filtros
```

### Atajos de Teclado
- `Ctrl+K`: Enfocar búsqueda
- `1-4`: Cambiar secciones
- `Ctrl+H`: Ir al inicio  
- `Escape`: Cerrar modales

## 🛠 Estructura del Proyecto

```
genediseases/
├── backend/
│   └── server.js           # Servidor Express con API REST
├── database/
│   ├── database.js         # Controlador de base de datos SQLite
│   └── genereviews.db      # Base de datos (se crea automáticamente)
├── frontend/
│   └── public/
│       ├── index.html      # Interfaz principal
│       ├── css/
│       │   └── styles.css  # Estilos responsive
│       └── js/
│           ├── api.js      # Cliente API
│           ├── ui.js       # Controlador UI
│           ├── search.js   # Controlador búsqueda
│           └── app.js      # Aplicación principal
├── scraper/
│   └── genereviews-scraper.js  # Web scraper para NCBI
├── package.json            # Configuración del proyecto
├── README.md              # Este archivo
└── .env.example           # Variables de entorno ejemplo
```

## 🔧 API Endpoints

### Información General
```http
GET /api/health              # Estado de la API
GET /api/stats               # Estadísticas generales (GeneReviews + libros)
GET /api/categories          # Lista de categorías de GeneReviews
GET /api/books               # Lista de fuentes de libros
```

### Búsqueda y Navegación - GeneReviews
```http
GET /api/search?q=query             # Búsqueda en GeneReviews
GET /api/reviews                    # Listar todos los reviews
GET /api/reviews/:id                # Obtener review específico
GET /api/categories/:cat/reviews    # Reviews por categoría
```

### Búsqueda - Libros y PDFs
```http
GET /api/books/search?q=query       # Búsqueda en libros
GET /api/books/sections/:id         # Obtener sección específica
GET /api/search/all?q=query         # Búsqueda en todas las fuentes
```

### Administración
```http
POST /api/admin/load-data           # Cargar datos de GeneReviews
POST /api/admin/load-book-data      # Cargar datos de libros procesados
```

## 📝 Esquema de Base de Datos

### Tablas Principales - GeneReviews
- **reviews**: Información principal de cada review
- **authors**: Autores asociados a cada review
- **sections**: Secciones y contenido estructurado
- **data_tables**: Tablas de datos extraídas
- **review_references**: Referencias bibliográficas
- **categories**: Categorías organizacionales
- **reviews_fts**: Índice de búsqueda de texto completo

### Tablas - Contenido de Libros
- **book_sections**: Secciones extraídas de libros/PDFs
- **book_sections_fts**: Índice de búsqueda para libros
- **data_tables**: Tablas y datos tabulares
- **references**: Referencias bibliográficas
- **categories**: Categorías organizacionales

### Índices Optimizados
- Búsqueda de texto completo (FTS5)
- Índices en títulos, categorías y autores
- Optimización para consultas frecuentes

## 🔍 Sistema de Scraping

### Características del Scraper
- **Rate Limiting**: 1 segundo entre requests por defecto
- **Manejo de Errores**: Reintentos automáticos con backoff exponencial
- **Respeto por robots.txt**: Headers apropiados y delays respetuosos
- **Extracción Estructurada**: Procesa tablas, referencias, secciones
- **Progreso Persistente**: Guarda progreso para continuar después de interrupciones

### Configuración del Scraping
```javascript
// En scraper/genereviews-scraper.js
this.delay = 1000;           // Delay entre requests
this.maxRetries = 3;         # Reintentos máximos
this.timeout = 10000;        # Timeout por request
```

## 🎨 Personalización

### Temas y Estilos
- Diseño responsive para móviles y desktop
- Variables CSS para personalización fácil
- Tema oscuro/claro (en desarrollo)

### Configuración de Usuario
- Historial de búsquedas persistente
- Preferencias de paginación
- Atajos de teclado personalizables

## 📈 Monitoreo y Análisis

### Métricas Disponibles
- Total de reviews procesados
- Distribución por categorías
- Patrones de búsqueda de usuarios
- Rendimiento de consultas

### Logs y Debugging
- Logs estructurados con niveles
- Monitoreo de rendimiento de API
- Análisis de errores de scraping

## 🔒 Consideraciones de Seguridad

### Medidas Implementadas
- Rate limiting en API
- Sanitización de inputs
- Headers de seguridad (Helmet.js)
- Validación de consultas SQL

### Uso Ético del Scraping
- Respeta delays apropiados
- User-Agent identificativo
- No sobrecarga los servidores de NCBI
- Cumple con términos de uso

## 🐛 Solución de Problemas

### Problemas Comunes

#### El scraper no encuentra datos
```bash
# Verificar conectividad
curl https://www.ncbi.nlm.nih.gov/books/NBK1116/

# Revisar logs del scraper
npm run scrape
```

#### Error de base de datos
```bash
# Recrear base de datos
rm database/genereviews.db
npm start
# Luego cargar datos nuevamente
```

#### Puerto ocupado
```bash
# Cambiar puerto en .env
PORT=3001
```

### Logs y Debugging
```bash
# Ver logs en tiempo real
tail -f logs/app.log

# Ejecutar en modo debug
DEBUG=* npm start
```

## 🤝 Contribución

### Cómo Contribuir
1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

### Estándares de Código
- ESLint para JavaScript
- Comentarios JSDoc para funciones principales
- Tests unitarios para nuevas funcionalidades
- Documentación actualizada

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🙏 Reconocimientos

- **NCBI GeneReviews**: Por proporcionar la base de datos médica
- **Comunidad Open Source**: Por las herramientas y bibliotecas utilizadas
- **Contribuidores**: Por mejoras y sugerencias

## 📞 Soporte

### Reportar Problemas
- Abrir issue en GitHub con detalles completos
- Incluir logs relevantes y pasos para reproducir
- Especificar versión del sistema y navegador

### Contacto
- Email: [tu-email@ejemplo.com]
- GitHub Issues: [link-al-repositorio]
- Documentación: [link-a-docs]

---

**Versión**: 1.0.0  
**Última actualización**: Enero 2024  
**Autor**: GeneReviews Database Project