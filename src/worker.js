'use strict';

const { handleImportShellRequest } = require('./import-shell');

module.exports = {
  fetch(request) {
    return handleImportShellRequest(request);
  },
};
