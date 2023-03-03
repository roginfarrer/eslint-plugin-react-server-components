import type { Rule } from "eslint";
import type {
  Expression,
  ExpressionStatement,
  Identifier,
  Node,
  Program,
  SpreadElement,
  Super,
} from "estree";

const hookRegex = /^use[A-Z]/;
const useClientRegex = /^('|")use client('|")/;

const meta: Rule.RuleModule["meta"] = {
  docs: {
    description:
      "Enforce components are appropriately labeled with 'use client'.",
    recommended: true,
  },
  type: "problem",
  hasSuggestions: true,
};

type RealNode = Node & Rule.NodeParentExtension;

function findParentProgram(node: RealNode): Program {
  const parent = node.parent;
  if (parent.type === "Program") {
    return parent;
  }
  return findParentProgram(parent);
}

const create: Rule.RuleModule["create"] = (context) => {
  let hasReported = false;
  const instances = [];
  let hasDirective = false;
  const sourceCode = context.getSourceCode();
  const firstLine = sourceCode.lines.filter(Boolean)[0].trim();

  if (useClientRegex.test(firstLine)) {
    hasDirective = true;
  }

  function reportMissingDirective(
    node: Node & Rule.NodeParentExtension,
    expression: Identifier | Expression | Super
  ) {
    hasReported = true;
    context.report({
      node: expression,
      message:
        "Using hooks requires that this file have the 'use client' directive at the top of the file.",
      // suggest: [
      //   {
      //     desc: "add use client at the top of the document",
      //     fix(fixer) {
      //       const p = findParentProgram(node.parent);
      //       const firstToken = sourceCode.getFirstToken(p.body[0]);
      //       return fixer.insertTextBefore(firstToken!, `'use client';\n\n`);
      //     },
      //   },
      // ],
      *fix(fixer) {
        const p = findParentProgram(node.parent);
        const firstToken = sourceCode.getFirstToken(p.body[0]);
        yield fixer.insertTextBefore(firstToken!, `'use client';\n`);
      },
    });
  }

  return {
    VariableDeclaration(node) {
      const declarator = node.declarations[0];
      if (declarator.init && declarator.init.type === "CallExpression") {
        const expression = declarator.init;
        const name = "name" in expression.callee ? expression.callee.name : "";
        if (hookRegex.test(name)) {
          instances.push(name);
          if (hasDirective || hasReported) {
            return;
          }
          reportMissingDirective(node, expression.callee);
        }
      }
    },
    ExpressionStatement(node) {
      const expression = node.expression as Expression & {
        callee?: Identifier;
        arguments?: Array<Expression | SpreadElement>;
      };
      if (!expression.callee) {
        return;
      }

      if (expression.callee && hookRegex.test(expression.callee.name)) {
        instances.push(expression.callee.name);
        if (hasDirective || hasReported) {
          return;
        }
        reportMissingDirective(node, expression.callee);
      }
    },

    "ExpressionStatement:exit"(
      node: ExpressionStatement & Rule.NodeParentExtension
    ) {
      const value = "value" in node.expression ? node.expression.value : "";
      if (typeof value !== "string" || !useClientRegex.test(value)) {
        return;
      }
      if (instances.length === 0 && hasDirective) {
        context.report({
          node,
          message:
            "This file is not using hooks, therefore it should not have the 'use client' directive.",
          fix(fixer) {
            return fixer.remove(node);
          },
          // suggest: [
          //   {
          //     desc: "remove use client at the top of the document",
          //     fix(fixer) {
          //       return fixer.remove(node);
          //     },
          //   },
          // ],
        });
      }
    },
  };
};

export const ClientComponents = { meta, create };
