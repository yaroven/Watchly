locals {
  r2_buckets = {
    raw     = "watchly-raw"
    content = "watchly-content"
  }
  r2_endpoint = "https://${var.cloudflare_account_id}.r2.cloudflarestorage.com"
}

resource "cloudflare_r2_bucket" "watchly" {
  for_each = local.r2_buckets

  account_id = var.cloudflare_account_id
  name       = each.value
  location   = "weur"
}

resource "cloudflare_r2_bucket_cors" "raw" {
  account_id  = var.cloudflare_account_id
  bucket_name = cloudflare_r2_bucket.watchly["raw"].name

  rules = [{
    allowed = {
      methods = ["PUT"]
      origins = var.app_origins
      headers = ["content-type"]
    }
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }]
}

resource "cloudflare_r2_bucket_cors" "content" {
  account_id  = var.cloudflare_account_id
  bucket_name = cloudflare_r2_bucket.watchly["content"].name

  rules = [{
    allowed = {
      methods = ["GET", "HEAD"]
      origins = var.app_origins
    }
    max_age_seconds = 3600
  }]
}

resource "cloudflare_r2_managed_domain" "content" {
  account_id  = var.cloudflare_account_id
  bucket_name = cloudflare_r2_bucket.watchly["content"].name
  enabled     = true
}

data "cloudflare_account_api_token_permission_groups_list" "r2_object_write" {
  account_id = var.cloudflare_account_id
  name       = "Workers R2 Storage Bucket Item Write"
}

resource "cloudflare_account_token" "app" {
  account_id = var.cloudflare_account_id
  name       = "watchly-app-r2"

  policies = [{
    effect            = "allow"
    permission_groups = [{ id = data.cloudflare_account_api_token_permission_groups_list.r2_object_write.result[0].id }]
    resources = jsonencode({
      for name in values(local.r2_buckets) :
      "com.cloudflare.edge.r2.bucket.${var.cloudflare_account_id}_default_${name}" => "*"
    })
  }]
}
