'use strict';

const { DaedalusPackageValidationError, importDaedalusPackage } = require('./daedalus-package');

const NO_PERSISTENCE_WARNING =
  'This package is processed locally/in-session unless storage is later enabled.';

async function handleImportShellRequest(request) {
  const url = new URL(request.url);

  if (url.pathname !== '/' && url.pathname !== '/import') {
    return createHtmlResponse(renderImportShellPage(), 404);
  }

  if (request.method === 'GET' || request.method === 'HEAD') {
    return createHtmlResponse(renderImportShellPage(), 200, request.method === 'HEAD');
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      headers: {
        allow: 'GET,HEAD,POST',
        'content-type': 'text/plain; charset=utf-8',
      },
      status: 405,
    });
  }

  const submittedPackage = await readSubmittedPackage(request);

  if (!submittedPackage) {
    return createHtmlResponse(
      renderImportShellPage({
        issues: [
          {
            code: 'missing_package_input',
            message: 'Paste package JSON or upload a .json file.',
            path: ['package'],
          },
        ],
      }),
      400,
    );
  }

  let parsedPackage;

  try {
    parsedPackage = JSON.parse(submittedPackage);
  } catch (error) {
    return createHtmlResponse(
      renderImportShellPage({
        packageText: submittedPackage,
        issues: [
          {
            code: 'invalid_json',
            message: `Package input is not valid JSON: ${error.message}`,
            path: ['package'],
          },
        ],
      }),
      400,
    );
  }

  try {
    const compiledTwin = importDaedalusPackage(parsedPackage);

    return createHtmlResponse(
      renderImportShellPage({
        packageText: submittedPackage,
        summary: summarizeCompiledTwin(compiledTwin),
      }),
      200,
    );
  } catch (error) {
    if (!(error instanceof DaedalusPackageValidationError)) {
      throw error;
    }

    return createHtmlResponse(
      renderImportShellPage({
        issues: error.issues,
        packageText: submittedPackage,
      }),
      400,
    );
  }
}

function summarizeCompiledTwin(compiledTwin) {
  const stateCounts = {
    approximate: 0,
    unknown: 0,
    unresolved: 0,
  };

  for (const state of compiledTwin.confidenceStates) {
    if (Object.prototype.hasOwnProperty.call(stateCounts, state.state)) {
      stateCounts[state.state] += 1;
    }
  }

  return {
    evidenceCount: compiledTwin.evidence.length,
    homeContextCount: compiledTwin.homeTwin.observationIds.length,
    houseAreaCount: compiledTwin.houseTwin.areas.length,
    packageVersion: compiledTwin.packageVersion,
    propertyRef: compiledTwin.propertyRef,
    relationshipCount: compiledTwin.relationships.length,
    systemAssetCount: compiledTwin.systemTwin.observationIds.length,
    unknownCount: stateCounts.unknown,
    unresolvedCount: stateCounts.unresolved,
    visitId: compiledTwin.visitId,
    approximateCount: stateCounts.approximate,
  };
}

async function readSubmittedPackage(request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return JSON.stringify(await request.json());
  }

  if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    const packageText = formData.get('packageText');
    if (typeof packageText === 'string' && packageText.trim() !== '') {
      return packageText;
    }

    const packageFile = formData.get('packageFile');
    if (packageFile && typeof packageFile.text === 'function') {
      const fileText = await packageFile.text();
      if (fileText.trim() !== '') {
        return fileText;
      }
    }

    return null;
  }

  const textBody = await request.text();
  return textBody.trim() === '' ? null : textBody;
}

function renderImportShellPage({ summary = null, issues = [], packageText = '' } = {}) {
  const hasIssues = Array.isArray(issues) && issues.length > 0;
  const hasSummary = Boolean(summary);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Daedalus Twin Import Shell</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; margin: 2rem auto; max-width: 56rem; padding: 0 1rem; }
      h1, h2 { margin-bottom: 0.5rem; }
      p, li { line-height: 1.5; }
      textarea { width: 100%; min-height: 16rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
      th, td { border: 1px solid #d0d7de; padding: 0.5rem; text-align: left; vertical-align: top; }
      .warning { background: #fff8c5; border: 1px solid #d4a72c; padding: 0.75rem; }
      .error { background: #ffebe9; border: 1px solid #cf222e; padding: 0.75rem; }
      .summary-list { list-style: none; padding: 0; margin: 1rem 0; }
      .summary-list li { margin: 0.35rem 0; }
      .stack { display: grid; gap: 0.75rem; }
    </style>
  </head>
  <body>
    <main class="stack">
      <header>
        <h1>DaedalusPackage Import Shell</h1>
        <p>Stateless Daedalus twin import/viewer for Cloudflare-hosted sessions.</p>
      </header>

      <p class="warning">${escapeHtml(NO_PERSISTENCE_WARNING)}</p>

      <form method="post" action="/import" enctype="multipart/form-data" class="stack">
        <label for="packageFile">Upload DaedalusPackage JSON file</label>
        <input id="packageFile" name="packageFile" type="file" accept="application/json,.json" />

        <label for="packageText">Or paste DaedalusPackage JSON</label>
        <textarea id="packageText" name="packageText" spellcheck="false">${escapeHtml(packageText)}</textarea>

        <button type="submit">Import package</button>
      </form>

      ${
        hasSummary
          ? `<section>
        <h2>Compiled Twin Summary</h2>
        <ul class="summary-list">
          <li><strong>Package version:</strong> ${escapeHtml(String(summary.packageVersion))}</li>
          <li><strong>Visit:</strong> ${escapeHtml(summary.visitId)}</li>
          <li><strong>Property:</strong> ${escapeHtml(summary.propertyRef)}</li>
          <li><strong>House areas:</strong> ${summary.houseAreaCount}</li>
          <li><strong>System assets:</strong> ${summary.systemAssetCount}</li>
          <li><strong>Home context:</strong> ${summary.homeContextCount}</li>
          <li><strong>Relationships:</strong> ${summary.relationshipCount}</li>
          <li><strong>Evidence count:</strong> ${summary.evidenceCount}</li>
          <li><strong>Unknown count:</strong> ${summary.unknownCount}</li>
          <li><strong>Approximate count:</strong> ${summary.approximateCount}</li>
          <li><strong>Unresolved count:</strong> ${summary.unresolvedCount}</li>
        </ul>
      </section>`
          : ''
      }

      ${
        hasIssues
          ? `<section class="error">
        <h2>Validation issues</h2>
        <p>The package could not be imported. Review the structured issues below.</p>
        <table>
          <thead>
            <tr><th>Path</th><th>Code</th><th>Message</th><th>Value</th></tr>
          </thead>
          <tbody>
            ${issues
              .map((issue) => {
                const path = Array.isArray(issue.path) ? issue.path.join('.') : '';
                const value = issue.value === undefined ? '' : JSON.stringify(issue.value);
                return `<tr>
                  <td>${escapeHtml(path)}</td>
                  <td>${escapeHtml(String(issue.code ?? ''))}</td>
                  <td>${escapeHtml(String(issue.message ?? ''))}</td>
                  <td>${escapeHtml(value)}</td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </section>`
          : ''
      }
    </main>
  </body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function createHtmlResponse(html, status, omitBody = false) {
  return new Response(omitBody ? null : html, {
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/html; charset=utf-8',
    },
    status,
  });
}

module.exports = {
  NO_PERSISTENCE_WARNING,
  handleImportShellRequest,
  renderImportShellPage,
  summarizeCompiledTwin,
};
