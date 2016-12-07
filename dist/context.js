"use strict";
const path = require('path');
class Context {
    constructor(fileName, syntax) {
        this.file = fileName;
        this.basePath = path.dirname(fileName);
        this.syntax = syntax || this.guessSyntaxFromExtension(fileName);
        this.sections = [];
        this.variables = {};
    }
    extend(path, syntax) {
        let t = new Context(path, syntax);
        t.basePath = this.basePath;
        t.sections = this.sections;
        t.variables = this.variables;
        return t;
    }
}
exports.Context = Context;
