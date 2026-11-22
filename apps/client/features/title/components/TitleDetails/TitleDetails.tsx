"use client";

import { EpisodeManager } from "@/features/episodes";
import { VideoPreviewModal } from "@/features/player";
import type { Season } from "@/features/season";
import { SeasonManager } from "@/features/season";
import { titleTranslations } from "@/features/title/api/title.translations";
import useTitleCast from "@/features/title/api/use-title-cast";
import { useSyncTitleRatings } from "@/features/title/api/use-title-mutations";
import TitleCastManager from "@/features/title/components/TitleCastManager";
import { castCoverage, toCastRows } from "@/features/title/components/TitleCastManager/cast-rows";
import TitleForm from "@/features/title/components/TitleForm";
import type { TitleEditStatus } from "@/features/title/components/TitleForm/TitleForm";
import { Title } from "@/features/title/schemas/title";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { useContentTranslations } from "@shared/api/content-translations";
import { useApiErrorMessage } from "@shared/api/use-api-error-message";
import { type ContentLocale, coverageByLocale, TRANSLATION_LOCALES } from "@shared/lib/content-locale";
import { EditingLanguageProvider, useEditingLanguage } from "@shared/lib/editing-language";
import { useTabA11y } from "@shared/lib/use-tab-a11y";
import { tokens } from "@shared/mui/theme";
import ContentTranslationEditor from "@shared/ui/TranslationEditor/ContentTranslationEditor";
import { useFormatter, useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import DeleteModal from "./components/DeleteModal";
import TitleEditorBar from "./components/TitleEditorBar";
import TitleSidePanel from "./components/TitleSidePanel";
import { useTitleDetails } from "./model/useTitleDetails";

interface TitleDetailsProps {
  title: Title;
  initialSeasons: Season[];
}

export default function TitleDetails(props: TitleDetailsProps) {
  return (
    <EditingLanguageProvider>
      <TitleDetailsScreen {...props} />
    </EditingLanguageProvider>
  );
}

function TitleDetailsScreen({ title, initialSeasons }: TitleDetailsProps) {
  const {
    title: currentTitle,
    isSeries,
    seasons,
    episodes,
    selectedSeasonId,
    setSelectedSeasonId,
    currentTranscodingStatus,
    isPreviewModalOpen,
    openPreviewModal,
    closePreviewModal,
    isDeleteModalOpen,
    openDeleteModal,
    closeDeleteModal,
    isTranscoding,
    restartTranscoding,
    transcodeError,
    resetTranscode,
    isDeleting,
    deleteTitle,
    deleteError,
    streamUrl,
    isPreviewLoading,
  } = useTitleDetails({
    title,
    initialSeasons,
  });

  const t = useTranslations("title.details");
  const tEditor = useTranslations("title.editor");
  const format = useFormatter();
  const describeError = useApiErrorMessage();
  const [ratingsSync, setRatingsSync] = useState<{ severity: "info" | "error"; text: string } | null>(null);
  const { mutate: syncRatings, isPending: isSyncingRatings } = useSyncTitleRatings({
    onSuccess: (ratings) =>
      setRatingsSync({ severity: "info", text: ratings.length ? t("ratingsSynced", { count: ratings.length }) : t("ratingsNone") }),
    onError: (error) => setRatingsSync({ severity: "error", text: `${t("ratingsSyncFailed")} ${describeError(error)}` }),
  });
  const transcodeMessage = describeError(transcodeError);

  const [tab, setTab] = useState<EditorTab>("details");
  const { language, setLanguage, isBase, translationLocale } = useEditingLanguage();
  const [editStatus, setEditStatus] = useState<TitleEditStatus>({ isDirty: false, isPending: false, savedAt: null });
  const tabA11y = useTabA11y<EditorTab>();
  const formId = `title-editor-${title.id}`;

  const {
    data: translations,
    isPending: isTranslationsPending,
    isError: isTranslationsError,
  } = useContentTranslations(titleTranslations, title.id);
  const { data: cast } = useTitleCast(title.id);
  const titleCoverage = coverageByLocale(translations, TRANSLATED_FIELDS);
  const barCoverage = tab === "details" ? titleCoverage : tab === "cast" && cast ? castCoverage(toCastRows(cast), TRANSLATION_LOCALES) : {};
  const openLocale = (locale: ContentLocale) => {
    setTab("details");
    setLanguage(locale);
  };

  const meta = [
    tEditor(`meta.${currentTitle.type}`),
    currentTitle.releaseDate ? format.dateTime(new Date(currentTitle.releaseDate), { year: "numeric" }) : null,
    isSeries
      ? tEditor("meta.seasons", { count: seasons.length })
      : currentTitle.runtime
        ? tEditor("meta.runtime", { minutes: currentTitle.runtime })
        : null,
    currentTitle.genres.map((genre) => genre.name).join(", ") || null,
  ].filter(Boolean);

  const tabs: EditorTab[] = isSeries ? ["details", "cast", "seasons"] : ["details", "cast"];

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <TitleEditorBar
        titleId={title.id}
        titleName={currentTitle.name}
        language={language}
        onLanguageChange={setLanguage}
        saveMode={tab !== "details" ? "none" : isBase ? "form" : "hint"}
        coverage={barCoverage}
        formId={formId}
        status={editStatus}
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1fr) 300px" },
          alignItems: "start",
          minHeight: "calc(100vh - var(--admin-header-h, 0px) - 57px)",
        }}
      >
        <Box
          sx={{
            minWidth: 0,
            px: { xs: "16px", md: "32px" },
            pt: "28px",
            pb: "56px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <Box>
            <Typography component="h1" variant="h1" sx={{ color: tokens.text.primary, textWrap: "balance" }}>
              {currentTitle.name}
            </Typography>
            <Typography sx={{ mt: "6px", fontSize: "14px", color: tokens.text.secondary }}>{meta.join(" · ")}</Typography>
          </Box>

          {ratingsSync && (
            <Alert severity={ratingsSync.severity} onClose={() => setRatingsSync(null)}>
              {ratingsSync.text}
            </Alert>
          )}

          {transcodeMessage && (
            <Alert severity="error" onClose={resetTranscode}>
              {t("restartFailed")} {transcodeMessage}
            </Alert>
          )}

          <Tabs value={tab} onChange={(_, value: EditorTab) => setTab(value)} sx={{ borderBottom: `1px solid ${tokens.border.subtle}` }}>
            {tabs.map((value) => (
              <Tab key={value} value={value} label={tEditor(`tabs.${value}`)} {...tabA11y.tab(value)} />
            ))}
          </Tabs>

          <Box {...tabA11y.panel("details")} hidden={tab !== "details"} sx={{ pt: "8px", maxWidth: "820px" }}>
            <Box hidden={!isBase}>
              <TitleForm initialData={currentTitle} formId={formId} onEditStatusChange={setEditStatus} />
            </Box>
            {translationLocale && (
              <ContentTranslationEditor key={translationLocale} content={titleTranslations} id={title.id} locale={translationLocale} />
            )}
          </Box>

          {tab === "cast" && (
            <Box {...tabA11y.panel("cast")} sx={{ pt: "8px", maxWidth: "820px" }}>
              <TitleCastManager titleId={title.id} />
            </Box>
          )}

          {isSeries && tab === "seasons" && (
            <Box {...tabA11y.panel("seasons")} sx={{ pt: "8px" }}>
              <SeriesManagementSection
                titleId={title.id}
                seasons={seasons}
                selectedSeasonId={selectedSeasonId}
                onSelectSeason={setSelectedSeasonId}
                episodes={episodes}
              />
            </Box>
          )}
        </Box>

        <TitleSidePanel
          title={currentTitle}
          transcodingStatus={currentTranscodingStatus}
          isTranscoding={isTranscoding}
          isSyncingRatings={isSyncingRatings}
          isDeleting={isDeleting}
          onPreview={openPreviewModal}
          onRestartTranscoding={() => restartTranscoding(title.id)}
          onSyncRatings={() => {
            setRatingsSync(null);
            syncRatings(title.id);
          }}
          coverage={titleCoverage}
          isTranslationsPending={isTranslationsPending}
          isTranslationsError={isTranslationsError && !translations}
          onOpenLocale={openLocale}
          onDelete={openDeleteModal}
        />
      </Box>

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        titleName={currentTitle.name}
        isDeleting={isDeleting}
        error={describeError(deleteError)}
        onConfirm={() => deleteTitle(title.id)}
      />

      <VideoPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={closePreviewModal}
        streamUrl={streamUrl}
        title={currentTitle.name}
        isLoading={isPreviewLoading}
      />
    </Box>
  );
}

type EditorTab = "details" | "cast" | "seasons";

const TRANSLATED_FIELDS = ["name", "description"] as const;

function SeriesManagementSection({
  titleId,
  seasons,
  selectedSeasonId,
  onSelectSeason,
  episodes,
}: {
  titleId: string;
  seasons: Season[];
  selectedSeasonId?: string;
  onSelectSeason: (seasonId: string) => void;
  episodes: ReturnType<typeof useTitleDetails>["episodes"];
}) {
  const t = useTranslations("title.details");

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "minmax(0, 1fr)", xl: "minmax(0, 1fr) minmax(0, 1fr)" },
        gap: "32px",
        alignItems: "start",
      }}
    >
      <PlainSection title={t("sections.seasons.title")} description={t("sections.seasons.description")}>
        <SeasonManager seasons={seasons} titleId={titleId} selectedSeasonId={selectedSeasonId} onSelectSeason={onSelectSeason} />
      </PlainSection>

      {selectedSeasonId && (
        <PlainSection title={t("sections.episodes.title")} description={t("sections.episodes.description")}>
          <EpisodeManager seasonId={selectedSeasonId} episodes={episodes} />
        </PlainSection>
      )}
    </Box>
  );
}

function PlainSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Box component="section" sx={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>
      <Box>
        <Typography component="h2" variant="h4" sx={{ color: tokens.text.primary }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ mt: "4px" }}>
          {description}
        </Typography>
      </Box>
      {children}
    </Box>
  );
}
