require('util').inspect.defaultOptions.depth = 4;

const fs = require("fs-extra");
const path = require("path");
const { exec } = require("mz/child_process");
const config = require('../config');

const dbPath = path.join(__dirname, '../data/db.json');
const imagesRoot = path.resolve(config.downloadRoot, 'image');
const imagesConvertedRoot = path.resolve(config.downloadRoot, 'image-converted');

fs.ensureDirSync(imagesConvertedRoot);

module.exports = async function() {

  let db = require(dbPath);

  // db.products = db.products.slice(0, 10);
  console.log("Products total", db.products.length);
  for(let product of db.products) {
    if (!product.images) continue;

    console.log(product.id);
    let jobs = [];
    for(let i = 0; i<product.images.length; i++) {
      let {url, source} = product.images[i];
      let imagePath = path.resolve(imagesRoot, source);
      let filename = product.id + '-' + i + '.jpg';
      let imageConvertedPath = path.resolve(imagesConvertedRoot, filename);

      jobs.push(exec(`convert ${imagePath} -resize 1000x1000 ${imageConvertedPath}`, {
        encoding: 'utf-8',
        stdio: 'inherit'
      }));
      product.images[i].source = filename;
      product.images[i].url = `https://shop-image.js.cx/${filename}?h=50`;
    }
    await Promise.all(jobs);
  }

  console.log(db.products);
  fs.writeFileSync(`${config.dataRoot}/db.json`, JSON.stringify(db, null, 2));

};
