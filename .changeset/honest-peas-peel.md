---
"eslint-plugin-react-server-components": major
---

Makes checks for window usage more robust to not require "use client" when safely accessed behind a `typeof window !== 'undefined'` or `typeof document !== 'undefined'`check.

For example:

```jsx
const href = typeof window !== 'undefined' ? window.location.href : '';

const MyComponent = () => <div>{href}</div>;
```

This does not need to be marked with a "use client" because all of its client-only actions are behind a safety check.
