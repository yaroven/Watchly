import { Title as TitleI, TitleType } from "@/app/types/title";
import Title from "../Title";
import styles from "./TitleList.module.scss";

interface TitleListProps {
  titles: TitleI[];
  onClick?: (id: string, type: TitleType) => void;
}

export default function TitleList({ titles, onClick }: TitleListProps) {
  return (
    <div className={styles.titleContainer}>
      {titles.map((data) => (
        <Title onClick={() => onClick && onClick(data.id, data.type)} key={data.id} {...data} />
      ))}
    </div>
  );
}
