/**
 * Test helper — creates an Express app identical to production
 * but without starting a server.
 */
import express from "express";
import cookieParser from "cookie-parser";

export async function createTestApp() {
  const { default: routes } = await import("../../src/routes/index.js");
  const { errorHandler, notFoundHandler } =
    await import("../../src/middleware/errorHandler.js");

  const app = express();

  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use("/api", routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
