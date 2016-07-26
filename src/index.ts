import * as fs from 'mz/fs';
import * as path from 'path';
import { AnalyzerContext } from "./analyzerContext";
import { IBlock, createBlock } from "./blocks";
import { Section } from "./section";
import { AnalyzerError } from "./error";
let gonzales = require('gonzales-pe');

export class Analyzer {
  private static defaultOptions = {
    sectionPrefix: "",
  };

  private options: any;

  constructor(options: any){ 
    this.options = Object.assign({}, Analyzer.defaultOptions, options);
  }  

  async analyze(path: string, syntax: string): Promise<any> {
    var context = new AnalyzerContext(path, syntax)
    await this.analyzeFile(context);
    return context.toJSON();
  }

  private async analyzeFile(context: AnalyzerContext) {
    var buffer = await fs.readFile(context.file);
    var source = buffer.toString();
    let tree: any;
    try {
      tree = gonzales.parse(source, { syntax: context.syntax });
    } catch(err) {
      throw new AnalyzerError(err.message, path.relative(context.basePath, context.file), err.line);
    }
    await this.traverse(tree, context);
  }

  private isAcceptedSection(content) {
    return !this.options.sectionPrefix || content.substring(0, this.options.sectionPrefix.length)==this.options.sectionPrefix;
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
      return; // currently in an ignore section
    }
    switch(node.type) {
      case "multilineComment":
        if(!this.isAcceptedSection(node.content)) {
          break;
        }
        let content = node.content
          .substring((this.options.sectionPrefix||"").length)
          .replace("\r\n","\n");
        let section = this.parseSection(content)
        if(!section) {
          break;
        }
        section.file = path.relative(context.basePath, context.file);
        section.line = node.start.line;
        if(section.depth===undefined) {
          // Just add under current section, no new scope
          if(context.sections.length==0) {
            context.sections.push(section);
          } else {
            context.sections[context.sections.length-1].addSection(section);
          }
          break;
        }

        // Adjust stack to expected depth
        context.sections.splice(section.depth);
        while(section.depth > context.sections.length) {
          let t = new Section();
          t.depth = context.sections.length;
          if(context.sections.length>0) {
            context.sections[context.sections.length-1].addSection(t);
          }
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
        atxRegExp = /^\s*(#+)\W+/,
        match : RegExpExecArray;
    let paragraphs = source
      .split("\n\n")
      .map(t => t.replace(/^\s*/g,"").replace(/\s*$/g,""))
      .filter(t => t.length>0);

    let section = new Section();

    let para = paragraphs.shift();
    if(!para) return null;

    // Parse markdown (atx) style heading or plain title
    if(match = atxRegExp.exec(para)) {
      section.title = para.substring(match[0].length).trim();
      section.depth = match[1].length;
    } else {
      section.title = para.trim();
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
      section.addBlock(createBlock(type, value));
    }

    return section;
  }
}
