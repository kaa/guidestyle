export interface IBlock {
    type: string;
    toJSON(): Object;
}
export declare class Analyzer {
    types: {
        [prefix: string]: (name: string, content: string) => IBlock;
    };
    analyze(path: string, syntax: string): Promise<any>;
    private analyzeFile(context);
    private traverse(node, context);
    private parseSection(source);
}
