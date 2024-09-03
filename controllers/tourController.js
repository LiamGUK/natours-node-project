// Package to handle file uploads sent through form submissions
const multer = require('multer');

// Package to update and edit image files in Node.js
const sharp = require('sharp');

// Import Tour model to use MongoDB query methods based on schema created in model class
const Tour = require('../models/tourModel');
const AppError = require('../utils/appError');

// Import APIfeatures class to execute with query below - contains sorting, filtering and pagination methods logic
// const APIfeatures = require('../utils/apiFeatures');

// Global catch block higher order function - won't need to add catch block to every handler function below, will all share this middleware function which will work with express global error middleware
const catchAsync = require('../utils/catchAsync');

const factory = require('./handlerFactory');

// memoryStorage method will save image file to memory instead in Node.js app and used as a buffer - More efficient then writing to hard disk and reading again
const multerStorage = multer.memoryStorage();

// filter function to check if file uploaded is an image type file - pass in true into callback function to continue middleware stack otherwise pass in false with error message to stop middleware stack and load an error
const multerFilter = function (req, file, callback) {
  // Checks if mimetype of file starts with image (image/jpeg etc) - if true won't throw an error and stop app
  if (file.mimetype.startsWith('image')) {
    callback(null, true);
  } else {
    callback(
      new AppError('Not an image, please upload only images', 400),
      false,
    );
  }
};

// First configure multer package and pass in option - include folder destination path to save images to (images not saved to DB but PC disc)
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

// Use fields method in multer to upload multiple files in a batch - accepts array of objects which include field names
exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(async function (req, res, next) {
  // Multiple file uploads will be stored to req.files
  // console.log(req.files);
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) cover image
  // Id value of tour will be contained in endpoint request as a param - will have access to id value using param object in request
  const imageCoverFileName = `tour-${req.params.id}-${Date.now()}-cover.jpg`;
  // As image file is not stored to disk and then read again - is stored to memory and can then be read in request object under buffer
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333) // 3/2 ratio image
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${imageCoverFileName}`);

  // Create a new key on request body object and attach new image file to it
  req.body.imageCover = imageCoverFileName;

  // 2) Other images
  req.body.images = [];

  // Need to use map method with async functions in loop otherwise filename would be empty and not persisted in awaited result - would execute next method before it completes
  // Use Promise.all to fulfil all promises from new array created from map method
  await Promise.all(
    req.files.images.map(async function (file, i) {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpg`;

      await sharp(file.buffer)
        .resize(2000, 1333) // 3/2 ratio image
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    }),
  );

  next();
});

// Middleware function to work with top-5-cheap endpoint to update request object before any of the below handler functions are called
exports.aliasTopTours = function (req, res, next) {
  // middleware will pre-fill query object with the below before it calls the below handler functions
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = factory.getAll(Tour);

// Assign each function to the exports object so all functions can be imported into one object in tourRoutes.js file
// exports.getAllTours = catchAsync(async function (req, res, next) {
//   // console.log(req.requestTime);
//   // try {
//   // EXECUTING QUERY
//   const features = new APIfeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();
//   const tours = await features.query;

//   // console.log(req.query);

//   // SEND RESPONSE
//   // in json method pass in object that will include status key to indicate data has been successfully loaded and returned, data key will hold JSON data stored from file read above
//   res.status(200).json({
//     status: 'success',
//     requestedAt: req.requestTime,
//     results: tours.length,
//     data: {
//       tours,
//     },
//   });
//   // } catch (err) {
//   //   res.status(404).json({
//   //     status: 'failed',
//   //     message: err.message,
//   //   });
//   // }
// });

exports.getTour = factory.getOne(Tour, { path: 'reviews' });

// exports.getTour = catchAsync(async function (req, res, next) {
//   // try {
//   // findById method will return objects in a new array with a matching id defined in database - use param method included with request object and attach id as id parameter defined on route in tourRoutes.js file
//   const tour = await Tour.findById(req.params.id).populate('reviews');

//   if (!tour) {
//     // If tour variable is null return a new error instance and pass in message and status code to create a new error instance
//     // Passing in new error instance in next method will result in express auto cancelling all other middleware functions and jumping straight to global error middleware function
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour,
//     },
//   });
//   // } catch (err) {
//   //   res.status(404).json({
//   //     status: 'failed',
//   //     message: err.message,
//   //   });
//   // }
// });

exports.createTour = factory.createOne(Tour);

// exports.createTour = catchAsync(async function (req, res, next) {
//   // As async function is being passed into higher order function which handles error there, try catch block no longer required
//   // try {
//   // create method auto included with Tour model instance - will create the new document and send to database in one go (won't need to create new instance of Tour here)
//   const newTour = await Tour.create(req.body);

//   if (!newTour) {
//     // If tour variable is null return a new error instance and pass in message and status code to create a new error instance
//     // Passing in new error instance in next method will result in express auto cancelling all other middleware functions and jumping straight to global error middleware function
//     return next(new AppError('No tour data detected', 404));
//   }

//   res.status(201).json({
//     status: 'success',
//     data: {
//       tour: newTour,
//     },
//   });
//   // } catch (err) {
//   //   res.status(400).json({
//   //     status: 'failed',
//   //     message: 'Invalid data sent',
//   //   });
//   // }
// });

exports.updateTour = factory.updateOne(Tour);

// exports.updateTour = catchAsync(async function (req, res, next) {
//   // try {
//   // findByIdAndUpdate method requires an ID to pass in to match data with and an object with new data to update with - pass in body as will contain object of new data to update
//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     // Adding 3rd argument with options - adding new key with true value will return the newly updated data to client
//     new: true,
//     runValidators: true,
//   });

//   if (!tour) {
//     // If tour variable is null return a new error instance and pass in message and status code to create a new error instance
//     // Passing in new error instance in next method will result in express auto cancelling all other middleware functions and jumping straight to global error middleware function
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour,
//     },
//   });
//   // } catch (err) {
//   //   res.status(404).json({
//   //     status: 'failed',
//   //     message: err.message,
//   //   });
//   // }
// });

exports.deleteTour = factory.deleteOne(Tour);

// exports.deleteTour = catchAsync(async function (req, res, next) {
//   // try {
//   // findByIdAndDelete method will look for object in array and match via ID value and remove it from the database
//   const tour = await Tour.findByIdAndDelete(req.params.id);

//   if (!tour) {
//     // If tour variable is null return a new error instance and pass in message and status code to create a new error instance
//     // Passing in new error instance in next method will result in express auto cancelling all other middleware functions and jumping straight to global error middleware function
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   // In delete requests data is returned as null to indicate data has been deleted - no new data is returned to client
//   res.status(204).json({
//     status: 'success',
//     data: null,
//   });
//   // } catch (err) {
//   //   res.status(404).json({
//   //     status: 'failed',
//   //     message: err.message,
//   //   });
//   // }
// });

// Aggregate pipelines = filtering returned data to only return data based on operator calculations defined by MongoDB
exports.getTourStats = catchAsync(async function (req, res, next) {
  // try {
  // aggregate method allows to run multiple queries based on model schema and will run them one by one
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        // Passing in operator value against id will return data in groups based on the operator value - below will group the data based on the difficulty key in schema
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgrating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      // Pass in 1 under avgPrice to sort data in an ascending order
      $sort: { avgPrice: 1 },
    },
    // {
    //   // Can use match query multiple times in aggregation pipeline
    //   $match: { _id: { $ne: 'EASY' } },
    // },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
  // } catch (err) {
  //   res.status(404).json({
  //     status: 'failed',
  //     message: err.message,
  //   });
  // }
});

exports.getMonthlyPlan = catchAsync(async function (req, res, next) {
  const year = req.params.year * 1; // * 1 = converts string to number
  const plan = await Tour.aggregate([
    {
      // unwind destructs an array and outputs 1 object for each array index
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      // $addFields allows to create a new field to be inserted and returned with data response object - will create a new field called month and use the value of _id field
      $addFields: { month: '$_id' },
    },
    {
      // Use $project to hide fields in response object - will hide the field _id and its value
      $project: { _id: 0 },
    },
    {
      // pass -1 to sort in a descending order (highest first)
      $sort: { numTourStarts: -1 },
    },
    {
      $limit: 12,
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

// /tours-within/233/center/34.12345,-118.87553/unit/mi - endpoint example
exports.getToursWithin = catchAsync(async function (req, res, next) {
  // extract params from endpoint URL using request params object
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  // Need to convert radius of earth value to radiums to work in MongoDB
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide a latitude and longitude in the correct format lat, lng',
        400,
      ),
    );
  }

  // Will find a tour with a location nearest to coordinates provided in request endpoint
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async function (req, res, next) {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide a latitude and longitude in the correct format lat, lng',
        400,
      ),
    );
  }

  // All calculations need to done using aggregate methods which will be attached to the model
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1], // multiplied by 1 to convert to a number
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier, // same as dividing by 1000 (to convert to km)
      },
    },
    {
      // Use project to only return specific fields in response object - below would only return name and distance fields
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
