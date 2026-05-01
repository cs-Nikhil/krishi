const buildSuccessResponse = ({ message = "Success", data = {}, meta } = {}) => ({
  success: true,
  message,
  data: data ?? {},
  errors: null,
  ...(meta ? { meta } : {})
});

const sendSuccess = (res, { status = 200, message = "Success", data = {}, meta } = {}) => {
  return res.status(status).json(buildSuccessResponse({ message, data, meta }));
};

module.exports = { buildSuccessResponse, sendSuccess };
