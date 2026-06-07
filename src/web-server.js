'use strict';

const http = require('node:http');

const { handleImportShellRequest } = require('./import-shell');

function createWebServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`);
      const requestInit = {
        headers: req.headers,
        method: req.method,
      };

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        requestInit.body = req;
        requestInit.duplex = 'half';
      }

      const request = new Request(url, requestInit);
      const response = await handleImportShellRequest(request);

      res.statusCode = response.status;
      for (const [headerName, headerValue] of response.headers.entries()) {
        res.setHeader(headerName, headerValue);
      }

      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      const bodyBuffer = Buffer.from(await response.arrayBuffer());
      res.end(bodyBuffer);
    } catch (error) {
      res.statusCode = 500;
      res.setHeader('content-type', 'text/plain; charset=utf-8');
      res.end('Internal Server Error');
    }
  });
}

if (require.main === module) {
  const host = process.env.HOST ?? '127.0.0.1';
  const port = Number.parseInt(process.env.PORT ?? '8787', 10);

  createWebServer().listen(port, host, () => {
    process.stdout.write(`Daedalus import shell listening on http://${host}:${port}\n`);
  });
}

module.exports = {
  createWebServer,
};
