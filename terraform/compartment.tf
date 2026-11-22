resource "oci_identity_compartment" "watchly_compartment" {
  compartment_id = var.tenancy_id

  name          = "Watchly"
  description   = "Compartment for watchly infrastructure"
  enable_delete = true
}