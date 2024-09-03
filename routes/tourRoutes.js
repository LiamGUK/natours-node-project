const express = require('express');

// Import controller handlers to use in router function below with relative CRUD operator
const tourController = require('../controllers/tourController');

const authController = require('../controllers/authController');

const reviewRouter = require('../routes/reviewRoutes');

// Create a main parent root route for application using Router method - Will use path value passed to middleware function in app.js file
const router = express.Router();

// Nested route - used when there is a clear parent child relationship - pass id of tour and review on URL endpoint
// POST /tour/id2345/reviews
// GET /tour/id2345/reviews
// GET /tour/id2345/reviews/9a3ff345

// Use express middleware to use reviewRouter only if it detects an endpoint containing a tour id param with the reviews endpoint - placed near top so will run before below router middleware functions are called.
router.use('/:tourId/reviews', reviewRouter);

// Param middleware - middleware function that only runs when a specific parameter is included in a route
// param method will only executes if it detects a parameter is included in request
router.param('id', function (req, res, next, paramVal) {
  // middleware function auto gets access to request, response and next methods but also the param value passed in response
  console.log(`Tour id is ${paramVal}`);
  next();
});

// Middleware function that will check ID value passed as param in request is valid with JSON data will return an error and exit app early if ID is not valid
// router.param('id', tourController.checkID);

// Use middleware function to alter request object to filter results based on top-5-cheap endpoint on request
router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);

router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan,
  );

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

// attaching route method with path can then chain all the methods in one go to combine all callback functions for relative CRUD operation
// Can then update path in route to new name and will auto update for all CRUD callback functions
// From above middleware now only need to define route as / (root path which is now api/v1/tours)
router
  .route('/')
  // Pass in protect middleware function first before getAllTours middleware function as needs to check if user is logged in - will only call next middleware function is the user has been authenticated
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour,
  );

// Can pass in middleware functions to run as part of CRUD operation by separating with a comma inside operation method
// .post(tourController.checkBody, tourController.createTour);

// Placing custom middleware function here won't execute with any of the above method routes as above route and one of the CRUD methods will end the execution after it returns a response - will exit application
// Custom middleware functions need to be placed at top of code
// tourRouter.use(function (req, res, next) {
//   console.log('hello from middleware 😎');
//   next();
// });

// To define a variable to use as a param on the API endpoint add /:<VARIABLE NAME>
// Variable assigned to id would be added and used in the API endpoint request
// e.g. api/v1/tours/5 - request object would return {id: 5}
// Can make a param optional in the API request by attaching ? at end of param
// app.get('/api/v1/tours/:id/:y?', getTour);

// Can give url path the same name as another HTTP request and will still work - As handling a different request will auto know which callback function to execute
// POST request to create a new tour
// app.post('/api/v1/tours', createTour);

// app.patch('/api/v1/tours/:id', updateTour);

// app.delete('/api/v1/tours/:id', deleteTour);

// From above middleware now only need to define route as /:id as will be pointing to main root endpoint path
router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour,
  )
  .delete(
    // Use protect and restrictTo middleware functions first before deleteTour handler to only allow CRUD operation to be performed if user has a certain role assigned to them via user model schema
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour,
  );

// Export router to use in app.js file
module.exports = router;
