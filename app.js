// Node.js core module for auto detecting root path of current node app
const path = require('path');

// Add express package to file after installing via npm
const express = require('express');

// After importing express to file, standard is to store express function call to variable called app
const app = express();

// express package to limit repeated requests to public APIs or endpoints
const rateLimit = require('express-rate-limit');

// express package to auto set secure headers to all requests
const helmet = require('helmet');

const mongoSantize = require('express-mongo-sanitize');

const xss = require('xss-clean');

const hpp = require('hpp');

// morgan = 3rd party middleware package
const morgan = require('morgan');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const cookieParser = require('cookie-parser');

// When using template engine with express i.e. pug - need to set engine in app file near beginning before server is run.
// Express supports different engines out of the box - don't need to require in to files but need to install package first
app.set('view engine', 'pug');

// Use path core module in node.js to point to root directory where app is run so will always be able to locate correct folder paths
app.set('views', path.join(__dirname, 'views'));

// Static files middleware
// Serving static files using express middleware - HTML files, image files, css files and javascript files etc
app.use(express.static(path.join(__dirname, '/public'))); // Passing in directory path with public will set static path to public folder in directory. Will only need to add file name to local host url to load file in browser - e.g 12.7.0.0.1:3000/overview.html = will load HTML file in public folder

// EXPRESS ROUTERS
const viewRouter = require('./routes/viewRoutes');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');

// 1) GLOBAL MIDDLEWARE FUNCTIONS
// Set security HTTP headers
// Call helmet middleware function inside express use method to run middleware function - will auto define secure headers to requests
// app.use(helmet());

app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));

// Developement logging
// Can use environment variables to define if a function should run - below middleware will only run if the environment is in development mode
if (process.env.NODE_ENV === 'development') {
  // Passing in dev option into morgan middleware function will return information about the request made in file, will return HTTP request type, time it took to complete and size of request
  app.use(morgan('dev'));
}

// Limit requests
// Use rate limiter to set defined options on how many requests can be made to endpoints - prevent brute force attacks
const limiter = rateLimit({
  max: 100, // Only allows a maximum of 100 requests in time window stated below
  windowMs: 60 * 60 * 1000, // 1 hour in ms (Once request limit is reached user would have to wait this long before making another request)
  message: 'Too many requests from this IP, please try again in an hour',
});

// Rate limiting middleware
// Use use method from express to run middleware functions - pass in '/api' so that middleware will only run on endpoints that start with /api
app.use('/api', limiter);

// Body parser - reading body into req.body - Middleware function that needs to be declared in top level code - middleware can modify incoming request data (stands between middle of request and response)
// express doesn't auto include body value in request so need to manually include using middleware function
app.use(express.json({ limit: '10kb' })); // middleware function will expose body element to file which can be used in POST request below - setting limit to '10kb' will only parse data no larger than 10kb.

// Middleware to parse request data submitted via a form so that controller can access body data
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Middleware to parse cookies delivered in response objects
app.use(cookieParser());

// DATA SANITISATION AGAINST NOSQL QUERY INJECTION
app.use(mongoSantize()); // package will filter out all mongo filter operators from all requests

// DATA SANITISATION AGAINST XSS ATTACKS
app.use(xss()); // package will clean any user input defined by user and set through in request - will clean any html elements included

// Prevent parameter pollution - will auto clean up query strings from requests (will remove duplicates etc)
app.use(
  hpp({
    // Can whitelist certain field names in response so that hpp won't apply parameter pollution protocols to stated field names
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

// Creating own middleware function - using use method with express pass in callback function and pass in req and res params but also include next param, will then know it's a middleware function (next is always passed as 3rd argument in middleware function)
// app.use(function (req, res, next) {
//   // middleware function will apply to every request in file - will log the below log when any of the below requests are made
//   console.log('hello from middleware 😎');
//   // need to call next() at end to prevent the request getting stuck and not moving forward until the it gets to the response
//   next();
// });

app.use(function (req, res, next) {
  // Use middleware function to add a custom timestamp to request object
  req.requestTime = new Date().toISOString();
  // Get access to headers in express from the request object and under headers
  // console.log(req.headers);
  next();
});

// 2) ROUTE HANDLERS

// Next need to define routes which express will read to determine what to load and return on a specific URL path
// Use get method to retrieve data and pass in URL route to use on method ('/' = URL root)
// When creating APIs best practice to add v1 to prevent breaking changes when updating API to new version
// app.get('/api/v1/tours', getAllTours);

// Use middleware function and pass in express router below to create a new main route path for application - below requests will auto point to this path when attaching tourRouter variable
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// Route handler for unhandled routes - endpoints that don't match the above two endpoints
// Use all method which is for all CRUD operations (GET, POST, PUT, DELETE etc) - will run middleware function for any of these
// This middleware function will only fire if none of the above route methods are executed
app.all('*', function (req, res, next) {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Can't find ${req.originalUrl} on this server!`,
  // });

  // Any arguments passed into next function express will cancel all other middleware functions on the stack and auto assume its an error being passed through
  next(new AppError(`Can't find ${req.originalUrl} on this server!!`, 404));
});

// EXPRESS middleware error handling - Any Errors passed into any next methods that creates a new error class instance will stop all other middleware functions and use middleware function passed in here
app.use(globalErrorHandler);

// 3) LISTENING TO SERVER
// export app variable to import into server.js file so that express logic can be listened to on server.
module.exports = app;
