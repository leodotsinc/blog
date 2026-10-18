import { defineDocumentType, defineNestedType, makeSource } from "contentlayer2/source-files";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";

export const Resume = defineDocumentType(() => ({
  name: "Resume",
  filePathPattern: "resume/**/*.mdx",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    name: { type: "string", required: true },
    occupation: { type: "string", required: true },
    summary: { type: "string", required: false },
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc) => doc._raw.flattenedPath.replace("resume/", ""),
    },
  },
}));

export const Project = defineDocumentType(() => ({
  name: "Project",
  filePathPattern: "projects/**/*.mdx",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    description: { type: "string", required: true },
    date: { type: "date", required: true },
    tags: { type: "list", of: { type: "string" }, required: true },
    image: { type: "string", required: false },
    github: { type: "string", required: false },
    demo: { type: "string", required: false },
    featured: { type: "boolean", required: false, default: false },
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc) => doc._raw.flattenedPath.replace("projects/", ""),
    },
  },
}));

export const Post = defineDocumentType(() => ({
  name: "Post",
  filePathPattern: "blog/**/*.mdx",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    description: { type: "string", required: true },
    date: { type: "date", required: true },
    tags: { type: "list", of: { type: "string" }, required: true },
    image: { type: "string", required: false },
    locale: { type: "string", required: false },
    canonical: { type: "string", required: false },
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc) =>
        doc._raw.flattenedPath
          .replace("blog/", "")
          .replace(/\.(en|pt-br)$/, ""),
    },
  },
}));

// Leo's Journal: plain Markdown written by a bot. Rendering and validation live
// in lib/journal/core.mjs (scripts/journal-validate.mjs runs before the build);
// these fields give the generated types. Contentlayer's default Markdown
// pipeline drops raw HTML, and pages never render `body.html`.
const JournalSource = defineNestedType(() => ({
  name: "JournalSource",
  fields: {
    name: { type: "string", required: true },
    url: { type: "string", required: true },
  },
}));

const JournalStorySource = defineNestedType(() => ({
  name: "JournalStorySource",
  fields: {
    kind: { type: "enum", options: ["the-news", "filipe-deschamps", "pesquisa-propria"], required: true },
    url: { type: "string", required: true },
    label: { type: "string", required: false },
  },
}));

const JournalImage = defineNestedType(() => ({
  name: "JournalImage",
  fields: {
    src: { type: "string", required: true },
    alt: { type: "string", required: true },
    credit: { type: "string", required: false },
  },
}));

const JournalStory = defineNestedType(() => ({
  name: "JournalStory",
  fields: {
    id: { type: "string", required: true },
    section: { type: "enum", options: ["brasil", "mundo", "economia", "tecnologia"], required: true },
    title: { type: "string", required: true },
    sources: { type: "list", of: JournalStorySource, required: true },
    update_of: { type: "date", required: false },
    image: { type: "nested", of: JournalImage, required: false },
  },
}));

export const JournalEdition = defineDocumentType(() => ({
  name: "JournalEdition",
  filePathPattern: "journal/*.md",
  contentType: "markdown",
  fields: {
    title: { type: "string", required: true },
    date: { type: "date", required: true },
    edition: { type: "number", required: true },
    description: { type: "string", required: true },
    highlights: { type: "list", of: { type: "string" }, required: true },
    sources: { type: "list", of: JournalSource, required: true },
    stories: { type: "list", of: JournalStory, required: true },
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc) => doc._raw.flattenedPath.replace("journal/", ""),
    },
  },
}));

export default makeSource({
  contentDirPath: "data",
  documentTypes: [Resume, Project, Post, JournalEdition],
  mdx: {
    rehypePlugins: [
      rehypeSlug,
      [rehypePrettyCode, { theme: "github-dark-dimmed" }],
    ],
  },
});
