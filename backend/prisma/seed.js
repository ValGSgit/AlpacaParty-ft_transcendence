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

  // Seed default admin user
  {
    const adminUsername = "admin";
    const adminEmail = "admin@alpacaparty.local";
    const adminPassword = "AdminPassword123";

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username: adminUsername }, { email: adminEmail }] },
    });

    if (!existing) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await prisma.user.create({
        data: {
          username: adminUsername,
          email: adminEmail,
          role: "superadmin",
          userAuth: {
            create: { passwordHash },
          },
          userStats: { create: {} },
          userSettings: { create: {} },
          alpacaFarm: { create: {} },
        },
      });
      console.log(`✓ Seeded admin user: ${adminUsername} / ${adminEmail}`);
      console.log(`  Password: ${adminPassword}`);
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
