// Best practice is to have all logic related to express in one file and logic for the server in its own file (separation of concerns)
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Handling Uncaught exceptions - errors relating to undefined values in code or properties that cannot be read
// Placed at top of file so will start listening for errors before the express server starts
process.on('uncaughtException', function (err) {
  console.log('UNCAUGHT EXECEPTION! Shutting down...');
  console.log(err.name, err.message);
  // For unhandled promise rejections resulting from issues such as connecting to server - best solution to exit out of app using process.exit() method (Will force exit out of application)
  process.exit(1); // pass in exit code 1 to flag to node.js to terminate the active process
});

// config method from dotenv package can read config file in project and will then add all variables set to the node.js process.env object
dotenv.config({ path: './config.env' });

const app = require('./app');

// Replaces placeholder text in connection string with real Password saved as env variable
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

// Use connect method from mongoose package and pass in connection string (saved as env variable) to remote connect to mongo database
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => {
    // Returns a promise so use then to return and read promise - connections key will return info on DB connection
    // console.log(connection.connections);
    console.log('DB connection established');
  });

// To check which environment app is currently running in in express use get method and pass 'env' to return environment value - Node.js by default starts in development environment
console.log(app.get('env'));

// To check environment variables for node.js in general use process.env
// Environment variables can be set and attached to process.env object - add config.env file in root project and set custom env variables there
// Use npm package dotenv to read configuration file in project
// console.log(process.env);
// console.log(process.env.NODE_ENV);

// Can use environment variable to define settings in app - will set the port number via the environment variable or hard-coded value in file
const port = process.env.PORT || 3000;
// To start server with express using listen method accessible via app variable
// Only need to pass in port and callback function to execute when server starts
const server = app.listen(port, () =>
  console.log(`App running on port ${port}`),
);

// Handling unhandled promise rejections - using event listeners
process.on('unhandledRejection', function (err) {
  console.log('UNHANDLED REJECTION! Shutting down...');
  console.log(err.name, err.message);
  // Best practice to stop server running first using close method attached to express app - pass in function which will execute after server finishes
  server.close(function () {
    // For unhandled promise rejections resulting from issues such as connecting to server - best solution to exit out of app using process.exit() method (Will force exit out of application)
    process.exit(1); // pass in exit code 1 to flag to node.js to terminate the active process
  });
});
