import { allProjects } from "contentlayer/generated";
import SectionContainer from "@/components/SectionContainer";
import ContentCard from "@/components/shared/ContentCard";

export const metadata = {
  title: "Projects - Leo",
  description: "My projects and work",
  alternates: {
    canonical: "/projects",
  },
};

export default function ProjectsPage() {
  const projects = allProjects.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <SectionContainer>
      <div className="py-8">
        <header className="mb-12">
          <h1 className="text-5xl font-bold mb-4">Projects</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            A collection of projects I&apos;ve built throughout my career, from micro-frontend architectures to cloud-native platforms.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {projects.map((project) => (
            <ContentCard
              key={project.slug}
              href={`/projects/${project.slug}`}
              title={project.title}
              description={project.description}
              date={project.date}
              tags={project.tags}
              badge={project.featured ? "Featured" : undefined}
            />
          ))}
        </div>
      </div>
    </SectionContainer>
  );
}
