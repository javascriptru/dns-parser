
const Ajv = require('ajv');
const fs = require("fs-extra");
const path = require("path");
const config = require('../config');

const dbPath = path.join(__dirname, '../data/db.json');
const schemasPath = path.join(__dirname, '../data/schemas.js');

module.exports = async function() {
  let schemas = require(schemasPath);

  let ajv = new Ajv({
    schemas,
    allErrors: true,
    // verbose: true
  });

  let db = require(dbPath);
  let validate = ajv.getSchema(`db`);
  if (!validate(db)) {
    console.error(validate.errors);
    throw new Error('Validation error');
  }
}