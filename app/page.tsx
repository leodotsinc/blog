import { allPosts, allProjects } from "contentlayer/generated";

import ArchitectureLab from "@/components/home/ArchitectureLab";
import BentoSection from "@/components/home/BentoSection";
import ContactSection from "@/components/home/ContactSection";
import PrinciplesSection from "@/components/home/PrinciplesSection";
import CustomCursor from "@/components/home/CustomCursor";
import Hero from "@/components/home/Hero";
import ScrollProgress from "@/components/home/ScrollProgress";
import StackBand from "@/components/home/StackBand";
import TimelineSection from "@/components/home/TimelineSection";
import WorkSection from "@/components/home/WorkSection";
import WritingSection from "@/components/home/WritingSection";

export const metadata = {
  title: "Leonardo Torres — Tech Lead & Solutions Architect",
  description:
    "Tech Lead at Getnet (Santander) with 9+ years designing systems that cannot fail — air traffic control and payment rails. Cloud-native architecture on Kubernetes, AWS and GCP, and AI where it earns its keep.",
};

export default function Home() {
  const projects = allProjects
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((project) => ({
      slug: project.slug,
      title: project.title,
      description: project.description,
      year: new Date(project.date).getFullYear().toString(),
      tags: project.tags,
      featured: project.featured,
    }));

  const posts = allPosts
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((post) => ({
      slug: post.slug,
      title: post.title,
      description: post.description,
      date: post.date,
      tags: post.tags,
    }));

  return (
    <div className="-mt-20">
      <ScrollProgress />
      <CustomCursor />

      <Hero />
      <ArchitectureLab />
      <PrinciplesSection />
      <BentoSection />

      <div className="mx-auto max-w-[73rem] px-6 sm:px-9 xl:px-0">
        <div className="hairline" />
      </div>

      <WorkSection items={projects} />

      <div className="mx-auto max-w-[73rem] px-6 sm:px-9 xl:px-0">
        <div className="hairline" />
      </div>

      <WritingSection posts={posts} />
      <TimelineSection />
      <StackBand />
      <ContactSection />
    </div>
  );
}
