#!/bin/bash
apt-get update
apt-get install -y nginx libnginx-mod-rtmp curl

# Install InfluxDB 2.x
wget -q https://repos.influxdata.com/influxdata-archive_compat.key
echo '393e8779c89ac8d958f81f942f9ad7fb82a25e133faddaf92e15b16e6ac9ce4c influxdata-archive_compat.key' | sha256sum -c && cat influxdata-archive_compat.key | gpg --dearmor | tee /etc/apt/trusted.gpg.d/influxdata-archive_compat.gpg > /dev/null
echo 'deb [signed-by=/etc/apt/trusted.gpg.d/influxdata-archive_compat.gpg] https://repos.influxdata.com/debian stable main' | tee /etc/apt/sources.list.d/influxdata.list
apt-get update && apt-get install -y influxdb2

# Configure InfluxDB
cat > /etc/influxdb/config.toml << 'INFLUX_EOF'
bolt-path = "/var/lib/influxdb/influxd.bolt"
engine-path = "/var/lib/influxdb/engine"
session-length = 720
INFLUX_EOF

# Start InfluxDB
systemctl start influxdb
systemctl enable influxdb

# Wait for InfluxDB to start
sleep 10

# Basic RTMP configuration
cat > /etc/nginx/nginx.conf << 'NGINX_EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
  worker_connections 768;
}

http {
  sendfile on;
  tcp_nopush on;
  types_hash_max_size 2048;
  include /etc/nginx/mime.types;
  default_type application/octet-stream;
  access_log /var/log/nginx/access.log;
  error_log /var/log/nginx/error.log;
  gzip on;

  server {
    listen 80;
    server_name _;

    location / {
      root /var/www/html;
      index index.html;
    }

    location /hls {
      types {
        application/vnd.apple.mpegurl m3u8;
        video/mp2t ts;
      }
      root /tmp;
      add_header Cache-Control no-cache;
      add_header Access-Control-Allow-Origin *;
    }
  }
}

rtmp {
  server {
    listen 1935;
    chunk_size 4096;

    application live {
      live on;
      record off;

      # Enable HLS
      hls on;
      hls_path /tmp/hls;
      hls_fragment 3;
      hls_playlist_length 60;
    }
  }
}
NGINX_EOF

mkdir -p /tmp/hls
chmod -R 755 /tmp/hls
systemctl restart nginx
