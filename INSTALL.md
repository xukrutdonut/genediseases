# 🧬 GeneReviews Database - Guía de Instalación

## 📋 Descripción del Proyecto

**Base de Datos GeneReviews** es una aplicación web completa que extrae, almacena y presenta de forma explorable todos los datos contenidos en GeneReviews de NCBI. Incluye web scraping inteligente, base de datos estructurada, búsqueda avanzada e interfaz web moderna.

### ✨ Características Principales
- ✅ **Web scraping automatizado** de GeneReviews (NCBI)
- ✅ **Base de datos SQLite** con búsqueda de texto completo
- ✅ **API REST** completa con documentación
- ✅ **Interfaz web moderna** responsive y accesible
- ✅ **Búsqueda avanzada** con operadores especiales
- ✅ **Navegación jerárquica** por categorías
- ✅ **Dockerizado** para fácil despliegue

## 🚀 Instalación Rápida

### Opción 1: Instalación Local

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd genediseases

# 2. Instalar dependencias
npm install

# 3. Ejecutar demostración completa
node demo.js

# 4. Abrir en navegador
open http://localhost:3000
```

### Opción 2: Docker

```bash
# Construcción y ejecución con Docker Compose
docker-compose up --build

# O construcción manual
docker build -t genereviews-db .
docker run -p 3000:3000 -v $(pwd)/database:/usr/src/app/database genereviews-db
```

## 📦 Instalación Detallada

### Prerrequisitos

```bash
# Verificar versiones requeridas
node --version  # >= v14.0.0
npm --version   # >= v6.0.0
```

### Paso a Paso

```bash
# 1. Preparar directorio de trabajo
mkdir genereviews-project
cd genereviews-project

# 2. Inicializar proyecto (si es nuevo)
npm init -y

# 3. Instalar dependencias principales
npm install express cors helmet compression morgan sqlite3 axios cheerio puppeteer rate-limiter-flexible dotenv nodemon

# 4. Copiar archivos del proyecto
# [Copiar todos los archivos de la estructura del proyecto]

# 5. Configurar variables de entorno (opcional)
cp .env.example .env
# Editar .env según necesidades

# 6. Ejecutar scraping inicial
npm run scrape

# 7. Iniciar servidor
npm start

# 8. Cargar datos (en otra terminal)
curl -X POST http://localhost:3000/api/admin/load-data

# 9. Verificar instalación
curl http://localhost:3000/api/health
```

## 🏗️ Estructura del Proyecto

```
genediseases/
├── 📁 backend/                    # Servidor Express
│   └── server.js                  # API REST y servidor web
├── 📁 database/                   # Base de datos y esquemas
│   ├── database.js               # Controlador SQLite
│   └── genereviews.db            # Base de datos (auto-creada)
├── 📁 frontend/public/           # Interfaz web
│   ├── index.html                # Página principal
│   ├── 📁 css/
│   │   └── styles.css           # Estilos responsive
│   └── 📁 js/
│       ├── api.js               # Cliente API
│       ├── ui.js                # Controlador UI
│       ├── search.js            # Búsquedas avanzadas
│       └── app.js               # App principal
├── 📁 scraper/                   # Web scraper
│   └── genereviews-scraper.js   # Extractor de datos NCBI
├── 📄 package.json              # Configuración npm
├── 📄 demo.js                   # Script de demostración
├── 🐳 Dockerfile               # Configuración Docker
├── 🐳 docker-compose.yml       # Orquestación Docker
└── 📖 README.md                 # Documentación principal
```

## ⚙️ Configuración

### Variables de Entorno

Cree un archivo `.env` basado en `.env.example`:

```env
# Puerto del servidor
PORT=3000

# Configuración de scraping
SCRAPER_DELAY=1000
SCRAPER_MAX_RETRIES=3

# Base de datos
DB_PATH=./database/genereviews.db

# Configuración opcional de NCBI
NCBI_API_KEY=su_clave_api_aqui
NCBI_EMAIL=su_email@ejemplo.com
```

### Configuración del Scraper

El web scraper está configurado para ser respetuoso con los servidores de NCBI:

```javascript
// En scraper/genereviews-scraper.js
{
    delay: 1000,           // 1 segundo entre requests
    maxRetries: 3,         // Máximo 3 reintentos
    timeout: 10000,        // 10 segundos de timeout
    userAgent: 'Mozilla/5.0 (compatible; GeneReviewsBot/1.0; Educational Purpose)'
}
```

## 🚀 Uso de la Aplicación

### Comandos Principales

```bash
# Iniciar servidor de desarrollo
npm run dev

# Iniciar servidor de producción
npm start

# Ejecutar web scraping
npm run scrape

# Demostración completa
node demo.js
```

### Endpoints de la API

```http
# Estado y salud
GET /api/health                    # Estado de la API
GET /api/stats                     # Estadísticas generales

# Navegación de contenido
GET /api/categories                # Lista de categorías
GET /api/reviews                   # Todos los reviews (paginado)
GET /api/reviews/:id               # Review específico por ID
GET /api/categories/:cat/reviews   # Reviews por categoría

# Búsqueda
GET /api/search?q=query            # Búsqueda de texto completo

# Administración
POST /api/admin/load-data          # Cargar datos desde JSON
```

### Ejemplos de Búsqueda

```bash
# Búsqueda simple
curl "http://localhost:3000/api/search?q=cystic"

# Búsqueda por categoría
curl "http://localhost:3000/api/search?q=category:\"Genetic Disorders\""

# Búsqueda por autor
curl "http://localhost:3000/api/search?q=author:\"Smith\""

# Búsqueda con múltiples filtros
curl "http://localhost:3000/api/search?q=genetics category:\"Heart\" -cancer"

# Frase exacta
curl "http://localhost:3000/api/search?q=\"cystic fibrosis\""
```

## 🌐 Interfaz Web

### Características de la UI

- **🏠 Inicio**: Vista general con estadísticas y acceso rápido
- **📂 Explorar**: Navegación jerárquica por categorías
- **🔍 Buscar**: Búsqueda avanzada con filtros múltiples
- **📊 Estadísticas**: Análisis visual de la base de datos

### Atajos de Teclado

| Atajo | Acción |
|-------|---------|
| `Ctrl+K` | Enfocar búsqueda rápida |
| `1-4` | Cambiar entre secciones |
| `Ctrl+H` | Ir al inicio |
| `Ctrl+B` | Ir a explorar |
| `Escape` | Cerrar modales/sugerencias |

### Operadores de Búsqueda Avanzada

| Operador | Descripción | Ejemplo |
|----------|-------------|---------|
| `"frase"` | Búsqueda exacta | `"cystic fibrosis"` |
| `category:` | Filtrar por categoría | `category:"Genetic Disorders"` |
| `author:` | Buscar por autor | `author:"Smith"` |
| `-término` | Excluir término | `genetics -cancer` |
| Combinado | Múltiples filtros | `category:"Heart" author:"Jones" -pediatric` |

## 🐳 Despliegue con Docker

### Desarrollo

```bash
# Construcción y ejecución simple
docker build -t genereviews-db .
docker run -p 3000:3000 genereviews-db
```

### Producción con Docker Compose

```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down

# Reconstruir y reiniciar
docker-compose up --build -d
```

### Configuración de Producción

Para producción, el archivo `docker-compose.yml` incluye:
- 🔧 **Nginx** como proxy reverso (opcional)
- 📊 **Health checks** automáticos
- 💾 **Volúmenes persistentes** para datos
- 🔒 **Configuración de seguridad**

## 🔧 Solución de Problemas

### Problemas Comunes

#### 1. Servidor no inicia
```bash
# Verificar puerto disponible
lsof -i :3000

# Cambiar puerto en .env
echo "PORT=3001" >> .env
```

#### 2. Error de base de datos
```bash
# Recrear base de datos
rm database/genereviews.db
npm start
curl -X POST http://localhost:3000/api/admin/load-data
```

#### 3. Scraper no funciona
```bash
# Verificar conectividad
curl -I https://www.ncbi.nlm.nih.gov/books/NBK1116/

# Ejecutar con más logging
DEBUG=* node scraper/genereviews-scraper.js
```

#### 4. Problemas con Docker
```bash
# Limpiar contenedores
docker system prune -a

# Reconstruir desde cero
docker-compose build --no-cache
```

### Logs y Debugging

```bash
# Ver logs del servidor
tail -f logs/app.log

# Ejecutar en modo debug
DEBUG=express:* npm start

# Verificar estado de la API
curl -s http://localhost:3000/api/health | jq

# Monitorear requests en tiempo real
curl -s http://localhost:3000/api/stats | jq .data
```

## 📊 Monitoreo y Mantenimiento

### Métricas Importantes

```bash
# Estadísticas de la base de datos
curl -s http://localhost:3000/api/stats | jq

# Salud del sistema
curl -s http://localhost:3000/api/health | jq

# Número de reviews por categoría
curl -s http://localhost:3000/api/categories | jq '.data[] | {name: .name, count: .actual_count}'
```

### Tareas de Mantenimiento

```bash
# 1. Actualización de datos (ejecutar periódicamente)
node scraper/genereviews-scraper.js
curl -X POST http://localhost:3000/api/admin/load-data

# 2. Backup de la base de datos
cp database/genereviews.db backup/genereviews_$(date +%Y%m%d).db

# 3. Limpieza de logs (opcional)
logrotate logs/app.log

# 4. Actualizar dependencias
npm audit
npm update
```

## 🤝 Contribución y Desarrollo

### Configuración de Desarrollo

```bash
# Instalar dependencias de desarrollo
npm install --dev

# Ejecutar en modo desarrollo con auto-reload
npm run dev

# Ejecutar tests (si existen)
npm test

# Linting de código
npx eslint backend/ frontend/ scraper/
```

### Estructura para Contribuciones

1. **Fork** el repositorio
2. **Crear rama** feature (`git checkout -b feature/nueva-funcionalidad`)
3. **Commit** cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. **Push** a la rama (`git push origin feature/nueva-funcionalidad`)
5. **Crear** Pull Request

## 📄 Licencia y Créditos

- **Licencia**: MIT License
- **Datos**: NCBI GeneReviews (dominio público/uso educativo)
- **Tecnologías**: Node.js, Express, SQLite, JavaScript, CSS3, HTML5

## 🆘 Soporte

### Recursos de Ayuda

- 📖 **Documentación completa**: Ver `README.md`
- 🐛 **Reportar bugs**: Crear issue en GitHub
- 💡 **Sugerencias**: Crear feature request
- 📧 **Contacto directo**: [email de contacto]

### Links Útiles

- 🌐 **NCBI GeneReviews**: https://www.ncbi.nlm.nih.gov/books/NBK1116/
- 📚 **Documentación Express**: https://expressjs.com/
- 🗄️ **SQLite Documentation**: https://sqlite.org/docs.html
- 🐳 **Docker Guide**: https://docs.docker.com/

---

**¡Gracias por usar GeneReviews Database! 🧬**

Para más información, consulte la documentación completa en `README.md` o ejecute `node demo.js` para ver una demostración completa del sistema.