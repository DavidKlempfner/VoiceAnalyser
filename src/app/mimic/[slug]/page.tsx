import { notFound } from "next/navigation";
import { celebrities } from "@/data/celebrities";
import MimicChallenge from "@/components/MimicChallenge";

export function generateStaticParams() {
  return celebrities.map(({ slug }) => ({ slug }));
}

export default async function CelebrityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const celebrity = celebrities.find((item) => item.slug === slug);
  if (!celebrity) notFound();
  return <MimicChallenge key={celebrity.slug} celebrity={celebrity} />;
}
