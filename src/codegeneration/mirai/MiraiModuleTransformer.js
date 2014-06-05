// heavily adapted from `CommonJsModuleTransformer`

import { GET_ACCESSOR, OBJECT_LITERAL_EXPRESSION, PROPERTY_NAME_ASSIGNMENT, RETURN_STATEMENT } from "../../syntax/trees/ParseTreeType";

import globalThis from "../globalThis";
import scopeContainsThis from "../scopeContainsThis";
import { assert } from "../../util/assert";
import { createEmptyParameterList, createFunctionExpression, createObjectLiteralExpression, createPropertyNameAssignment } from "../ParseTreeFactory";
import { ModuleTransformer } from "../ModuleTransformer";
import { parseExpression, parsePropertyDefinition, parseStatement, parseStatements } from "../PlaceholderParser";
import { prependStatements } from "../PrependStatements";

import { MiraiImportDeclarationTransformer } from "./MiraiImportDeclarationTransformer";

export class MiraiModuleTransformer extends ModuleTransformer {
    wrapModule(statements) {
        if (statements.some(scopeContainsThis)) {
            var context = globalThis();
            return parseStatements `module.exports = function() { ${statements} }.call(${context});`;
        }

        var lastStatement = statements[statements.length - 1];
        statements = statements.slice(0, -1);

        assert(lastStatement.type === RETURN_STATEMENT);

        // If the module doesn't use any export statements, nor global "this",
        // it might be because it wants to make its own changes to "exports"
        // or "module.exports", so we don't append "module.exports = {}" to
        // the output.
        if (this.hasExports()) {
            var exportObject = lastStatement.expression;
            var descriptors = this.transformObjectLiteralToDescriptors(exportObject);
            var exportStatement = parseStatement `Object.defineProperties(exports, ${descriptors});`;
            return prependStatements(statements, exportStatement);
        }

        return statements;
    }

    transformObjectLiteralToDescriptors(tree) {
        assert(tree.type === OBJECT_LITERAL_EXPRESSION);

        var properties = tree.propertyNameAndValues.map(function(expression) {
            var assign = descriptor => createPropertyNameAssignment(expression.name, descriptor);

            switch (expression.type) {
                case GET_ACCESSOR:
                    var getterFunction = createFunctionExpression(createEmptyParameterList(), expression.body);
                    return assign(parseExpression `{ get: ${getterFunction} }`);
                case PROPERTY_NAME_ASSIGNMENT:
                    return assign(parseExpression `{ value: ${expression.value} }`);
                default:
                    throw new Error(`Unexpected property type ${expression.type}`);
            }
        });

        return createObjectLiteralExpression(properties);
    }

    transformModuleSpecifier(tree) {
        return parseExpression `__mirai__.require("module", ${tree.token}, require.resolve(${tree.token}))`;
    }

    getExportProperties() {
        var properties = super();

        if (this.exportVisitor_.hasExports())
            properties.push(parsePropertyDefinition `__mirai__: { type: "transpiled" }`);
        return properties;
    }

    // There's no easy way to specify the parent of some arbitrary tree node
    // (to tell `transformAny` whether a module specifier is a child of an
    // `import` or `module` statement), so we must transform import
    // declarations later.
    //
    // module foo from 'bar' -> __mirai__.require("module", "bar", require.resolve(...))
    // import foo from 'bar' -> __mirai__.require("import", "bar", require.resolve(...))
    //
    transformImportDeclaration(...args) {
        var statement = super(...args);
        var transformer = new MiraiImportDeclarationTransformer();
        return transformer.transformAny(statement);
    }
}