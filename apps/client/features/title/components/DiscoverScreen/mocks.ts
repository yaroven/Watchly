import { APP } from "@/shared/lib/routes";
import type { SpotlightTitle } from "@features/title/components/SpotlightGrid";
import type { SliderTitle } from "@shared/ui/HeroSlider";

/**
 * TEMPORARY: design-file fixtures for the parts of the discover screen that
 * have no endpoint yet (hero carousel, news rail, spotlight grid). Drop this
 * file once those endpoints land; nothing else imports it.
 */

export const heroSlides: SliderTitle[] = [
  {
    id: "mock-1",
    title: "Game of Thrones",
    description: "It's the story of the intricate and bloody battles of several noble families in the fictional land of Westeros.",
    score: "9.2",
    backdropUrl: "/banner.png",
    watchLink: APP.DISCOVER,
    trailerLink: APP.DISCOVER,
    genres: ["Action", "Adventure", "Drama"],
  },
  {
    id: "mock-2",
    title: "House of the Dragon",
    description: "An internal succession war within House Targaryen at the height of its power, 172 years before the birth of Daenerys.",
    score: "8.4",
    backdropUrl: "https://picsum.photos/id/1015/1600/500",
    watchLink: APP.DISCOVER,
    genres: ["Fantasy", "Drama"],
  },
  {
    id: "mock-3",
    title: "Peaky Blinders",
    description: "A gangster family epic set in 1900s England, centring on a gang who sew razor blades in the peaks of their caps.",
    score: "8.8",
    backdropUrl: "https://picsum.photos/id/1039/1600/500",
    watchLink: APP.DISCOVER,
    trailerLink: APP.DISCOVER,
    genres: ["Crime", "Drama"],
  },
];

export const news = [
  {
    id: "1",
    text:
      '"Slow Horses," the popular spy drama, has been renewed for a fifth season, much to the delight of its dedicated fanbase. The\n' +
      "          highly anticipated fourth season is set to premiere on September 4, 2024, promising more thrilling storylines and complex\n" +
      "          characters that viewers have come to love. Notable cast members, including the acclaimed Gary Oldman and Cillian Murphy, will\n" +
      "          continue to bring depth and intrigue to the series.",
    image: "/HotNews.png",
    createdAt: new Date("2026-07-25"),
  },
  {
    id: "2",
    text:
      "HBO has greenlit a second season ahead of the finale, citing record viewership across its streaming platform.\n\n" +
      "Production is expected to begin next spring, with both leads returning.",
    image: "https://picsum.photos/id/1074/536/340",
    createdAt: new Date("2026-07-19"),
  },
  {
    id: "3",
    text:
      "Denis Villeneuve confirms the third instalment is in active development, with a script already handed to the studio.\n\n" +
      "Filming is pencilled in for late next year, subject to cast availability.",
    image: "https://picsum.photos/id/1084/536/340",
    createdAt: new Date("2026-07-11"),
  },
  {
    id: "4",
    text:
      'The streaming rights to "Peaky Blinders" have moved again, bringing all six seasons back to a single catalogue.\n\n' +
      "A feature-length continuation remains in pre-production.",
    image: "https://picsum.photos/id/1027/536/340",
    createdAt: new Date("2026-07-03"),
  },
  {
    id: "5",
    text:
      "This year's festival line-up leans heavily on genre cinema, with four horror premieres scheduled for opening weekend.\n\n" +
      "Tickets go on sale to members first.",
    image: "https://picsum.photos/id/1039/536/340",
    createdAt: new Date("2026-06-28"),
  },
];

export const spotlight: Record<"feature" | "secondary" | "tall", SpotlightTitle> = {
  feature: {
    id: "shogun",
    name: "Shogun",
    tagline: "Uncovering Secrets, Shifting Powers",
    description:
      "When a mysterious European ship sinks near a nearby fishing village, Lord Yoshi Toranaga uncovers secrets that could tip the balance of power and devastate his enemies. He must act quickly to protect his realm from the looming threat.",
    imageUrl: "/spotlight/banner_shogun.png",
    watchLink: APP.DISCOVER,
  },
  secondary: {
    id: "sympathizer",
    name: "The Sympathizer",
    genres: ["Historical", "Drama", "Thriller"],
    imageUrl: "/spotlight/banner_the_sympathizer.png",
    watchLink: APP.DISCOVER,
  },
  tall: {
    id: "small-light",
    name: "A Small Light",
    tagline: "Risk Everything",
    imageUrl: "/spotlight/banner_a_small_light.png",
    watchLink: APP.DISCOVER,
  },
};
