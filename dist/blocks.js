"use strict";
let types = {
    "modifiers": (name, content) => new ModifiersBlock("modifiers", content)
};
function createBlock(type, content) {
    return types.hasOwnProperty(type) ? types[type](type, content) : new TextBlock(type, content);
}
exports.createBlock = createBlock;
class TextBlock {
    constructor(type, content) {
        this.type = type;
        this.content = content;
    }
    toJSON(context) {
        return this.content;
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
        return this.rows;
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
        return modifiers;
    }
}
