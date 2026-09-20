import SettingsIcon from "@mui/icons-material/Settings";
import Box from "@mui/material/Box";
import { useState } from "react";

import { usePlayerPlaybackRate, usePlayerQuality } from "../../CustomVideoPlayerContext";
import useDismissiblePanel from "../../hooks/useDismissiblePanel";
import { formatPlaybackRate } from "../../utils";
import QualityMenu from "./QualityMenu";
import SpeedMenu from "./SpeedMenu";

type SettingsTab = "quality" | "speed";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "quality", label: "Quality" },
  { id: "speed", label: "Speed" },
];

const tabPanelSx = {
  display: "flex",
  flexDirection: "column",
  maxHeight: "min(60vh, 320px)",
  overflowY: "auto",
  "&[hidden]": { display: "none" },
};

export default function Settings() {
  const { ref: panelRef, isOpen: isPanelOpen, toggle: togglePanel, close: closePanel } = useDismissiblePanel();
  const { set: setQuality } = usePlayerQuality();
  const { value: playbackRate } = usePlayerPlaybackRate();
  const [activeTab, setActiveTab] = useState<SettingsTab>("quality");

  const handleQualitySelect = (level: number) => {
    setQuality(level);
    closePanel();
  };

  return (
    <Box ref={panelRef} sx={{ position: "relative", display: "flex", alignItems: "center" }}>
      <Box
        component="button"
        type="button"
        onClick={togglePanel}
        aria-expanded={isPanelOpen}
        aria-label="Video settings"
        title={`Settings (${formatPlaybackRate(playbackRate)})`}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          border: 0,
          background: "transparent",
          color: "#fff",
          cursor: "pointer",
          "&:focus-visible": { outline: "2px solid #fff", outlineOffset: "3px", borderRadius: "4px" },
        }}
      >
        <SettingsIcon sx={{ color: "currentColor", transition: "transform 0.2s ease", "&:hover": { transform: "rotate(45deg)" } }} />
      </Box>

      {isPanelOpen && (
        <Box
          sx={{
            position: "absolute",
            bottom: "44px",
            right: 0,
            background: "rgba(15, 15, 15, 0.85)",
            backdropFilter: "blur(16px)",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "6px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            minWidth: "160px",
            zIndex: 20,
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.6)",
            animation: "fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            "@keyframes fadeIn": {
              from: { opacity: 0, transform: "translateY(8px) scale(0.95)" },
              to: { opacity: 1, transform: "translateY(0) scale(1)" },
            },
          }}
        >
          <Box
            role="tablist"
            aria-label="Video settings"
            sx={{ display: "flex", gap: "4px", padding: "2px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.06)" }}
          >
            {TABS.map((tab) => (
              <Box
                key={tab.id}
                component="button"
                type="button"
                role="tab"
                id={`settings-tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`settings-panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                sx={[
                  {
                    flex: 1,
                    border: 0,
                    background: "transparent",
                    color: "rgba(255, 255, 255, 0.65)",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "8px 10px",
                    borderRadius: "6px",
                    transition: "background 0.2s ease, color 0.2s ease",
                    "&:hover": { color: "#fff" },
                    "&:focus-visible": { outline: "2px solid #e7bc0f", outlineOffset: "-2px" },
                  },
                  activeTab === tab.id && { color: "#fff", background: "rgba(231, 188, 15, 0.35)" },
                ]}
              >
                {tab.label}
              </Box>
            ))}
          </Box>

          <Box
            role="tabpanel"
            id="settings-panel-quality"
            aria-labelledby="settings-tab-quality"
            hidden={activeTab !== "quality"}
            sx={tabPanelSx}
          >
            <QualityMenu onSelect={handleQualitySelect} />
          </Box>

          <Box
            role="tabpanel"
            id="settings-panel-speed"
            aria-labelledby="settings-tab-speed"
            hidden={activeTab !== "speed"}
            sx={tabPanelSx}
          >
            <SpeedMenu />
          </Box>
        </Box>
      )}
    </Box>
  );
}
