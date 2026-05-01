const normalizeValue = (value) => {
  if (value === undefined) return null;
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return "[binary]";
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (typeof value === "object") {
    if (value.toString && value._bsontype === "ObjectId") return value.toString();

    return Object.keys(value).reduce((acc, key) => {
      acc[key] = normalizeValue(value[key]);
      return acc;
    }, {});
  }

  return value;
};

const toPlainObject = (doc) => {
  if (!doc) return {};
  if (typeof doc.toObject === "function") return doc.toObject({ depopulate: true });
  return doc;
};

const diffObjects = (before, after, ignoredFields = []) => {
  const previous = toPlainObject(before);
  const updated = toPlainObject(after);
  const ignored = new Set(["_id", "__v", "createdAt", "updatedAt", ...ignoredFields]);
  const keys = new Set([...Object.keys(previous), ...Object.keys(updated)]);
  const changes = [];

  keys.forEach((field) => {
    if (ignored.has(field)) return;

    const previousValue = normalizeValue(previous[field]);
    const updatedValue = normalizeValue(updated[field]);

    if (JSON.stringify(previousValue) !== JSON.stringify(updatedValue)) {
      changes.push({ field, previousValue, updatedValue });
    }
  });

  return changes;
};

module.exports = { diffObjects, normalizeValue, toPlainObject };

