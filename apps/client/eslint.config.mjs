import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

/**
 * Filenames the App Router gives meaning to. Anything else under app/ is
 * domain code and belongs in features/ or shared/.
 */
const ROUTE_FILES = [
  "page",
  "layout",
  "template",
  "loading",
  "error",
  "global-error",
  "not-found",
  "route",
  "default",
  "forbidden",
  "unauthorized",
  "sitemap",
  "robots",
  "manifest",
  "opengraph-image",
  "twitter-image",
  "icon",
  "apple-icon",
  "middleware",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".fttemplates/**",
  ]),
  {
    // app/ is the routing layer: match a URL, expose metadata, fetch on the
    // server, handle notFound()/error. Screens, hooks, domain components and
    // domain types live in features/; primitives live in shared/.
    name: "watchly/app-is-routing-only",
    files: ["app/**/*.ts", "app/**/*.tsx"],
    ignores: ROUTE_FILES.flatMap((name) => [`app/**/${name}.ts`, `app/**/${name}.tsx`]),
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Program",
          message:
            "app/ may only contain App Router route files (page, layout, error, not-found, loading, route, template, ...). Move this into features/ or shared/ and render it from a route file.",
        },
      ],
    },
  },
  {
    // Layers point one way: app -> features -> shared.
    name: "watchly/layer-boundaries",
    files: ["shared/**/*.ts", "shared/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*", "@features/*", "@/app/*"],
              message: "shared/ must not depend on features/ or app/. Invert the dependency or take the domain type as a prop.",
            },
          ],
        },
      ],
    },
  },
  {
    name: "watchly/features-never-import-routes",
    files: ["features/**/*.ts", "features/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/*", "@app/*"],
              message: "features/ must not depend on app/. Route-specific values belong in props.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
