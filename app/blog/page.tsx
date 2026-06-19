import SectionContainer from "@/components/SectionContainer";
import ContentCard from "@/components/shared/ContentCard";
import { getBlogIndexPosts } from "@/lib/posts";

export const metadata = {
  title: "Blog - Leo",
  description: "Articles about software engineering, architecture, and development",
};

export default function BlogPage() {
  const posts = getBlogIndexPosts();

  return (
    <SectionContainer>
      <div className="py-8">
        <header className="mb-12">
          <h1 className="text-5xl font-bold mb-4">Blog</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Thoughts on software engineering, system design, and lessons learned building scalable applications.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {posts.map((post) => (
            <ContentCard
              key={post.slug}
              href={`/blog/${post.slug}`}
              title={post.title}
              description={post.description}
              date={post.date}
              tags={post.tags}
              dateStyle="long"
            />
          ))}
        </div>
      </div>
    </SectionContainer>
  );
}
