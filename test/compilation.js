'use strict';

const fs = require('fs');
const ignore = require('ignore');
const { describe, it } = require('mocha');
const requiredirectory = require('require-directory');
const relquire = require('lib/relquire');

describe(require('package.json').name, function () {
  this.timeout(3000);
  it('compiles', () => {
    const gitignore = ignore().add(fs.readFileSync('.gitignore', 'utf8'));

    requiredirectory(module, relquire.base, {
      exclude: (absolutePath) =>
        gitignore.ignores(absolutePath.split(relquire.base).pop().slice(1))
    });
  });
});
