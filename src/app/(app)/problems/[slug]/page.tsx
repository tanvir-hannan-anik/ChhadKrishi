import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProblemDetail } from "@/components/problems/problem-detail";
import { PROBLEMS, getProblem } from "@/lib/problems/data";

export function generateStaticParams() {
  return PROBLEMS.map((problem) => ({ slug: problem.slug }));
}

export async function generateMetadata({ params }: PageProps<"/problems/[slug]">): Promise<Metadata> {
  const problem = getProblem((await params).slug);
  if (!problem) return {};
  const { bn, en } = problem.content;
  return {
    title: `${bn.title} — ${en.title} | ChhadKrishi`,
    description: `${bn.summary} ${en.summary}`,
    openGraph: { images: [{ url: problem.image.src, width: problem.image.width, height: problem.image.height, alt: problem.image.alt.en }] },
  };
}

export default function ProblemPage({ params }: PageProps<"/problems/[slug]">) {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <Problem params={params} />
    </Suspense>
  );
}

async function Problem({ params }: Pick<PageProps<"/problems/[slug]">, "params">) {
  const problem = getProblem((await params).slug);
  if (!problem) notFound();
  return <ProblemDetail problem={problem} />;
}
