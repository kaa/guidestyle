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
        var ctx = new index_1.AnalyzerContext();
        ctx.syntax = "css";
        yield analyzer.analyze(yield resolver("index.css"), ctx);
        assert.equal(ctx.section.getStyleguide().sections.length, 1);
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
        var ctx = new index_1.AnalyzerContext();
        yield analyzer.analyze(yield resolver("index.scss"), ctx);
        assert.equal(ctx.section.getStyleguide().sections.length, 1);
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
        var ctx = new index_1.AnalyzerContext();
        ctx.path = "index.scss";
        yield analyzer.analyze(yield resolver("index.scss"), ctx);
        assert.equal(ctx.section.getStyleguide().sections[0].file, "index.scss");
        assert.equal(ctx.section.getStyleguide().sections[1].file, "_child.scss");
        assert.equal(ctx.section.getStyleguide().sections[2].file, "sub/_index.scss");
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
        var ctx = new index_1.AnalyzerContext();
        yield analyzer.analyze(source, ctx);
        var styleguide = ctx.section.getStyleguide();
        var section = styleguide.sections[0];
        var text1 = section.blocks[0], block1 = section.blocks[1], text2 = section.blocks[2], block2 = section.blocks[3];
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
        var ctx = new index_1.AnalyzerContext();
        yield analyzer.analyze(source, ctx);
        var styleguide = ctx.section.getStyleguide();
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
        var ctx = new index_1.AnalyzerContext();
        yield analyzer.analyze(source, ctx);
        var data = ctx.section.getStyleguide();
        data.stringify();
    }));
    it("parses variables", () => __awaiter(this, void 0, void 0, function* () {
        let source = `
            $var1: red;
            $var2: #ddd;
            `;
        var ctx = new index_1.AnalyzerContext();
        yield analyzer.analyze(source, ctx);
        var styleguide = ctx.section.getStyleguide();
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
        var ctx = new index_1.AnalyzerContext();
        yield analyzer.analyze(source, ctx);
        var styleguide = ctx.section.getStyleguide();
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
        var ctx = new index_1.AnalyzerContext();
        yield analyzer.analyze(source, ctx);
        var styleguide = ctx.section.getStyleguide();
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
        var ctx = new index_1.AnalyzerContext();
        yield analyzer.analyze(source, ctx);
        var styleguide = ctx.section.getStyleguide();
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
        var ctx = new index_1.AnalyzerContext();
        yield analyzer.analyze(source, ctx);
        var styleguide = ctx.section.getStyleguide();
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
        var ctx = new index_1.AnalyzerContext();
        yield analyzer.analyze(source, ctx);
        var styleguide = ctx.section.getStyleguide();
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
        var ctx = new index_1.AnalyzerContext();
        yield analyzer.analyze(source, ctx);
        var styleguide = ctx.section.getStyleguide();
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
        var ctx = new index_1.AnalyzerContext();
        yield analyzer.analyze(source, ctx);
        var styleguide = ctx.section.getStyleguide();
        assert.equal(styleguide.sections.length, 0);
    }));
});
