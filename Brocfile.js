'use strict';

const md = require('./lib/plugin/markdown-handlebars');
const merge = require('broccoli-merge-trees');
const sass = require('broccoli-sass-source-maps')(require('sass'));
const funnel = require('broccoli-funnel');
const LiveReload = require('broccoli-livereload');

const markdown = new md('src/docs', 'src/templates');

const css = sass(['src'], 'styles/site.scss', 'assets/site.css', {
  annotation: 'Sass files',
  sourceMap: true,
  sourceMapContents: true,
});

const pub = funnel('src/public', {
  annotation: 'Public assets',
});

let tree = merge([markdown, css, pub]);

tree = new LiveReload(tree, {
  target: 'index.html',
});

module.exports = tree;
