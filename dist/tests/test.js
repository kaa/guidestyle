"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const assert = require('assert');
const index_1 = require('../index');
var chai = require("chai");
chai.use(require("chai-as-promised"));
var analyzer = new index_1.Analyzer({});
describe("imports", () => {
    it("follows import rules", () => __awaiter(this, void 0, void 0, function* () {
        let sources = {
            "index.css": '@import "child.css"',
            "child.css": '@import "sub/index.css"',
            "sub/index.css": '@import "child.css"',
            "sub/child.css": '@import "../parent.css"',
            "parent.css": "/* # Section */"
        };
        let resolver = (path) => __awaiter(this, void 0, void 0, function* () { return sources[path]; });
        var analyzer = new index_1.Analyzer({
            resolver: resolver
        });
        let styleguide = yield analyzer.analyzePath("index.css");
        assert.equal(styleguide.sections.length, 1);
    }));
    it("follows scss import rules", () => __awaiter(this, void 0, void 0, function* () {
        let sources = {
            "index.scss": '@import "child"',
            "_child.scss": '@import "sub/index"',
            "sub/_index.scss": '@import "child"',
            "sub/_child.scss": '@import "../parent"',
            "_parent.scss": "/* # Section */"
        };
        let resolver = (path) => __awaiter(this, void 0, void 0, function* () { return sources[path]; });
        var analyzer = new index_1.Analyzer({
            resolver: resolver
        });
        let styleguide = yield analyzer.analyzePath("index.scss");
        assert.equal(styleguide.sections.length, 1);
    }));
    it("registers file in section", () => __awaiter(this, void 0, void 0, function* () {
        let sources = {
            "index.scss": `
                /* # Section */
                @import "child"
            `,
            "_child.scss": `
                /* # Child */
                @import "sub/index"
            `,
            "sub/_index.scss": "/* # Sub */"
        };
        let resolver = (path) => __awaiter(this, void 0, void 0, function* () { return sources[path]; });
        var analyzer = new index_1.Analyzer({ resolver: resolver });
        let styleguide = yield analyzer.analyzePath("index.scss");
        assert.equal(styleguide.sections[0].file, "index.scss");
        assert.equal(styleguide.sections[1].file, "_child.scss");
        assert.equal(styleguide.sections[2].file, "sub/_index.scss");
    }));
});
describe("section", () => {
    it("parses blocks in order", () => __awaiter(this, void 0, void 0, function* () {
        let source = `
            /*
                # Title

                Text block

                block1: Named single line block

                Inline text block

                block2:
                multiline
                block
            */
            `;
        let styleguide = yield analyzer.analyzeString(source);
        let section = styleguide.sections[0];
        let text1 = section.blocks[0], block1 = section.blocks[1], text2 = section.blocks[2], block2 = section.blocks[3];
        assert.equal(text1.content, "Text block");
        assert.equal(text2.content, "Inline text block");
        assert.equal(block1.type, "block1");
        assert.equal(block1.content, "Named single line block");
        assert.equal(block2.type, "block2");
        assert.equal(block2.content, "multiline\nblock");
    }));
    it("parses modifier blocks", () => __awaiter(this, void 0, void 0, function* () {
        let source = `
            /*
                # Title

                modifiers:
                .class - a class
                :pseudo - a pseudoclass
                $var - a variable
            */
            `;
        let styleguide = yield analyzer.analyzeString(source);
        var section = styleguide.sections[0];
        var mods = section.blocks[0];
        assert.equal(3, Object.keys(mods.modifiers).length);
        assert.equal(mods.modifiers[".class"].type, "class");
        assert.equal(mods.modifiers[".class"].name, "class");
        assert.equal(mods.modifiers[":pseudo"].type, "pseudo");
        assert.equal(mods.modifiers[":pseudo"].name, ":pseudo");
        assert.equal(mods.modifiers["$var"].type, "variable");
        assert.equal(mods.modifiers["$var"].name, "var");
    }));
});
describe("styleguide", () => {
    it("serializes nicely", () => __awaiter(this, void 0, void 0, function* () {
        let source = `
            /*
                # Section-One
            */

            /*
                ## Section-Two

                Content
            */
            `;
        let styleguide = yield analyzer.analyzeString(source);
        styleguide.stringify();
    }));
    it("parses variables", () => __awaiter(this, void 0, void 0, function* () {
        let source = `
            $var1: red;
            $var2: #ddd;
            `;
        let styleguide = yield analyzer.analyzeString(source, "scss");
        assert.equal(Object.keys(styleguide.variables).length, 2);
        assert.equal(styleguide.variables["var1"], "red");
        assert.equal(styleguide.variables["var2"], "#ddd");
    }));
    it("adds base level paragraphs to styleguide blocks", () => __awaiter(this, void 0, void 0, function* () {
        let source = `
            /*
                Generic text block

                A second block
            */`;
        let styleguide = yield analyzer.analyzeString(source);
        assert.equal(styleguide.blocks.length, 2);
        var textBlock = styleguide.blocks[0];
        assert(textBlock);
        assert.equal(textBlock.content, "Generic text block");
    }));
    it("parses sections", () => __awaiter(this, void 0, void 0, function* () {
        let source = `
            /*
                # Section-One
            */

            /*
                # Section-Two
            */
            `;
        let styleguide = yield analyzer.analyzeString(source);
        assert.equal(styleguide.sections.length, 2);
    }));
    it("parses sub sections", () => __awaiter(this, void 0, void 0, function* () {
        let source = `
            /*
                # Section-One
            */

            /*
                ## Sub-Section-One
            */
            `;
        let styleguide = yield analyzer.analyzeString(source);
        assert.equal(styleguide.sections.length, 1);
        assert.equal(styleguide.sections[0].sections.length, 1);
    }));
    it("parses complex sections", () => __awaiter(this, void 0, void 0, function* () {
        let source = `
            /*
                # Section-One
            */
            /*
                ## Sub-Section-One
            */
            /*
                ### Sub-Section-One
            */
            /*
                ## Sub-Section-One
            */
            /*
                # Sub-Section-One
            */
            /*
                ## Sub-Section-One
            */
            `;
        let styleguide = yield analyzer.analyzeString(source);
        assert.equal(styleguide.sections.length, 2);
        assert.equal(styleguide.sections[0].sections.length, 2);
        assert.equal(styleguide.sections[0].sections[0].sections.length, 1);
        assert.equal(styleguide.sections[1].sections.length, 1);
    }));
    it("inserts anonymous sections", () => __awaiter(this, void 0, void 0, function* () {
        let source = `
            /*
                ### Section-One
            */
            `;
        let styleguide = yield analyzer.analyzeString(source);
        assert.equal(styleguide.sections[0].sections[0].sections.length, 1);
    }));
    it("respects multiline ignore sections", () => __awaiter(this, void 0, void 0, function* () {
        let source = `
            /* BEGIN IGNORE */
            /*
                # Section-One
            */
            /* END IGNORE */
            `;
        let styleguide = yield analyzer.analyzeString(source);
        assert.equal(styleguide.sections.length, 0);
    }));
    it("respects singleline sections", () => __awaiter(this, void 0, void 0, function* () {
        let source = `
            // BEGIN IGNORE
            /*
                # Section-One
            */
            // END IGNORE
            `;
        let styleguide = yield analyzer.analyzeString(source, "scss");
        assert.equal(styleguide.sections.length, 0);
    }));
});
