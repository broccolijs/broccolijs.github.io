'use strict';

const Filter = require('broccoli-filter');
const Handlebars = require('handlebars');
const frontmatter = require('front-matter');
const fs = require('fs');

class MarkdownHandlebars extends Filter {
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
  constructor(inputNodes, options) {
    options = options || {};
    options.extensions = options.extensions || ['md', 'markdown'];
    options.targetExtension = options.targetExtension || 'html';
    super(inputNodes, options);

    const layouts = options.layouts || {};
    if (!layouts.default) {
      throw new Error('No "layouts.default" option supplied, this is required');
    }

    this._validateLayouts(layouts);
    this.layouts = layouts;
    this.handlebarOptions = options.handlebarOptions;
    this.callbacks = options.callbacks || {};
    this.templates = {};
  }

  /**
   * Ensure that each layout file exists
   * @param {Array} layouts The layouts to validate
   * @throws Error if the file does not exist
   */
  _validateLayouts(layouts) {
    for (const layout in layouts) {
      const file = layouts[layout];
      if (!fs.existsSync(file)) {
        throw new Error(`Layout ${layout} does not exist at ${file}`);
      }
    }
  }

  /**
   * Process a markdown file, read the frontmatter, and load the data into the corresponding layout
   * @param {string} content The markdown file content
   * @param {string} filename The relative markdown file name
   * @returns {string} The compiled handlebars template
   */
  processString(content, filename) {
    let data = frontmatter(content);
    data.markdownFile = filename;

    if (typeof this.callbacks.beforeCompile === 'function') {
      data = this.callbacks.beforeCompile(data);
    }

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
    if (!this.templates[layout]) {
      this.templates[layout] = Handlebars.compile(
        this.getLayoutContent(layout),
        this.handlebarOptions
      );
    }

    return this.templates[layout];
  }

  /**
   * Get the layout file content
   * @param {string} layout The layout file to resolve
   * @returns {string} The layout file content
   */
  getLayoutContent(layout) {
    if (!this.layouts[layout]) {
      throw new Error(`Invalid layout: ${layout}`);
    }

    return fs.readFileSync(this.layouts[layout], { encoding: 'utf-8' });
  }
}

module.exports = MarkdownHandlebars;
