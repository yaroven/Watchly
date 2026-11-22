"use client";

import { useTitles } from "@/features/title";
import { useRouter } from "@/i18n/navigation";
import { getOptimizedImageSrc } from "@/shared/lib/get-optimized-image-src";
import { ADMIN } from "@/shared/lib/routes";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import GradientCard from "@shared/ui/GradientCard";
import { useFormatter, useTranslations } from "next-intl";
import Image from "next/image";

const SKELETON_ROWS = Array.from({ length: 5 }, (_, index) => index);

export default function RecentAdditions() {
  const t = useTranslations("admin");
  const format = useFormatter();
  const router = useRouter();

  const { data: recentTitles, isPending } = useTitles({ limit: 5, page: 1 });

  return (
    <GradientCard sx={{ padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <Typography variant="h5" sx={{ color: "text.primary" }}>
        {t("dashboard.recentAdditions.title")}
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {isPending ? (
          SKELETON_ROWS.map((row) => (
            <Box key={row} sx={{ display: "flex", alignItems: "center", gap: "14px", padding: "10px 12px" }}>
              <Skeleton variant="rounded" width={40} height={56} sx={{ borderRadius: "6px", flexShrink: 0 }} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Skeleton variant="text" width="60%" height={22} />
                <Skeleton variant="rounded" width={54} height={20} sx={{ mt: "6px", borderRadius: "6px" }} />
              </Box>
              <Skeleton variant="text" width={70} height={20} />
            </Box>
          ))
        ) : recentTitles?.items.length ? (
          recentTitles.items.map(({ id, type, name, posterUrl, createdAt }) => (
            <Box
              key={id}
              onClick={() => router.push(ADMIN.TITLES_EDIT(id))}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                padding: "10px 12px",
                borderRadius: "12px",
                cursor: "pointer",
                transition: "background-color 0.2s",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.03)" },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
                <Image
                  src={getOptimizedImageSrc(posterUrl)}
                  alt={name}
                  width={40}
                  height={56}
                  style={{ display: "block", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{ fontWeight: 500, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {name}
                  </Typography>
                  <Chip
                    label={t(`dashboard.titleType.${type}`)}
                    size="small"
                    sx={{ mt: "6px", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", height: "20px" }}
                  />
                </Box>
              </Box>
              <Typography sx={{ color: "text.secondary", fontSize: "0.85rem", flexShrink: 0 }}>
                {format.dateTime(new Date(createdAt), { dateStyle: "short" })}
              </Typography>
            </Box>
          ))
        ) : (
          <Typography sx={{ color: "text.secondary" }}>{t("dashboard.recentAdditions.empty")}</Typography>
        )}
      </Box>
    </GradientCard>
  );
}
