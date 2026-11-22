resource "oci_containerengine_cluster" "watchly_oke" {
  compartment_id     = oci_identity_compartment.watchly_compartment.id
  kubernetes_version = var.kubernetes_version
  name               = var.cluster_name
  vcn_id             = oci_core_vcn.watchly_vcn.id

  # Hardcoded on purpose: BASIC is the free control plane, ENHANCED is billed per hour.
  type = "BASIC_CLUSTER"

  cluster_pod_network_options {
    cni_type = "FLANNEL_OVERLAY"
  }

  endpoint_config {
    is_public_ip_enabled = true
    subnet_id            = oci_core_subnet.watchly_public_subnet.id
    nsg_ids              = [oci_core_network_security_group.k8s_api_nsg.id]
  }

  options {
    service_lb_subnet_ids = [oci_core_subnet.watchly_public_subnet.id]

    kubernetes_network_config {
      pods_cidr     = var.pods_cidr
      services_cidr = var.services_cidr
    }
  }

  lifecycle {
    precondition {
      condition     = contains(data.oci_containerengine_cluster_option.watchly_oke.kubernetes_versions, var.kubernetes_version)
      error_message = "OKE does not accept kubernetes_version ${var.kubernetes_version}. Supported: ${join(", ", data.oci_containerengine_cluster_option.watchly_oke.kubernetes_versions)}."
    }
  }
}

resource "oci_containerengine_node_pool" "watchly_workers" {
  cluster_id         = oci_containerengine_cluster.watchly_oke.id
  compartment_id     = oci_identity_compartment.watchly_compartment.id
  kubernetes_version = oci_containerengine_cluster.watchly_oke.kubernetes_version
  name               = var.node_pool_name

  # Hardcoded on purpose: Ampere A1 is the only Always Free shape big enough for the stack.
  node_shape = "VM.Standard.A1.Flex"

  node_shape_config {
    ocpus         = var.node_ocpus
    memory_in_gbs = var.node_memory_gbs
  }

  node_source_details {
    source_type             = "IMAGE"
    image_id                = local.oke_arm_image_id
    boot_volume_size_in_gbs = var.node_boot_volume_gbs
  }

  node_config_details {
    size    = var.node_count
    nsg_ids = [oci_core_network_security_group.k8s_workers_nsg.id]

    placement_configs {
      availability_domain = data.oci_identity_availability_domains.watchly_ads.availability_domains[var.availability_domain_index].name
      subnet_id           = oci_core_subnet.watchly_private_subnet.id
    }
  }

  lifecycle {
    precondition {
      condition     = local.oke_arm_image_id != null
      error_message = "No aarch64 OKE image for Oracle Linux ${var.node_image_os_version} and Kubernetes ${var.kubernetes_version}."
    }

    precondition {
      condition     = var.availability_domain_index < length(data.oci_identity_availability_domains.watchly_ads.availability_domains)
      error_message = "availability_domain_index ${var.availability_domain_index} is out of range: the region has ${length(data.oci_identity_availability_domains.watchly_ads.availability_domains)} availability domains."
    }
  }
}
