# Rules follow Oracle's "Network Resource Configuration for Cluster Creation and
# Deployment" for a flannel cluster with a public API endpoint, private workers
# and public load balancers. NSG rules here are stateful, so replies need no rule.

resource "oci_core_network_security_group" "k8s_api_nsg" {
  compartment_id = oci_identity_compartment.watchly_compartment.id
  vcn_id         = oci_core_vcn.watchly_vcn.id
  display_name   = "k8s-api-nsg"
}

resource "oci_core_network_security_group" "k8s_workers_nsg" {
  compartment_id = oci_identity_compartment.watchly_compartment.id
  vcn_id         = oci_core_vcn.watchly_vcn.id
  display_name   = "k8s-workers-nsg"
}

# Not attached by Terraform: Kubernetes creates the load balancers itself, so the
# ingress Service has to reference this NSG by annotation (see the lb_nsg_id output).
resource "oci_core_network_security_group" "k8s_lb_nsg" {
  compartment_id = oci_identity_compartment.watchly_compartment.id
  vcn_id         = oci_core_vcn.watchly_vcn.id
  display_name   = "k8s-lb-nsg"
}

# --- Kubernetes API endpoint ---

resource "oci_core_network_security_group_security_rule" "api_ingress_kubectl" {
  for_each = toset(var.api_allowed_cidrs)

  network_security_group_id = oci_core_network_security_group.k8s_api_nsg.id
  description               = "kubectl access to the Kubernetes API"
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = each.value
  source_type               = "CIDR_BLOCK"

  tcp_options {
    destination_port_range {
      min = 6443
      max = 6443
    }
  }
}

resource "oci_core_network_security_group_security_rule" "api_ingress_workers" {
  network_security_group_id = oci_core_network_security_group.k8s_api_nsg.id
  description               = "Workers to the Kubernetes API"
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = oci_core_network_security_group.k8s_workers_nsg.id
  source_type               = "NETWORK_SECURITY_GROUP"

  tcp_options {
    destination_port_range {
      min = 6443
      max = 6443
    }
  }
}

resource "oci_core_network_security_group_security_rule" "api_ingress_workers_control" {
  network_security_group_id = oci_core_network_security_group.k8s_api_nsg.id
  description               = "Workers to the control plane"
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = oci_core_network_security_group.k8s_workers_nsg.id
  source_type               = "NETWORK_SECURITY_GROUP"

  tcp_options {
    destination_port_range {
      min = 12250
      max = 12250
    }
  }
}

resource "oci_core_network_security_group_security_rule" "api_ingress_workers_icmp" {
  network_security_group_id = oci_core_network_security_group.k8s_api_nsg.id
  description               = "Path MTU discovery from workers"
  direction                 = "INGRESS"
  protocol                  = "1"
  source                    = oci_core_network_security_group.k8s_workers_nsg.id
  source_type               = "NETWORK_SECURITY_GROUP"

  icmp_options {
    type = 3
    code = 4
  }
}

resource "oci_core_network_security_group_security_rule" "api_egress_all" {
  network_security_group_id = oci_core_network_security_group.k8s_api_nsg.id
  description               = "Control plane to workers and OCI services"
  direction                 = "EGRESS"
  protocol                  = "all"
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
}

# --- Workers ---

resource "oci_core_network_security_group_security_rule" "workers_ingress_internal" {
  network_security_group_id = oci_core_network_security_group.k8s_workers_nsg.id
  description               = "Node to node and pod to pod (flannel VXLAN)"
  direction                 = "INGRESS"
  protocol                  = "all"
  source                    = oci_core_network_security_group.k8s_workers_nsg.id
  source_type               = "NETWORK_SECURITY_GROUP"
}

resource "oci_core_network_security_group_security_rule" "workers_ingress_api" {
  network_security_group_id = oci_core_network_security_group.k8s_workers_nsg.id
  description               = "Control plane to workers (kubelet, exec, webhooks)"
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = oci_core_network_security_group.k8s_api_nsg.id
  source_type               = "NETWORK_SECURITY_GROUP"
}

resource "oci_core_network_security_group_security_rule" "workers_ingress_lb_nodeports" {
  network_security_group_id = oci_core_network_security_group.k8s_workers_nsg.id
  description               = "Load balancers to Service NodePorts"
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = oci_core_network_security_group.k8s_lb_nsg.id
  source_type               = "NETWORK_SECURITY_GROUP"

  tcp_options {
    destination_port_range {
      min = 30000
      max = 32767
    }
  }
}

resource "oci_core_network_security_group_security_rule" "workers_ingress_lb_health" {
  network_security_group_id = oci_core_network_security_group.k8s_workers_nsg.id
  description               = "Load balancer health checks to kube-proxy"
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = oci_core_network_security_group.k8s_lb_nsg.id
  source_type               = "NETWORK_SECURITY_GROUP"

  tcp_options {
    destination_port_range {
      min = 10256
      max = 10256
    }
  }
}

resource "oci_core_network_security_group_security_rule" "workers_ingress_icmp" {
  network_security_group_id = oci_core_network_security_group.k8s_workers_nsg.id
  description               = "Path MTU discovery"
  direction                 = "INGRESS"
  protocol                  = "1"
  source                    = "0.0.0.0/0"
  source_type               = "CIDR_BLOCK"

  icmp_options {
    type = 3
    code = 4
  }
}

resource "oci_core_network_security_group_security_rule" "workers_egress_all" {
  network_security_group_id = oci_core_network_security_group.k8s_workers_nsg.id
  description               = "Workers to the API, image registries and the internet via NAT"
  direction                 = "EGRESS"
  protocol                  = "all"
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
}

# --- Load balancers ---

resource "oci_core_network_security_group_security_rule" "lb_ingress" {
  for_each = toset(["80", "443"])

  network_security_group_id = oci_core_network_security_group.k8s_lb_nsg.id
  description               = "Public traffic on port ${each.value}"
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = "0.0.0.0/0"
  source_type               = "CIDR_BLOCK"

  tcp_options {
    destination_port_range {
      min = tonumber(each.value)
      max = tonumber(each.value)
    }
  }
}

resource "oci_core_network_security_group_security_rule" "lb_egress_nodeports" {
  network_security_group_id = oci_core_network_security_group.k8s_lb_nsg.id
  description               = "Load balancers to Service NodePorts"
  direction                 = "EGRESS"
  protocol                  = "6"
  destination               = oci_core_network_security_group.k8s_workers_nsg.id
  destination_type          = "NETWORK_SECURITY_GROUP"

  tcp_options {
    destination_port_range {
      min = 30000
      max = 32767
    }
  }
}

resource "oci_core_network_security_group_security_rule" "lb_egress_health" {
  network_security_group_id = oci_core_network_security_group.k8s_lb_nsg.id
  description               = "Load balancer health checks to kube-proxy"
  direction                 = "EGRESS"
  protocol                  = "6"
  destination               = oci_core_network_security_group.k8s_workers_nsg.id
  destination_type          = "NETWORK_SECURITY_GROUP"

  tcp_options {
    destination_port_range {
      min = 10256
      max = 10256
    }
  }
}
