"use client";

import { ReactNode } from "react";
import useFeatureFlag from "../../api/use-feature-flag";
import { FeatureFlag } from "../../schemas/feature-flags";

interface FeatureGateProps {
  flag: FeatureFlag;
  children: ReactNode;
  fallback?: ReactNode;
}

export default function FeatureGate({ flag, children, fallback = null }: FeatureGateProps) {
  const enabled = useFeatureFlag(flag);

  return <>{enabled ? children : fallback}</>;
}
