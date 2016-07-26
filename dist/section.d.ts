import { IBlock } from './blocks';
import { AnalyzerContext } from "./analyzerContext";
export declare class Section {
    depth: number;
    title: string;
    body: string;
    file: string;
    line: number;
    blocks: IBlock[];
    sections: Section[];
    addBlock(block: IBlock): void;
    addSection(section: Section): void;
    toJSON(context: AnalyzerContext): Object;
}
