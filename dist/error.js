class AnalyzerError extends Error {
    constructor(message, fileName, line) {
        super(message);
        this.fileName = fileName;
        this.line = line;
    }
}
