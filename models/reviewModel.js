// review / rating / created at / ref to tour / ref to user
const mongoose = require('mongoose');

const Tour = require('./tourModel');

const reviewsSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'A review cannot be empty!'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      // required: [true, 'A review must belong to a tour!'], - VALIDATION BUG ON REVIEW CREATION
    },
    guide: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      // required: [true, 'A review must belong to a user!'], - VALIDATION BUG ON REVIEW CREATION
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Create compound index for tour and user in reviews Model so that they always both have to be unique when creating a new review (prevent duplicate reviews)
reviewsSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewsSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // }).populate({
  //   path: 'guide',
  //   select: 'name photo',
  // });

  this.populate({
    path: 'guide',
    select: 'name photo',
  });

  next();
});

// STATICS METHODS - can be attached to model schemas to be used on queries
reviewsSchema.statics.calcAverageRatings = async function (tourId) {
  // this keyword points to current model
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  // console.log(stats);
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    // Sets the default values for fields if no stats array detected
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// Use post middleware hook so will execute after the document has been saved into the database
reviewsSchema.post('save', function () {
  // this points to document being saved (current review)

  // To be able to use static method before model has been fully initialized can use this.constructor to manually attach to model class instance and will run as soon as model is declared in code.
  this.constructor.calcAverageRatings(this.tour);
  // next(); - post middleware doesn't get access to next so not required as app would of finished running at this point
});

// Use regex to match methods findOneAndUpdate and findOneAndDelete methods being used - will run this middle anytime those methods are used
reviewsSchema.pre(/^findOneAnd/, async function (next) {
  // this is current query - await find method and save to a new field in query so that it can be queried again below in the post hook after the review update has been saved to the database
  this.reviewUpdate = await this.findOne();
  next();
});

reviewsSchema.post(/^findOneAnd/, async function () {
  // To be able to call static method need to chain up from new query field key created above and use constructor to be able to point to static method created above can now call method and pass in tour id from updated review saved to new field key from pre middleware above
  // this.reviewUpdate = await this.findOne(); - This won't work here as query would already have been executed in post hook

  await this.reviewUpdate.constructor.calcAverageRatings(
    this.reviewUpdate.tour,
  );
});

const Reviews = mongoose.model('Reviews', reviewsSchema);

module.exports = Reviews;
