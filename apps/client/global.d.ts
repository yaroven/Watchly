/// <reference types="next" />
/// <reference types="next/image-types/global" />

declare module "*.scss" {
  const content: Record<string, string>;
  export default content;
}

declare module "*.css";

// SVGR: .svg imports are React components, not URL strings.
declare module "*.svg" {
  import type { FC, SVGProps } from "react";
  const ReactComponent: FC<SVGProps<SVGSVGElement> & { title?: string }>;
  export default ReactComponent;
}
