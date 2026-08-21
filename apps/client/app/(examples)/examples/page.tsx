"use client";
import { TranscodingStatus } from "@/types";
import TitleCard from "@features/title/components/TitleCard";
import { TitleType } from "@features/title/schemas/title";
import MuiThemeProvider from "@shared/mui/MuiThemeProvider";
import Button from "@shared/ui/Button";

/**
 * Demo route — visit /examples/mui-profile locally to see the
 * MUI-based Profile page pattern rendered live. Not linked from
 * navigation; delete this route group once the pattern is adopted
 * (or rejected) for real pages.
 */
export default function MuiProfileExamplePage() {
  return (
    <MuiThemeProvider>
      <div style={{ minHeight: "100vh", background: "#191919" }}>
        <Button danger={true} variant={"outlined"}>
          Test
        </Button>
        <TitleCard
          onClick={() => {}}
          id={"1"}
          createdAt={new Date()}
          updatedAt={new Date()}
          name={"123"}
          description={"12341"}
          type={TitleType.MOVIE}
          transcodingStatus={TranscodingStatus.COMPLETED}
          rating={1}
        ></TitleCard>
      </div>
    </MuiThemeProvider>
  );
}
