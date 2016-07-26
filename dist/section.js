"use strict";
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
exports.Section = Section;
