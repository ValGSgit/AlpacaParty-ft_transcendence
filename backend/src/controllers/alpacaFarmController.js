import prisma from "#lib/prisma.js";

/**
 * PUT /api/users/farmdata
 */
export const getFarmData = async (req, res, next) => {
  const id = Number(req.user.id);

  try {
    const farmData = await prisma.alpacaFarm.findFirst({
      where: {
        id: id,
      },
    });

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
  const { items, alpacas, coins, upgrades } = req.body;

  try {
    const updatedFarmData = await prisma.alpacaFarm.update({
      where: {
        id: id,
      },
      data: {
        items: items,
        alpacas: alpacas,
        coins: coins,
        upgrades: upgrades,
      },
    });

    res.status(200).json({ farmData: updatedFarmData });
  } catch (err) {
    next(err);
  }
};
