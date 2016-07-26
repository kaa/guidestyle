export declare class Analyzer {
    private static defaultOptions;
    private options;
    constructor(options: any);
    analyze(path: string, syntax: string): Promise<any>;
    private analyzeFile(context);
    private isAcceptedSection(content);
    private traverse(node, context);
    private parseSection(source);
}
