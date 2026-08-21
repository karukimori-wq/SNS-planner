import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SNS Planner",
    short_name: "SNS Planner",
    description: "AI投稿作成・投稿管理・素材管理をひとつに。",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7fb",
    theme_color: "#635bff",
    lang: "ja",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
