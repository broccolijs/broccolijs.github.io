'use strict';

const md = require('./lib/plugin/markdown-handlebars');
const merge = require('broccoli-merge-trees');
const sass = require('broccoli-sass-source-maps')(require('sass'));

const markdown = new md('docs', {
  layouts: {
    default: 'src/templates/index.hbs',
  },
});

const css = new sass(['src'], 'styles/site.scss', 'assets/site.css', {
  annotation: 'Sass files',
  sourceMap: true,
  sourceMapContents: true,
});

const tree = merge([markdown, css]);

module.exports = tree;
