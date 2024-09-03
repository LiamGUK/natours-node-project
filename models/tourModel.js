const mongoose = require('mongoose');

const slugify = require('slugify');

// const User = require('./userModel');

// Validator js library - contains built in validation methods that can be used to validate fields
// const validator = require('validator');

// With Mongodb need to create a schema (blueprint) in order to create documents (Data for DB)
// Schema also required to query DB using CRUD operations. Can use Mongoose model to help create a schema
const toursSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      // String validators - maxlength and minlength (will throw an error if trying to add data under field that doesn't meet the requirements)
      // Validators will work runValidators command added to handler functions used with Route method requests - runValidators: true
      maxlength: [40, 'A tour name must have less or equal than 40 characters'],
      minlength: [10, 'A tour name must have more or equal than 10 characters'],
      // validate: [validator.isAlpha, 'Tour name must only contain characters'],
    },
    slug: {
      type: String,
      // Creates an index for field inside database
      index: true,
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      // enum = String validator - pass in array of options that can only be used with field. Values that don't match any of the enum values will force an error
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      // Number Validators - setting a maximum and minimum number value that can be entered to be added to database
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10, // Multiple by 10 then divide to ensure value isn't rounded down to whole integer
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      // Custom validator - add key called validate and add callback function to run custom validation on database query
      // Add validate object and pass in validator key for callback function and message key for error message
      validate: {
        validator: function (val) {
          // callback function will auto get access to value entered in request
          // this only points to current doc on NEW document creation - won't work for UPDATE queries
          return val < this.price; // if discount value entered is lower than the price already set will return true if not will return false and return an error.
        },
        // Adding {VALUE} in string will dynamically add value from request in error string
        message: 'Discount price ({VALUE}) should be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      // add select with false will perm hide key in any response
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // GeoJSON - MongoDB requires at least two fields to be specified to store GeoJSON data to DB
      // 1) type field - which then requires subfield to include type as a 'Point'
      // 2) Coordinates field - which will store coordinates on latitude and longitude
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number], // expects an array of Numbers
      address: String,
      description: String,
    },
    // Create embedded documents in MongoDB by adding an array of objects - will create new documents inside the parent document (Will be given an objectID which can be linked to parent document)
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    // Referencing using Mongoose
    guides: [
      {
        // type expects a MongoDB ID value
        type: mongoose.Schema.ObjectId,
        // Use ref field to specify wanting to reference another document model - pass in string name of model wanting to reference (don't need to import into file)
        ref: 'User', // references the User model defined in userModel.js
      },
    ],
  },
  {
    // Pass in 2nd argument in Schema object to accept virtual properties which will then be included in response object
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// To create a custom index on a field use index method and pass in object with field name wanting to index in database - add 1 to sort in ascending order or -1 to sort in descending
// toursSchema.index({ price: 1 }); // Indexing a field can be beneficial for performance as database won't need to scan through all documents to match query but only separate list of stored values

// Compounding indexing - adding 2 fields to be indexed as a group - will also index both the price and ratingsAverage fields individually if queried
toursSchema.index({ price: 1, ratingsAverage: -1 });

// Indexes startLocation field as a 2dsphere type index
toursSchema.index({ startLocation: '2dsphere' });

// toursSchema.index({ slug: 1 }); - Can add index's directly to field inside schema by including field option index: true

// Virtual Properties - Data attached to data schema that isn't stored to database but data made accessible in application itself
// Add on get method as needs to run each time a get request is made - pass in normal callback function so that this key word points to object
toursSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// Virtual populate - method to allow parent model to see data of child model data when doing child to parent referencing
toursSchema.virtual('reviews', {
  ref: 'Reviews',
  // foreignField = ID value from model wanting to link to from ref value (this case Review model)
  foreignField: 'tour', // Will look for ObjectId specified on tour field from mongoose.Schema.ObjectId
  localField: '_id', // Grabs ID value set from model in this file - needs to match with foreignField value
});

// Document middleware - middleware function that runs before and during document creation process
// Use pre method on schema object and pass in callback function (normal) to execute during document build phase
toursSchema.pre('save', function (next) {
  // pass in save for middleware to execute while the document is being saved to Database - before save() method and create() method
  // console.log(this);
  this.slug = slugify(this.name, { lower: true });
  next();
});

// Query middleware to run for all documents and using regex to call middleware on methods that start with find
// Uses populate mongoose method to update any values that contain guides array field to reference to User document
toursSchema.pre(/^find/, function (next) {
  // this will always point to document being queried in request object
  this.populate({
    // Add populate to query so that mongoose will auto update reference in request object with document it's trying to reference - pass in reference field name wanting to apply populate on and can use select to remove fields not wanting to return in response
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

// Implement embedding into documents using query middleware function to update document before saving to Database
// toursSchema.pre('save', async function (next) {
//   // Use map method to iterate over guides array and return only ids that match from request object and Id of user document defined in user model schema
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   // findById method returns a promise so need to use Promise all to ful fill promise which can then overwrite guides field in request object and place user object into array instead
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// toursSchema.pre('save', function (next) {
//   console.log('Will save document...');
//   next();
// });

// Post middleware function executes after all pre middleware functions have been executed
// toursSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

// QUERY MIDDLEWARE
// Using find hook will execute middleware when the find method is used on a query to find documents in the database
// Use regex to execute middleware on all hooks that start with find - will then also work with findByOne method when wanting to return just one tour
toursSchema.pre(/^find/, function (next) {
  // toursSchema.pre('find', function (next) {
  // this key word will point to query been made in request
  this.find({
    // This will filter out all documents where the secretTour field is not equal to true
    secretTour: { $ne: true },
  });

  this.start = Date.now();
  next();
});

// post query middleware will execute after the request has finished and returned the data
// Use regex to execute middleware on all hooks that start with find
toursSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds`);
  // console.log(docs);
  next();
});

// AGGREGATION MIDDLEWARE
// toursSchema.pre('aggregate', function (next) {
//   // pipeline method will show which aggregate methods are being applied to the current aggregate query being used on request
//   // use unshift method to add a new aggregate query to start of array pipeline to include query to filter out specific tours in response
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   // console.log(this.pipeline());
//   next();
// });

// After creating schema next need to connect to a model using model method on mongoose package
// Store to variable with uppercase letter to define as a model class and pass in name of model and schema created above
const Tour = mongoose.model('Tour', toursSchema);

module.exports = Tour;
