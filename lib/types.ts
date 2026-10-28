export type Theme = "ink" | "chalk" | "sun" | "lagos" | "cobalt";
export type Shape = "square" | "round" | "pill";
export type Fill = "solid" | "outline" | "soft";
export type Kind = "link" | "header" | "social";

export type Profile = {
  id: string;
  username: string;
  name: string;
  headline: string;
  bio: string;
  theme: Theme;
  shape: Shape;
  fill: Fill;
};

export type LinkRow = {
  id: string;
  kind: Kind;
  title: string;
  url: string;
  enabled: boolean;
};

export type Stats = {
  daily: { day: string; views: number; clicks: number }[];
  per_link: { link_id: string; clicks: number }[];
  referrers: { referrer: string; views: number }[];
};
