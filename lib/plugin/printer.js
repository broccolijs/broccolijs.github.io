const Funnel = require('broccoli-funnel');
const glob = require('glob').sync;
const fs = require('fs');

class Printer extends Funnel
{
  constructor (inputNode) {
    super(inputNode);
  }

  build() {
    const inputPath = this.inputPaths[0];
    glob(`${inputPath}/**`).forEach(file => {
      const stat = fs.lstatSync(file);

      if (stat.isFile()) {
        const isByte = stat.size < 1024;
        const size = isByte ? stat.size : Math.round(stat.size / 1024);
        const path = file.substr(inputPath.length + 1);
        const label = isByte ? 'B' : 'KB';
        console.log(`${size}${label}\t${path}`);
      }
    });

    super.build();
  }
}

module.exports = (...arguments) => {
  return new Printer(...arguments);
};

module.exports.Printer = Printer;
