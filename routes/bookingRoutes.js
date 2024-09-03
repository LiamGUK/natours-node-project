const express = require('express');

// Import controller handlers to use in router function below with relative CRUD operator
const bookingController = require('../controllers/bookingController');

const authController = require('../controllers/authController');

// Create a main parent root route for application using Router method - Will use path value passed to middleware function in app.js file
const router = express.Router();

router.use(authController.protect);

router.get('/checkout-session/:tourId', bookingController.getCheckoutSession);

router.use(authController.restrictTo('admin', 'lead-guide'));

router
  .route('/')
  .get(bookingController.getAllBookings)
  .post(bookingController.createBooking);

router
  .route('/:id')
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);

module.exports = router;
