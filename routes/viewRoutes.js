const express = require('express');

const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

// Rendering pug templates on client - use get method attached to express app and set path. Pass in callback function to return a response and use render method to point to pug file to render on route endpoint
// router.get('/', function (req, res) {
//   res.status(200).render('base', {
//     // Pass in an object of options in render method to expose values to use inside pug template files
//     tour: 'The Forest Hiker',
//     user: 'Jonas',
//   });
// });

// router.use(authController.isLoggedIn);

router.get(
  '/',
  bookingController.createBookingCheckout,
  authController.isLoggedIn,
  viewsController.getOverview,
);

router.get('/tour/:slug', authController.isLoggedIn, viewsController.getTour);

// Login route
router.get('/login', authController.isLoggedIn, viewsController.getLoginForm);

router.get('/me', authController.protect, viewsController.getAccount);
router.get('/my-tours', authController.protect, viewsController.getMyTours);

router.post(
  '/submit-user-data',
  authController.protect,
  viewsController.updateUserData,
);

module.exports = router;
