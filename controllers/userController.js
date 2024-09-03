// Package to handle file uploads sent through form submissions
const multer = require('multer');

// Package to update and edit image files in Node.js
const sharp = require('sharp');

const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// const multerStorage = multer.diskStorage({
//   destination: function (req, file, callback) {
//     callback(null, 'public/img/users');
//   },
//   filename: function (req, file, callback) {
//     // user-27897cbvg-timestamp.jpeg
//     const extension = file.mimetype.split('/')[1];
//     callback(null, `user-${req.user.id}-${Date.now()}.${extension}`);
//   },
// });

// memoryStorage method will save image file to memory instead in Node.js app and used as a buffer - More efficient then writing to hard disk and reading again
const multerStorage = multer.memoryStorage();

// filter function to check if file uploaded is an image type file - pass in true into callback function to continue middleware stack otherwise pass in false with error message to stop middleware stack and load an error
const multerFilter = function (req, file, callback) {
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

// single method attached to multer package is middleware to handle uploading a single file - pass in field name which is sent through on request
exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async function (req, res, next) {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpg`;

  // As image file is not stored to disk and then read again - is stored to memory and can then be read in request object under buffer
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

const filterObj = function (obj, ...allowedFields) {
  const newObj = {};
  Object.keys(obj).forEach(function (el) {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getAllUsers = factory.getAll(User);

// exports.getAllUsers = catchAsync(async function (req, res) {
//   const users = await User.find();

//   // console.log(req.query);

//   // SEND RESPONSE
//   // in json method pass in object that will include status key to indicate data has been successfully loaded and returned, data key will hold JSON data stored from file read above
//   res.status(200).json({
//     status: 'success',
//     requestedAt: req.requestTime,
//     results: users.length,
//     data: {
//       users,
//     },
//   });
// });

// Middleware function which will set the param of id on endpoint and set it to equal to the logged in user - can then use with factory function
exports.getMe = function (req, res, next) {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async function (req, res, next) {
  // File uploads through form submissions can be inspected in request object
  // console.log(req.file);

  // 1) Create error if user tries to update password
  if (req.body.password || req.body.passwordConfirm)
    return next(
      new AppError(
        'This route is not for password updates. Please use updateMyPassword',
        400,
      ),
    );

  // 2) Filter out unwanted field names in request that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');

  // Checks if a upload file is included in request object - if so will add a new key to filteredBody object above and add filename to it.
  if (req.file) filteredBody.photo = req.file.filename;

  // 3) Update the user document in DB
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async function (req, res, next) {
  await User.findByIdAndUpdate(req.user.id, { active: false }); // Sets active field for user to false (finds user by the ID value)

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = function (req, res) {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined! Please use sign up instead.',
  });
};

exports.getUser = factory.getOne(User);

// exports.getUser = function (req, res) {
//   res.status(500).json({
//     status: 'error',
//     message: 'This route is not yet defined',
//   });
// };

// DO NOT UPDATE PASSWORDS WITH THIS
exports.updateUser = factory.updateOne(User);

// exports.updateUser = function (req, res) {
//   res.status(500).json({
//     status: 'error',
//     message: 'This route is not yet defined',
//   });
// };

// DO NOT UPDATE PASSWORDS WITH THIS
exports.deleteUser = factory.deleteOne(User);

// exports.deleteUser = function (req, res) {
//   res.status(500).json({
//     status: 'error',
//     message: 'This route is not yet defined',
//   });
// };
