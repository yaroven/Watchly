import { Title as TitleI, TitleType } from "@/features/title/schemas/title";
import TitleCard from "../TitleCard";
import styles from "./TitleList.module.scss";

interface TitleListProps {
  titles: TitleI[];
  onClick?: (id: string, type: TitleType) => void;
}

export default function TitleList({ titles, onClick }: TitleListProps) {
  return (
    <div className={styles.titleContainer}>
      {titles.map((data) => (
        <TitleCard onClick={() => onClick && onClick(data.id, data.type)} key={data.id} {...data} />
      ))}
    </div>
  );
}
