data "hcloud_server" "frontend" {
  name = var.frontend_server_name
}

data "hcloud_server" "backend" {
  name = var.backend_server_name
}

data "hcloud_ssh_key" "frontend_admin" {
  name = var.frontend_ssh_key_name
}

data "cloudflare_zone" "norge360" {
  filter = {
    name = var.cloudflare_zone_name
  }
}

resource "hcloud_firewall" "frontend" {
  name = "norge360-web-frontend-firewall"

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  dynamic "rule" {
    for_each = var.frontend_admin_cidrs

    content {
      direction  = "in"
      protocol   = "tcp"
      port       = "22"
      source_ips = [rule.value]
    }
  }

  rule {
    direction       = "out"
    protocol        = "tcp"
    port            = "any"
    destination_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction       = "out"
    protocol        = "udp"
    port            = "any"
    destination_ips = ["0.0.0.0/0", "::/0"]
  }
}

resource "hcloud_firewall_attachment" "frontend" {
  firewall_id = hcloud_firewall.frontend.id
  server_ids  = [data.hcloud_server.frontend.id]
}

resource "cloudflare_dns_record" "root" {
  zone_id = data.cloudflare_zone.norge360.id
  name    = "@"
  type    = "A"
  content = data.hcloud_server.frontend.ipv4_address
  proxied = true
  ttl     = 1
}

resource "cloudflare_dns_record" "auth" {
  zone_id = data.cloudflare_zone.norge360.id
  name    = "auth"
  type    = "A"
  content = data.hcloud_server.frontend.ipv4_address
  proxied = true
  ttl     = 1
}

resource "cloudflare_dns_record" "www" {
  zone_id = data.cloudflare_zone.norge360.id
  name    = "www"
  type    = "A"
  content = data.hcloud_server.frontend.ipv4_address
  proxied = true
  ttl     = 1
}

resource "null_resource" "frontend_docker_bootstrap" {
  count = var.enable_frontend_docker_bootstrap ? 1 : 0

  triggers = {
    server_id = data.hcloud_server.frontend.id
    version   = "2026-06-05-1"
  }

  connection {
    host        = data.hcloud_server.frontend.ipv4_address
    user        = var.frontend_ssh_user
    private_key = file(var.frontend_ssh_private_key_path)
    timeout     = "10m"
  }

  provisioner "remote-exec" {
    inline = [
      "set -eu",
      "curl -fsSL https://get.docker.com | sh",
      "systemctl enable --now docker",
      "mkdir -p /opt/norge360-web /opt/norge360-env",
      "chmod 750 /opt/norge360-web /opt/norge360-env",
      "docker compose version",
    ]
  }
}
