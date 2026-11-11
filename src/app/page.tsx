import Experience from "@/components/Experience";

const DEFAULT_FIGMA = "https://www.figma.com/make/pgEVOlmtzny3DNh0VELMGu/Radius-Mockup?p=f";

function embedUrl(): { embed: string; open: string } {
  // Override with NEXT_PUBLIC_DEMO_EMBED_URL (e.g. a published *.figma.site URL) without code changes.
  const override = process.env.NEXT_PUBLIC_DEMO_EMBED_URL;
  const open = process.env.NEXT_PUBLIC_DEMO_OPEN_URL || override || DEFAULT_FIGMA;
  if (override) return { embed: override, open };
  return {
    embed: `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(DEFAULT_FIGMA)}`,
    open,
  };
}

export default function Home() {
  const { embed, open } = embedUrl();
  return <Experience demoEmbedUrl={embed} demoOpenUrl={open} />;
}
