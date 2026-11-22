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

output "vault_id" {
  value = oci_kms_vault.watchly.id
}

output "app_secret_ids" {
  description = "OCID of each environment's app secret, for scripts/push-secrets.sh"
  value       = { for env, s in oci_vault_secret.app : env => s.id }
}

output "r2_endpoint" {
  value = local.r2_endpoint
}

output "r2_buckets" {
  value = { for k, b in cloudflare_r2_bucket.watchly : k => b.name }
}

output "r2_content_public_url" {
  value = "https://${cloudflare_r2_managed_domain.content.domain}"
}

output "r2_app_credentials" {
  description = "S3 credentials of the app's R2 token, for scripts/push-secrets.sh"
  sensitive   = true
  value = {
    access_key_id     = cloudflare_account_token.app.id
    secret_access_key = sha256(cloudflare_account_token.app.value)
  }
}
