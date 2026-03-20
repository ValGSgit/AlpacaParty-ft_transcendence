# nginx WAF image — wraps the official OWASP ModSecurity CRS nginx image
# and adds our custom rule tuning.
#
# Base image ships:
#   nginx 1.25 + ModSecurity v3 + OWASP CRS v4
#   https://hub.docker.com/r/owasp/modsecurity-crs

FROM owasp/modsecurity-crs:nginx

# Create SSL directory
RUN mkdir -p /etc/nginx/conf

# ── CRS configuration ──────────────────────────────────────────────────
# The base image reads these env vars at startup to configure CRS.
ENV MODSEC_RULE_ENGINE=On \
    MODSEC_REQ_BODY_ACCESS=On \
    MODSEC_RESP_BODY_ACCESS=Off \
    MODSEC_REQ_BODY_LIMIT=10485760 \
    MODSEC_AUDIT_LOG=/proc/self/fd/2 \
    ANOMALY_INBOUND=10 \
    ANOMALY_OUTBOUND=4 \
    PORT=8080 \
    SSL_PORT=8443

# Copy our tuning override (applied after CRS rules)
COPY nginx/modsecurity/modsecurity.conf /etc/modsecurity.d/99-alpacaparty.conf

# Copy SSL certificates
COPY nginx/ssl/cert.pem /etc/nginx/conf/server.crt
COPY nginx/ssl/key.pem /etc/nginx/conf/server.key
