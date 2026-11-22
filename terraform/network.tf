resource "oci_core_vcn" "watchly_vcn" {
  compartment_id = oci_identity_compartment.watchly_compartment.id

  cidr_blocks  = var.vcn_cidr_blocks
  display_name = var.vcn_display_name
  dns_label    = var.vcn_dns_label
}

resource "oci_core_internet_gateway" "watchly_igw" {
  compartment_id = oci_identity_compartment.watchly_compartment.id

  vcn_id       = oci_core_vcn.watchly_vcn.id
  display_name = var.igw_display_name
  enabled      = true
}

resource "oci_core_nat_gateway" "watchly_nat" {
  compartment_id = oci_identity_compartment.watchly_compartment.id
  vcn_id         = oci_core_vcn.watchly_vcn.id
  display_name   = var.nat_display_name
}

resource "oci_core_route_table" "watchly_public_rt" {
  compartment_id = oci_identity_compartment.watchly_compartment.id
  vcn_id         = oci_core_vcn.watchly_vcn.id
  display_name   = var.pub_rt_display_name

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.watchly_igw.id
  }
}

resource "oci_core_route_table" "watchly_private_rt" {
  compartment_id = oci_identity_compartment.watchly_compartment.id
  vcn_id         = oci_core_vcn.watchly_vcn.id
  display_name   = var.priv_rt_display_name

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_nat_gateway.watchly_nat.id
  }
}

resource "oci_core_subnet" "watchly_public_subnet" {
  compartment_id             = oci_identity_compartment.watchly_compartment.id
  vcn_id                     = oci_core_vcn.watchly_vcn.id
  cidr_block                 = cidrsubnet(var.vcn_cidr_blocks[0], 8, 1)
  display_name               = "public-subnet"
  dns_label                  = "public"
  route_table_id             = oci_core_route_table.watchly_public_rt.id
  prohibit_public_ip_on_vnic = false
}

resource "oci_core_subnet" "watchly_private_subnet" {
  compartment_id             = oci_identity_compartment.watchly_compartment.id
  vcn_id                     = oci_core_vcn.watchly_vcn.id
  cidr_block                 = cidrsubnet(var.vcn_cidr_blocks[0], 8, 2)
  display_name               = "private-subnet"
  dns_label                  = "private"
  route_table_id             = oci_core_route_table.watchly_private_rt.id
  prohibit_public_ip_on_vnic = true
}
