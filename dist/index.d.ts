import { Section, Styleguide } from "./section";
export interface AnalyzerOptions {
    /**
     * Require a special prefix to identify styleguide sections, the default is none.
     */
    sectionPrefix?: string;
    /**
     * A function that is used to resolve @import directives, the default resolver
     * gets imported files from the file system.
     */
    resolver?: (path: string) => Promise<string>;
}
export declare class Analyzer {
    private static defaultOptions;
    private options;
    constructor(options?: AnalyzerOptions);
    /**
     * Generate styleguide from a file
     *
     * @param path - Path to source file
     */
    analyzePath(path: string, syntax?: string | null): Promise<Styleguide>;
    /**
     * Generate styleguide from a string.
     *
     * @param source - Source code to analyze
     * @param syntax - The syntax of the supplied source code, defaults to 'css'
     */
    analyzeString(source: string, syntax?: string): Promise<Styleguide>;
    /**
     * Generate styleguide by analyzing a string
     */
    private analyze(source, context);
    /**
     * Traverse node and children and look for sections, variable
     * declarations and @import rules
     *
     * @param node - The current node to explore
     * @param context - The current state of analysis
    */
    private traverse(node, context);
    /** Parse a variable declaration */
    private parseDeclaration(node, context);
    /** Parse an import rule */
    private parseAtRule(node, context);
    /** Parse multiline comments to styleguide sections */
    private parseMultilineComment(node, context);
    /** Attempt to guess syntax of file from its extension */
    private guessSyntaxFromExtension(filename);
    private resolvePath(path);
}
export declare class AnalyzerContext {
    isIgnoring: Boolean;
    section: Section;
    styleguide: Styleguide;
    path: string;
    syntax: string;
    constructor(syntax?: string);
}
