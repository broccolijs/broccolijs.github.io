'use strict';

const md = require('./lib/plugin/markdown-handlebars');

module.exports = new md('docs', {
  layouts: {
    default: 'src/templates/index.hbs',
  },
});
