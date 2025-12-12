# Reserve a static external IP address
resource "google_compute_address" "streaming_server_ip" {
  name   = "streaming-server-ip"
  region = var.region
}

# Compute Engine instance for MediaMTX Media Server (RTMP/SRT/HLS/RTSP/WebRTC streaming)
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
      nat_ip = google_compute_address.streaming_server_ip.address
    }
  }

  metadata = {
    startup-script = file("${path.module}/startup-script.sh")
  }

  tags = ["http-server", "rtmp-server", "srt-server", "mqtt-server", "mediamtx-api"]

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

# Firewall rule for SRT
resource "google_compute_firewall" "allow_srt" {
  name    = "allow-srt"
  network = "default"

  allow {
    protocol = "udp"
    ports    = ["9998"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["srt-server"]
}

# Firewall rule for MediaMTX API
resource "google_compute_firewall" "allow_mediamtx_api" {
  name    = "allow-mediamtx-api"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["9997"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["mediamtx-api"]
}

# Firewall rule for MQTT
resource "google_compute_firewall" "allow_mqtt" {
  name    = "allow-mqtt"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["1883"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["mqtt-server"]
}

# Firewall rule for MQTT over WebSockets
resource "google_compute_firewall" "allow_mqtt_websockets" {
  name    = "allow-mqtt-websockets"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["9001"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["mqtt-server"]
}

# Output the external IP
output "streaming_server_ip" {
  description = "External IP address of the streaming server"
  value       = google_compute_address.streaming_server_ip.address
}

output "mqtt_broker" {
  description = "MQTT broker connection details"
  value       = "mqtt://${google_compute_address.streaming_server_ip.address}:1883"
}
