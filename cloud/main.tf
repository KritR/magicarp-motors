# Compute Engine instance for web server + RTMP streaming
resource "google_compute_instance" "streaming_server" {
  name         = "streaming-server"
  machine_type = "e2-medium"
  zone         = "${var.region}-a"

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
      size  = 20
      type  = "pd-standard"
    }
  }

  network_interface {
    network = "default"
    access_config {
      # Ephemeral external IP
    }
  }

  metadata = {
    startup-script = <<-EOF
      #!/bin/bash
      apt-get update
      apt-get install -y nginx libnginx-mod-rtmp

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
    EOF
  }

  tags = ["http-server", "rtmp-server"]

  service_account {
    scopes = ["cloud-platform"]
  }
}

# Firewall rule for HTTP/HTTPS
resource "google_compute_firewall" "allow_http" {
  name    = "allow-http-https"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["http-server"]
}

# Firewall rule for RTMP
resource "google_compute_firewall" "allow_rtmp" {
  name    = "allow-rtmp"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["1935"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["rtmp-server"]
}

# Output the external IP
output "streaming_server_ip" {
  description = "External IP address of the streaming server"
  value       = google_compute_instance.streaming_server.network_interface[0].access_config[0].nat_ip
}
