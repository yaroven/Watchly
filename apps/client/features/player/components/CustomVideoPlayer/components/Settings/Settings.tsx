import { Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";

import { usePlayerPlaybackRate, usePlayerQuality } from "../../CustomVideoPlayerContext";
import useDismissiblePanel from "../../hooks/useDismissiblePanel";
import { formatPlaybackRate } from "../../utils";
import QualityMenu from "./QualityMenu";
import styles from "./Settings.module.scss";
import SpeedMenu from "./SpeedMenu";

type SettingsTab = "quality" | "speed";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "quality", label: "Quality" },
  { id: "speed", label: "Speed" },
];

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
    <div ref={panelRef} className={styles.settingsContainer}>
      <button
        type="button"
        className={styles.settingsButton}
        onClick={togglePanel}
        aria-expanded={isPanelOpen}
        aria-label="Video settings"
        title={`Settings (${formatPlaybackRate(playbackRate)})`}
      >
        <SettingsIcon className={styles.settingsIcon} />
      </button>

      {isPanelOpen && (
        <div className={styles.settingsPopup}>
          <div className={styles.tabList} role="tablist" aria-label="Video settings">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`settings-tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`settings-panel-${tab.id}`}
                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            id="settings-panel-quality"
            aria-labelledby="settings-tab-quality"
            hidden={activeTab !== "quality"}
            className={styles.tabPanel}
          >
            <QualityMenu onSelect={handleQualitySelect} />
          </div>

          <div
            role="tabpanel"
            id="settings-panel-speed"
            aria-labelledby="settings-tab-speed"
            hidden={activeTab !== "speed"}
            className={styles.tabPanel}
          >
            <SpeedMenu />
          </div>
        </div>
      )}
    </div>
  );
}
