variable "frontend_server_name" {
  type        = string
  description = "Name of the existing Hetzner frontend server."
  default     = "norge360-frontend-1"
}

variable "backend_server_name" {
  type        = string
  description = "Name of the existing Hetzner backend server used for service-to-service connectivity checks."
  default     = "norge360-backend-1"
}

variable "cloudflare_zone_name" {
  type        = string
  description = "Cloudflare zone that will own the Norge360 DNS records."
  default     = "norge360.com"
}

variable "frontend_ssh_key_name" {
  type        = string
  description = "Name of the existing Hetzner SSH key used by the frontend admin."
  default     = "norge360-hetzner"
}

variable "frontend_ssh_private_key_path" {
  type        = string
  description = "Path to the local SSH private key used to bootstrap the frontend server."
  default     = "C:/Users/berka/.ssh/id_ed25519"
}

variable "frontend_ssh_user" {
  type        = string
  description = "SSH user for the frontend server bootstrap connection."
  default     = "root"
}

variable "frontend_admin_cidrs" {
  type        = list(string)
  description = "Allowed CIDR ranges for SSH access to the frontend server."
  default     = []
}

variable "enable_frontend_docker_bootstrap" {
  type        = bool
  description = "Whether Terraform should bootstrap Docker and Docker Compose on the frontend server over SSH."
  default     = false
}
