const httpError = require("../utils/httpError");

const formatIssues = (issues = []) => {
  return issues.reduce((errors, issue) => {
    const key = issue.path.length ? issue.path.join(".") : "request";
    errors[key] = issue.message;
    return errors;
  }, {});
};

const validate = (schemas = {}) => (req, res, next) => {
  try {
    for (const source of ["params", "query", "body"]) {
      if (!schemas[source]) continue;

      const result = schemas[source].safeParse(req[source]);
      if (!result.success) {
        throw httpError(400, "Validation failed", formatIssues(result.error.issues));
      }

      req[source] = result.data;
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = validate;
