output "frontend_server_id" {
  value = data.hcloud_server.frontend.id
}

output "frontend_server_ipv4" {
  value = data.hcloud_server.frontend.ipv4_address
}

output "frontend_server_private_ipv4" {
  value = try(data.hcloud_server.frontend.private_net[0].ip, null)
}

output "backend_server_id" {
  value = data.hcloud_server.backend.id
}

output "backend_server_private_ipv4" {
  value = try(data.hcloud_server.backend.private_net[0].ip, null)
}

output "frontend_firewall_id" {
  value = hcloud_firewall.frontend.id
}

output "frontend_ssh_key_id" {
  value = data.hcloud_ssh_key.frontend_admin.id
}
