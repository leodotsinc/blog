import { allPosts, allProjects } from "contentlayer/generated";

import { headerNavLinks } from "@/data/navLinks";
import type { CommandItem } from "@/components/nav/CommandPalette";

/**
 * Flat searchable index for the ⌘K palette. Built on the server so the client
 * bundle never carries the whole content layer.
 */
export function buildCommandIndex(): CommandItem[] {
  const pages: CommandItem[] = headerNavLinks
    .filter((link) => !link.hidden)
    .map((link) => ({
      title: link.title,
      href: link.href,
      group: "Page",
    }));

  const posts: CommandItem[] = allPosts
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((post) => ({
      title: post.title,
      href: `/blog/${post.slug}`,
      group: "Post",
      hint: post.description,
    }));

  const projects: CommandItem[] = allProjects
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((project) => ({
      title: project.title,
      href: `/projects/${project.slug}`,
      group: "Project",
      hint: project.description,
    }));

  return [...pages, ...projects, ...posts];
}
