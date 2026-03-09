/**
 * Error-handling Middleware
 * @owner DavidPoetsch, ValGSgit
 * @issue https://github.com/ValGSgit/AlpacaParty/issues/2
 */

export const notFoundHandler = (_req, _res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};
