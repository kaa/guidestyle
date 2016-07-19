"use strict";

import * as fs from 'mz/fs';
import * as util from 'util';
import * as path from 'path';
let gonzales = require('gonzales-pe');

class Section {
  depth: number;
  title: string;
  body: string;
  file: string;
  line: number;
  blocks: IBlock[];
  sections: Section[];

  addBlock(block: IBlock) {
    if(!this.blocks){
      this.blocks = [];
    }
    this.blocks.push(block);
  }
  addSection(section: Section) {
    if(!this.sections){
      this.sections = [];
    }
    this.sections.push(section);
  }
  toJSON(): Object {
    return {
      file: this.file,
      line: this.line,
      title: this.title,
      body: this.body,
      blocks: this.blocks 
        ? this.blocks.map(t => t.toJSON())
        : null,
      sections: this.sections 
        ? this.sections.map(t => t.toJSON())
        : null,
    }
  }
}

export interface IBlock {
  type: string;
  toJSON(): Object;
}
class TextBlock implements IBlock {
  type: string;
  content: string;
  constructor(type: string, content: string) {
    this.type = type;
    this.content = content;
  }
  toJSON(): Object {
    return {
      type: this.type,
      content: this.content
    }
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
  toJSON(): Object {
    return {
      type: this.type,
      rows: this.rows
    }
  }
}

class ModifiersBlock extends KeyValueBlock {
  type: string;
  toJSON(): Object {
    var modifiers = {};
    Object.keys(this.rows).forEach((value, index) => {
      if(index[0]==".") {
        modifiers[index] = {"type": "class", "value": value.substring(1), "description": this.rows[value] };
      } else if(index[0]=="%") {
        modifiers[index] = {"type": "variable", "value": "UNKNOWN", "description": this.rows[value] };
      } else if(index[0]==":") {
        modifiers[index] = {"type": "pseudo", "value": value, "description": this.rows[value] };
      }
    });
    return {
      type: this.type,
      modifiers: modifiers
    }
  }
}

class AnalyzerContext {
  syntax: string;
  sections: Section[];
  variables: {[name: string]: string};
  file: string;

  constructor(path: string, syntax?: string) {
    this.file = path;
    this.syntax = syntax || this.guessSyntaxFromExtension(path);
    this.sections = [new Section()];
    this.variables = {};
  }

  extend(path: string, syntax?: string): AnalyzerContext {
    let t = new AnalyzerContext(path, syntax);
    t.sections = this.sections;
    t.variables = this.variables;
    return t;
  }

  toJSON(): Object {
    return {
      variables: this.variables,
      styleguide: this.sections[0].toJSON()
    }
  }

  private guessSyntaxFromExtension(filename: string) {
    switch(path.extname(filename)) {
      case ".scss":
        return "scss";
      case ".less":
        return "less";
      default:
        return "css";
    }
  }
}
export class Analyzer {

  types: { [prefix: string]: (name: string, content: string) => IBlock } = {
    "modifiers": (name, content) => new ModifiersBlock("modifiers", content)
  };

  async analyze(path: string, syntax: string): Promise<any> {
    var context = new AnalyzerContext(path, syntax)
    await this.analyzeFile(context);
    return context.toJSON();
  }

  private async analyzeFile(context: AnalyzerContext) {
    var buffer = await fs.readFile(context.file);
    var source = buffer.toString();
    var tree = gonzales.parse(source, { syntax: context.syntax });
    await this.traverse(tree, context);
  }

  private async traverse(node: any, context: AnalyzerContext) {
    switch(node.type) {
      case "multilineComment":
        let section = this.parseSection(node.content)
        section.file = context.file;
        section.line = node.start.line;
        if(!section) {
          console.log("Bad section?");
          break;
        }
        if(section.depth===undefined) {
          // Just add under current section, no new scope
          context.sections[context.sections.length-1].addSection(section);
          break;
        }

        // Adjust stack to expected depth
        context.sections = context.sections.slice(0,section.depth);
        while(section.depth > context.sections.length) {
          let t = new Section();
          t.line = section.line;
          t.file = section.file;
          t.depth = context.sections.length;
          context.sections[context.sections.length-1].addSection(t);
          context.sections.push(t);
        }
        context.sections[context.sections.length-1].addSection(section);
        context.sections.push(section);
        break;

      case "atrule":
        let keyword = node.first("atkeyword");
        if(!keyword) {
          break;
        }
        let atident = keyword.first("ident");
        if(!atident || atident.content!=="import") break;
        let file = node.first("string");
        if(!file) break;
        let rawPath = file.content.replace(/^[\s"]*|[\s"]*$/g, "");
        let resolvedPath: string;
        if(context.syntax==="scss") {
          resolvedPath = path.join(path.dirname(context.file),"_"+rawPath+".scss");
        } else {
          resolvedPath = path.join(path.dirname(context.file),rawPath);
        }
        await this.analyzeFile(context.extend(resolvedPath));
        break;

      case "declaration":
        let property = node.first("property");
        if(!property) break;
        let variable = property.first("variable")
        if(!variable) break;
        let name = variable.first("ident");
        if(!name) break;
        var value = node.first("value");
        if(!value) break;
        context.variables[name] = value.toString();
        break;
        
      default:
        if(node.content instanceof Array) {
          for(let i=0; i<node.content.length; i++) {
            await this.traverse(node.content[i], context);
          }
        }
        break;
    }
  }

  private parseSection(source: string) : Section {
    let blockRegExp = /^\s*(\w+):/,
        setextRegExp = /^\s*(=+|-+)/,
        atxRegExp = /^\s*(#+)\W+/,
        match : RegExpExecArray;
    let paragraphs = source
      .split("\n\n")
      .map(t => t.replace(/^\s*|\s*$/g,""))
      .filter(t => t.length>0);

    let section = new Section();

    let para = paragraphs.shift();
    if(!para) return null;

    // Parse atx style heading or plain title
    if(match = atxRegExp.exec(para)) {
      section.title = para.substring(match[0].length).trim();
      section.depth = match[1].length;
    } else {
      section.title = para.trim();
    }

    // Test for setext style heading (=== or ---)
    para = paragraphs.shift();
    if(match = setextRegExp.exec(para)) {
      section.depth = match[1][0]=="=" ? 1 : 2;
      para = paragraphs.shift();
    }

    // Read description
    while(para) {
      if(blockRegExp.test(para)) break;
      section.body = ((section.body||"") + "\n\n" + para).trim();
      para = paragraphs.shift();
    } 
  
    // Read blocks
    while(para) {
      let match = blockRegExp.exec(para),
          type = match[1].trim().toLowerCase(),
          value = para.substring(match[0].length).trim();
      while(para = paragraphs.shift()) {
        if(blockRegExp.test(para)) break;
        value += "\n\n"+para;
      } 
      var factory = this.types[type];
      section.addBlock(factory ? factory(type, value) : new TextBlock(type, value));
    }

    return section;
  }
}
