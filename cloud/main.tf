# Reserve a static external IP address
resource "google_compute_address" "streaming_server_ip" {
  name   = "streaming-server-ip"
  region = var.region
}

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
      nat_ip = google_compute_address.streaming_server_ip.address
    }
  }

  metadata = {
    startup-script = file("${path.module}/startup-script.sh")
  }

  tags = ["http-server", "rtmp-server", "influxdb-server"]

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

# Firewall rule for InfluxDB
resource "google_compute_firewall" "allow_influxdb" {
  name    = "allow-influxdb"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["8086"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["influxdb-server"]
}

# Output the external IP
output "streaming_server_ip" {
  description = "External IP address of the streaming server"
  value       = google_compute_address.streaming_server_ip.address
}

output "influxdb_url" {
  description = "InfluxDB URL for API access"
  value       = "http://${google_compute_address.streaming_server_ip.address}:8086"
}
