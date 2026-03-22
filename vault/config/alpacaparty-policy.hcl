# Vault policy for the AlpacaParty backend service token.
# This token may ONLY read the single secret path used by the app.
# It cannot list, write, delete, or access any other path.

path "secret/data/alpacaparty" {
  capabilities = ["read"]
}
