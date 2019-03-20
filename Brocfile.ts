import { BrocfileOptions } from 'broccoli';
import md from './lib/plugin/markdown-handlebars';
import merge from 'broccoli-merge-trees';
import broccoliSass from 'broccoli-sass-source-maps';
import sass from 'sass';
import sassLint from 'broccoli-sass-lint';
import funnel from 'broccoli-funnel';
import assetRev from 'broccoli-asset-rev';
import LiveReload from 'broccoli-livereload';
import CleanCss from 'broccoli-clean-css';
import menu from './menu';

const compileSass = broccoliSass(sass);

// noinspection JSUnusedGlobalSymbols
export default (options: BrocfileOptions) => {
  const appRoot = 'src';
  const isProduction = options.env === 'production';

  const markdown = md(`${appRoot}/content`, `${appRoot}/templates`, {
    data: {
      title: 'broccoli.build',
      description: 'Broccoli.js - The asset pipeline for ambitious web applications',
      url: 'https://broccoli.build',
      menu,
    },
  });

  let css = sassLint(appRoot + '/styles', {
    disableTestGenerator: true,
  });

  css = compileSass([css, 'node_modules'], 'site.scss', 'assets/site.css', {
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

  return tree;
};
