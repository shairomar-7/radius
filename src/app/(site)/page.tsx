import Experience from "@/components/Experience";

export default function Home() {
  // The prototype is our own adapted copy of the Figma Make app, served at /demo (embeddable).
  // NEXT_PUBLIC_DEMO_EMBED_URL can still point the phone at something else without code changes.
  const embed = process.env.NEXT_PUBLIC_DEMO_EMBED_URL || "/demo";
  return <Experience demoEmbedUrl={embed} />;
}
