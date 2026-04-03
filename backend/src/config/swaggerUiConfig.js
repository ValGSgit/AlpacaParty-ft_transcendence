//todo remove ? the original look better tbh. :D
export const swaggerUiOptions = {
  customCss: `
    body { background: #0a0a12 !important; }
    .swagger-ui { background: #0a0a12; color: #e0e0e0; }
    .swagger-ui .topbar { background: #0d0d1a; border-bottom: 1px solid #1a1a2e; }
    .swagger-ui .topbar .download-url-wrapper .select-label span,
    .swagger-ui .topbar .download-url-wrapper input[type=text] { color: #e0e0e0; background: #1a1a2e; border-color: #00f0ff33; }
    .swagger-ui .info .title { color: #00f0ff; }
    .swagger-ui .info p, .swagger-ui .info li, .swagger-ui .info table thead tr td,
    .swagger-ui .info table thead tr th { color: #c0c0d0; }
    .swagger-ui .info a { color: #00f0ff; }
    .swagger-ui .scheme-container { background: #0d0d1a; box-shadow: none; border-bottom: 1px solid #1a1a2e; }
    .swagger-ui section.models, .swagger-ui section.models.is-open h4 { background: #0d0d1a; border-color: #1a1a2e; }
    .swagger-ui section.models h4 { color: #00f0ff; }
    .swagger-ui .model-title { color: #00f0ff; }
    .swagger-ui .model { color: #c0c0d0; }
    .swagger-ui .opblock-tag { color: #e0e0e0; border-bottom: 1px solid #1a1a2e; }
    .swagger-ui .opblock-tag:hover { background: #0d0d1a; }
    .swagger-ui .opblock { border-color: #1a1a2e; background: #0d0d1a; }
    .swagger-ui .opblock .opblock-summary { border-color: #1a1a2e; }
    .swagger-ui .opblock .opblock-summary-description { color: #c0c0d0; }
    .swagger-ui .opblock.opblock-get .opblock-summary { border-color: #00f0ff44; }
    .swagger-ui .opblock.opblock-get { background: #00f0ff08; border-color: #00f0ff33; }
    .swagger-ui .opblock.opblock-post { background: #00cc6608; border-color: #00cc6633; }
    .swagger-ui .opblock.opblock-put { background: #ff8c0008; border-color: #ff8c0033; }
    .swagger-ui .opblock.opblock-delete { background: #ff004408; border-color: #ff004433; }
    .swagger-ui .opblock-body pre.microlight { background: #0a0a12; color: #c0c0d0; }
    .swagger-ui textarea { background: #0a0a12; color: #c0c0d0; border-color: #1a1a2e; }
    .swagger-ui input[type=text], .swagger-ui input[type=password], .swagger-ui input[type=search],
    .swagger-ui input[type=email] { background: #0d0d1a; color: #e0e0e0; border-color: #1a1a2e; }
    .swagger-ui select { background: #0d0d1a; color: #e0e0e0; border-color: #1a1a2e; }
    .swagger-ui .btn { background: #1a1a2e; color: #e0e0e0; border-color: #00f0ff44; }
    .swagger-ui .btn.execute { background: #00f0ff22; border-color: #00f0ff; color: #00f0ff; }
    .swagger-ui .btn.execute:hover { background: #00f0ff44; }
    .swagger-ui .btn.authorize { background: #00cc6622; border-color: #00cc66; color: #00cc66; }
    .swagger-ui .responses-inner h4, .swagger-ui .responses-inner h5 { color: #c0c0d0; }
    .swagger-ui table thead tr th, .swagger-ui table thead tr td { color: #00f0ff; border-color: #1a1a2e; }
    .swagger-ui table tbody tr td { color: #c0c0d0; border-color: #1a1a2e; }
    .swagger-ui .parameter__name { color: #00f0ff; }
    .swagger-ui .parameter__type { color: #c084fc; }
    .swagger-ui .parameter__in { color: #86efac; }
    .swagger-ui .tab li { color: #c0c0d0; }
    .swagger-ui .tab li.active { color: #00f0ff; }
    .swagger-ui .highlight-code { background: #0a0a12; }
    .swagger-ui .response-col_status { color: #00f0ff; }
    .swagger-ui .markdown p, .swagger-ui .markdown li { color: #c0c0d0; }
    .swagger-ui .markdown code { background: #1a1a2e; color: #00f0ff; padding: 1px 4px; border-radius: 3px; }
    .swagger-ui .markdown pre { background: #0d0d1a; border: 1px solid #1a1a2e; }
  `,
  customSiteTitle: "AlpacaParty API Docs",
  swaggerOptions: {
    persistAuthorization: true,
    tryItOutEnabled: true,
    displayRequestDuration: true,
    filter: true,
    docExpansion: "list",
    defaultModelsExpandDepth: 1,
    syntaxHighlight: { theme: "monokai" },
  },
};
