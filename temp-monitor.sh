#!/bin/bash

# Monitor de temperatura para Raspberry Pi 5
# Envía alertas cuando la temperatura es muy alta

TEMP_THRESHOLD=${TEMP_THRESHOLD:-80}
CHECK_INTERVAL=${CHECK_INTERVAL:-30}
WEBHOOK_URL=${WEBHOOK_URL:-}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

get_temperature() {
    if [ -f /sys/class/thermal/thermal_zone0/temp ]; then
        temp_raw=$(cat /sys/class/thermal/thermal_zone0/temp)
        temp=$((temp_raw / 1000))
        echo $temp
    else
        echo "0"
    fi
}

send_alert() {
    local temp=$1
    local message="🌡️ ALERT: Raspberry Pi 5 temperature is ${temp}°C (threshold: ${TEMP_THRESHOLD}°C)"
    
    log "$message"
    
    if [ -n "$WEBHOOK_URL" ]; then
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"$message\"}" \
            --max-time 10 \
            --silent || log "Failed to send webhook alert"
    fi
    
    # También podríamos enviar comando a Docker para reducir recursos
    # docker update --cpus="0.5" --memory="256m" genereviews-rpi5 2>/dev/null || true
}

log "Starting temperature monitor for RPi5"
log "Threshold: ${TEMP_THRESHOLD}°C"
log "Check interval: ${CHECK_INTERVAL}s"

alert_sent=false

while true; do
    temp=$(get_temperature)
    
    if [ "$temp" -gt "$TEMP_THRESHOLD" ]; then
        if [ "$alert_sent" = false ]; then
            send_alert $temp
            alert_sent=true
        fi
        log "Temperature: ${temp}°C (HIGH - above threshold)"
    else
        if [ "$alert_sent" = true ]; then
            log "Temperature normalized: ${temp}°C"
            alert_sent=false
        else
            log "Temperature: ${temp}°C (OK)"
        fi
    fi
    
    sleep $CHECK_INTERVAL
done