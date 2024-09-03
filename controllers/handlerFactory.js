// Factory functions that will return controller functions to use in app to share common logic
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIfeatures = require('../utils/apiFeatures');

exports.deleteOne = function (Model) {
  // function will accept model as an argument which will return a function to execute methods on
  return catchAsync(async function (req, res, next) {
    // findByIdAndDelete method will look for object in array and match via ID value and remove it from the database
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      // If tour variable is null return a new error instance and pass in message and status code to create a new error instance
      // Passing in new error instance in next method will result in express auto cancelling all other middleware functions and jumping straight to global error middleware function
      return next(new AppError('No document found with that ID', 404));
    }

    // In delete requests data is returned as null to indicate data has been deleted - no new data is returned to client
    res.status(204).json({
      status: 'success',
      data: null,
    });
  });
};

exports.updateOne = function (Model) {
  return catchAsync(async function (req, res, next) {
    // try {
    // findByIdAndUpdate method requires an ID to pass in to match data with and an object with new data to update with - pass in body as will contain object of new data to update
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      // Adding 3rd argument with options - adding new key with true value will return the newly updated data to client
      new: true,
      runValidators: true,
    });

    if (!doc) {
      // If tour variable is null return a new error instance and pass in message and status code to create a new error instance
      // Passing in new error instance in next method will result in express auto cancelling all other middleware functions and jumping straight to global error middleware function
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        doc,
      },
    });
  });
};

exports.createOne = function (Model) {
  return catchAsync(async function (req, res, next) {
    // create method auto included with Tour model instance - will create the new document and send to database in one go (won't need to create new instance of Tour here)
    const newDoc = await Model.create(req.body);

    if (!newDoc) {
      // If tour variable is null return a new error instance and pass in message and status code to create a new error instance
      // Passing in new error instance in next method will result in express auto cancelling all other middleware functions and jumping straight to global error middleware function
      return next(new AppError('No document data detected', 404));
    }

    res.status(201).json({
      status: 'success',
      data: {
        data: newDoc,
      },
    });
  });
};

exports.getOne = function (Model, popOptions) {
  return catchAsync(async function (req, res, next) {
    // findById method will return objects in a new array with a matching id defined in database - use param method included with request object and attach id as id parameter defined on route in tourRoutes.js file
    let query = Model.findById(req.params.id);

    if (popOptions) query = query.populate(popOptions);

    const doc = await query;

    if (!doc) {
      // If tour variable is null return a new error instance and pass in message and status code to create a new error instance
      // Passing in new error instance in next method will result in express auto cancelling all other middleware functions and jumping straight to global error middleware function
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });
};

exports.getAll = function (Model) {
  return catchAsync(async function (req, res, next) {
    // To allow for nested GET reviews on tour
    let filter = {};
    // Checking to see if a tour ID has been included with endpoint request - if so to only return that tour in GET request
    if (req.params.tourId) filter = { tour: req.params.tourId };

    // EXECUTING QUERY
    const features = new APIfeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const doc = await features.query;
    // const doc = await features.query.explain(); // - Adding explain method to query will return stats on query in terms of data returned and performance of query from database - will list out time taken for database to search for query through document collections

    // SEND RESPONSE
    // in json method pass in object that will include status key to indicate data has been successfully loaded and returned, data key will hold JSON data stored from file read above
    res.status(200).json({
      status: 'success',
      requestedAt: req.requestTime,
      results: doc.length,
      data: {
        doc,
      },
    });
  });
};
