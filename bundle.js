#!/usr/bin/env node
/**
 * Generate the QuickJS-compatible SafeScript bundle.
 * Usage: node bundle.js [output-path]
 */
'use strict';

var fs = require('fs');
var path = require('path');
var generator = require('./index');

var outputPath = process.argv[2] || path.join(__dirname, 'dist', 'safescript-quickjs.js');
var outputDir = path.dirname(outputPath);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

var bundle = generator.generateBundle();
fs.writeFileSync(outputPath, bundle);

console.log('Bundle written to ' + outputPath + ' (' + bundle.length + ' bytes)');
