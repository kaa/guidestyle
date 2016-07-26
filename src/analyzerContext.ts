import * as path from 'path';
import { Section } from "./section";

export class AnalyzerContext {
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
    this.sections = [];
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
