"use strict";
const path = require('path');
class AnalyzerContext {
    constructor(fileName, syntax) {
        this.file = fileName;
        this.basePath = path.dirname(fileName);
        this.syntax = syntax || this.guessSyntaxFromExtension(fileName);
        this.sections = [];
        this.variables = {};
    }
    extend(path, syntax) {
        let t = new AnalyzerContext(path, syntax);
        t.basePath = this.basePath;
        t.sections = this.sections;
        t.variables = this.variables;
        return t;
    }
    resolveVariable(name) {
        return this.variables[name];
    }
    toJSON() {
        return {
            variables: this.variables,
            styleguide: this.sections[0].toJSON(this)
        };
    }
    guessSyntaxFromExtension(filename) {
        switch (path.extname(filename)) {
            case ".scss":
                return "scss";
            case ".less":
                return "less";
            default:
                return "css";
        }
    }
}
exports.AnalyzerContext = AnalyzerContext;
