"use strict";

import { RuleTester } from "eslint";
import { ClientComponents as rule } from "./use-client";

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: {
      version: "18.2.0",
    },
  },
});

describe("use client", () => {
  describe("browser globals", () => {
    ruleTester.run("BROWSER GLOBALS", rule, {
      valid: [
        {
          code: 'const foo = "bar"',
        },
        {
          code: `import {createContext, useContext, useEffect} from 'react';
    const context = createContext()
    export function useTheme() {
      const context = useContext(context);
      useEffect(() => {
        window.setTimeout(() => {});
      });
      return context;
    }`,
        },
        {
          code: `import * as React from 'react';
    const context = React.createContext()
    export function Foo() {
      return <div />;
    }
    export function useTheme() {
      const context = React.useContext(context);
      React.useEffect(() => {
        window.setTimeout(() => {});
      });
      return context;
    }`,
        },
      ],
      invalid: [
        // DOCUMENT
        {
          code: `const foo = "bar";
document.addEventListener('scroll', () => {})`,
          errors: [{ messageId: "addUseClientBrowserAPI" }],
          output: `'use client';
const foo = "bar";
document.addEventListener('scroll', () => {})`,
        },
        {
          code: `const foo = "bar";
function Bar() {
  document.addEventListener('scroll', () => {})
  return <div />;
}`,
          errors: [{ messageId: "addUseClientBrowserAPI" }],
          output: `'use client';
const foo = "bar";
function Bar() {
  document.addEventListener('scroll', () => {})
  return <div />;
}`,
        },
        // WINDOW
        {
          code: `const foo = "bar";
window.addEventListener('scroll', () => {})`,
          errors: [{ messageId: "addUseClientBrowserAPI" }],
          output: `'use client';
const foo = "bar";
window.addEventListener('scroll', () => {})`,
        },
        {
          code: `const foo = "bar";
function Bar() {
  window.addEventListener('scroll', () => {})
  return <div />;
}`,
          errors: [{ messageId: "addUseClientBrowserAPI" }],
          output: `'use client';
const foo = "bar";
function Bar() {
  window.addEventListener('scroll', () => {})
  return <div />;
}`,
        },
        // OBSERVERS
        {
          code: `const observer = new IntersectionObserver()`,
          errors: [{ messageId: "addUseClientBrowserAPI" }],
          output: `'use client';
const observer = new IntersectionObserver()`,
        },
        {
          code: `const observer = new MutationObserver()`,
          errors: [{ messageId: "addUseClientBrowserAPI" }],
          output: `'use client';
const observer = new MutationObserver()`,
        },
        {
          code: `const observer = new ResizeObserver()`,
          errors: [{ messageId: "addUseClientBrowserAPI" }],
          output: `'use client';
const observer = new ResizeObserver()`,
        },
        // GLOBAL PROPERTY REFERENCE
        {
          code: `const foo = window.foo;`,
          errors: [{ messageId: "addUseClientBrowserAPI" }],
          output: `'use client';
const foo = window.foo;`,
        },
      ],
    });
  });

  describe("hooks", () => {
    ruleTester.run("HOOKS", rule, {
      valid: [
        {
          code: 'const foo = "bar";',
        },
        {
          code: `'use client';
import {useState} from 'react';
const Button = () => {
  const [value, setValue] = useState('');
  return <div />;
}`,
        },
        {
          code: `'use client';
import {useEffect} from 'react';
const Button = () => {
  useEffect(() => {}, [])
  return <div />;
}`,
        },
      ],
      invalid: [
        {
          code: `import {useState} from 'react';
const Button = () => {
  const [value, setValue] = useState('');
  return <div />;
}`,
          errors: [
            { messageId: "addUseClientHooks", data: { hook: "useState" } },
          ],
          output: `'use client';
import {useState} from 'react';
const Button = () => {
  const [value, setValue] = useState('');
  return <div />;
}`,
        },
        {
          code: `import * as React from 'react';
const Button = () => {
  const [value, setValue] = React.useState('');
  return <div />;
}`,
          errors: [
            { messageId: "addUseClientHooks", data: { hook: "useState" } },
          ],
          output: `'use client';
import * as React from 'react';
const Button = () => {
  const [value, setValue] = React.useState('');
  return <div />;
}`,
        },
        {
          code: `import {useEffect} from 'react';
const Button = () => {
  useEffect(() => {}, [])
  return <div />;
}`,
          errors: [
            { messageId: "addUseClientHooks", data: { hook: "useEffect" } },
          ],
          output: `'use client';
import {useEffect} from 'react';
const Button = () => {
  useEffect(() => {}, [])
  return <div />;
}`,
        },
      ],
    });
  });

  describe("event callbacks", () => {
    ruleTester.run("EVENT CALLBACKS", rule, {
      valid: [{ code: 'const foo = "bar";' }],
      invalid: [
        {
          code: `import React from 'react';
function App() {
  return (
    <button onClick={() => console.log('hello')}>Hello</button>
  );
}`,
          errors: [{ messageId: "addUseClientCallbacks" }],
          filename: "foo.jsx",
          output: `'use client';
import React from 'react';
function App() {
  return (
    <button onClick={() => console.log('hello')}>Hello</button>
  );
}`,
        },
      ],
    });
  });
});
