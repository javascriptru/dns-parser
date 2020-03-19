// @see https://www.dns-shop.ru/sitemap.xml
// const util = require("util");
// util.inspect.defaultOptions.depth = 4;

const PromisePool = require('es6-promise-pool');

const fs = require('fs-extra');
const path = require('path');
const fetchUrl = require('./fetchUrl');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const config = require('../config');
const imageRoot = path.resolve(config.downloadRoot, 'image');
const productRoot = path.resolve(config.downloadRoot, 'product');

const LOAD_IMAGES = false;

const CONCURRENCY = 1; // download that many files simultaneously

process.on('message', async urls => {
  let i = 0;
  function producer() {
    let url = urls[i++];
    if (!url) {
      // console.log("DONE")
      return null;
    }
    return loadUrl(url).then(result => {
      process.send(url);
      return result;
    });

  }

  const pool = new PromisePool(producer, CONCURRENCY);

  await pool.start();
  // console.log("DONE");
  process.exit(0);
});

async function loadUrl(url) {
  let id = url
    .split('/')
    .filter(Boolean)
    .pop();
  if (fs.existsSync(`${productRoot}/json/${id}.json`)) return;

  let productPage;
  if (fs.existsSync(`${productRoot}/html/${id}.html`)) {
    productPage = fs.readFileSync(`${productRoot}/html/${id}.html`, {
      encoding: 'utf-8'
    });
    if (productPage == 'null') return; // no such product
  } else {
    productPage = await fetchUrl({ url });
    fs.writeFileSync(`${productRoot}/html/${id}.html`, productPage);

    if (productPage === null) {
      fs.writeFileSync(`${productRoot}/json/${id}.json`, JSON.stringify(null));
      return; // no such product
    }
  }

  console.log('PARSE', url);
  let product = parse(productPage);
  product.id = id;
  product.sourceUrl = url;

  if (LOAD_IMAGES) {
    let jobs = [];
    for (let url of product.images) {
      let filename = path.basename(url);
      if (fs.existsSync(`${imageRoot}/${filename}`)) {
        continue;
      }

      console.log(url);

      let job = await fetchUrl({
        url,
        encoding: null
      }).then(function(res) {
        if (res) {
          const buffer = Buffer.from(res, 'utf8');
          fs.writeFileSync(`${imageRoot}/${filename}`, buffer);
        }
      });
      jobs.push(job);
    }
    await Promise.all(jobs);
  }

  fs.writeFileSync(`${productRoot}/json/${id}.json`, JSON.stringify(product, null, 2));
}

function parse(productPage) {
  const dom = new JSDOM(productPage);
  const window = dom.window;
  const document = window.document;

  let product = {};

  product.title = parseTitle(document);
  product.breadcrumb = parseBreadcrumb(document);

  product.code = +document.querySelector('[data-product-param="code"]').textContent;
  product.price = parsePrice(document);
  product.images = parseImages(document);

  let descriptionElem = document.querySelector('[itemprop="description"]');
  product.description = descriptionElem ? descriptionElem.querySelector('p').textContent : '';

  product.characteristics = parseCharacteristics(document);

  product.rating = parseRating(document);

  product.guid = parseGuid(document);

  // trying to avoid "out of memory"
  // doesn't actually work, but maybe helps
  window.close();

  return product;
}

function parsePrice(document) {
  let elem = document.querySelector('meta[itemprop="price"]');
  return elem ? +elem.getAttribute('content') : null;
}

function parseCharacteristics(document) {
  let characteristics = [];
  let characteristicElems = document.querySelectorAll('#main-characteristics tr');
  let section;
  for (let elem of characteristicElems) {
    let partElem = elem.querySelector('.table-part');
    if (partElem) {
      section = {
        title: partElem.textContent,
        items: []
      };
      if (elem.classList.contains('hidden')) {
        section.isExtended = true;
      }
      characteristics.push(section);
    } else {
      let item = {
        name: elem.querySelector('.dots span').firstChild.data.trim(),
        value: elem.querySelectorAll('td')[1].textContent.trim()
      };
      if (elem.classList.contains('extended-characteristic')) {
        item.isExtended = true;
      }
      section.items.push(item);
    }
  }

  return characteristics;
}

function parseImages(document) {
  let images = [];
  let imagesContainer = document.getElementById('thumbsSliderWrap') || document.getElementById('mainImageSliderWrap');
  let imageLinks = imagesContainer.querySelectorAll('[data-original]');
  for (let link of imageLinks) {
    images.push(link.dataset.original);
  }
  return images;
}

function parseTitle(document) {
  let breadcrumbElem = document.querySelector('[itemscope="http://schema.org/BreadcrumbList"]');
  //console.log(document.documentElement.innerHTML)
  let breadcrumbElems = breadcrumbElem.querySelectorAll('[itemprop = "itemListElement"]');
  breadcrumbElems = Array.from(breadcrumbElems);

  let productElem = breadcrumbElems.pop();

  return productElem.querySelector('[itemprop="item"]').textContent;
}

function parseBreadcrumb(document) {
  let breadcrumbElems = document
    .querySelector('[itemscope="http://schema.org/BreadcrumbList"]')
    .querySelectorAll('[itemprop = "itemListElement"]');
  breadcrumbElems = Array.from(breadcrumbElems);
  breadcrumbElems.pop();
  breadcrumbElems.shift();

  let breadcrumb = [];
  for (let elem of breadcrumbElems) {
    breadcrumb.push({
      href: elem.querySelector('[itemprop="item"]').href,
      name: elem.querySelector('[itemprop="name"]').textContent
    });
  }

  return breadcrumb;
}

function parseRating(document) {
  let ratingElem = document.querySelector('[itemprop="ratingValue"]');
  if (!ratingElem) return null;
  return +ratingElem.textContent;
}

function parseGuid(document) {
  let productGuidContainerEl = document.getElementById('product-page');
  return productGuidContainerEl.dataset.id;
}
