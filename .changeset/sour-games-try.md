---
"eslint-plugin-react-server-components": minor
---

Added `allowedServerHooks` option. Hooks specified here will not throw an error in files that do not have the `'use client'` directive.

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
