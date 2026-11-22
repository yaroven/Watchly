output "compartment_id" {
  value = oci_identity_compartment.watchly_compartment.id
}

output "cluster_id" {
  value = oci_containerengine_cluster.watchly_oke.id
}

output "cluster_public_endpoint" {
  value = oci_containerengine_cluster.watchly_oke.endpoints[0].public_endpoint
}

output "kubeconfig_command" {
  description = "Writes a kubeconfig for this cluster (needs the OCI CLI)"
  value       = "oci ce cluster create-kubeconfig --cluster-id ${oci_containerengine_cluster.watchly_oke.id} --file $HOME/.kube/config --region ${var.region} --token-version 2.0.0 --kube-endpoint PUBLIC_ENDPOINT"
}

output "node_image" {
  value = local.oke_arm_image_name
}

output "lb_nsg_id" {
  description = "Attach to the ingress Service: annotation oci.oraclecloud.com/oci-network-security-groups (load balancer) or oci-network-load-balancer.oraclecloud.com/oci-network-security-groups (network load balancer)"
  value       = oci_core_network_security_group.k8s_lb_nsg.id
}
