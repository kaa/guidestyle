import { Block } from './blocks';
export declare class Section {
    private parent;
    depth: number;
    title: string;
    file: string;
    line: number;
    blocks: Block[];
    sections: Section[];
    addSection(section: Section): Section;
    getParent(): Section | null;
    stringify(): string;
}
export declare class Styleguide extends Section {
    variables: {
        [name: string]: string;
    };
    constructor();
}
