import { Section } from "./section";
export declare class Context {
    syntax: string;
    sections: Section[];
    variables: {
        [name: string]: string;
    };
    file: string;
    basePath: string;
    isIgnoring: Boolean;
    constructor(fileName: string, syntax?: string);
    extend(path: string, syntax?: string): Context;
    private guessSyntaxFromExtension(filename);
}
