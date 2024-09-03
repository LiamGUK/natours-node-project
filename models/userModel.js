const crypto = require('crypto');

const mongoose = require('mongoose');

const validator = require('validator');

const bcrypt = require('bcryptjs');

// name, email, photo, password, passwordConfirm
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A user must have a name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'A user must have a email'],
    unique: true,
    lowercase: true, // transforms email to lowercase characters
    validate: [validator.isEmail, 'Please provide a valid email address'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    // enum = only accepts values specified in array
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'A user must have a password'],
    minlength: 8,
    select: false, // Use select field and set to false to always hide the password field from any response object - will never be returned on client side
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only works on CREATE and SAVE - not on updating methods
      validator: function (el) {
        return el === this.password; // checks to see if value for passwordConfirm matches the same value entered for password
      },
      message: 'Passwords are not the same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    // Hidden in all response objects
    select: false,
  },
});

// pre middleware to encrypt password before its saved to the Database and not save as plain text value
userSchema.pre('save', async function (next) {
  // Check if the password field has NOT been modified/changed - if not then exit early and run next middleware function
  if (!this.isModified('password')) return next();

  // Use hash method attached to bcrypt package to encrypt password - pass in password value and salt level value (Higher the value the more CPU intensive the operation will be and stronger encryption)
  this.password = await bcrypt.hash(this.password, 12); // hash asynchronous method need to await value

  // Need to delete passwordConfirm field value as only needed to check on save and not store to Database - set as undefined to remove field values
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function (next) {
  // If password field has NOT been modified or is a new document added to DB exit out of middleware function by returning next call
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000; // subtract timestamp by a 1000 ms (1 second) into the past so that the new token creation isn't set after the passwordChangedAt value - buffer on time taken to create new token and add to DB
  next();
});

// middleware query instance which will run whenever a find method is called and used on the user Model instance - use regex to match all methods that start with find
userSchema.pre(/^find/, function (next) {
  // this points to current query
  this.find({ active: { $ne: false } }); // will filter out users where the active field is not equal to false
  next();
});

// Instance method - method available to all instances of a certain collection (custom methods you can attach to models)
// correctPassword method will check two password values to check if they match - pass in candidate password (stored password) and userPassword (password supplied from request object)
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  // compare method from bcrypt will encrypt userPassword and see if if matches against password stored in database (returns a promise so need to await)
  return await bcrypt.compare(candidatePassword, userPassword); // returns a boolean value
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  // JWTTimestamp = decoded.iat value supplied from decoded JWT verify method in authController
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    // console.log(changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp;
  }
  // false means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  // Create a random password using randomBytes method from Node crypto core package - generates a random string which client can use to reset and set their own password
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // Current timestamp + 10 mins to set expiry time to 10 mins

  return this.resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
