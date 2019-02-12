'use strict';

const md = require('./lib/plugin/markdown-handlebars');
const merge = require('broccoli-merge-trees');
const sass = require('broccoli-sass-source-maps')(require('sass'));
const sassLint = require('broccoli-sass-lint');
const funnel = require('broccoli-funnel');
const assetRev = require('broccoli-asset-rev');
const LiveReload = require('broccoli-livereload');
const CleanCss = require('broccoli-clean-css');
const env = require('broccoli-env').getEnv() || 'development';
const isProduction = env === 'production';

const appRoot = 'src';

const markdown = new md(`${appRoot}/content`, `${appRoot}/templates`, {
  data: {
    title: 'broccoli.build',
    description: 'Broccoli.js - The asset pipeline for ambitious web applications',
    url: 'https://broccoli.build',
    menu: require('./menu'),
  },
});

let css = sassLint(appRoot + '/styles', {
  disableTestGenerator: true,
});

css = sass([css, 'node_modules'], `site.scss`, 'assets/site.css', {
  annotation: 'Sass files',
  sourceMap: true,
  sourceMapContents: true,
});

if (isProduction) {
  css = new CleanCss(css);
}

const pub = funnel('src/public', {
  annotation: 'Public assets',
});

let tree = merge([markdown, css, pub]);

if (isProduction) {
  tree = assetRev(tree, {
    extensions: ['js', 'css', 'png', 'jpg', 'gif', 'webmanifest', 'svg'],
  });
} else {
  tree = new LiveReload(tree, {
    target: '\\.html$',
  });
}

module.exports = tree;
