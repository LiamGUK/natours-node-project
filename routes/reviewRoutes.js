const express = require('express');

const reviewController = require('../controllers/reviewsController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true }); // When mounting a router to another route using express use middleware and need to access the same params need to pass in object and set mergeParams to true - params will then be accessible inside this route as well

// Both these endpoints will now work with this router when it points to '/' in route call
// POST /tour/id2345/reviews
// GET /reviews

// Using Middleware function and calling protect method before below route middleware will auto apply to all routes - If user is not logged in then none of the below middleware will execute (saves needing to add to each route method below)
router.use(authController.protect);

router
  .route('/')
  .get(authController.protect, reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview,
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview,
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview,
  );

module.exports = router;
