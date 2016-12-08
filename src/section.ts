import { Block } from './blocks';

export class Section {
  private parent: Section|null
  depth: number = 0
  title: string
  file: string
  line: number
  blocks: Block[] = []
  sections: Section[] = []

  public addSection(section: Section): Section {
    this.sections.push(section);
    section.parent = this;
    return section;
  }
  public getParent(): Section|null {
    return this.parent ? this.parent : null;
  }
  public stringify(): string {
    return JSON.stringify(this, (key,value) => key === "parent" ? undefined : value);
  }
}

export class Styleguide extends Section {
  variables: {[name:string]: string} = {};
  constructor(){
    super();
  }
}