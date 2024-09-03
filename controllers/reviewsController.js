const Reviews = require('../models/reviewModel');

// const AppError = require('../utils/appError');

// Global catch block higher order function - won't need to add catch block to every handler function below, will all share this middleware function which will work with express global error middleware
// const catchAsync = require('../utils/catchAsync');

const factory = require('./handlerFactory');

exports.getAllReviews = factory.getAll(Reviews);

// exports.getAllReviews = catchAsync(async function (req, res, next) {
//   let filter = {};

//   // Checking to see if a tour ID has been included with endpoint request - if so to only return that tour in GET request
//   if (req.params.tourId) filter = { tour: req.params.tourId };

//   const reviews = await Reviews.find(filter);

//   res.status(200).json({
//     status: 'success',
//     results: reviews.length,
//     data: {
//       reviews,
//     },
//   });
// });

exports.setTourUserIds = function (req, res, next) {
  // Allow nested routes
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id; // Gets id from protect middleware function which runs on router endpoint
  next();
};

exports.createReview = factory.createOne(Reviews);

// exports.createReview = catchAsync(async function (req, res, next) {
//   const newReview = await Reviews.create(req.body);

//   if (!newReview) {
//     return next(
//       new AppError('No review content detected. Please include a review.', 404),
//     );
//   }

//   res.status(201).json({
//     status: 'success',
//     data: {
//       review: newReview,
//     },
//   });
// });

exports.getReview = factory.getOne(Reviews);

exports.deleteReview = factory.deleteOne(Reviews);

exports.updateReview = factory.updateOne(Reviews);
