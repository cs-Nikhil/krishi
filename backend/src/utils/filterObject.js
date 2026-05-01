const filterObject = (source, allowedFields) => {
  const output = {};

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      output[field] = source[field];
    }
  });

  return output;
};

module.exports = filterObject;

