import { CallExpression, IdentifierExpression, LiteralExpression, MemberExpression } from "../../syntax/trees/ParseTrees";
import { createArgumentList, createCallExpression, createStringLiteral } from "../ParseTreeFactory";
import { ParseTreeTransformer } from "../ParseTreeTransformer";

var get = {
    memberName: tree => tree.memberName.value,
    operand: tree => tree.operand,
    identifier: tree => tree.identifierToken.value,
    literal: tree => tree.literalToken.value
};

var equals = {
    member: function(tree, expression) {
        var bits = expression.split(".");

        if (bits.length != 2)
            throw "not supported"; // not supported yet

        var objectName = bits[0];
        var memberName = bits[1];

        return tree instanceof MemberExpression && get.memberName(tree) == memberName
            && tree.operand instanceof IdentifierExpression && get.identifier(tree.operand) == objectName;
    },
    literal: function(tree, value) {
        return tree instanceof LiteralExpression && get.literal(tree) == value;
    }
};

export class MiraiImportDeclarationTransformer extends ParseTreeTransformer {
    // import declarations need to be distinguished from module declarations,
    // however this is not possible during a generic module transformation. we
    // do some post-processing here to fix that.
    //
    //     __mirai__.require("module", moduleName, require.resolve(...))
    //     => __mirai__.require("import", moduleName, require.resolve(...))
    //
    // basically, we change the first param from "module" to "import" to mark
    // it as an import statement (instead of a module)
    //
    transformCallExpression(tree) {
        // tree:CallExpression -> args:ArgumentList -> args:Array
        var args = tree.args.args;
        var shouldTransform = 
            // check that we are calling __mirai__.require()
            equals.member(tree.operand, "__mirai__.require")

            // check that its arguments list is like this: `require("module", friendlyName, require.resolve(...))`;
            && args.length == 3
            && (equals.literal(args[0], "module") || equals.literal(args[0], "\"module\""))
            && args[1] instanceof LiteralExpression
            && args[2] instanceof CallExpression && equals.member(args[2].operand, "require.resolve");

        if (shouldTransform) {
            return createCallExpression(
                tree.operand,
                createArgumentList(createStringLiteral("import"), args[1], args[2]));    
        }

        return tree;
    }
}
