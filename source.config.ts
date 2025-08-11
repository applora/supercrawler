import {
  defineCollections,
  defineDocs,
  frontmatterSchema,
} from 'fumadocs-mdx/config';
import z from 'zod';

export const { docs, meta } = defineDocs({
  dir: 'content/docs',
});

export const blog = defineCollections({
  type: 'doc',
  dir: 'content/blog',
  async: true,
  schema: frontmatterSchema.extend({
    author: z.string(),
    date: z.string().date().or(z.date()),
  }),
});
