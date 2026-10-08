import { allResumes } from "contentlayer/generated";
import { notFound } from "next/navigation";
import ResumeLayout from "@/components/resume/ResumeLayout";
import TableOfContents from "@/components/resume/TableOfContents";
import MDXContent from "@/components/resume/MDXContent";

export const metadata = {
  title: "Resume - Leo",
  description: "Professional resume and CV",
  alternates: {
    canonical: "/resume",
  },
};

export default function ResumePage() {
  const resume = allResumes.find((r) => r.slug === "default") || allResumes[0];

  if (!resume) {
    notFound();
  }

  return (
    <ResumeLayout toc={<TableOfContents />}>
      <article>
        <header className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{resume.name}</h1>
          <p className="text-lg text-muted-foreground">{resume.occupation}</p>
        </header>

        <MDXContent code={resume.body.code} />
      </article>
    </ResumeLayout>
  );
}
