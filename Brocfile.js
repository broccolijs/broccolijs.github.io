'use strict';

const md = require('./lib/plugin/markdown-handlebars');
const merge = require('broccoli-merge-trees');
const sass = require('broccoli-sass-source-maps')(require('sass'));
const funnel = require('broccoli-funnel');
const assetRev = require('broccoli-asset-rev');
const LiveReload = require('broccoli-livereload');
const env = require('broccoli-env').getEnv() || 'development';
const isProduction = env === 'production';

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

if (isProduction) {
  tree = assetRev(tree, {
    extensions: ['js', 'css', 'png', 'jpg', 'gif', 'webmanifest', 'svg'],
  });
} else {
  tree = new LiveReload(tree, {
    target: 'index.html',
  });
}

module.exports = tree;
