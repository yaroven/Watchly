variable "api_fingerprint" {
  description = "Fingerprint of OCI API private key for Tenancy"
  type        = string
}

variable "api_private_key_path" {
  description = "Path to OCI API private key used for Tenancy"
  type        = string
}

variable "tenancy_id" {
  description = "Tenancy ID where to create resources for Tenancy"
  type        = string
}

variable "user_id" {
  description = "User ID that Terraform will use to create resources for Tenancy"
  type        = string
}

variable "region" {
  description = "OCI region where resources will be created for Tenancy"
  type        = string
}

# --- Network ---

variable "vcn_cidr_blocks" {
  description = "CIDR blocks of the VCN. Must not overlap the OKE pods (10.244.0.0/16) or services (10.96.0.0/16) CIDRs"
  type        = list(string)
  default     = ["10.0.0.0/16"]

  validation {
    condition     = length(var.vcn_cidr_blocks) > 0 && alltrue([for c in var.vcn_cidr_blocks : can(cidrhost(c, 0))])
    error_message = "vcn_cidr_blocks must contain at least one valid CIDR, e.g. 10.0.0.0/16."
  }
}

variable "vcn_display_name" {
  description = "Display name of the VCN in the OCI console"
  type        = string
  default     = "watchly-vcn"
}

variable "vcn_dns_label" {
  description = "DNS label of the VCN: starts with a letter, letters and digits only, at most 15 characters"
  type        = string
  default     = "watchly"

  validation {
    condition     = can(regex("^[a-z][a-z0-9]{0,14}$", var.vcn_dns_label))
    error_message = "vcn_dns_label must start with a lowercase letter, contain only lowercase letters and digits, and be at most 15 characters."
  }
}

variable "igw_display_name" {
  description = "Display name of the Internet Gateway"
  type        = string
  default     = "watchly-igw"
}

variable "nat_display_name" {
  description = "Display name of the NAT Gateway"
  type        = string
  default     = "watchly-nat"
}

variable "pub_rt_display_name" {
  description = "Display name of the public route table (default route via the Internet Gateway)"
  type        = string
  default     = "watchly-public-rt"
}

variable "priv_rt_display_name" {
  description = "Display name of the private route table (default route via the NAT Gateway)"
  type        = string
  default     = "watchly-private-rt"
}

# --- Kubernetes (OKE) ---

variable "kubernetes_version" {
  description = "Kubernetes version of the cluster and node pool. Must be one OKE currently accepts; a precondition checks it against the live list"
  type        = string
  default     = "v1.36.4"

  validation {
    condition     = can(regex("^v\\d+\\.\\d+\\.\\d+$", var.kubernetes_version))
    error_message = "kubernetes_version must look like v1.36.4."
  }
}

variable "cluster_name" {
  description = "Name of the OKE cluster"
  type        = string
  default     = "watchly"
}

variable "node_pool_name" {
  description = "Name of the OKE node pool"
  type        = string
  default     = "arm-free-pool"
}

variable "pods_cidr" {
  description = "CIDR for pod IPs (flannel). Must not overlap the VCN"
  type        = string
  default     = "10.244.0.0/16"
}

variable "services_cidr" {
  description = "CIDR for Kubernetes Service IPs. Must not overlap the VCN"
  type        = string
  default     = "10.96.0.0/16"
}

variable "api_allowed_cidrs" {
  description = "CIDRs allowed to reach the Kubernetes API on 6443. Set to [\"<your IP>/32\"] to close it to the internet"
  type        = list(string)
  default     = ["0.0.0.0/0"]

  validation {
    condition     = length(var.api_allowed_cidrs) > 0 && alltrue([for c in var.api_allowed_cidrs : can(cidrhost(c, 0))])
    error_message = "api_allowed_cidrs must contain at least one valid CIDR, e.g. 203.0.113.7/32."
  }
}

variable "availability_domain_index" {
  description = "Which availability domain (0-based) to place the nodes in. Change it when A1 reports \"Out of host capacity\""
  type        = number
  default     = 0
}

variable "node_image_os_version" {
  description = "Oracle Linux version of the OKE node image, e.g. 8.10 or 9.8"
  type        = string
  default     = "8.10"
}

# --- Always Free limits (Ampere A1: 4 OCPU, 24 GB RAM; block storage: 200 GB) ---

variable "node_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 2

  validation {
    condition     = var.node_count >= 1
    error_message = "node_count must be at least 1."
  }
}

variable "node_ocpus" {
  description = "OCPUs per node. node_count * node_ocpus must stay within the Always Free 4 OCPUs"
  type        = number
  default     = 2

  validation {
    condition     = var.node_count * var.node_ocpus <= 4
    error_message = "node_count * node_ocpus exceeds the Always Free A1 limit of 4 OCPUs."
  }
}

variable "node_memory_gbs" {
  description = "Memory per node in GB. node_count * node_memory_gbs must stay within the Always Free 24 GB"
  type        = number
  default     = 12

  validation {
    condition     = var.node_count * var.node_memory_gbs <= 24
    error_message = "node_count * node_memory_gbs exceeds the Always Free A1 limit of 24 GB."
  }
}

variable "node_boot_volume_gbs" {
  description = "Boot volume per node in GB (OCI minimum is 50). All boot volumes plus every PVC share the Always Free 200 GB"
  type        = number
  default     = 50

  validation {
    condition     = var.node_boot_volume_gbs >= 50 && var.node_count * var.node_boot_volume_gbs <= 200
    error_message = "node_boot_volume_gbs must be at least 50, and node_count * node_boot_volume_gbs must stay within the Always Free 200 GB."
  }
}

# --- Budget ---

variable "budget_amount" {
  description = "Monthly budget in the account currency. Everything is meant to be free, so keep it at the minimum"
  type        = number
  default     = 1
}

variable "budget_alert_email" {
  description = "Email that receives the budget alerts"
  type        = string
}

# --- Secrets ---

variable "secret_environments" {
  description = "Environments that get an app secret in the vault, one per k8s overlay"
  type        = list(string)
  default     = ["prod"]
}
