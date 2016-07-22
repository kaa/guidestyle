export declare class Analyzer {
    private types;
    private options;
    private ignore;
    constructor(options: any);
    analyze(path: string, syntax: string): Promise<any>;
    private analyzeFile(context);
    private traverse(node, context);
    private parseSection(source);
}
