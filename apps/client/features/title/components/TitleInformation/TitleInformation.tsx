import { type Title, TitleType } from "@/features/title/schemas/title";
import { getOptimizedImageSrc } from "@/shared/lib/get-optimized-image-src";
import type { SvgIconComponent } from "@mui/icons-material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ClosedCaptionIcon from "@mui/icons-material/ClosedCaption";
import EventIcon from "@mui/icons-material/Event";
import ExpandMore from "@mui/icons-material/ExpandMore";
import FlagIcon from "@mui/icons-material/Flag";
import GroupsIcon from "@mui/icons-material/Groups";
import MovieCreationIcon from "@mui/icons-material/MovieCreation";
import PublicIcon from "@mui/icons-material/Public";
import TranslateIcon from "@mui/icons-material/Translate";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { getTitleOverviewFixture } from "../TitleOverview/mocks";

interface TitleInformationProps {
  title: Title;
}

interface InfoRow {
  label: string;
  value?: string;
  icon: SvgIconComponent;
  hasChevron?: boolean;
}

const CAST_AVATAR_SIZE = 96;

export default function TitleInformation({ title }: TitleInformationProps) {
  const { cast, meta } = getTitleOverviewFixture(title.id);
  const isSeries = title.type === TitleType.SERIES;

  const leftRows: InfoRow[] = [
    { label: "Country", value: meta.country, icon: FlagIcon },
    { label: "Release Date", value: meta.releaseDate, icon: EventIcon },
    { label: "Language", value: meta.language, icon: TranslateIcon, hasChevron: true },
    ...(isSeries ? [{ label: "Network", value: meta.network, icon: PublicIcon }] : []),
  ];
  const rightRows: InfoRow[] = [
    { label: "Director", value: meta.director, icon: MovieCreationIcon },
    { label: "Runtime", value: meta.runtime, icon: AccessTimeIcon },
    { label: "Closed Caption", value: meta.closedCaption, icon: ClosedCaptionIcon, hasChevron: true },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <Typography variant="h3">Information</Typography>

      <Box sx={{ display: "flex", gap: "66px", flexWrap: "wrap" }}>
        <InfoTableColumn rows={leftRows} />
        <InfoTableColumn rows={rightRows} />
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <GroupsIcon sx={{ color: "primary.main", fontSize: "24px" }} />
          <Typography sx={{ fontSize: "18px", fontWeight: 600 }}>Stars</Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            gap: "32px",
            overflowX: "auto",
            pb: "8px",
            scrollbarWidth: "thin",
            scrollbarColor: "#333333 transparent",
          }}
        >
          {cast.map((member) => (
            <Box key={member.name} sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", flexShrink: 0 }}>
              <Box
                sx={{
                  position: "relative",
                  width: CAST_AVATAR_SIZE,
                  height: CAST_AVATAR_SIZE,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "2px solid",
                  borderColor: "primary.main",
                }}
              >
                <Image
                  src={getOptimizedImageSrc(member.avatarUrl)}
                  alt={member.name}
                  fill
                  sizes={`${CAST_AVATAR_SIZE}px`}
                  style={{ objectFit: "cover" }}
                />
              </Box>
              <Typography sx={{ fontSize: "14px", textAlign: "center" }}>{member.name}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function InfoTableColumn({ rows }: { rows: InfoRow[] }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minWidth: "280px" }}>
      <Divider sx={{ borderColor: "divider" }} />
      {rows.map(({ label, value, icon: Icon, hasChevron }) => (
        <Box key={label}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: "12px" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Icon sx={{ color: "primary.main", fontSize: "20px" }} />
              <Typography sx={{ fontSize: "14px", color: "text.secondary" }}>{label}</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Typography sx={{ fontSize: "14px", color: "#ffffff" }}>{value}</Typography>
              {hasChevron && <ExpandMore sx={{ color: "text.secondary", fontSize: "18px" }} />}
            </Box>
          </Box>
          <Divider sx={{ borderColor: "divider" }} />
        </Box>
      ))}
    </Box>
  );
}
