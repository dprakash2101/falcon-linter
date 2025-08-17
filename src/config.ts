import { z } from 'zod';

const bitbucketSchema = z.object({
  BITBUCKET_USERNAME: z.string().optional(),
  BITBUCKET_APP_PASSWORD: z.string().optional(),
});

const githubSchema = z.object({
  GITHUB_TOKEN: z.string().optional(),
});

const debugSchema = z.object({
  DEBUG_MODE: z.string().optional(),
});

const credentialsSchema = bitbucketSchema.merge(githubSchema).merge(debugSchema);

const credentials = credentialsSchema.parse(process.env);

export default {
  ...credentials,
  DEBUG_MODE: credentials.DEBUG_MODE === 'true',
};