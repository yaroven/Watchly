import styles from "./Skeleton.module.scss";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export default function Skeleton({ width, height, borderRadius, className }: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton} ${className || ""}`}
      style={{
        width: width || "100%",
        height: height || "100%",
        borderRadius: borderRadius || "8px",
      }}
    />
  );
}
