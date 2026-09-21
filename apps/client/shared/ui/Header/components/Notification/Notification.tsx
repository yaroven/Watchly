import { NotificationsNone as NotificationsNoneIcon } from "@mui/icons-material";
import { Badge } from "@mui/material";

interface NotificationProps {
  hasNotifications: boolean;
  onClick?: () => void;
}

export default function Notification({ hasNotifications = false, onClick }: NotificationProps) {
  if (hasNotifications)
    return (
      <Badge
        variant="dot"
        overlap="circular"
        sx={{
          "& .MuiBadge-badge": {
            backgroundColor: "#ff523b",
            border: "2px solid #1e1e1e",
            width: 12,
            height: 12,
            borderRadius: "50%",
            transform: "translate(25%, -25%)",
          },
        }}
      >
        <NotificationsNoneIcon onClick={onClick} sx={{ fontSize: "32px", cursor: onClick ? "pointer" : "default" }} />
      </Badge>
    );

  return <NotificationsNoneIcon onClick={onClick} sx={{ fontSize: "32px", cursor: onClick ? "pointer" : "default" }} />;
}
