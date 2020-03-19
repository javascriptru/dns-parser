const request = require('request-promise');
const requestPure = require('request');
const { JSDOM } = require('jsdom');

// loads url, retries in case of timeout
// handles 410 as "no data"
// shows itself as googlebot
module.exports = async function fetchUrl(options = {}) {
  console.log('FETCH', options.url);
  // using requestPure cause (maybe) request-promise aborts on ESOCKETTIMEOUT
  return new Promise((resolve, reject) => {
    requestPure(
      Object.assign(
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            Accept: '*/*'
          },
          timeout: 20000,
          jar: true,
          gzip: true
        },
        options
      ),
      (error, response, body) => {
        if (!error && !response.headers['content-type'].startsWith('image') && body && body.includes('ipp.')) {
          // DDOS protection
          body = body.replace('location.href', 'window.redir');
          body = body.replace(/document.cookie=/g, 'window.cook = (window.cook || "") + "|||" + ');
          const dom = new JSDOM(body, { runScripts: 'dangerously' });
          const window = dom.window;

          options.url = window.redir;
          resolve(fetchUrl(options));

          console.log('REDIR', window.redir, 'COOKIE', window.cook, 'BODY', body);
          const document = window.document;

          console.log('REQUEST', options, error, response, body);

          console.log('COOKIE', document.cookie);
          process.exit(1);

          return;
        }
        if (error) {
          if (error.code == 'ESOCKETTIMEDOUT') {
            resolve(fetchUrl(options));
          } else if (error.code == 'ECONNRESET') {
            return new Promise(resolve => setTimeout(resolve, 2000)).then(() => resolve(fetchUrl(options)));
          } else if (error.message.includes('Exceeded maxRedirects')) {
            resolve(null);
          } else {
            reject(error);
          }
        } else {
          if (response.statusCode == 410 || response.statusCode == 500) {
            // not such product any more
            resolve(null);
          } else if (response.statusCode != 200) {
            console.error('BAD RESPONSE', error, response, body);
            process.exit(1);
            throw new Error('BAD RESPONSE');
          } else {
            resolve(body);
          }
        }
      }
    );
  });
}
