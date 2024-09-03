// Node built in core module util - contains promisfy module = allows to promisfy any function in node app
const { promisify } = require('util');

const crypto = require('crypto');

const jwt = require('jsonwebtoken');

const User = require('../models/userModel');

const AppError = require('../utils/appError');

const Email = require('../utils/email');

// Global catch block higher order function - won't need to add catch block to every handler function below, will all share this middleware function which will work with express global error middleware
const catchAsync = require('../utils/catchAsync');

const signToken = function (id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = function (user, statusCode, res) {
  const token = signToken(user);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ), // converts 90 days to milliseconds
    //secure: true, // secure true = cookie is only sent on a https server
    httpOnly: true, // httpOnly = ensures cookie cannot be modified from browser
  };

  // Only set secure property to true if running in production environment (don't set in development to test cookie on non secure server)
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  // Define a new cookie to be sent with response object using cookie method attached to response
  res.cookie('jwt', token, cookieOptions);

  // Remove password value from response object
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async function (req, res, next) {
  // Use create method included with User model to create a new document to be stored to database - pass in body object sent through in request which will contain field values related to schema
  // Pass in Object and only store field values that are only needed and not entire request body - to prevent sign up at admin level
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
  });

  // http://127.0.0.1:8000/me
  const url = `${req.protocol}://${req.get('host')}/me`;

  await new Email(newUser, url).sendWelcome();

  // Use sign method attached to jsonwebtoken package to create a new secret pass in object of options - 1) header payload (usually id) = pass in id value created by MongoDB when new user is added to DB. 2) pass in secret value (needs to be at least 32 characters in length to be secure)
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async function (req, res, next) {
  // Store the email and password values sent through request object to check the values
  const { email, password } = req.body;

  // 1) Check if email and password exists
  if (!email || !password) {
    // Return the next middleware method call with new error instance so that it exists out of function and doesn't attempt to execute below code
    return next(new AppError('Please provide a valid email and password', 400));
  }
  // 2) Check if user exists and password is correct
  // Use findOne method to check if email field value in database matches with email sent through request object
  // As password is hidden from response can use select method and pass in password field name with + at start to temp return value to check here
  const user = await User.findOne({ email }).select('+password');

  // As user variable a direct instance of User model can call method directly instead of creating a new instance
  // pass in password from request object and password stored to DB using password field from schema
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401)); // 401 = Unauthorised
  }

  // 3) If all good, send JWT back to client
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  // Overwrites existing cookie with token and replaces with string value = 'loggedout
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async function (req, res, next) {
  // 1) Get token and check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Use split method to separate authorization string Bearer and token string values - use 2nd index to pick token value string
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    // Will only authorize a route if it detects the JW Token has been stored to a cookie after logging in
    token = req.cookies.jwt;
  }
  // console.log(token);

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access', 401),
    ); // 401 = Unauthorised
  }
  // 2) Validate token - checks if JWT signature is valid
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  // Use findById method to try and match user in DB using id value stored to decoded variable
  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    // If user no longer exists in DB exit out of function early and pass in error through next method to block all other middleware functions
    return next(
      new AppError('The user belonging to token no longer exists', 401),
    );
  }

  // 4) Check if user changed password after JWT was issued
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again', 401),
    );
  }

  // If no errors only then next method run and grants access to protected route
  req.user = freshUser;

  // Assigning value to res.locals exposes value from response object to pug templates
  res.locals.user = freshUser;
  next();
});

// Only for rendered pages - will never have any errors
exports.isLoggedIn = catchAsync(async function (req, res, next) {
  // JWT will only be available via cookie
  if (req.cookies.jwt) {
    // 2) Validate token - checks if JWT signature is valid
    const decoded = await promisify(jwt.verify)(
      req.cookies.jwt,
      process.env.JWT_SECRET,
    );

    // 3) Check if user still exists
    // Use findById method to try and match user in DB using id value stored to decoded variable
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      // If user no longer exists in DB will simply run next middleware and continue with app
      return next();
    }

    // 4) Check if user changed password after JWT was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next();
    }

    // If user exists then there is a logged in user detected
    // All pug templates get access to res.locals - whatever value placed here will auto be shared and be accessible in templates to use
    res.locals.user = currentUser;
    // Need to return next method here so it doesn't execute next middleware inside if block and outside if block as well
    // return next();
  }
  // If no cookie detected then just run next method to continue with app
  next();
});

// Middleware function to restrict routes to only allowed to be made based on role defined on registered user (role field from document schema)
exports.restrictTo = function (...roles) {
  return function (req, res, next) {
    // roles = array accessible to returned function via closure
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403),
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async function (req, res, next) {
  // 1) Get user based on posted email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with that email address', 404));
  }

  // 2) Generate random reset token
  // After awaiting result of findOne method on User model - auto get access to static methods set on Model = can use createPasswordResetToken method added to Model
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); // Passing in validateBeforeSave will tell MongoDB to ignore all validators set on schema when trying to save document to database

  // Rather than returning a new error and exiting need to also reset the token value and expire time if any error occurs with this middleware - use try catch block to read any errors in this function and set token and expire time values to undefined and then save to DB to update there as well.
  try {
    // 3) send it to users email
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}}`;
    await new Email(user, resetURL).sendPasswordReset();

    response.status(200).json({
      status: 'success',
      message: 'Token send to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email please try again',
        500,
      ),
    );
  }
});

exports.resetPassword = catchAsync(async function (req, res, next) {
  // 1) Get user based on token
  // token supplied as a parameter in request (/:token)
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    // Check if token has not expired using greater than operator in MongoDB and compare with current timestamp (Token valid for 10 mins)
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) Set new password - only if token has not expired and is a valid user
  if (!user) {
    return next(new AppError('Token is invalid or has expired!', 400)); // 400 = bad request
  }
  // Set the user password to the new password supplied in request body
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  // Set the passwordResetToken and Expires values to undefined so it doesn't add values to DB
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  // Save updated user object to DB
  await user.save();
  // 3) Update changedPasswordAt property for user

  // 4) Log user in and send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async function (req, res, next) {
  // 1) Get user from collection
  // User.findByIdAndUpdate method will not work as validators set on userModel schema won't work resulting in pre save middleware functions also not working
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if posted password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is incorrect', 401)); // 401 = unauthorized
  }
  // 3) If password is correct - update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4) Log user in and send JWT
  createSendToken(user, 200, res);
});
