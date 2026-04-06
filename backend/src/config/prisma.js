import { PrismaPg } from "@prisma/adapter-pg";
import prismaPkg from "@prisma/client";
import dotenv from "dotenv";

dotenv.config({ path: "/run/secrets/.env" });
const PrismaClient = prismaPkg?.PrismaClient ?? prismaPkg?.default?.PrismaClient;
if (!PrismaClient) {
	throw new Error("PrismaClient export not found in @prisma/client");
}
const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export default prisma;
