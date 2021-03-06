import { Section } from "./section";
export declare class AnalyzerContext {
    syntax: string;
    sections: Section[];
    variables: {
        [name: string]: string;
    };
    file: string;
    basePath: string;
    isIgnoring: Boolean;
    constructor(fileName: string, syntax?: string);
    extend(path: string, syntax?: string): AnalyzerContext;
    private guessSyntaxFromExtension(filename);
}
