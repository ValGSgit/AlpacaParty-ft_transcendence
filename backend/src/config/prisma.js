import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Match backend config env loading (Docker secret vs local dev .env).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localEnvPath = path.resolve(__dirname, "../../../.env");
if (fs.existsSync("/run/secrets/.env")) {
  dotenv.config({ path: "/run/secrets/.env" });
} else if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  dotenv.config();
}
const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export default prisma;
