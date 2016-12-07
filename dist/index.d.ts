import { Section } from "./section";
export interface AnalyzerOptions {
    sectionPrefix?: string;
    resolver?: (path: string) => Promise<string>;
}
export declare class Analyzer {
    private static defaultOptions;
    private options;
    constructor(options?: AnalyzerOptions);
    defaultResolver(path: any): Promise<string>;
    analyze(source: string, context: AnalyzerContext): Promise<void>;
    /**
     * Traverse nodes
     * @param node - The current node to traverse
     * @param context - The current state of analysis
    */
    private traverse(node, context);
    /** Parse a variable declaration */
    parseDeclaration(node: any, context: AnalyzerContext): void;
    /** Parse an import rule */
    parseAtRule(node: any, context: AnalyzerContext): Promise<void>;
    parseMultilineComment(node: any, context: AnalyzerContext): void;
    private guessSyntaxFromExtension(filename);
}
export declare class AnalyzerContext {
    isIgnoring: Boolean;
    section: Section;
    basePath: string;
    path: string;
    syntax: string;
    constructor(syntax?: string);
}
