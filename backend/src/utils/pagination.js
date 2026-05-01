const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const toPositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const getPagination = (query = {}, options = {}) => {
  const maxLimit = options.maxLimit || MAX_LIMIT;
  const page = toPositiveInteger(query.page, options.defaultPage || DEFAULT_PAGE);
  const requestedLimit = toPositiveInteger(query.limit, options.defaultLimit || DEFAULT_LIMIT);
  const limit = Math.min(requestedLimit, maxLimit);

  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
};

const buildPaginationMeta = ({ page, limit, total }) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

module.exports = { buildPaginationMeta, getPagination };
