require("./bin/traceur");

traceur.options.reset();
traceur.options.experimental = true;
traceur.options.modules = "mirai";

var compile = function(content, filename) {
    var sourceFile = new traceur.syntax.SourceFile(filename, content);
    var parser = new traceur.syntax.Parser(sourceFile);
    var tree = parser.parseModule();
    var reporter = new traceur.util.ErrorReporter();
    var transformer = new traceur.codegeneration.FromOptionsTransformer(reporter);
    var transformedTree = transformer.transform(tree);

    if (reporter.hadError()) {
        var errors = reporter.errors.map(function(error) { return "    " + error; }).join("\n");
        throw "traceur compilation failed: \n" + errors;
    }
    return traceur.outputgeneration.TreeWriter.write(transformedTree);
};

var code = ''
    + 'import foxy from "foxy";\n'
    + 'import { princess, queen } from "leaders";\n'
    + 'import { dragon, spirit as maaya, wyvern as karin } from "creatures";\n'
    + 'module factory from "factory";\n'
    + 'export default 1;\n'
    + 'export var cute_foxies = true;';
    
console.log(compile(code));