import type { Rule } from "eslint";
import type {
  Expression,
  ExpressionStatement,
  Identifier,
  Node,
  Program,
  SpreadElement,
} from "estree";
import globals from "globals";
import { reactEvents } from "./react-events";
import { JSXOpeningElement } from "estree-jsx";
// @ts-expect-error
import Components from "eslint-plugin-react/lib/util/Components";

const HOOK_REGEX = /^use[A-Z]/;
const useClientRegex = /^('|")use client('|")/;
const { browserGlobals } = [
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
      '{{hook}} only works in Client Components. Add the "use client" directive at the top of the file to use it.',
    addUseClientBrowserAPI:
      'Browser APIs only work in Client Components. Add the "use client" directive at the top of the file to use it.',
    addUseClientCallbacks:
      'Functions can only be passed as props to Client Components. Add the "use client" directive at the top of the file to use it.',
    removeUseClient:
      "This file does not require the 'use client' directive, and it should be removed.",
  },
};

// type RealNode = Node & Rule.NodeParentExtension;

// function findParentProgram(node: RealNode): Program {
//   if (node.type === "Program") {
//     return node;
//   }
//   return findParentProgram(node.parent);
// }

// function getIsType(node: RealNode): boolean {
//   const { parent } = node;
//   if (parent.type === "Program") {
//     return false;
//   }
//   return parent.type === "TSTypeReference" || getIsType(parent);
// }

const create = Components.detect(
  (
    context: Parameters<Rule.RuleModule["create"]>[0],
    _: any,
    util: any
  ): ReturnType<Rule.RuleModule["create"]> => {
    let hasReported = false;
    const instances = [];
    let hasDirective = false;
    const sourceCode = context.getSourceCode();
    const firstLine = sourceCode.lines.filter(Boolean)[0].trim();

    if (useClientRegex.test(firstLine)) {
      hasDirective = true;
    }

    let parentNode: Program;

    function reportMissingDirective(
      messageId: string,
      expression: Node,
      data?: Record<string, any>
    ) {
      if (hasDirective || hasReported) {
        return;
      }
      hasReported = true;
      context.report({
        node: expression,
        messageId,
        data,
        *fix(fixer) {
          // const p = findParentProgram(node);
          const firstToken = sourceCode.getFirstToken(parentNode.body[0]);
          yield fixer.insertTextBefore(firstToken!, `'use client';\n`);
        },
      });
    }

    const reactImports: Record<string | "namespace", string | string[]> = {
      namespace: [],
    };

    const undeclaredReferences = new Set();

    return {
      Program(node) {
        parentNode = node;
        const scope = context.getScope();
        // Report variables not declared at all
        scope.through.forEach((reference) => {
          undeclaredReferences.add(reference.identifier.name);
        });

        // // @ts-expect-error
        // const globals = scope.implicit.left || scope.implicit.leftToBeResolved;
        // for (const reference of globals) {
        //   if (getIsType(reference.identifier)) {
        //     continue;
        //   }
        //   const inModuleScope = reference.from.type === "module";
        //   const isInFunctionComponent = getIsFunctionComponent(reference);
        //   const name = reference.identifier.name as string;
        //   if (browserGlobals.includes(name)) {
        //     // instances.push(name);
        //     // reportMissingDirective(
        //     //   "addUseClientBrowserAPI",
        //     //   reference.identifier
        //     // );
        //   }
        // }
      },

      ImportDeclaration(node) {
        if (node.source.value === "react") {
          node.specifiers
            .filter((spec) => spec.type === "ImportSpecifier")
            .forEach((spec) => {
              // @ts-expect-error
              reactImports[spec.local.name] = spec.imported.name;
            });
          const namespace = node.specifiers.find(
            (spec) =>
              spec.type === "ImportDefaultSpecifier" ||
              spec.type === "ImportNamespaceSpecifier"
          );
          if (namespace) {
            reactImports.namespace = [
              ...reactImports.namespace,
              namespace.local.name,
            ];
          }
        }
      },
      NewExpression(node) {
        // @ts-expect-error
        const name = node.callee.name;
        if (undeclaredReferences.has(name) && browserGlobals.includes(name)) {
          instances.push(name);
          reportMissingDirective("addUseClientBrowserAPI", node);
        }
      },
      VariableDeclaration(node) {
        // Catch using hooks within a component
        const declarator = node.declarations[0];

        if (declarator.init && declarator.init.type === "CallExpression") {
          const expression = declarator.init;
          let name = "";
          if (
            expression.callee.type === "Identifier" &&
            "name" in expression.callee
          ) {
            name = expression.callee.name;
          } else if (
            expression.callee.type === "MemberExpression" &&
            "name" in expression.callee.property
          ) {
            name = expression.callee.property.name;
          }

          if (
            HOOK_REGEX.test(name) &&
            // Is in a function...
            context.getScope().type === "function" &&
            // But only if that function is a component
            Boolean(util.getParentComponent(node))
          ) {
            instances.push(name);
            reportMissingDirective("addUseClientHooks", expression.callee, {
              hook: name,
            });
          }
        }
      },
      MemberExpression(node) {
        // Catch uses of browser APIs in module scope
        // or React component scope.
        // eg:
        // const foo = window.foo
        // window.addEventListener(() => {})
        // const Foo() {
        //   const foo = window.foo
        //   return <div />;
        // }
        // @ts-expect-error
        const name = node.object.name;
        const scopeType = context.getScope().type;
        if (
          undeclaredReferences.has(name) &&
          browserGlobals.includes(name) &&
          (scopeType === "module" || !!util.getParentComponent(node))
        ) {
          instances.push(name);
          reportMissingDirective("addUseClientBrowserAPI", node.object);
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

        if (
          expression.callee &&
          HOOK_REGEX.test(expression.callee.name) &&
          Boolean(util.getParentComponent(expression))
        ) {
          instances.push(expression.callee.name);
          reportMissingDirective("addUseClientHooks", expression.callee, {
            hook: expression.callee.name,
          });
        }
      },
      // @ts-expect-error
      JSXOpeningElement(node: JSXOpeningElement) {
        const scope = context.getScope();
        const fnsInScope: string[] = [];
        scope.variables.forEach((variable) => {
          variable.defs.forEach((def) => {
            if (isFunction(def)) {
              fnsInScope.push(variable.name);
            }
          });
        });
        scope.upper?.set.forEach((variable) => {
          variable.defs.forEach((def) => {
            if (isFunction(def)) {
              fnsInScope.push(variable.name);
            }
          });
        });

        for (const attribute of node.attributes) {
          if (
            attribute.type === "JSXSpreadAttribute" ||
            attribute.value?.type !== "JSXExpressionContainer"
          ) {
            continue;
          }

          if (reactEvents.includes(attribute.name.name as string)) {
            reportMissingDirective("addUseClientCallbacks", attribute.name);
          }

          if (
            attribute.value?.expression.type === "ArrowFunctionExpression" ||
            attribute.value?.expression.type === "FunctionExpression" ||
            (attribute.value.expression.type === "Identifier" &&
              fnsInScope.includes(attribute.value.expression.name))
          ) {
            reportMissingDirective("addUseClientCallbacks", attribute);
          }
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
  }
);

function isFunction(def: any) {
  if (def.type === "FunctionName") {
    return true;
  }
  if (def.node.init && def.node.init.type === "ArrowFunctionExpression") {
    return true;
  }
  return false;
}

// function getIsFunctionComponent(reference) {
//   return (
//     reference.from.block.type === "FunctionDeclaration" &&
//     /^[A-Z]/.test(reference.from.block.id.name)
//   );
// }

export const ClientComponents = { meta, create };
