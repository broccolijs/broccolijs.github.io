'use strict';

// const Filter = require('broccoli-filter');
const Plugin = require('broccoli-plugin');
const Handlebars = require('handlebars');
const HandlebarsHelpers = require('handlebars-helpers')();
const frontmatter = require('front-matter');
const walkSync = require('walk-sync');
const mapSeries = require('promise-map-series');
const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');
const Markdown = require('markdown-it');

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
    options.markdownOptions = Object.assign(
      {
        html: true,
        linkify: true,
        typographer: true,
      },
      options.markdownOptions || {}
    );
    options.markdownAnchorOptions = Object.assign(
      {
        permalink: true,
        permalinkSymbol: '⚭',
      },
      options.markdownAnchorOptions || {}
    );
    options.markdownHilightOptions = Object.assign({}, options.markdownHilightOptions);

    super([markdownNode, templatesNode], options);

    this.handlebarOptions = options.handlebarOptions;
    this.callbacks = options.callbacks || {};
    this.options = options;

    this.md = Markdown(options.markdownOptions)
      .use(require('markdown-it-highlightjs'), options.markdownHilightOptions)
      .use(require('markdown-it-anchor'), options.markdownAnchorOptions)
      .use(require('markdown-it-toc-done-right'));

    // Register the helpers
    HandlebarsHelpers.map(Handlebars.registerHelper);
    Handlebars.registerHelper('partial', this.processPartial.bind(this));
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

        fs.writeFileSync(destPath, this.processFile(fullPath, destFile), {
          encoding: 'utf-8',
        });
      }
    });
  }

  /**
   * Process the partial helper
   * @param {string} name The partial name
   * @param {object} options Options object
   * @returns {string}
   */
  processPartial(name, options) {
    const layoutFile = options.data.root.layoutFile;
    const layoutDir = path.dirname(layoutFile);
    const partial = path.join(layoutDir, name);
    let partialFile = `${partial}.hbs`;

    if (fs.existsSync(`${partial}.hbs`)) {
      partialFile = `${partial}.hbs`;
    } else if (fs.existsSync(`${partial}.handlebars`)) {
      partialFile = `${partial}.handlebars`;
    } else {
      throw new Error(`Unable to locate ${partialFile}.(hbs|handlebars)`);
    }

    const template = this.getTemplate(partialFile);
    return new Handlebars.SafeString(template(options.data.root));
  }

  /**
   * Process a markdown file, read the frontmatter, and load the data into the corresponding layout
   * @param {string} filename The relative markdown file name
   * @param {string} outputFile The relative output file name
   * @returns {string} The compiled handlebars template
   */
  processFile(filename, outputFile) {
    const content = fs.readFileSync(filename, { encoding: 'utf-8' });
    const stat = fs.statSync(filename);

    let data = frontmatter(content);
    data.markdownFile = filename;
    data.modifiedTime = new Date(stat.mtime);
    data.createdTime = new Date(stat.ctime);
    data.outputFile = outputFile;
    data.site = this.options.data;

    if (typeof this.callbacks.beforeMarkdown === 'function') {
      data = this.callbacks.beforeMarkdown(data);
    }

    // Parse markdown
    data.rawBody = data.body;
    data.body = this.md.render(data.body);

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
    const layoutFile = this.getLayoutFile(layout);
    data.layoutFile = layoutFile;

    const template = this.getTemplate(layoutFile);
    let result = template(data);

    if (typeof this.callbacks.afterCompile === 'function') {
      result = this.callbacks.afterCompile(data);
    }

    return result;
  }

  /**
   * Get the layout file for the given layout
   * @param [string} layout The layout name
   * @returns {string}
   */
  getLayoutFile(layout) {
    const file = path.join(this.inputPaths[1], layout) + '.hbs';

    if (!fs.existsSync(file)) {
      throw new Error(`Invalid layout: ${layout} does not exist at ${file}`);
    }

    return file;
  }

  /**
   * Get & compile the layout into a template
   * @param {string} layoutFile The layout file
   * @returns {HandlebarsTemplateDelegate}
   */
  getTemplate(layoutFile) {
    return Handlebars.compile(this.getLayoutContent(layoutFile), this.handlebarOptions);
  }

  /**
   * Get the layout file content
   * @param {string} layoutFile The layout file to resolve
   * @returns {string} The layout file content
   */
  getLayoutContent(layoutFile) {
    return fs.readFileSync(layoutFile, { encoding: 'utf-8' });
  }
}

module.exports = MarkdownHandlebars;
