const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getOverview = catchAsync(async function (req, res, next) {
  // 1) Get tour data from collection
  const tours = await Tour.find();

  // 2) Build template

  // 3) render template from tour data in step 1

  res.status(200).render('overview', {
    title: 'All Tours',
    tours,
  });
});

exports.getTour = catchAsync(async function (req, res, next) {
  // 1) get data for the requested tour (including reviews and guides)
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    // When needing to grad field values from another model schema referencing relative model use populate method to include required fields in response
    path: 'reviews',
    // From reviews model includes review rating and user field data
    fields: 'review rating user',
  });

  console.log(req.params.slug);

  if (!tour) {
    return next(new AppError('There is no tour with that name', 404));
  }

  // console.log(tour);
  // 2) Build template

  // 3) Render template using data from 1)

  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour,
  });
});

exports.getLoginForm = function (req, res) {
  res.status(200).render('login', {
    title: 'Log into your account',
  });
};

exports.getAccount = function (req, res) {
  res.status(200).render('account', {
    title: 'Your Account',
  });
};

exports.getMyTours = catchAsync(async function (req, res, next) {
  // 1) Find all bookings
  const bookings = await Booking.find({ user: req.user.id });

  // 2) Find tours with returned Ids of bookings for user
  const tourIds = bookings.map((el) => el.tour); // Creates a new array of only the matching tours based on the ids in bookings array.
  const tours = await Tour.find({ _id: { $in: tourIds } }); // Will find and match all the tours in DB with ids IN tourIds array

  res.status(200).render('overview', {
    title: 'My Booked Tours',
    tours,
  });
});

exports.updateUserData = catchAsync(async function (req, res, next) {
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  res.status(200).render('account', {
    title: 'Your Account',
    // Pass in updatesUser variable so that pug template will use updated values instead
    user: updatedUser,
  });
});
