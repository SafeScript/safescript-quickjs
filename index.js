/**
 * safescript-quickjs — Node.js helper for building QuickJS-embeddable SafeScript bundles.
 *
 * This module generates a single JavaScript file that can be loaded into QuickJS.
 * The generated file contains the SafeScript compiler + runtime and a simple
 * eval API that the C host calls via JS_Eval.
 */
'use strict';

var fs = require('fs');
var path = require('path');

/**
 * Generate a QuickJS-compatible SafeScript bundle.
 *
 * The bundle defines a global `__safescript` object with:
 *   __safescript.compile(source) → '{"ok":true,"code":"..."}' or error JSON
 *   __safescript.validate(source) → '{"ok":true}' or '{"ok":false,"errors":[...]}'
 *   __safescript.capabilities(source) → headerJSON
 *
 * NOTE: SafeScript v0.3 uses an auto-async execution model where run() always
 * returns a Promise. QuickJS does not support async/await or Promises, so
 * __safescript.run() is unavailable. Use compile() to get the emitted code and
 * execute it in an async-capable runtime (Node.js, Deno, browser).
 *
 * @param {Object} [opts]
 * @param {string} [opts.safescriptPath] - Path to safescript.js browser bundle
 * @returns {string} The bundle source
 */
function generateBundle(opts) {
  opts = opts || {};
  var ssPath = opts.safescriptPath || findSafeScript();
  var ssSource = fs.readFileSync(ssPath, 'utf8');

  var bundle = [
    '// SafeScript for QuickJS — auto-generated bundle',
    '// This file is loaded into QuickJS via JS_Eval or as a module.',
    '//',
    '// NOTE: SafeScript v0.3 auto-async model means run() returns a Promise.',
    '// QuickJS does not support Promises, so run() is unavailable here.',
    '// Use compile() to get the emitted JS and execute it in an async-capable runtime.',
    '',
    '(function() {',
    '"use strict";',
    '',
    '// ── SafeScript core ──',
    ssSource,
    '',
    '// ── QuickJS bridge ──',
    'var SS = (typeof SafeScript !== "undefined") ? SafeScript : this.SafeScript;',
    '',
    'globalThis.__safescript = {',
    '  /**',
    '   * run() is unavailable in QuickJS — SafeScript v0.3 auto-async model',
    '   * requires Promise support. Use compile() instead.',
    '   */',
    '  run: function(source, scopeJSON) {',
    '    return JSON.stringify({',
    '      ok: false,',
    '      error: "SafeScript v0.3 auto-async model requires Promise support. ' +
    'Use compile() to get the code and run it in an async-capable runtime, ' +
    'or use validate()/capabilities() for static analysis."',
    '    });',
    '  },',
    '',
    '  validate: function(source) {',
    '    var result = SS.validate(source);',
    '    return JSON.stringify(result);',
    '  },',
    '',
    '  capabilities: function(source) {',
    '    var caps = SS.capabilities(source);',
    '    return JSON.stringify(caps);',
    '  },',
    '',
    '  compile: function(source) {',
    '    try {',
    '      var result = SS.compile(source);',
    '      return JSON.stringify({ ok: true, code: result.code, hash: result.hash || null });',
    '    } catch(e) {',
    '      return JSON.stringify({ ok: false, error: e.message });',
    '    }',
    '  }',
    '};',
    '',
    '})();',
  ].join('\n');

  return bundle;
}

function findSafeScript() {
  // Try local node_modules first
  var candidates = [
    path.join(__dirname, 'node_modules', 'safescript', 'safescript.js'),
    path.join(__dirname, '..', 'safescript', 'safescript.js'),
    path.join(__dirname, '..', 'safe-js', 'safescript.js'),
  ];
  for (var i = 0; i < candidates.length; i++) {
    if (fs.existsSync(candidates[i])) return candidates[i];
  }
  throw new Error('Could not find safescript.js. Pass opts.safescriptPath or install safescript.');
}

exports.generateBundle = generateBundle;
exports.findSafeScript = findSafeScript;
