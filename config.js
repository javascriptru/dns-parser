const path = require('path');

function resolve(relPath) {
  return path.resolve(__dirname, relPath);
}

module.exports = {
  projectRoot:  __dirname,
  dataRoot:     resolve('data'),
  downloadRoot: resolve('download'),
  supportEmail: 'iliakan@javascript.ru',
};

