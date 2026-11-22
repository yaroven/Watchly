data "oci_identity_availability_domains" "watchly_ads" {
  compartment_id = var.tenancy_id
}

# Kubernetes versions OKE currently accepts for new clusters.
data "oci_containerengine_cluster_option" "watchly_oke" {
  cluster_option_id = "all"
}

# Node images OKE offers. Filtered in locals down to the newest OKE image for
# ARM (aarch64) built for the cluster's Kubernetes version.
data "oci_containerengine_node_pool_option" "watchly_oke" {
  node_pool_option_id = "all"
  compartment_id      = var.tenancy_id
}

locals {
  # "v1.36.4" -> "1.36.4", the form used in OKE image names.
  node_k8s_version = trimprefix(var.kubernetes_version, "v")

  # Image names look like Oracle-Linux-8.10-aarch64-2026.10.16-0-OKE-1.36.4-2067:
  # the build date sorts lexicographically, so the last name is the newest image.
  oke_arm_images = {
    for s in data.oci_containerengine_node_pool_option.watchly_oke.sources :
    s.source_name => s.image_id
    if can(regex("^Oracle-Linux-${replace(var.node_image_os_version, ".", "\\.")}-aarch64-.*-OKE-${replace(local.node_k8s_version, ".", "\\.")}-", s.source_name))
  }
  oke_arm_image_name = length(local.oke_arm_images) > 0 ? reverse(sort(keys(local.oke_arm_images)))[0] : null
  oke_arm_image_id   = local.oke_arm_image_name == null ? null : local.oke_arm_images[local.oke_arm_image_name]
}
