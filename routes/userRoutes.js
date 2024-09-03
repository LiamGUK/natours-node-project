const express = require('express');

const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

// Router method creates a root directory value passed on string endpoint value passed into middleware function in app.js - All CRUD operations now only need to point to /
const router = express.Router();

// Create a separate endpoint route for new user creation as can only use post requests, don't need to use any other CRUD operations on action
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// using express use method able to run middleware functions - pass in protectTo middleware and will run before all of the below CRUD operations - will auto apply protect function to them all (user will have to be logged in to use any of the below methods)
router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword);

router.get('/me', userController.getMe, userController.getUser);

// Pass in saved multer function as middleware in route and use single method attached to pass in field name of relevant value stored in DB
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe,
);
router.delete('/deleteMe', userController.deleteMe);

// All below CRUD operations will only be able to be executed with a user role of admin
router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
