#!/usr/bin/env node
'use strict';

var generator = require('./index');
var fs = require('fs');
var path = require('path');

var pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ ' + msg); }
}

console.log('safescript-quickjs tests');
console.log('───────────────────────');

// ── generateBundle ──

console.log('\ngenerateBundle:');

var bundle = generator.generateBundle();
assert(typeof bundle === 'string' && bundle.length > 1000, 'generates a non-trivial bundle string');
assert(bundle.indexOf('__safescript') !== -1, 'bundle defines __safescript global');
assert(bundle.indexOf('run: function') !== -1, 'bundle exposes run()');
assert(bundle.indexOf('validate: function') !== -1, 'bundle exposes validate()');
assert(bundle.indexOf('capabilities: function') !== -1, 'bundle exposes capabilities()');
assert(bundle.indexOf('compile: function') !== -1, 'bundle exposes compile()');
assert(bundle.indexOf('"use strict"') !== -1, 'bundle uses strict mode');

// Check that it wraps in an IIFE
assert(bundle.indexOf('(function()') !== -1, 'bundle is wrapped in an IIFE');
assert(bundle.trim().slice(-5) === '})();', 'IIFE is properly closed');

// ── findSafeScript ──

console.log('\nfindSafeScript:');

var ssPath = generator.findSafeScript();
assert(fs.existsSync(ssPath), 'findSafeScript returns a path that exists');
assert(ssPath.indexOf('safescript.js') !== -1, 'found path contains safescript.js');

// ── custom path ──

console.log('\ncustom safescriptPath:');

var customBundle = generator.generateBundle({ safescriptPath: ssPath });
assert(typeof customBundle === 'string' && customBundle.length > 1000, 'accepts custom safescriptPath');

// ── bad path ──

console.log('\nerror handling:');

var threw = false;
try { generator.generateBundle({ safescriptPath: '/nonexistent/safescript.js' }); }
catch(e) { threw = true; }
assert(threw, 'throws on missing safescriptPath');

// ── bundle.js CLI ──

console.log('\nbundle CLI:');

var distDir = path.join(__dirname, 'dist');
var distFile = path.join(distDir, 'safescript-quickjs.js');

// Clean up first
if (fs.existsSync(distFile)) fs.unlinkSync(distFile);

var cp = require('child_process');
var result = cp.execSync('node ' + path.join(__dirname, 'bundle.js'), { encoding: 'utf8' });
assert(result.indexOf('Bundle written') !== -1, 'bundle.js prints success message');
assert(fs.existsSync(distFile), 'bundle.js creates dist/safescript-quickjs.js');

var distContent = fs.readFileSync(distFile, 'utf8');
assert(distContent.indexOf('__safescript') !== -1, 'generated file contains __safescript');
assert(distContent === bundle, 'CLI output matches programmatic output');

// ── bundle content validation ──

console.log('\nbundle content:');

// The bundle should contain SafeScript core
assert(bundle.indexOf('SafeScript') !== -1, 'bundle embeds SafeScript core');
// JSON bridge pattern
assert(bundle.indexOf('JSON.stringify') !== -1, 'bridge uses JSON.stringify for results');
// run() should explain async limitation
assert(bundle.indexOf('auto-async') !== -1, 'bridge documents auto-async model limitation');

// ── Summary ──

console.log('\n───────────────────────');
console.log(pass + ' passed, ' + fail + ' failed');
if (fail > 0) process.exit(1);
