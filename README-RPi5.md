# 🍓 GeneReviews Database para Raspberry Pi 5

## 🎯 Optimizada para Raspberry Pi 5

Esta aplicación ha sido específicamente optimizada para ejecutarse en **Raspberry Pi 5** usando Docker, aprovechando su arquitectura ARM64 y 4-8GB de RAM para ofrecer una experiencia fluida y estable.

## ⚡ Características Específicas para RPi5

### 🏗️ Optimizaciones de Hardware
- ✅ **ARM64 nativo**: Aprovecha completamente la arquitectura de 64 bits
- ✅ **Gestión inteligente de memoria**: Configuraciones adaptativas según RAM disponible
- ✅ **Control térmico**: Timeouts ajustados para evitar throttling
- ✅ **E/O optimizada**: Cache en tmpfs y configuraciones de disco eficientes

### 🐳 Docker Optimizado
- ✅ **Multi-stage build** optimizado para ARM64
- ✅ **Límites de recursos** específicos para RPi5
- ✅ **Health checks** ajustados para tiempos de respuesta de RPi
- ✅ **Logging rotativo** para no saturar la SD

### 🔧 Configuraciones Inteligentes
- ✅ **Perfil de memoria automático**: Low/Medium/High según RAM disponible
- ✅ **Node.js tunning**: GC optimizado y límites de heap
- ✅ **SQLite config**: Configuración específica para ARM64
- ✅ **Web scraping conservador**: Rate limiting adaptado para estabilidad

## 🚀 Instalación Rápida en Raspberry Pi 5

### Opción 1: Instalación Automática (Recomendada)

```bash
# 1. Descargar o clonar el proyecto
git clone <repo-url>
cd genediseases

# 2. Ejecutar instalación específica para RPi5
./install-rpi5.sh
```

### Opción 2: Docker Manual

```bash
# Construir para RPi5
docker-compose -f docker-compose.rpi5.yml build

# Iniciar con configuración optimizada
docker-compose -f docker-compose.rpi5.yml --env-file .env.rpi5 up -d

# Verificar estado
docker-compose -f docker-compose.rpi5.yml ps
```

## 📋 Prerrequisitos para Raspberry Pi 5

### Hardware Mínimo
- **Raspberry Pi 5** (4GB RAM mínimo, 8GB recomendado)
- **microSD Class 10** o superior (32GB mínimo)
- **Refrigeración activa** (recomendado para cargas sostenidas)
- **Fuente 5V/5A** oficial de Raspberry Pi

### Software
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar usuario a grupo docker
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo apt install docker-compose -y

# Reiniciar sesión
newgrp docker
```

## ⚙️ Configuraciones Específicas RPi5

### Perfiles de Memoria Automáticos

El sistema detecta automáticamente la RAM disponible y aplica configuraciones óptimas:

#### 🟡 Perfil LOW (< 1GB RAM libre)
```env
NODE_OPTIONS=--max-old-space-size=256 --gc-interval=25
UV_THREADPOOL_SIZE=1
SCRAPER_DELAY=3000
```

#### 🟠 Perfil MEDIUM (1-4GB RAM)
```env
NODE_OPTIONS=--max-old-space-size=512 --gc-interval=50
UV_THREADPOOL_SIZE=2
SCRAPER_DELAY=2000
```

#### 🟢 Perfil HIGH (4GB+ RAM)
```env
NODE_OPTIONS=--max-old-space-size=1024 --gc-interval=75
UV_THREADPOOL_SIZE=4
SCRAPER_DELAY=1500
```

### Límites de Recursos Docker

```yaml
# Configuración para RPi5
deploy:
  resources:
    limits:
      memory: 512M      # Conservador para estabilidad
      cpus: '1.5'       # Máximo 1.5 cores
    reservations:
      memory: 256M
      cpus: '0.5'
```

## 🔍 Monitoreo del Sistema

### Comandos Útiles para RPi5

```bash
# Temperatura del SoC
vcgencmd measure_temp

# Frecuencia actual
vcgencmd measure_clock arm

# Voltaje
vcgencmd measure_volts

# Throttling status
vcgencmd get_throttled

# Estado de contenedores
docker stats

# Logs de la aplicación
docker-compose -f docker-compose.rpi5.yml logs -f
```

### Dashboard de Monitoreo (Opcional)

La configuración incluye un monitor RPi opcional:

```bash
# Activar monitoreo
docker-compose -f docker-compose.rpi5.yml --profile monitoring up -d

# Acceder al dashboard
open http://localhost:8888
```

## 🌡️ Gestión Térmica

### Prevención de Throttling

```bash
# Verificar throttling
vcgencmd get_throttled
# 0x0 = Sin throttling
# 0x20000 = Throttling por temperatura

# Monitoreo continuo
watch -n 5 'vcgencmd measure_temp && vcgencmd get_throttled'
```

### Configuraciones Térmicas
- **Timeouts extendidos** durante alta temperatura
- **Reducción automática** de workers cuando T > 80°C
- **Health checks** más espaciados en verano

## 🚀 Rendimiento Esperado en RPi5

### Benchmarks Típicos
- **Inicio de contenedor**: 60-90 segundos
- **Respuesta API**: 100-300ms
- **Búsqueda texto completo**: 200-500ms
- **Scraping por página**: 3-5 segundos
- **Carga inicial de datos**: 2-5 minutos

### Optimizaciones de Rendimiento

```bash
# 1. Usar SSD USB en lugar de microSD
# Mejor rendimiento I/O

# 2. Configurar swap en SSD
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile  # CONF_SWAPFILE=/mnt/ssd/swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# 3. Montar base de datos en SSD
# Editar docker-compose.rpi5.yml para usar SSD
```

## 📊 Uso de Recursos Típico

### En Reposo (Idle)
- **RAM**: 200-300MB
- **CPU**: 5-10%
- **Temperatura**: 35-45°C

### Durante Scraping
- **RAM**: 400-600MB
- **CPU**: 30-60%
- **Temperatura**: 50-70°C

### Durante Búsquedas Intensivas
- **RAM**: 300-500MB
- **CPU**: 20-40%
- **Temperatura**: 40-60°C

## 🔒 Seguridad y Backup

### Configuración de Backup Automático

```bash
# Activar backup automático
docker-compose -f docker-compose.rpi5.yml --profile backup up -d

# Backup manual
docker exec genereviews-rpi5 sqlite3 /usr/src/app/database/genereviews.db ".backup /backups/manual_backup.db"
```

### Acceso Remoto Seguro

```bash
# Configurar Nginx con SSL (opcional)
docker-compose -f docker-compose.rpi5.yml --profile production up -d

# Generar certificados auto-firmados
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/server.key -out ssl/server.crt
```

## 🔧 Solución de Problemas RPi5

### Problemas Comunes

#### 1. Contenedor no inicia
```bash
# Verificar recursos
free -h
df -h

# Verificar temperatura
vcgencmd measure_temp

# Ver logs detallados
docker-compose -f docker-compose.rpi5.yml logs --tail=50
```

#### 2. Rendimiento lento
```bash
# Verificar throttling
vcgencmd get_throttled

# Verificar swap
swapon --show

# Optimizar configuración
docker-compose -f docker-compose.rpi5.yml down
# Editar .env.rpi5 para reducir límites
docker-compose -f docker-compose.rpi5.yml up -d
```

#### 3. Error de memoria
```bash
# Cambiar a perfil LOW
echo "NODE_OPTIONS=--max-old-space-size=256" >> .env.rpi5
docker-compose -f docker-compose.rpi5.yml restart
```

#### 4. Base de datos corrupta
```bash
# Verificar integridad
docker exec genereviews-rpi5 sqlite3 /usr/src/app/database/genereviews.db "PRAGMA integrity_check;"

# Restaurar desde backup
cp backups/latest_backup.db database/genereviews.db
docker-compose -f docker-compose.rpi5.yml restart
```

### Logs Específicos de RPi5

```bash
# Ver logs de optimización RPi5
docker logs genereviews-rpi5 | grep "RPi5"

# Monitorear rendimiento en tiempo real
docker exec genereviews-rpi5 top -p 1

# Ver configuración aplicada
docker exec genereviews-rpi5 env | grep -E "(NODE_|RPI|MEMORY)"
```

## 📱 Acceso desde Dispositivos Móviles

La interfaz está optimizada para acceso móvil desde la red local:

```bash
# Encontrar IP del RPi5
hostname -I

# Acceder desde móvil/tablet
# http://[IP_DEL_RPI]:3000
```

## 🎯 Casos de Uso Específicos para RPi5

### 1. Laboratorio Médico
- Base de datos local sin dependencias de internet
- Consultas rápidas durante investigación
- Backup automático de datos críticos

### 2. Educación
- Servidor local para múltiples estudiantes
- Datos actualizados periódicamente
- Bajo costo de infraestructura

### 3. Investigación Personal
- Acceso 24/7 a base de datos genética
- Personalización completa
- Integración con otras herramientas

## 📈 Escalabilidad

### Para Mayor Rendimiento
```bash
# 1. Cluster de Raspberry Pi
# Usar Docker Swarm para distribuir carga

# 2. Optimización de red
# Configurar Nginx con cache agresivo

# 3. Base de datos externa
# Migrar SQLite a PostgreSQL en servidor dedicado
```

## 🆘 Soporte Específico RPi5

### Enlaces Útiles
- 🍓 **Raspberry Pi OS**: https://www.raspberrypi.org/software/
- 🐳 **Docker en RPi**: https://docs.docker.com/engine/install/debian/
- 🔧 **Optimización RPi**: https://www.raspberrypi.org/documentation/configuration/

### Contacto y Comunidad
- 📧 **Issues RPi5**: [GitHub Issues con tag rpi5]
- 💬 **Foro RPi**: https://www.raspberrypi.org/forums/
- 🛠️ **Wiki optimizaciones**: [Link a Wiki del proyecto]

---

## 🎉 ¡Listo para Raspberry Pi 5!

Su GeneReviews Database está optimizada y lista para ofrecer una experiencia excepcional en Raspberry Pi 5, aprovechando al máximo el hardware ARM64 y las capacidades de este increíble dispositivo.

### Próximos Pasos
1. ✅ Ejecute `./install-rpi5.sh`
2. ✅ Visite `http://localhost:3000`
3. ✅ Explore la base de datos genética
4. ✅ Configure backup automático
5. ✅ ¡Disfrute de su laboratorio genético personal!

**🍓 ¡Feliz investigación genética en su Raspberry Pi 5! 🧬**