import MuiSvgIcon, { type SvgIconProps } from "@mui/material/SvgIcon";
import type { ComponentType, SVGProps } from "react";

type CustomIconProps = Omit<SvgIconProps, "component" | "children"> & {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export default function CustomIcon({ icon, ...rest }: CustomIconProps) {
  return <MuiSvgIcon inheritViewBox component={icon} {...rest} />;
}
