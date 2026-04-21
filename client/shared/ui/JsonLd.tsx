import { Title, TitleType } from "@/features/title/schemas/title";

interface JsonLdProps {
  data: Title;
}

export default function JsonLd({ data }: JsonLdProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": data.type === TitleType.MOVIE ? "Movie" : "TVSeries",
    name: data.name,
    description: data.description,
    image: data.posterUrl || "/cat.webp",
    datePublished: data.createdAt,
    // Add more fields if available in the Title type (e.g. genre, actors etc)
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
