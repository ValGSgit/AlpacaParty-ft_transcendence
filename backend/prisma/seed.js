import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { seedFromCsv } from "./seedUtils.js";
import prisma from "#lib/prisma.js";
import bcrypt from "bcrypt";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Import Achievements
  {
    await seedFromCsv(
      prisma.achievement,
      path.resolve(__dirname, "seed/achievements.csv"),
    );
  }

  // Seed live demo user (used by E2E tests)
  {
    const demoUsername = "live_demo";
    const demoEmail = "live_demo@alpacaparty.test";
    const demoPassword = process.env.SEED_DEMO_PASSWORD || "LiveSeed123!";

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username: demoUsername }, { email: demoEmail }] },
    });

    if (!existing) {
      const passwordHash = await bcrypt.hash(demoPassword, 12);
      await prisma.user.create({
        data: {
          username: demoUsername,
          email: demoEmail,
          userAuth: { create: { passwordHash } },
          userStats: { create: {} },
          userSettings: { create: {} },
          alpacaFarm: { create: {} },
        },
      });
      console.log(`✓ Seeded demo user: ${demoUsername} / ${demoEmail}`);
    }
  }

}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
