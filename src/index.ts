import * as fs from 'mz/fs';
import * as path from 'path';
import { Block, createBlock } from "./blocks";
import { Section, Styleguide } from "./section";
import { AnalyzerError } from "./error";
let gonzales = require('gonzales-pe');

export interface AnalyzerOptions {
    /**
     * Require a special prefix to identify styleguide sections, the default is none.
     */
    sectionPrefix?: string;

    /**
     * A function that is used to resolve @import directives, the default resolver
     * gets imported files from the file system.
     */
    resolver?: (path: string) => Promise<string>
}

export class Analyzer {
  private static defaultOptions: AnalyzerOptions = {
    sectionPrefix: ""
  };

  private options: AnalyzerOptions;

  constructor(options?: AnalyzerOptions) {
    this.options = Object.assign({}, Analyzer.defaultOptions, options);
  }  

  /**
   * Generate styleguide from a file
   * 
   * @param path - Path to source file
   * @param syntax - Syntax of source file, default is determined from extension
   */
  async analyzePath(path: string, syntax: string|null = null): Promise<Styleguide> {
    let context = new AnalyzerContext();
    context.path = path;
    context.syntax = syntax || this.guessSyntaxFromExtension(path);
    var source = await this.resolvePath(path);
    await this.analyze(source, context);
    return context.styleguide;
  }

  /**
   * Generate styleguide from a string.
   * 
   * @param source - Source code to analyze
   * @param syntax - The syntax of the supplied source code, defaults to 'css'
   */
  async analyzeString(source: string, syntax: string = "css"): Promise<Styleguide> {
    let context = new AnalyzerContext(syntax);
    context.path = "";
    await this.analyze(source, context);
    return context.styleguide;
  }

  /**
   * Generate styleguide by analyzing a string
   */
  private async analyze(source: string, context: AnalyzerContext): Promise<void> {
    try {
      let node = gonzales.parse(source, { syntax: context.syntax });
      await this.traverse(node, context);
    } catch(err) {
      throw new AnalyzerError(err.message, path, err.line);
    }
  }

  /** 
   * Traverse node and children and look for sections, variable 
   * declarations and @import rules
   * 
   * @param node - The current node to explore
   * @param context - The current state of analysis
  */
  private async traverse(node: any, context: AnalyzerContext): Promise<void> {
    if(node.type==="singlelineComment" || node.type==="multilineComment") {
      if(node.content.trim()=="BEGIN IGNORE") {
        context.isIgnoring = true;
        return;
      } else if(node.content.trim()=="END IGNORE") {
        context.isIgnoring = false;
        return;
      }
    }
    if(context.isIgnoring) {
      return; // currently in an ignore section
    }
    if(node.type=="declaration")
      return this.parseDeclaration(node, context);
    else if(node.type=="multilineComment")
      return this.parseMultilineComment(node, context);
    else if(node.type=="atrule") {
      return await this.parseAtRule(node, context);
    } else if(node.content instanceof Array) {
      for(let i=0; i<node.content.length; i++) {
        await this.traverse(node.content[i], context);
      }
    }
  }

  /** Parse a variable declaration */
  private parseDeclaration(node: any, context: AnalyzerContext): void {
    let property = node.first("property");
    if(!property) return;
    let variable = property.first("variable")
    if(!variable) return;
    let name = variable.first("ident");
    if(!name) return;
    var value = node.first("value");
    if(!value) return;
    context.styleguide.variables[name] = value.toString();
  }

  /** Parse an import rule */
  private async parseAtRule(node: any, context: AnalyzerContext): Promise<void> {
    let keyword = node.first("atkeyword");
    if(!keyword) return;
    let ident = keyword.first("ident");
    if(!ident || ident.content!=="import") return;
    let file = node.first("string");
    if(!file) return;

    let importPath = file.content.replace(/^[\s"]*|[\s"]*$/g, "");

    if(context.syntax==="scss") {
      let dirname = path.dirname(importPath),
          strippedPath = path.basename(importPath).replace(/^_/,"").replace(/.scss$/,""); 
      importPath = path.join(dirname, "_" + strippedPath + ".scss");
    }
    importPath = path.join(path.dirname(context.path || ""), importPath);

    var source = await this.resolvePath(importPath),
        currentPath = context.path,
        currentSyntax = context.syntax;
    context.path = importPath;
    context.syntax = this.guessSyntaxFromExtension(importPath);
    await this.analyze(source, context);
    context.path = currentPath;
    context.syntax = currentSyntax;
  }

  /** Parse multiline comments to styleguide sections */
  private parseMultilineComment(node: any, context: AnalyzerContext): void {
    var prefix = this.options.sectionPrefix;
    if(prefix && node.content.substring(0, prefix.length)!=prefix) {
      return;
    }

    let paragraphs = node.content
      .substring((this.options.sectionPrefix||"").length)
      .replace(/\r\n/g,"\n")
      .split("\n\n")
      .map(t => t.replace(/^\s*/g,"").replace(/\s*$/g,""))
      .filter(t => t.length>0);

    let para = paragraphs.shift();
    if(!para) return;

    let blockRegExp = /^\s*(\w+):/,
        atxRegExp = /^\s*(#*)\W/;

    let section: Section,
        titleMatch = atxRegExp.exec(para),
        depth = titleMatch ? titleMatch[1].length : undefined;
    if(!depth && context.section instanceof Styleguide) {
      section = context.section;
      section.blocks.push(createBlock(null, para));
    } else {
      section = new Section();
      section.title = para.substring(titleMatch ? titleMatch[0].length : 0).trim();
      section.depth = depth || context.section.depth + 1;
      section.file = context.path;
      section.line = node.start.line;
      if(depth) {
        while(depth <= context.section.depth) {
          let parent = context.section.getParent();
          if(!parent) throw new Error("Section of depth "+context.section.depth+" does not have a parent.");
          context.section = parent;
        }
        while(depth > context.section.depth + 1) {
          let s = new Section();
          s.depth = context.section.depth + 1;
          context.section = context.section.addSection(s);
        }
        context.section = context.section.addSection(section);
      } else {
        context.section.addSection(section);
      }
    }
      
    // Read blocks
    para = paragraphs.shift();
    while(para) {
      let match = blockRegExp.exec(para);
      if(match) {
        let type = match[1].trim().toLowerCase(),
            value = para
              .substring(match[0].length)
              .replace(/\n\s*/g, "\n")
              .trim();
        section.blocks.push(createBlock(type, value));
      } else {
        section.blocks.push(createBlock(null, para));
      }
      para = paragraphs.shift();
    }
  }

  /** Attempt to guess syntax of file from its extension */
  private guessSyntaxFromExtension(filename: string): string {
      switch (path.extname(filename)) {
          case ".scss":
              return "scss";
          case ".less":
              return "less";
          default:
              return "css";
      }
  }

  private async resolvePath(path: string): Promise<string> {
    if(this.options.resolver)
      return this.options.resolver(path);
    var buffer = await fs.readFile(path);
    return buffer.toString();
  }
}

export class AnalyzerContext {
  isIgnoring: Boolean
  section: Section
  styleguide: Styleguide
  path: string
  syntax: string

  constructor(syntax: string = "scss") {
    this.syntax = syntax;
    this.section = this.styleguide = new Styleguide();
  }
}