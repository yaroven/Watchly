import styles from "./PageSkeletons.module.scss";
import Skeleton from "./Skeleton";

export function SitePageSkeleton() {
  return (
    <div className={styles.siteShell}>
      <div className={styles.siteHeader}>
        <div className={styles.siteHeaderNav}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} height={18} borderRadius={999} />
          ))}
        </div>
      </div>

      <div className={styles.siteContent}>
        <div className={styles.siteHero}>
          <Skeleton width="28%" height={18} />
          <Skeleton width="48%" height={56} />
          <Skeleton width="72%" height={22} />
          <div className={styles.siteMetaRow}>
            <Skeleton width={120} height={38} borderRadius={999} />
            <Skeleton width={140} height={38} borderRadius={999} />
            <Skeleton width={110} height={38} borderRadius={999} />
          </div>
        </div>

        <div className={styles.siteGrid}>
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className={styles.card}>
              <Skeleton height={225} borderRadius={20} />
              <Skeleton height={20} width="86%" />
              <Skeleton height={16} width="52%" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminPageSkeleton() {
  return (
    <div className={styles.adminShell}>
      <div className={styles.adminHero}>
        <div className={styles.adminHeroText}>
          <Skeleton width="20%" height={16} />
          <Skeleton width="42%" height={52} />
          <Skeleton width="68%" height={20} />
        </div>
        <Skeleton width={220} height={58} borderRadius={20} />
      </div>

      <div className={styles.adminPanels}>
        <div className={styles.adminPanel}>
          <Skeleton width={160} height={22} />
          <div className={styles.adminFilterRow}>
            <Skeleton height={58} borderRadius={18} />
            <Skeleton height={58} borderRadius={18} />
            <Skeleton height={58} borderRadius={18} />
            <Skeleton height={58} borderRadius={18} />
          </div>
        </div>

        <div className={styles.adminPanel}>
          <div className={styles.adminTableHeader}>
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} width="70%" height={18} />
            ))}
          </div>

          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={styles.adminTableRow}>
              <div className={styles.titleCell}>
                <Skeleton width={56} height={82} borderRadius={16} />
                <div className={styles.adminHeroText}>
                  <Skeleton width="70%" height={22} />
                  <Skeleton width="38%" height={16} />
                </div>
              </div>
              <Skeleton width="52%" height={20} />
              <Skeleton width="60%" height={20} />
              <Skeleton width="72%" height={36} borderRadius={999} />
              <Skeleton width="58%" height={42} borderRadius={14} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AuthPageSkeleton() {
  return (
    <div className={styles.authShell}>
      <div className={styles.authCard}>
        <Skeleton width="34%" height={16} />
        <Skeleton width="52%" height={42} />
        <Skeleton width="80%" height={18} />

        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className={styles.formField}>
            <Skeleton width="24%" height={14} />
            <Skeleton height={52} borderRadius={16} />
          </div>
        ))}

        <div className={styles.formField}>
          <Skeleton width="28%" height={14} />
          <Skeleton height={52} borderRadius={16} />
        </div>

        <Skeleton height={54} borderRadius={18} />
      </div>
    </div>
  );
}
