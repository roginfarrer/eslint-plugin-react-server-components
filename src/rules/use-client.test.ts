"use strict";

import { RuleTester } from "eslint";
import { ClientComponents as rule } from "./use-client";

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
});

/** BROWSER GLOBALS */
ruleTester.run("client-component", rule, {
  valid: [
    {
      code: 'const foo = "bar"',
    },
  ],
  invalid: [
    // DOCUMENT
    {
      code: `const foo = "bar";
document.addEventListener('scroll', () => {})`,
      errors: [{ message: /requires/ }],
      output: `'use client';
const foo = "bar";
document.addEventListener('scroll', () => {})`,
    },
    {
      code: `const foo = "bar";
function bar() {
  document.addEventListener('scroll', () => {})
}`,
      errors: [{ message: /requires/ }],
      output: `'use client';
const foo = "bar";
function bar() {
  document.addEventListener('scroll', () => {})
}`,
    },
    // WINDOW
    {
      code: `const foo = "bar";
window.addEventListener('scroll', () => {})`,
      errors: [{ message: /requires/ }],
      output: `'use client';
const foo = "bar";
window.addEventListener('scroll', () => {})`,
    },
    {
      code: `const foo = "bar";
function bar() {
  window.addEventListener('scroll', () => {})
}`,
      errors: [{ message: /requires/ }],
      output: `'use client';
const foo = "bar";
function bar() {
  window.addEventListener('scroll', () => {})
}`,
    },
    // OBSERVERS
    {
      code: `const observer = new IntersectionObserver()`,
      errors: [{ message: /requires/ }],
      output: `'use client';
const observer = new IntersectionObserver()`,
    },
    {
      code: `const observer = new MutationObserver()`,
      errors: [{ message: /requires/ }],
      output: `'use client';
const observer = new MutationObserver()`,
    },
    {
      code: `const observer = new ResizeObserver()`,
      errors: [{ message: /requires/ }],
      output: `'use client';
const observer = new ResizeObserver()`,
    },
  ],
});

ruleTester.run("client-component", rule, {
  valid: [
    {
      code: 'const foo = "bar";',
    },
    {
      code: `'use client';
import {useState} from 'react';
const Button = () => {
  const [value, setValue] = useState('');
  return 'foo';
}`,
    },
    {
      code: `'use client';
import {useEffect} from 'react';
const Button = () => {
  useEffect(() => {}, [])
  return 'foo';
}`,
    },
  ],
  invalid: [
    {
      code: `import {useState} from 'react';
const Button = () => {
  const [value, setValue] = useState('');
  return 'foo';
}`,
      errors: [{ message: /Using hooks requires/ }],
      output: `'use client';
import {useState} from 'react';
const Button = () => {
  const [value, setValue] = useState('');
  return 'foo';
}`,
    },
    {
      code: `import {useEffect} from 'react';
const Button = () => {
  useEffect(() => {}, [])
  return 'foo';
}`,
      errors: [{ message: /Using hooks requires/ }],
      output: `'use client';
import {useEffect} from 'react';
const Button = () => {
  useEffect(() => {}, [])
  return 'foo';
}`,
    },
  ],
});

/** Callbacks */
ruleTester.run("client-component", rule, {
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
