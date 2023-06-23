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
import globals from "globals";
import { reactEvents } from "./react-events";

const hookRegex = /^use[A-Z]/;
const useClientRegex = /^('|")use client('|")/;
const { browserGlobals, nodeGlobals } = [
  ...Object.keys(globals.browser),
  ...Object.keys(globals.node),
].reduce<{ browserGlobals: string[]; nodeGlobals: string[] }>(
  (acc, curr) => {
    switch (true) {
      case curr in globals.node && curr in globals.browser:
        break;
      case curr in globals.node:
        acc.nodeGlobals.push(curr);
        break;
      case curr in globals.browser:
        acc.browserGlobals.push(curr);
        break;
    }
    return acc;
  },
  { browserGlobals: [], nodeGlobals: [] }
);

const meta: Rule.RuleModule["meta"] = {
  docs: {
    description:
      "Enforce components are appropriately labeled with 'use client'.",
    recommended: true,
  },
  type: "problem",
  hasSuggestions: true,
  fixable: "code",
  messages: {
    addUseClientHooks:
      "Using hooks requires that this file have the 'use client' directive at the top of the file.",
    addUseClientBrowserAPI:
      "Using browser APIs requires that this file have the 'use client' directive at the top of the file.",
    addUseClientCallbacks:
      "Using event callbacks requires that this file have the 'use client' directive at the top of the file.",
    removeUseClient:
      "This file does not require the 'use client' directive, and it should be removed.",
  },
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
  const sourceCode = context.sourceCode;
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
      messageId: "addUseClientHooks",
      *fix(fixer) {
        const p = findParentProgram(node.parent);
        const firstToken = sourceCode.getFirstToken(p.body[0]);
        yield fixer.insertTextBefore(firstToken!, `'use client';\n`);
      },
    });
  }

  return {
    Program() {
      const scope = context.getScope();
      if (!scope) {
        return;
      }
      // @ts-expect-error
      scope.implicit.left.forEach((reference) => {
        const name = reference.identifier.name as string;
        if (browserGlobals.includes(name)) {
          hasReported = true;
          instances.push(name);
          context.report({
            node: reference.identifier,
            messageId: "addUseClientBrowserAPI",
            *fix(fixer) {
              const p = findParentProgram(reference.identifier);
              const firstToken = sourceCode.getFirstToken(p.body[0]);
              yield fixer.insertTextBefore(firstToken!, `'use client';\n`);
            },
          });
        }
      });
    },
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
    JSXAttribute(node: any) {
      const propName = node.name.name as string;
      if (reactEvents.includes(propName)) {
        hasReported = true;
        context.report({
          node: node.name,
          messageId: "addUseClientCallbacks",
          *fix(fixer) {
            const p = findParentProgram(node);
            const firstToken = sourceCode.getFirstToken(p.body[0]);
            yield fixer.insertTextBefore(firstToken!, `'use client';\n`);
          },
        });
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
          messageId: "removeUseClient",
          fix(fixer) {
            return fixer.remove(node);
          },
        });
      }
    },
  };
};

export const ClientComponents = { meta, create };
