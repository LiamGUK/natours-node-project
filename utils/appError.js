// Global error class to extend from built in Error object
class AppError extends Error {
  constructor(message, statusCode) {
    // As class extension of existing object need to call super to inherit parent object methods - add in message to inherit message object from parent Error object
    super(message);
    this.statusCode = statusCode;
    // Convert statusCode to a string and use startsWith method to check if code starts with a 4 - status should equal to fail otherwise it should equal error for other statusCodes
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    // isOperational class will allow to filter out errors to only errors defined by this class - only errors generated through this class will have this boolean value set
    this.isOperational = true;

    // To preserve stack trace with new class instance need to call captureStackTrace method and pass in this to point to this class and also constructor method in this class
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
