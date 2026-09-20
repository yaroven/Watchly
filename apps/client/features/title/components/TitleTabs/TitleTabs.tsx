"use client";

import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useEffect, useRef, useState } from "react";

export interface TitleTabsSection {
  id: string;
  label: string;
}

interface TitleTabsProps {
  sections: TitleTabsSection[];
}

/** Anchor tab bar for the title-detail page: scrolls to a section on click, highlights the section in view. */
export default function TitleTabs({ sections }: TitleTabsProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id);
  const isClickScrolling = useRef(false);

  useEffect(() => {
    const elements = sections.map(({ id }) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) return;
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -50% 0px" },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const handleChange = (_: React.SyntheticEvent, id: string) => {
    setActiveId(id);
    const el = document.getElementById(id);
    if (!el) return;

    isClickScrolling.current = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      isClickScrolling.current = false;
    }, 700);
  };

  return (
    <Box sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
      <Tabs value={activeId} onChange={handleChange} aria-label="Title sections">
        {sections.map(({ id, label }) => (
          <Tab key={id} value={id} label={label} />
        ))}
      </Tabs>
    </Box>
  );
}
