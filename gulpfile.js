const {task, series, parallel} = require('gulp');
const config = require('./config');
const path = require('path');

process.on('uncaughtException', function(err) {
  console.error(err.message, err.stack, err.errors);
  process.exit(255);
});

task('download', require('./tasks/download'));
task('generateOrders', require('./tasks/generateOrders'));
task('convertProducts', require('./tasks/convertProducts'));
task('validate', require('./tasks/validate'));

task('makeDb', series('download', 'convertProducts', 'generateOrders', 'validate'));
