const success = (data) => ({ data, error: null });

const failure = (error, status = 500, code = "INTERNAL_ERROR") => ({
  data: null,
  error: {
    code,
    message: error instanceof Error ? error.message : String(error),
    status,
  },
});

const sendResultError = (res, error) =>
  res.status(error.status).json({
    message: error.message,
    code: error.code,
  });

module.exports = { success, failure, sendResultError };
