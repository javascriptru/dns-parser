// @see https://www.dns-shop.ru/sitemap.xml
// const util = require("util");
// util.inspect.defaultOptions.depth = 4;

const fetchUrl = require('../libs/fetchUrl');
const xml2js = require("xml2js");
const fs = require("fs-extra");
const path = require("path");
const parser = new xml2js.Parser(/* options */);
const config = require('../config');
const imageRoot = path.resolve(config.downloadRoot, "image");
const productRoot = path.resolve(config.downloadRoot, "product");
const { fork } = require('child_process');

const URLS_PER_FORK = 300;

fs.ensureDirSync(`${productRoot}/json`);
fs.ensureDirSync(`${productRoot}/html`);
fs.ensureDirSync(imageRoot);
// require('request-debug')(requestPure);

let files = [
  "https://www.dns-shop.ru/products1.xml",
  "https://www.dns-shop.ru/products2.xml",
  "https://www.dns-shop.ru/products3.xml",
  "https://www.dns-shop.ru/products4.xml",
  "https://www.dns-shop.ru/products5.xml"
];

async function run(productsXmlUrl) {
  console.log("RUN", productsXmlUrl);

  let xml;
  // console.log(fs.statSync(`${productRoot}/${path.basename(productsXml)}`).mtimeMs, Date.now() - 3600e3, fs.statSync(`${productRoot}/${path.basename(productsXml)}`).mtimeMs > Date.now() - 3600e3);
  if (
    fs.existsSync(`${productRoot}/${path.basename(productsXmlUrl)}`) &&
    fs.statSync(`${productRoot}/${path.basename(productsXmlUrl)}`).mtimeMs >
      Date.now() - 3600e3
  ) {
    xml = fs.readFileSync(`${productRoot}/${path.basename(productsXmlUrl)}`);
  } else {
    xml = await fetchUrl({ url: productsXmlUrl });
    fs.writeFileSync(`${productRoot}/${path.basename(productsXmlUrl)}`, xml);
  }

  let parsed = await parser.parseStringPromise(xml);
  let urls = parsed.urlset.url.map(record => record.loc[0]);

  let i = 0;

  while(i < urls.length) {
    const forked = fork(path.join(__dirname, '../libs/download.js'), [], {
      stdio: 'inherit'
    });

    forked.on('message', url => {
      // in console urls start from index 1 (1...25000 of 25000)
      console.log(`url ${i+1} of ${urls.length}: ${url}`);
      i++;
    });

    // console.log("Sending from", i);
    forked.send(urls.slice(i, i + URLS_PER_FORK));

    await new Promise(resolve => {
      forked.on('exit', (code) => {
        // console.log("Fork exit", code);
        resolve();
      });
    });

  }

}

module.exports = async function() {
  for (let file of files) {
    await run(file);
  }
};
