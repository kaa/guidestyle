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
let gonzales = require('gonzales-pe');
class Section {
    addBlock(block) {
        if (!this.blocks) {
            this.blocks = [];
        }
        this.blocks.push(block);
    }
    addSection(section) {
        if (!this.sections) {
            this.sections = [];
        }
        this.sections.push(section);
    }
    toJSON(context) {
        var blocks = {};
        if (this.blocks) {
            this.blocks.forEach(block => {
                var json = block.toJSON(context);
                if (blocks[block.type] === undefined) {
                    blocks[block.type] = json;
                }
                else if (blocks[block.type] instanceof Array) {
                    blocks[block.type].push(json);
                }
                else {
                    blocks[block.type] = [blocks[block.type], json];
                }
            });
        }
        return {
            file: this.file,
            line: this.line,
            title: this.title,
            body: this.body,
            blocks: blocks,
            sections: this.sections
                ? this.sections.map(t => t.toJSON(context))
                : null,
        };
    }
}
class TextBlock {
    constructor(type, content) {
        this.type = type;
        this.content = content;
    }
    toJSON(context) {
        return {
            type: this.type,
            content: this.content
        };
    }
}
class KeyValueBlock {
    constructor(type, content) {
        this.type = type;
        this.rows = {};
        content.split("\n").map(t => t.trim()).forEach(t => {
            var m = /\S+\s+-\s/.exec(t);
            this.rows[m[0].substring(0, m[0].length - 3).trim()] = t.substring(m[0].length).trim();
        });
    }
    toJSON(context) {
        return {
            type: this.type,
            rows: this.rows
        };
    }
}
class ModifiersBlock extends KeyValueBlock {
    toJSON(context) {
        var modifiers = {};
        Object.keys(this.rows).forEach((value, index) => {
            if (value[0] === ".") {
                modifiers[value] = { "type": "class", "value": value.substring(1), "description": this.rows[value] };
            }
            else if (value[0] === "$") {
                modifiers[value] = { "type": "variable", "name": value.substring(1), "value": context.resolveVariable(value.substring(1)), "description": this.rows[value] };
            }
            else if (value[0] === ":") {
                modifiers[value] = { "type": "pseudo", "value": value, "description": this.rows[value] };
            }
            else {
                modifiers[value] = { "type": "unknown", "value": value, "description": this.rows[value] };
            }
        });
        return {
            type: this.type,
            modifiers: modifiers
        };
    }
}
class AnalyzerContext {
    constructor(path, syntax) {
        this.file = path;
        this.syntax = syntax || this.guessSyntaxFromExtension(path);
        this.sections = [new Section()];
        this.variables = {};
    }
    extend(path, syntax) {
        let t = new AnalyzerContext(path, syntax);
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
class Analyzer {
    constructor() {
        this.types = {
            "modifiers": (name, content) => new ModifiersBlock("modifiers", content)
        };
    }
    analyze(path, syntax) {
        return __awaiter(this, void 0, Promise, function* () {
            var context = new AnalyzerContext(path, syntax);
            yield this.analyzeFile(context);
            return context.toJSON();
        });
    }
    analyzeFile(context) {
        return __awaiter(this, void 0, void 0, function* () {
            var buffer = yield fs.readFile(context.file);
            var source = buffer.toString();
            var tree = gonzales.parse(source, { syntax: context.syntax });
            yield this.traverse(tree, context);
        });
    }
    traverse(node, context) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (node.type) {
                case "multilineComment":
                    let section = this.parseSection(node.content);
                    section.file = context.file;
                    section.line = node.start.line;
                    if (!section) {
                        console.log("Bad section?");
                        break;
                    }
                    if (section.depth === undefined) {
                        // Just add under current section, no new scope
                        context.sections[context.sections.length - 1].addSection(section);
                        break;
                    }
                    // Adjust stack to expected depth
                    context.sections = context.sections.slice(0, section.depth);
                    while (section.depth > context.sections.length) {
                        let t = new Section();
                        t.line = section.line;
                        t.file = section.file;
                        t.depth = context.sections.length;
                        context.sections[context.sections.length - 1].addSection(t);
                        context.sections.push(t);
                    }
                    context.sections[context.sections.length - 1].addSection(section);
                    context.sections.push(section);
                    break;
                case "atrule":
                    let keyword = node.first("atkeyword");
                    if (!keyword) {
                        break;
                    }
                    let atident = keyword.first("ident");
                    if (!atident || atident.content !== "import")
                        break;
                    let file = node.first("string");
                    if (!file)
                        break;
                    let rawPath = file.content.replace(/^[\s"]*|[\s"]*$/g, "");
                    let resolvedPath;
                    if (context.syntax === "scss") {
                        resolvedPath = path.join(path.dirname(context.file), "_" + rawPath + ".scss");
                    }
                    else {
                        resolvedPath = path.join(path.dirname(context.file), rawPath);
                    }
                    yield this.analyzeFile(context.extend(resolvedPath));
                    break;
                case "declaration":
                    let property = node.first("property");
                    if (!property)
                        break;
                    let variable = property.first("variable");
                    if (!variable)
                        break;
                    let name = variable.first("ident");
                    if (!name)
                        break;
                    var value = node.first("value");
                    if (!value)
                        break;
                    context.variables[name] = value.toString();
                    break;
                default:
                    if (node.content instanceof Array) {
                        for (let i = 0; i < node.content.length; i++) {
                            yield this.traverse(node.content[i], context);
                        }
                    }
                    break;
            }
        });
    }
    parseSection(source) {
        let blockRegExp = /^\s*(\w+):/, setextRegExp = /^\s*(=+|-+)/, atxRegExp = /^\s*(#+)\W+/, match;
        let paragraphs = source
            .split("\n\n")
            .map(t => t.replace(/^\s*|\s*$/g, ""))
            .filter(t => t.length > 0);
        let section = new Section();
        let para = paragraphs.shift();
        if (!para)
            return null;
        // Parse atx style heading or plain title
        if (match = atxRegExp.exec(para)) {
            section.title = para.substring(match[0].length).trim();
            section.depth = match[1].length;
        }
        else {
            section.title = para.trim();
        }
        // Test for setext style heading (=== or ---)
        para = paragraphs.shift();
        if (match = setextRegExp.exec(para)) {
            section.depth = match[1][0] == "=" ? 1 : 2;
            para = paragraphs.shift();
        }
        // Read description
        while (para) {
            if (blockRegExp.test(para))
                break;
            section.body = ((section.body || "") + "\n\n" + para).trim();
            para = paragraphs.shift();
        }
        // Read blocks
        while (para) {
            let match = blockRegExp.exec(para), type = match[1].trim().toLowerCase(), value = para.substring(match[0].length).trim();
            while (para = paragraphs.shift()) {
                if (blockRegExp.test(para))
                    break;
                value += "\n\n" + para;
            }
            var factory = this.types[type];
            section.addBlock(factory ? factory(type, value) : new TextBlock(type, value));
        }
        return section;
    }
}
exports.Analyzer = Analyzer;
//# sourceMappingURL=index.js.map