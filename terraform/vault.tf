resource "oci_kms_vault" "watchly" {
  compartment_id = oci_identity_compartment.watchly_compartment.id
  display_name   = "watchly-vault"
  vault_type     = "DEFAULT"
}

resource "oci_kms_key" "watchly_secrets" {
  compartment_id      = oci_identity_compartment.watchly_compartment.id
  display_name        = "watchly-secrets-key"
  management_endpoint = oci_kms_vault.watchly.management_endpoint
  protection_mode     = "SOFTWARE"

  key_shape {
    algorithm = "AES"
    length    = 32
  }
}

resource "oci_vault_secret" "app" {
  for_each = toset(var.secret_environments)

  compartment_id = oci_identity_compartment.watchly_compartment.id
  vault_id       = oci_kms_vault.watchly.id
  key_id         = oci_kms_key.watchly_secrets.id
  secret_name    = "watchly-${each.key}-app"
  description    = "Env vars of the watchly-secrets Secret in watchly-${each.key}"

  secret_content {
    content_type = "BASE64"
    content      = base64encode("{}")
  }

  lifecycle {
    ignore_changes = [secret_content]
  }
}

resource "oci_identity_dynamic_group" "watchly_nodes" {
  compartment_id = var.tenancy_id
  name           = "watchly-oke-nodes"
  description    = "Worker nodes of the watchly OKE cluster"
  matching_rule  = "ALL {instance.compartment.id = '${oci_identity_compartment.watchly_compartment.id}'}"
}

resource "oci_identity_policy" "watchly_nodes_read_secrets" {
  compartment_id = oci_identity_compartment.watchly_compartment.id
  name           = "watchly-nodes-read-secrets"
  description    = "Lets External Secrets Operator on the watchly nodes read the app secrets"
  statements = [
    "Allow dynamic-group ${oci_identity_dynamic_group.watchly_nodes.name} to read secret-family in compartment id ${oci_identity_compartment.watchly_compartment.id} where target.vault.id = '${oci_kms_vault.watchly.id}'",
  ]
}
