# Safety net: everything here is meant to stay inside Always Free, so any spend
# at all means something escaped the free limits. Targets the root compartment
# so it also catches resources Kubernetes creates on its own (load balancers,
# block volumes for PVCs).
resource "oci_budget_budget" "watchly" {
  compartment_id = var.tenancy_id
  display_name   = "watchly-free-tier-guard"
  description    = "Alerts on any spend in the tenancy"
  amount         = var.budget_amount
  reset_period   = "MONTHLY"
  target_type    = "COMPARTMENT"
  targets        = [var.tenancy_id]
}

resource "oci_budget_alert_rule" "watchly_any_spend" {
  budget_id      = oci_budget_budget.watchly.id
  display_name   = "any-actual-spend"
  type           = "ACTUAL"
  threshold_type = "PERCENTAGE"
  threshold      = 1
  recipients     = var.budget_alert_email
  message        = "OCI spend is above zero. Something left the Always Free limits: check Cost Analysis."
}

resource "oci_budget_alert_rule" "watchly_forecast" {
  budget_id      = oci_budget_budget.watchly.id
  display_name   = "forecast-over-budget"
  type           = "FORECAST"
  threshold_type = "PERCENTAGE"
  threshold      = 100
  recipients     = var.budget_alert_email
  message        = "OCI forecasts this month's spend above the budget."
}
