export class AnalyzerError extends Error {
  fileName: string;
  line: number;
  constructor(message, fileName, line) {
    super(message);
    this.fileName = fileName;
    this.line = line;
  }
}