"use strict";

import * as minimatch from 'minimatch';
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
  toJSON(context: AnalyzerContext): Object {
    var blocks = {};
    if(this.blocks) {
      this.blocks.forEach(block => {
        var json = block.toJSON(context);
        if(blocks[block.type]===undefined) {
          blocks[block.type] = json;
        } else if(blocks[block.type] instanceof Array) {
          blocks[block.type].push(json);
        } else {
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
    }
  }
}

interface IBlock {
  type: string;
  toJSON(context: AnalyzerContext): Object;
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

class AnalyzerContext {
  syntax: string;
  sections: Section[];
  variables: {[name: string]: string};
  file: string;
  basePath: string;
  isIgnoring: Boolean;

  constructor(fileName: string, syntax?: string) {
    this.file = fileName;
    this.basePath = path.dirname(fileName);
    this.syntax = syntax || this.guessSyntaxFromExtension(fileName);
    this.sections = [new Section()];
    this.variables = {};
  }

  extend(path: string, syntax?: string): AnalyzerContext {
    let t = new AnalyzerContext(path, syntax);
    t.basePath = this.basePath;
    t.sections = this.sections;
    t.variables = this.variables;
    return t;
  }

  resolveVariable(name: string): string {
    return this.variables[name];
  }

  toJSON(): Object {
    return {
      variables: this.variables,
      styleguide: this.sections[0].toJSON(this)
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
  private static defaultOptions = {
    ignore: "",
    sectionPrefix: "",
  };

  private types: { [prefix: string]: (name: string, content: string) => IBlock } = {
    "modifiers": (name, content) => new ModifiersBlock("modifiers", content)
  };

  private options: any;
  private ignore: minimatch.Minimatch;

  constructor(options: any){ 
    this.options = Object.assign({}, Analyzer.defaultOptions, options);
    this.ignore = new minimatch.Minimatch(this.options.ignore || "");
  }  

  async analyze(path: string, syntax: string): Promise<any> {
    var context = new AnalyzerContext(path, syntax)
    await this.analyzeFile(context);
    return context.toJSON();
  }

  private async analyzeFile(context: AnalyzerContext) {
    let relativePath = path.relative(context.basePath, context.file);
    if(this.ignore.match(relativePath)) {
      return; // Ignored in options
    }
    var buffer = await fs.readFile(context.file);
    var source = buffer.toString();
    var tree = gonzales.parse(source, { syntax: context.syntax });
    await this.traverse(tree, context);
  }

  private isAcceptedSection(content) {
    return !this.options.sectionPrefix || content.substring(0, this.options.sectionPrefix.length)!=this.options.sectionPrefix;
  }

  private async traverse(node: any, context: AnalyzerContext) {
    if(node.type==="singlelineComment") {
      if(node.content.trim()=="BEGIN IGNORE") {
        context.isIgnoring = true;
      } else if(node.content.trim()=="END IGNORE") {
        context.isIgnoring = false;
      }
    }
    if(context.isIgnoring) {
      return;
    }
    switch(node.type) {
      case "multilineComment":
        if(!this.isAcceptedSection(node.content)) {
          break;
        }
        let section = this.parseSection(node.content)
        if(!section) {
          console.log("Bad section?");
          break;
        }
        section.file = path.relative(context.basePath, context.file);
        section.line = node.start.line;
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
        let basepath = path.dirname(context.file),
            rawPath = file.content.replace(/^[\s"]*|[\s"]*$/g, ""),
            dirname = path.dirname(rawPath),
            basename = path.basename(rawPath).replace(/^_/,"").replace(/.scss$/,"");
        let resolvedPath = context.syntax==="scss"
          ? path.join(basepath, dirname, "_" + basename + ".scss")
          : path.join(path.dirname(context.file),rawPath);
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
      .map(t => t.replace(/^\s*/m,"").replace(/\s*$/g,""))
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
