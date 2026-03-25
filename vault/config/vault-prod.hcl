storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address       = "0.0.0.0:8200"
  tls_cert_file = "/vault/ssl/cert.pem"
  tls_key_file  = "/vault/ssl/key.pem"
}

api_addr     = "https://vault:8200"
cluster_addr = "http://vault:8201"
ui           = true
log_level    = "warn"

# disable_mlock = true is correct for Docker: HashiCorp recommends this for
# container deployments.  cap_add: IPC_LOCK (set in compose) still grants the
# kernel privilege for per-buffer mlock calls; only the global mlockall() is
# skipped, which avoids crash-loops in WSL2 / Docker Desktop environments.
disable_mlock = true
