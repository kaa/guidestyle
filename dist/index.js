"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const fs = require('mz/fs');
const path = require('path');
const blocks_1 = require("./blocks");
const section_1 = require("./section");
const error_1 = require("./error");
let gonzales = require('gonzales-pe');
class Analyzer {
    constructor(options) {
        this.options = Object.assign({}, Analyzer.defaultOptions, options);
    }
    /**
     * Generate styleguide from a file
     *
     * @param path - Path to source file
     */
    analyzePath(path, syntax = null) {
        return __awaiter(this, void 0, void 0, function* () {
            let context = new AnalyzerContext();
            context.path = path;
            context.syntax = syntax || this.guessSyntaxFromExtension(path);
            var source = yield this.resolvePath(path);
            yield this.analyze(source, context);
            return context.styleguide;
        });
    }
    /**
     * Generate styleguide from a string.
     *
     * @param source - Source code to analyze
     * @param syntax - The syntax of the supplied source code, defaults to 'css'
     */
    analyzeString(source, syntax = "css") {
        return __awaiter(this, void 0, void 0, function* () {
            let context = new AnalyzerContext(syntax);
            context.path = "";
            yield this.analyze(source, context);
            return context.styleguide;
        });
    }
    /**
     * Generate styleguide by analyzing a string
     */
    analyze(source, context) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let node = gonzales.parse(source, { syntax: context.syntax });
                yield this.traverse(node, context);
            }
            catch (err) {
                throw new error_1.AnalyzerError(err.message, path, err.line);
            }
        });
    }
    /**
     * Traverse node and children and look for sections, variable
     * declarations and @import rules
     *
     * @param node - The current node to explore
     * @param context - The current state of analysis
    */
    traverse(node, context) {
        return __awaiter(this, void 0, void 0, function* () {
            if (node.type === "singlelineComment" || node.type === "multilineComment") {
                if (node.content.trim() == "BEGIN IGNORE") {
                    context.isIgnoring = true;
                    return;
                }
                else if (node.content.trim() == "END IGNORE") {
                    context.isIgnoring = false;
                    return;
                }
            }
            if (context.isIgnoring) {
                return; // currently in an ignore section
            }
            if (node.type == "declaration")
                return this.parseDeclaration(node, context);
            else if (node.type == "multilineComment")
                return this.parseMultilineComment(node, context);
            else if (node.type == "atrule") {
                return yield this.parseAtRule(node, context);
            }
            else if (node.content instanceof Array) {
                for (let i = 0; i < node.content.length; i++) {
                    yield this.traverse(node.content[i], context);
                }
            }
        });
    }
    /** Parse a variable declaration */
    parseDeclaration(node, context) {
        let property = node.first("property");
        if (!property)
            return;
        let variable = property.first("variable");
        if (!variable)
            return;
        let name = variable.first("ident");
        if (!name)
            return;
        var value = node.first("value");
        if (!value)
            return;
        context.styleguide.variables[name] = value.toString();
    }
    /** Parse an import rule */
    parseAtRule(node, context) {
        return __awaiter(this, void 0, void 0, function* () {
            let keyword = node.first("atkeyword");
            if (!keyword)
                return;
            let ident = keyword.first("ident");
            if (!ident || ident.content !== "import")
                return;
            let file = node.first("string");
            if (!file)
                return;
            let importPath = file.content.replace(/^[\s"]*|[\s"]*$/g, "");
            if (context.syntax === "scss") {
                let dirname = path.dirname(importPath), strippedPath = path.basename(importPath).replace(/^_/, "").replace(/.scss$/, "");
                importPath = path.join(dirname, "_" + strippedPath + ".scss");
            }
            importPath = path.join(path.dirname(context.path || ""), importPath);
            var source = yield this.resolvePath(importPath), currentPath = context.path, currentSyntax = context.syntax;
            context.path = importPath;
            context.syntax = this.guessSyntaxFromExtension(importPath);
            yield this.analyze(source, context);
            context.path = currentPath;
            context.syntax = currentSyntax;
        });
    }
    /** Parse multiline comments to styleguide sections */
    parseMultilineComment(node, context) {
        var prefix = this.options.sectionPrefix;
        if (prefix && node.content.substring(0, prefix.length) != prefix) {
            return;
        }
        let paragraphs = node.content
            .substring((this.options.sectionPrefix || "").length)
            .replace(/\r\n/g, "\n")
            .split("\n\n")
            .map(t => t.replace(/^\s*/g, "").replace(/\s*$/g, ""))
            .filter(t => t.length > 0);
        let para = paragraphs.shift();
        if (!para)
            return;
        let blockRegExp = /^\s*(\w+):/, atxRegExp = /^\s*(#*)\W/;
        let section, titleMatch = atxRegExp.exec(para), depth = titleMatch ? titleMatch[1].length : undefined;
        if (!depth && context.section instanceof section_1.Styleguide) {
            section = context.section;
            section.blocks.push(blocks_1.createBlock(null, para));
        }
        else {
            section = new section_1.Section();
            section.title = para.substring(titleMatch ? titleMatch[0].length : 0).trim();
            section.depth = depth || context.section.depth + 1;
            section.file = context.path;
            section.line = node.start.line;
            if (depth) {
                while (depth <= context.section.depth) {
                    let parent = context.section.getParent();
                    if (!parent)
                        throw new Error("Section of depth " + context.section.depth + " does not have a parent.");
                    context.section = parent;
                }
                while (depth > context.section.depth + 1) {
                    let s = new section_1.Section();
                    s.depth = context.section.depth + 1;
                    context.section = context.section.addSection(s);
                }
                context.section = context.section.addSection(section);
            }
            else {
                context.section.addSection(section);
            }
        }
        // Read blocks
        para = paragraphs.shift();
        while (para) {
            let match = blockRegExp.exec(para);
            if (match) {
                let type = match[1].trim().toLowerCase(), value = para
                    .substring(match[0].length)
                    .replace(/\n\s*/g, "\n")
                    .trim();
                section.blocks.push(blocks_1.createBlock(type, value));
            }
            else {
                section.blocks.push(blocks_1.createBlock(null, para));
            }
            para = paragraphs.shift();
        }
    }
    /** Attempt to guess syntax of file from its extension */
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
    resolvePath(path) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.options.resolver)
                return this.options.resolver(path);
            var buffer = yield fs.readFile(path);
            return buffer.toString();
        });
    }
}
Analyzer.defaultOptions = {
    sectionPrefix: ""
};
exports.Analyzer = Analyzer;
class AnalyzerContext {
    constructor(syntax = "scss") {
        this.syntax = syntax;
        this.section = this.styleguide = new section_1.Styleguide();
    }
}
exports.AnalyzerContext = AnalyzerContext;
