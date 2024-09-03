module.exports = function (fn) {
  // Returned anonymous function will be assigned to exported variable higher order function was called on - will then get access to req, res and next params
  return function (req, res, next) {
    fn(req, res, next).catch(function (err) {
      // Calling next in here and passing error will result in express auto calling global error handler defined in app.js
      next(err);
    });
  };
};
