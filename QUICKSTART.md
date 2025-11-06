# 🚀 Inicio Rápido - 5 Minutos

## Base de Datos de Genética Clínica

### 1️⃣ Instalación (2 minutos)

```bash
# Dependencias del sistema
sudo apt-get install -y tesseract-ocr poppler-utils

# Dependencias Node.js
npm install
```

### 2️⃣ Preparar Datos (10-15 minutos - solo la primera vez)

```bash
# Opción automática (recomendada)
npm run setup

# O paso a paso:
# npm run scrape        # GeneReviews (5-10 min)
# npm run process-pdf   # Oxford PDF (2-3 min)
```

**Nota**: El PDF Oxford se descarga automáticamente (91 MB)

### 3️⃣ Iniciar Aplicación (30 segundos)

```bash
# Terminal 1: Servidor
npm start

# Terminal 2: Cargar datos (solo primera vez)
curl -X POST http://localhost:3000/api/admin/load-data
curl -X POST http://localhost:3000/api/admin/load-book-data
```

### 4️⃣ Usar la Aplicación

Abrir navegador: **http://localhost:3000**

---

## 🔍 Pruebas Rápidas

### API - Buscar en todas las fuentes
```bash
curl "http://localhost:3000/api/search/all?q=genetics&limit=5"
```

### API - Buscar solo en GeneReviews
```bash
curl "http://localhost:3000/api/search?q=cystic+fibrosis"
```

### API - Buscar solo en libros
```bash
curl "http://localhost:3000/api/books/search?q=chromosome"
```

### API - Ver estadísticas
```bash
curl http://localhost:3000/api/stats
```

---

## 📊 ¿Qué datos tengo?

Después del setup completo:

✅ **GeneReviews**: Reviews de enfermedades genéticas de NCBI  
✅ **Oxford Clinical Genetics**: 530 secciones del libro completo  
✅ **Base de datos**: SQLite con búsqueda de texto completo  
✅ **API REST**: 15+ endpoints disponibles  

---

## 🆘 Problemas Comunes

**Puerto 3000 ocupado?**
```bash
PORT=3001 npm start
```

**Error de permisos?**
```bash
sudo chown -R $USER:$USER .
```

**Base de datos bloqueada?**
```bash
rm -f database/genereviews.db
npm start
# Volver a cargar datos
```

**Quiero empezar de cero?**
```bash
rm -rf data/pdf_extracted database/genereviews.db
npm run setup
```

---

## 📖 Más Información

- **README.md** - Documentación completa
- **SETUP.md** - Guía detallada de configuración
- **PROJECT_STATUS.md** - Estado y características del proyecto

---

## ⚡ Comandos Útiles

```bash
npm start              # Iniciar servidor
npm run dev            # Modo desarrollo (auto-reload)
npm run scrape         # Actualizar datos de GeneReviews
npm run process-pdf    # Re-procesar PDF
```

---

**¡Listo para usar en 15 minutos!** 🎉
