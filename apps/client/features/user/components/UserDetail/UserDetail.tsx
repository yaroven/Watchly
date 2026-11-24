"use client";

import { useUpdateUserRole } from "@/features/user/api/use-user-mutations";
import { useUser } from "@/features/user/api/use-users";
import { useAuthStore } from "@/shared/lib/auth-store";
import { ADMIN } from "@/shared/lib/routes";
import Role from "@/types/role";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import MuiSelect, { SelectChangeEvent } from "@mui/material/Select";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useApiErrorMessage } from "@shared/api/use-api-error-message";
import { INLINE_ERROR } from "@shared/api/write-errors";
import { inputVariants, tokens } from "@shared/mui/theme";
import Button from "@shared/ui/Button";
import ConfirmDialog from "@shared/ui/ConfirmDialog";
import GradientCard from "@shared/ui/GradientCard";
import Loader from "@shared/ui/Loader";
import { useFormatter, useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";

interface UserDetailProps {
  id: string;
}

const selectSx = {
  ...inputVariants.pill,
  height: 44,
  width: 220,
  display: "flex",
  alignItems: "center",
  "& .MuiSelect-select": { padding: 0, minHeight: "unset", display: "flex", alignItems: "center" },
  "& .MuiSelect-icon": { color: tokens.text.secondary, right: "12px" },
};

const menuProps = {
  slotProps: {
    paper: {
      sx: {
        mt: "4px",
        borderRadius: "12px",
        backgroundColor: tokens.surface.fill,
        backgroundImage: "none",
        border: `1px solid ${tokens.border.faint}`,
      },
    },
  },
};

export default function UserDetail({ id }: UserDetailProps) {
  const t = useTranslations("user");
  const format = useFormatter();
  const currentUserId = useAuthStore((s) => s.userId);
  const { data: user, isPending: isLoadingUser, isError } = useUser(id);

  const [pendingRole, setPendingRole] = useState<Role | null>(null);
  const describeError = useApiErrorMessage();
  const {
    mutate: updateRole,
    isPending,
    error: roleError,
    reset: resetRole,
  } = useUpdateUserRole({ meta: INLINE_ERROR, onSuccess: () => setPendingRole(null) });

  if (isLoadingUser) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <Loader />
      </Box>
    );
  }

  if (isError || !user) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", padding: "40px" }}>
        <GradientCard sx={{ p: "48px", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", textAlign: "center" }}>
          <Typography component="h1" variant="h4" sx={{ color: tokens.text.primary }}>
            {t("detail.notFoundTitle")}
          </Typography>
          <Typography sx={{ color: "text.secondary", maxWidth: "420px" }}>{t("detail.notFoundDescription")}</Typography>
          <Button href={ADMIN.USERS}>{t("detail.backToUsers")}</Button>
        </GradientCard>
      </Box>
    );
  }

  const isSelf = currentUserId === user.id;
  const createdLabel = format.dateTime(new Date(user.createdAt), { year: "numeric", month: "long", day: "numeric" });

  const handleRoleChange = (event: SelectChangeEvent<unknown>) => {
    const nextRole = event.target.value as Role;
    if (nextRole === user.role) return;
    resetRole();
    setPendingRole(nextRole);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "28px", padding: { xs: "24px 16px 40px", md: "40px 36px 56px" } }}>
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <Typography component="h1" variant="h2" sx={{ color: tokens.text.primary }}>
          {user.email}
        </Typography>
        <Typography sx={{ mt: "14px", maxWidth: "680px", color: "text.secondary" }}>{t("detail.subtitle")}</Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.15fr) minmax(0, 1fr)" },
          gap: "24px",
          alignItems: "start",
        }}
      >
        <SectionCard title={t("detail.accountInfoTitle")} description={t("detail.accountInfoDescription")}>
          <InfoRow label={t("fields.email")} value={user.email} />
          <InfoRow label={t("fields.userId")} value={user.id} mono />
          <InfoRow label={t("fields.joined")} value={createdLabel} />
        </SectionCard>

        <SectionCard title={t("detail.roleTitle")} description={t("detail.roleDescription")}>
          <Box sx={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <Tooltip title={isSelf ? t("detail.cannotChangeOwnRole") : ""} disableHoverListener={!isSelf}>
              <Box>
                <MuiSelect value={user.role} onChange={handleRoleChange} disabled={isSelf || isPending} MenuProps={menuProps} sx={selectSx}>
                  <MenuItem value={Role.ADMIN}>{t(`role.${Role.ADMIN}`)}</MenuItem>
                  <MenuItem value={Role.USER}>{t(`role.${Role.USER}`)}</MenuItem>
                </MuiSelect>
              </Box>
            </Tooltip>

            <Chip
              size="small"
              label={t(`role.${user.role}`)}
              sx={
                user.role === Role.ADMIN
                  ? { backgroundColor: "rgba(231,188,15,0.16)", color: "primary.main", fontWeight: 700 }
                  : { backgroundColor: "rgba(255,255,255,0.08)", color: "text.secondary", fontWeight: 700 }
              }
            />
          </Box>
        </SectionCard>
      </Box>

      <ConfirmDialog
        isOpen={pendingRole !== null}
        onClose={() => setPendingRole(null)}
        onConfirm={() => pendingRole && updateRole({ id: user.id, data: { role: pendingRole } })}
        isPending={isPending}
        error={describeError(roleError)}
        tone="warning"
        confirmLabel={t("changeRole.confirm")}
        pendingLabel={t("changeRole.pending")}
        title={t("changeRole.title")}
        description={t.rich("changeRole.description", {
          email: user.email,
          role: pendingRole ? t(`role.${pendingRole}`) : "",
          strong: (chunks) => <Typography component="strong">{chunks}</Typography>,
        })}
      />
    </Box>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", py: "10px" }}>
      <Typography sx={{ color: "text.secondary", fontWeight: 700, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </Typography>
      <Typography
        sx={{
          color: tokens.text.primary,
          fontFamily: mono ? "monospace" : "inherit",
          fontSize: mono ? "13px" : "15px",
          textAlign: "right",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function SectionCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <GradientCard sx={{ width: "100%" }}>
      <Box sx={{ px: "28px", pt: "24px" }}>
        <Typography component="h2" variant="h4" sx={{ color: tokens.text.primary }}>
          {title}
        </Typography>
        <Typography sx={{ mt: "8px", color: "text.secondary" }}>{description}</Typography>
      </Box>

      <Box sx={{ borderBottom: "1px solid", borderColor: "divider", mt: "20px" }} />

      <Box sx={{ p: "28px", display: "flex", flexDirection: "column", gap: "8px" }}>{children}</Box>
    </GradientCard>
  );
}
