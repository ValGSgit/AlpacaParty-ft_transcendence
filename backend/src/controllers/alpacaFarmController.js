import prisma from "#config/prisma.js";

/**
 * GET /api/users/farmdata
 */
export const getFarmData = async (req, res, next) => {
  let id = Number(req.user.id);
  if (req.query.id)
    id = Number(req.query.id);
  try {
    const farmData = await prisma.alpacaFarm.findFirst({
      where: {
        userId: id,
      },
    });

    console.log("")
    res.status(200).json({ farmData: farmData });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/farmdata
 */
export const updateFarmData = async (req, res, next) => {
  const id = Number(req.user.id);
  const { items, alpacas, coins, upgrades, herdsize } = req.body;

  try {
    const updatedFarmData = await prisma.alpacaFarm.upsert({
      where: {
        userId: id,
      },
      update: {
        items: items,
        alpacas: alpacas,
        coins: coins,
        upgrades: upgrades,
        herdsize: herdsize
      },
      create: {
        userId: id,
        items: items ?? [],
        alpacas: alpacas ?? [],
        coins: coins ?? 10,
        upgrades: upgrades ?? 0,
        herdsize: herdsize ?? 0,
      },
    });

    res.status(200).json({ farmData: updatedFarmData });
  } catch (err) {
    next(err);
  }
};
