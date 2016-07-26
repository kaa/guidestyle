import { AnalyzerContext } from "./analyzerContext";

export interface IBlock {
  type: string;
  toJSON(context: AnalyzerContext): Object;
}

let types: { [prefix: string]: (name: string, content: string) => IBlock } = {
  "modifiers": (name, content) => new ModifiersBlock("modifiers", content)
};

export function createBlock(type: string, content: string): IBlock {
  return types.hasOwnProperty(type) ? types[type](type, content) : new TextBlock(type, content)
}

class TextBlock implements IBlock {
  type: string;
  content: string;
  constructor(type: string, content: string) {
    this.type = type;
    this.content = content;
  }
  toJSON(context: AnalyzerContext): Object {
    return this.content;
  }
}

class KeyValueBlock implements IBlock {
  type: string;
  rows: { [name: string]: string }
  constructor(type: string, content: string) {
    this.type = type;
    this.rows = {};
    content.split("\n").map(t => t.trim()).forEach(t => {
      var m = /\S+\s+-\s/.exec(t);
      this.rows[m[0].substring(0,m[0].length-3).trim()] = t.substring(m[0].length).trim();
    });
  }
  toJSON(context: AnalyzerContext): Object {
    return this.rows;
  }
}

class ModifiersBlock extends KeyValueBlock {
  type: string;
  toJSON(context: AnalyzerContext): Object {
    var modifiers = {};
    Object.keys(this.rows).forEach((value, index) => {
      if(value[0]===".") {
        modifiers[value] = {"type": "class", "value": value.substring(1), "description": this.rows[value] };
      } else if(value[0]==="$") {
        modifiers[value] = {"type": "variable", "name": value.substring(1), "value": context.resolveVariable(value.substring(1)), "description": this.rows[value] };
      } else if(value[0]===":") {
        modifiers[value] = {"type": "pseudo", "value": value, "description": this.rows[value] };
      } else {
        modifiers[value] = {"type": "unknown", "value": value, "description": this.rows[value] };
      }
    });
    return modifiers;
  }
}
