
let blockFactories: { [prefix: string]: (name: string, content: string) => Block } = {
  "modifiers": (name, content) => new ModifiersBlock("modifiers", content)
};

export function createBlock(type: string|null, content: string): Block {
  return type && blockFactories.hasOwnProperty(type) 
    ? blockFactories[type](type, content) 
    : new TextBlock(type || "text", content)
}

export class Block {
  constructor(type: string) {
    this.type = type;
  }
  type: string;
}

export class TextBlock extends Block {
  type: string;
  content: string;
  constructor(type: string, content: string) {
    super(type);
    this.content = content;
  }
}

export class KeyValueBlock extends Block {
  type: string;
  constructor(type: string, content: string) {
    super(type);
    content.split("\n").map(t => t.trim()).forEach(t => {
      var m = /\S+\s+-\s/.exec(t);
      if(!m) return;
      this.accept(m[0].substring(0,m[0].length-3).trim(), t.substring(m[0].length).trim());
    });
  }
  accept(key: string, value: string) {}
}

export class ModifiersBlock extends KeyValueBlock {
  type: string;
  modifiers: { [name: string]: { type: string, name: string, description: string } }
  constructor(type: string, content: string) {
    super(type, content);
  }

  accept(key: string, value: string) {
    this.modifiers = this.modifiers || {};
    if(key[0]===".") {
      this.modifiers[key] = { type: "class", name: key.substring(1), description: value };
    } else if(key[0]==="$") {
      this.modifiers[key] = { type: "variable", name: key.substring(1), description: value };
    } else if(key[0]===":") {
      this.modifiers[key] = { type: "pseudo", name: key, description: value };
    } else {
      this.modifiers[key] = { type: "unknown", name: key, description: value };
    }
  }
}
