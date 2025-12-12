#!/bin/bash
apt-get update
apt-get install -y curl ca-certificates gnupg mosquitto-clients

# Install Podman
apt-get install -y podman

# Create Mosquitto configuration
mkdir -p /etc/mosquitto
cat > /etc/mosquitto/mosquitto.conf << 'MOSQUITTO_CONF_EOF'
# Listen on default MQTT port
listener 1883
protocol mqtt

# Listen on WebSocket port for browser clients
listener 9001
protocol websockets

# Allow anonymous connections
allow_anonymous true

# Persistence for message retention
persistence true
persistence_location /mosquitto/data/

# Logging
log_dest stdout
log_type error
log_type warning
log_type notice
log_type information
MOSQUITTO_CONF_EOF

# Create systemd service file for Mosquitto MQTT Broker
cat > /etc/systemd/system/mosquitto.service << 'MOSQUITTO_SERVICE_EOF'
[Unit]
Description=Mosquitto MQTT Broker (Podman)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
Restart=always
TimeoutStartSec=300
ExecStartPre=/usr/bin/podman pull docker.io/eclipse-mosquitto:latest
ExecStart=/usr/bin/podman run --rm --name mosquitto \
  -p 1883:1883 \
  -p 9001:9001 \
  -v /etc/mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro \
  docker.io/eclipse-mosquitto:latest
ExecStop=/usr/bin/podman stop -t 10 mosquitto

[Install]
WantedBy=multi-user.target
MOSQUITTO_SERVICE_EOF

# Enable and start the Mosquitto service
systemctl daemon-reload
systemctl enable mosquitto.service
systemctl start mosquitto.service

# Create MediaMTX configuration
mkdir -p /etc/mediamtx
cat > /etc/mediamtx/mediamtx.yml << 'MEDIAMTX_EOF'
# MediaMTX Configuration

# RTMP server
rtmp: yes
rtmpAddress: :1935

# SRT server
srt: yes
srtAddress: :9998

# HLS server
hls: yes
hlsAddress: :80
hlsAllowOrigins: ['*']
hlsVariant: lowLatency
hlsSegmentCount: 7
hlsSegmentDuration: 1s
hlsPartDuration: 200ms

# API server
api: yes
apiAddress: :9997

# Logging
logLevel: info

# Path defaults - accept all streams
paths:
  all:
    source: publisher
MEDIAMTX_EOF

# Create systemd service file for MediaMTX
cat > /etc/systemd/system/mediamtx.service << 'MEDIAMTX_SERVICE_EOF'
[Unit]
Description=MediaMTX Media Server (Podman)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
Restart=always
TimeoutStartSec=900
ExecStartPre=/usr/bin/podman pull docker.io/bluenviron/mediamtx:latest
ExecStart=/usr/bin/podman run --rm --name mediamtx \
  -p 1935:1935 \
  -p 9998:9998/udp \
  -p 80:80 \
  -p 9997:9997 \
  -p 8554:8554 \
  -p 8889:8889 \
  -p 8189:8189/udp \
  -v /etc/mediamtx/mediamtx.yml:/mediamtx.yml:ro \
  docker.io/bluenviron/mediamtx:latest
ExecStop=/usr/bin/podman stop -t 10 mediamtx

[Install]
WantedBy=multi-user.target
MEDIAMTX_SERVICE_EOF

# Enable and start the MediaMTX service
systemctl daemon-reload
systemctl enable mediamtx.service
systemctl start mediamtx.service
