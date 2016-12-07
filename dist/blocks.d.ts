export declare function createBlock(type: string | null, content: string): Block;
export declare class Block {
    constructor(type: string);
    type: string;
}
export declare class TextBlock extends Block {
    type: string;
    content: string;
    constructor(type: string, content: string);
}
export declare class KeyValueBlock extends Block {
    type: string;
    constructor(type: string, content: string);
    accept(key: string, value: string): void;
}
export declare class ModifiersBlock extends KeyValueBlock {
    type: string;
    modifiers: {
        [name: string]: {
            type: string;
            name: string;
            description: string;
        };
    };
    constructor(type: string, content: string);
    accept(key: string, value: string): void;
}
