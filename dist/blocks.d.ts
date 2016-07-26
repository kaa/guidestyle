import { AnalyzerContext } from "./analyzerContext";
export interface IBlock {
    type: string;
    toJSON(context: AnalyzerContext): Object;
}
export declare function createBlock(type: string, content: string): IBlock;
