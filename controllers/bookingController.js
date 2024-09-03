// Stripe package - pass in secret key when requiring into file
const Stripe = require('stripe');

const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
// const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async function (req, res, next) {
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  // 1) Get currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    // Info of session itself
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    mode: 'payment',
    line_items: [
      // Info on tour being purchased
      {
        price_data: {
          unit_amount: tour.price * 100, // Need to multiple by 100 to convert to cents (currency format on Stripe)
          currency: 'usd',
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [
              `https://www.natours.dev/img/tours/${tour.imageCover}.jpg`,
            ],
          },
        },
        quantity: 1,
      },
    ],
  });

  // 3) Create session as response to send to client
  // res.redirect(303, session.url);
  res.status(200).json({
    status: 'success',
    session,
  });
});

exports.createBookingCheckout = catchAsync(async function (req, res, next) {
  // TEMP: UNSECURE method - anyone can make a booking without paying if they know endpoint
  const { tour, user, price } = req.query;

  if (!tour && !user && !price) {
    // use next middleware so will run getOverview middleware in endpoint route
    return next();
  }

  await Booking.create({ tour, user, price });

  // Redirects to homepage without any query parameters attached
  res.redirect(req.originalUrl.split('?')[0]);
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
