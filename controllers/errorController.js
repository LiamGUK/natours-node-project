const AppError = require('../utils/appError');

const handleCastErrorDB = function (err) {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = function (err) {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0]; // regex pattern to match any text in between "" or ''
  const message = `Duplicate field value: ${value}. Please use another value`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = function (err) {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// Function to generate error messages for Development Environment
const sendErrorDev = function (err, req, res) {
  // Use originalURL included in request to check if request is for the API or page slug - if API need to return JSON, for page slug need to render a HTML template to display an error page
  console.error('ERROR', err);
  if (req.originalUrl.startsWith('/api')) {
    // if request URL starts with /api = is making a request to API endpoint - need to return JSON in response
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    // Use render method to load a pug template to display an error page
    res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }
};

// Function to generate error message for Production Environment
const sendErrorProduction = function (err, req, res) {
  // Check if request is for API
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      // Will only return this error response to any errors that include isOperational boolean value defined in appError class
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // All other errors coming from outside of this app will return a generic error message instead
    // 1) Log error - will be accessible on hosting platform
    console.error('ERROR', err);

    // 2) send generic error message
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong',
    });
  }

  // ERROR FOR RENDERING PAGE ERROR
  if (err.isOperational) {
    // Will only return this error response to any errors that include isOperational boolean value defined in appError class
    res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  } else {
    // All other errors coming from outside of this app will return a generic error message instead
    // 1) Log error - will be accessible on hosting platform
    console.error('ERROR', err);

    // 2) send generic error message
    res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: 'Please try again later',
    });
  }
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired, please log in again', 401);

// Passing in err first, express will know its an error handling middleware function
module.exports = function (err, req, res, next) {
  //console.log(err.stack); // stack trace will show where the error occurred and on what line of code in file
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.name = err.name;
    error.message = err.message;
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    sendErrorProduction(error, req, res);
  }
};
