import type { Rule } from "eslint";
import type {
  Expression,
  Identifier,
  Node,
  Program,
  SpreadElement,
} from "estree";

const meta: Rule.RuleModule["meta"] = {
  docs: {
    description:
      "Enforce components are appropriately labeled with 'use client'.",
    recommended: true,
  },
  type: "problem",
  hasSuggestions: true,
};

function findParentProgram(
  node: Node & Rule.NodeParentExtension
): Node & Rule.NodeParentExtension {
  const parent = node.parent;
  if (node.parent.type === "Program") {
    return parent;
  }
  return findParentProgram(parent);
}

const create: Rule.RuleModule["create"] = (context) => {
  let hasInstance = false;
  const instances: string[] = [];
  let hasDirective = false;
  const sourceCode = context.getSourceCode();
  const firstLine = sourceCode.lines.filter(Boolean)[0].trim();
  if (/('|")use client('|")/.test(firstLine)) {
    hasDirective = true;
  }

  return {
    VariableDeclaration(node) {
      const declarator = node.declarations[0];
      if (declarator.init && declarator.init.type === "CallExpression") {
        const expression = declarator.init;
        if (expression.callee.name === "useState") {
          hasInstance = true;
          instances.push("useState");
          if (hasDirective) {
            return;
          }
          context.report({
            node: expression.callee,
            message: "write `use client`",
            suggest: [
              {
                desc: "add use client at the top of the document",
                fix(fixer) {
                  const p = findParentProgram(node.parent);
                  return fixer.insertTextBefore(p, "'use client';");
                },
              },
            ],
            // *fix(fixer) {
            //   const p = findParentProgram(node.parent);
            //   yield [fixer.insertTextBefore(p, "'use client';")];
            // },
          });
        }
      }
    },
    ExpressionStatement(node) {
      const expression = node.expression as Expression & {
        callee?: Identifier;
        arguments?: Array<Expression | SpreadElement>;
      };
      if (!expression.callee) return;
      const name = expression.callee.name;
      if (name === "useEffect" || name === "useLayoutEffect") {
        hasInstance = true;
        instances.push(name);
        context.report({
          node: expression.callee,
          message: "write `use client`",
          suggest: [
            {
              desc: "add use client at the top of the document",
              fix(fixer) {
                const p = findParentProgram(node.parent);
                return fixer.insertTextBefore(p, "'use client';");
              },
            },
          ],
        });
      }
    },
    "Program:exit": (node: Program) => {
      if (instances.length < 1 && hasDirective) {
        context.report({
          node,
          message: "remove `use client`",
          suggest: [
            {
              desc: "remove use client at the top of the document",
              fix(fixer) {
                return fixer.remove(node.body[0]);
              },
            },
          ],
        });
      }
    },
  };
};

export const ClientComponents = { meta, create };
