import PageNotFound from "@shared/ui/PageNotFound";
import SiteShell from "@shared/ui/SiteShell";

/**
 * Root not-found: reached by any unmatched URL, so it renders outside the
 * (main) layout and has to bring the site frame itself.
 */
export default function NotFound() {
  return (
    <SiteShell>
      <PageNotFound />
    </SiteShell>
  );
}
