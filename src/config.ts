import { z } from 'zod';

const bitbucketSchema = z.object({
  BITBUCKET_USERNAME: z.string().optional(),
  BITBUCKET_APP_PASSWORD: z.string().optional(),
});

const githubSchema = z.object({
  GITHUB_TOKEN: z.string().optional(),
});

const credentialsSchema = bitbucketSchema.merge(githubSchema);

const credentials = credentialsSchema.parse(process.env);

export default {
  ...credentials,
};