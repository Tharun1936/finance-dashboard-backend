// Validation helper - turns express-validator errors into a clean response
// We use express-validator in our routes to check incoming data
// If anything is wrong, this middleware catches those errors and responds

const { validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  // Check if there are any validation errors from the route validators
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Format the errors nicely so the frontend knows exactly what's wrong
    const errorList = errors.array().map(err => ({
      field: err.path,
      message: err.msg
    }));

    return res.status(400).json({
      success: false,
      message: 'Please fix the following errors:',
      errors: errorList
    });
  }

  // No errors, move on
  next();
};

module.exports = { validationResult: handleValidationErrors };