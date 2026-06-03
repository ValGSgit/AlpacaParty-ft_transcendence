# nginx reverse-proxy image (dev)
FROM nginx:1.25

# SSL directory (certs mounted via the `ssl` volume at runtime)
RUN mkdir -p /etc/nginx/conf

# nginx config — rendered from the template by the official image entrypoint
COPY conf/nginx.conf /etc/nginx/templates/conf.d/default.conf.template
