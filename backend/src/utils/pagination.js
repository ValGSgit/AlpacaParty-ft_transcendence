/**
 * Processes raw query parameters into Prisma pagination arguments
 * @param {Object} query - The req.query object
 * @returns {Object} { skip: number, take: number }
 */
export const getPagination = (query) => {
  const page = parseInt(query.page) || 1;
  const pageSize = parseInt(query.pageSize) || 10;

  const pageNumber = Math.max(1, page);
  const pageSizeNumber = Math.max(1, pageSize);

  return {
    pageNumber: pageNumber,
    pageSizeNumber: pageSizeNumber,
    skip: (pageNumber - 1) * pageSizeNumber,
    take: pageSizeNumber,
  };
};
