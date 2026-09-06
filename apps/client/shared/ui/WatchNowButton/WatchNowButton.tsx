import { Play } from "@shared/assets/icons";
import Button from "@shared/ui/Button";
import CustomIcon from "@shared/ui/CustomIcon";
import type { ComponentProps } from "react";

// The theme's contained button is the page-level call to action: tall, r5.
// This one sits on top of artwork, so it shrinks to a pill and drops the height.
type WatchNowButtonProps = Omit<ComponentProps<typeof Button>, "variant" | "danger" | "children"> & {
  label?: string;
};

export default function WatchNowButton({ label = "Watch now", sx, ...rest }: WatchNowButtonProps) {
  return (
    <Button
      startIcon={<CustomIcon icon={Play} sx={{ fontSize: "20px" }} />}
      sx={[
        {
          borderRadius: "999px",
          minHeight: "unset",
          paddingBlock: "8px",
          paddingInline: "16px",
          fontSize: "clamp(13px, 0.95vw, 17px)",
          fontWeight: 600,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    >
      {label}
    </Button>
  );
}
