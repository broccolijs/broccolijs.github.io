'use strict';

// const Filter = require('broccoli-filter');
const Plugin = require('broccoli-plugin');
const Handlebars = require('handlebars');
const frontmatter = require('front-matter');
const walkSync = require('walk-sync');
const mapSeries = require('promise-map-series');
const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');
const md = require('markdown-it')();

class MarkdownHandlebars extends Plugin {
  /**
   *
   * @param {Array} inputNodes The source input nodes to find markdown files to parse
   * @param {Object} options An options hash supporting the following properties:
   * {
   *    extensions: ['md', 'markdown'], // The markdown file extensions
   *    targetExtension: 'html', // The target file extension for the parsed files
   *    layouts: {
   *      // A hash of the available template layouts. At least the "default" template must be supplied.
   *      default: 'path/to/default/template.hbs',
   *    },
   *    callbacks: {
   *      // A callback that receives the parsed markdown data and returns the template data
   *      beforeCompile(data) { ... return data }
   *      // A callback that receives the compiled template as a string, and returns a string
   *      afterCompile(template) { ... return template }
   *    }
   * }
   */
  constructor(markdownNode, templatesNode, options) {
    options = options || {};

    super([markdownNode, templatesNode], options);

    this.handlebarOptions = options.handlebarOptions;
    this.callbacks = options.callbacks || {};
    this.templates = {};
  }

  /**
   * Build invoked by broccoli.
   * Reads markdown files from markdownNode, parses them into HTML.
   * The parsed markdown is passed to the associated `layout`.
   * The `layout` is read from templatesNode, parsed and rendered with the markdown data.
   * The resulting content is written to an .html file
   *
   * @returns {Promise}
   */
  build() {
    const paths = walkSync(this.inputPaths[0]);
    const destDir = this.outputPath;

    return mapSeries(paths, relativePath => {
      const fullPath = path.join(this.inputPaths[0], relativePath);

      if (relativePath.slice(-1) === '/') {
        const destPath = destDir + '/' + relativePath;
        mkdirp.sync(destPath);
      } else {
        const destFile = relativePath.substr(0, relativePath.lastIndexOf('.')) + '.html';
        const destPath = path.join(destDir, destFile);

        fs.writeFileSync(destPath, this.processFile(fullPath), {
          encoding: 'utf-8',
        });
      }
    });
  }

  /**
   * Process a markdown file, read the frontmatter, and load the data into the corresponding layout
   * @param {string} filename The relative markdown file name
   * @returns {string} The compiled handlebars template
   */
  processFile(filename) {
    const content = fs.readFileSync(filename, { encoding: 'utf-8' });
    let data = frontmatter(content);
    data.markdownFile = filename;

    if (typeof this.callbacks.beforeMarkdown === 'function') {
      data = this.callbacks.beforeMarkdown(data);
    }

    // Parse markdown
    data.rawBody = data.body;
    data.body = md.render(data.body);

    if (typeof this.callbacks.afterMarkdown === 'function') {
      data = this.callbacks.afterMarkdown(data);
    }

    // Make string HTML safe
    data.body = new Handlebars.SafeString(data.body);

    if (typeof this.callbacks.beforeCompile === 'function') {
      data = this.callbacks.beforeCompile(data);
    }

    // Render template
    const layout = data.attributes.layout || 'default';
    const template = this.getTemplate(layout);
    let result = template(data);

    if (typeof this.callbacks.afterCompile === 'function') {
      result = this.callbacks.afterCompile(data);
    }

    return result;
  }

  /**
   * Get & compile the layout into a template
   * @param {string} layout The layout name
   * @returns {HandlebarsTemplateDelegate}
   */
  getTemplate(layout) {
    return Handlebars.compile(this.getLayoutContent(layout), this.handlebarOptions);
  }

  /**
   * Get the layout file content
   * @param {string} layout The layout file to resolve
   * @returns {string} The layout file content
   */
  getLayoutContent(layout) {
    const file = path.join(this.inputPaths[1], layout) + '.hbs';

    if (!fs.existsSync(file)) {
      throw new Error(`Invalid layout: ${layout} does not exist at ${file}`);
    }

    return fs.readFileSync(file, { encoding: 'utf-8' });
  }
}

module.exports = MarkdownHandlebars;
