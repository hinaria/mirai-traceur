import { CallExpression, IdentifierExpression, LiteralExpression, MemberExpression } from "../../syntax/trees/ParseTrees";
import { createArgumentList, createCallExpression, createStringLiteral } from "../ParseTreeFactory";
import { ParseTreeTransformer } from "../ParseTreeTransformer";

var get = {
    memberName: tree => tree.memberName.value,
    operand: tree => tree.operand,
    identifier: tree => tree.identifierToken.value,
    literal: tree => tree.literalToken.value
};

export class MiraiImportDeclarationTransformer extends ParseTreeTransformer {
    // changes
    //
    //     __mirai__.modularize("module", moduleName, require(...))
    //
    // into
    //
    //     __mirai__.modularize("import", moduleName, require(...))
    //
    // basically, it changes the first param from "module" to "import"
    //
    transformCallExpression(tree) {
        // tree:CallExpression -> args:ArgumentList -> args:Array
        var args = tree.args.args;
        var shouldTransform = 
            // check that the function name is `__mirai__.modularize`
            tree.operand instanceof MemberExpression && get.memberName(tree.operand) == "modularize"
            && tree.operand.operand instanceof IdentifierExpression && get.identifier(tree.operand.operand) == "__mirai__"

            // check that its arguments list is like this: `modularize("module", moduleName, require(...))`;
            && args.length == 3
            && args[0] instanceof LiteralExpression && (get.literal(args[0]) == "module" || get.literal(args[0]) == "\"module\"")
            && args[1] instanceof LiteralExpression
            && args[2] instanceof CallExpression;
        
        if (shouldTransform) {
            return createCallExpression(
                tree.operand,
                createArgumentList(createStringLiteral("import"), args[1], args[2]));    
        }

        return tree;
    }
}
