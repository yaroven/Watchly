/// <reference types="next" />
/// <reference types="next/image-types/global" />

declare module "*.scss" {
  const content: Record<string, string>;
  export default content;
}

declare module "*.css";
