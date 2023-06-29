import { ClientComponents } from "./rules/use-client";

export const configs = {
  recommended: {
    rules: {
      "react-server-components/use-client": "error",
    },
    plugins: ["react-server-components"],
  },
};
export const rules = {
  "use-client": ClientComponents,
};
