# eslint-plugin-react-server-components

Experiment in making an ESLint rule for enforcing `"use client"` in client components (and warning if it's not needed).

## Installation

```bash
npm install --save-dev eslint-plugin-react-server-components
```

## Configuration

To use the recommended configuration:

```json5
// eslintrc.json
{
  extends: ["plugin:react-server-components/recommended"],
}
```

## Rules

### `use-client`

> Enforce components are appropriately prefixed with `'use client'.`

```json
{
  "rules": {
    "react-server-components/use-client": "error"
  }
}
```
