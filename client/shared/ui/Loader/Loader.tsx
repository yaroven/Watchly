import { RotateCw } from "lucide-react";
import styles from "./Loader.module.scss";

interface PageLoaderProps {
  size?: number;
}

export default function Loader({ size = 64 }: PageLoaderProps) {
  return <RotateCw className={styles.loader} size={size} />;
}
