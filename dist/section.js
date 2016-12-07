"use strict";
class Section {
    constructor() {
        this.depth = 0;
        this.blocks = [];
        this.sections = [];
    }
    addSection(section) {
        this.sections.push(section);
        section.parent = this;
        return section;
    }
    getStyleguide() {
        if (!this.parent) {
            throw Error("Section is not rooted in a styleguide");
        }
        return this.parent.getStyleguide();
    }
    getParent() {
        return this.parent ? this.parent : null;
    }
    stringify() {
        return JSON.stringify(this, (key, value) => key === "parent" ? undefined : value);
    }
}
exports.Section = Section;
class Styleguide extends Section {
    constructor() {
        super();
        this.variables = {};
    }
    getStyleguide() {
        return this;
    }
}
exports.Styleguide = Styleguide;
