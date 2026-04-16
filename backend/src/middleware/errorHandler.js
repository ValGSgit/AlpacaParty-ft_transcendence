/**
 * Error-handling Middleware
 * @owner DavidPoetsch, ValGSgit
 * @issue https://github.com/ValGSgit/AlpacaParty/issues/2
 */

import { Prisma } from "@prisma/client";
import CustomError from "#utils/CustomError.js";
import { isValidationError } from "#validators/validatorUtils.js";
import config from "#config/index.js";

export const notFoundHandler = (_req, _res, next) => {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
};

/**
  ### Error handler
  Prisma error codes:
    - https://www.prisma.io/docs/orm/reference/error-reference
*/
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  var status = err.status || 500;
  var message = err.message || "Internal Server Error";
  var prismaCode = -1; // -1 = no prisma error
  var error = new CustomError(message, status);

  if (err instanceof CustomError) {
    error = err;
  } else if (isValidationError(err)) {
    if (!err.isEmpty()) {
      const mapped = err.mapped();
      const firstError = Object.values(mapped)[0];
      return res.status(400).json({
        error: {
          message: firstError || "Validation failed",
          fields: mapped,
        },
        errors: mapped,
      });
    }
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    prismaCode = err.code;
    error = handlePrismaError(err);
  }

  if (config.envIsDev)
    console.log(`errorHandler: ${error.statusCode}: ${error.message}`);

  res.status(error.statusCode).json({
    error: {
      message: error.message,
      ...(process.env.NODE_ENV === "development" && {
        stack: err.stack,
        prismaCode: prismaCode,
      }),
    },
  });
};

const handlePrismaError = (err) => {
  console.log(`#### PRISMA_CODE: ${err.code}`);
  console.log(`#### PRISMA_META: ${JSON.stringify(err.meta, null, 2)}`);

  const prefix = "Prisma error:";

  switch (err.code) {
    case "P2000": {
      const message = `${prefix} The value is too long`;
      return new CustomError(message, 400);
    }
    case "P2002": {
      const message = `${prefix} Unique constraint failed`;
      return new CustomError(message, 409);
    }
    case "P2025": {
      const message = `${prefix} The requested record was not found`;
      return new CustomError(message, 404);
    }
    default: {
      const message = `${prefix} Unknown prisma error ${err.message}`;
      return new CustomError(message, 404);
    }
  }
};
