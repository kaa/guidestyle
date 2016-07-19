export declare class Analyzer {
    private types;
    analyze(path: string, syntax: string): Promise<any>;
    private analyzeFile(context);
    private traverse(node, context);
    private parseSection(source);
}
