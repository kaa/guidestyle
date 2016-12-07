"use strict";
let blockFactories = {
    "modifiers": (name, content) => new ModifiersBlock("modifiers", content)
};
function createBlock(type, content) {
    return type && blockFactories.hasOwnProperty(type)
        ? blockFactories[type](type, content)
        : new TextBlock(type || "text", content);
}
exports.createBlock = createBlock;
class Block {
    constructor(type) {
        this.type = type;
    }
}
exports.Block = Block;
class TextBlock extends Block {
    constructor(type, content) {
        super(type);
        this.content = content;
    }
}
exports.TextBlock = TextBlock;
class KeyValueBlock extends Block {
    constructor(type, content) {
        super(type);
        content.split("\n").map(t => t.trim()).forEach(t => {
            var m = /\S+\s+-\s/.exec(t);
            if (!m)
                return;
            this.accept(m[0].substring(0, m[0].length - 3).trim(), t.substring(m[0].length).trim());
        });
    }
    accept(key, value) { }
}
exports.KeyValueBlock = KeyValueBlock;
class ModifiersBlock extends KeyValueBlock {
    constructor(type, content) {
        super(type, content);
    }
    accept(key, value) {
        this.modifiers = this.modifiers || {};
        if (key[0] === ".") {
            this.modifiers[key] = { type: "class", name: key.substring(1), description: value };
        }
        else if (key[0] === "$") {
            this.modifiers[key] = { type: "variable", name: key.substring(1), description: value };
        }
        else if (key[0] === ":") {
            this.modifiers[key] = { type: "pseudo", name: key, description: value };
        }
        else {
            this.modifiers[key] = { type: "unknown", name: key, description: value };
        }
    }
}
exports.ModifiersBlock = ModifiersBlock;
