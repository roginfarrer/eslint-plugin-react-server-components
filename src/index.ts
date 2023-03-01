import { ClientComponents } from "./rules/use-client";

export default {
  configs: {
    plugins: ["react-client-components"],
    recommended: {
      rules: {
        "react-client-components/react-client-components": "error",
      },
    },
  },
  rules: {
    "react-client-components": ClientComponents,
  },
};
