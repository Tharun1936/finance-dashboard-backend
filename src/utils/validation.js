// Validation helper
// express-validator v7 ValidationChain objects must be run using .run(req)
// They don't work as direct middleware arguments in modern Express versions
//
// How to use:
//   router.post('/route', validate([body('field').notEmpty()]), controller)
//
// validate() runs all validators, then checks for errors and either:
//   - returns a 400 with the error list, OR
//   - calls next() to continue to the controller

const { validationResult } = require('express-validator');

// Takes an array of ValidationChain objects, runs them all, then checks errors
const validate = (validators) => async (req, res, next) => {
  // Run every validator against the request (this is the v7 recommended way)
  await Promise.all(validators.map(v => v.run(req)));

  // Now check if any of them found errors
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
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

  // All good — move on to the controller
  next();
};

module.exports = { validate };