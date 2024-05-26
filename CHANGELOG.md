# eslint-plugin-react-server-components

## 1.2.0

### Minor Changes

- 560c8be: Added `allowedServerHooks` option. Hooks specified here will not throw an error in files that do not have the `'use client'` directive.

  Example:

  ```json
  {
    "rules": {
      "react-server-components/use-client": [
        "error",
        { "allowedServerHooks": ["useTranslation"] }
      ]
    }
  }
  ```

## 1.1.2

### Patch Changes

- c1f4c62: Allow `useId` in server and shared components.

## 1.1.1

### Patch Changes

- 644f71d: Simplify creation of browser-only globals reference.

## 1.1.0

### Minor Changes

- 30770a0: Error on class components

## 1.0.1

### Patch Changes

- 8f42b00: Fixed detection of 'use client' directive around comments in file header.
