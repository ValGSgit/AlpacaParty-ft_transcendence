/**
 * Helmet / CSP configuration.
 *
 * In production we drop 'unsafe-eval' entirely and keep 'unsafe-inline' only
 * for styles (Vue scoped-style injection uses inline style blocks). Scripts
 * in prod are hash/nonce-free because the frontend is served as pre-built
 * bundles under 'self' — no third-party script tags.
 *
 * In dev we keep 'unsafe-inline' and 'unsafe-eval' on scriptSrc so Vite's
 * HMR client and source maps keep working.
 */
const isProd = process.env.NODE_ENV === "production";

export const getHelmetConfig = () => {
  const scriptSrc = isProd
    ? ["'self'"]
    : ["'self'", "'unsafe-inline'", "'unsafe-eval'"];

  return {
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc,
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "*.googleusercontent.com",
          "*.githubusercontent.com",
          "picsum.photos",
          "*.picsum.photos",
          "https://images.pexels.com",
        ],
        connectSrc: ["'self'", "wss:", "ws:", "https:"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "blob:"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  };
};
