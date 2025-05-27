import { z } from 'zod';

// Base task schema
const BaseTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  points: z.number().min(0, 'Points must be non-negative'),
  completed: z.boolean().optional().default(false),
});

// Video task schema
const VideoTaskSchema = BaseTaskSchema.extend({
  videoUrl: z.string().url('Must be a valid URL'),
  thumbnailUrl: z.string().url('Must be a valid URL'),
  sequence: z.number().min(1).optional(),
  lastWatchedSegment: z.number().min(0).optional(),
});

// Social task schema
const SocialTaskSchema = BaseTaskSchema.extend({
  platform: z.string().min(1, 'Platform is required'),
  tweetLink: z.string().url('Must be a valid URL'),
  hashtags: z.array(z.string()).default([]),
  type: z.literal('social'),
  requirements: z.object({
    platform: z.string(),
    action: z.string(),
    tags: z.array(z.string()),
    prerequisiteVideos: z.number().min(0).optional(),
  }),
});

// Referral task schema
const ReferralTaskSchema = BaseTaskSchema.extend({
  percents: z.number().min(0).max(100, 'Percentage must be between 0-100'),
  type: z.literal('referral'),
  instructions: z.string().min(1, 'Instructions are required'),
  message: z.string().min(1, 'Message template is required'),
  invitees: z.union([z.array(z.string()), z.number()]).optional(),
  questImage: z.string().url().optional(),
});

// Quests schema
const QuestsSchema = z.object({
  videoTasks: z.array(VideoTaskSchema).default([]),
  socialTasks: z.array(SocialTaskSchema).default([]),
  referralTask: ReferralTaskSchema.optional(),
});

// Welcome screen configuration
const WelcomeScreenSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  buttonText: z.string().optional(),
  agreementText: z.string().optional(),
  privacyText: z.string().optional(),
  privacyLink: z.string().url().optional(),
  sliderContent: z
    .array(
      z.object({
        icon: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  cssVariables: z.record(z.string()).optional(),
});

// Campaign configuration schema
const CampaignConfigSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
  status: z.enum(['active', 'paused', 'expired'], {
    errorMap: () => ({ message: 'Status must be active, paused, or expired' }),
  }),
  description: z.string().min(1, 'Description is required'),
  debug: z.boolean().default(false),
  configuration: z
    .object({
      welcomeScreen: WelcomeScreenSchema.optional(),
    })
    .optional(),
});

// Form data schema (the main campaign data structure)
export const FormDataSchema = z.object({
  campaign: CampaignConfigSchema,
  quests: QuestsSchema,
  leaderboard: z.array(z.any()).default([]),
  metadata: z
    .object({
      version: z.string(),
      exportTimestamp: z.string().datetime(),
      format: z.string(),
    })
    .optional(),
});

// Full campaign schema (from RMS service)
export const CampaignSchema = z.object({
  campaignId: z.number().positive('Campaign ID must be positive').or(z.string().transform(Number)),
  status: z.number().min(0),
  startDate: z.string(),
  endDate: z.string(),
  campaignName: z.string().min(1, 'Campaign name is required'),
  // Fix: Handle type as number or string, convert to string
  type: z
    .union([
      z.string().nullable(),
      z
        .number()
        .nullable()
        .transform((val) => val?.toString() ?? null),
      z.null(),
    ])
    .optional(),
  likeId: z.string().optional(),
  archive: z.number().min(0).optional(),
  mobile: z.number().min(0).optional(),
  userName: z.string().optional(),
  modDate: z.string().optional(),
  guid: z.string().optional(),
  formData: z.union([
    FormDataSchema, // Already an object
    z
      .string()
      .transform((str) => {
        try {
          return JSON.parse(str);
        } catch {
          throw new Error('Invalid JSON in formData string');
        }
      })
      .pipe(FormDataSchema), // Parse string then validate
    z.any().transform((data) => {
      // Handle any other case - try to use as-is
      return data;
    }),
  ]),
  templateHtml: z.string().optional(),
});

// Template schema - Updated to match actual API response
export const TemplateSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1, 'Template name is required'),
    type: z.string(), // Accept any string, we'll validate in the transform
    theme: z.string().default('light'),
    params: z.string().min(1, 'Template params are required'),
    archived: z.number().min(0).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    createdBy: z.string().optional(),
    updatedBy: z.string().optional(),
    guid: z.string().optional(),
  })
  .transform((data) => {
    // Normalize the type to what we expect
    const normalizedType = ['GET_QUESTS', 'GET_LEADERBOARD'].includes(data.type)
      ? (data.type as 'GET_QUESTS' | 'GET_LEADERBOARD')
      : ('GET_QUESTS' as const);

    return {
      ...data,
      type: normalizedType,
    };
  });

// Export types
export type Campaign = z.infer<typeof CampaignSchema>;
export type FormData = z.infer<typeof FormDataSchema>;
export type VideoTask = z.infer<typeof VideoTaskSchema>;
export type SocialTask = z.infer<typeof SocialTaskSchema>;
export type ReferralTask = z.infer<typeof ReferralTaskSchema>;
export type Template = z.infer<typeof TemplateSchema>;

// Validation functions
export const validateCampaign = (data: unknown): Campaign => {
  return CampaignSchema.parse(data);
};

export const validateTemplate = (data: unknown): Template => {
  return TemplateSchema.parse(data);
};

export const validateFormData = (data: unknown): FormData => {
  return FormDataSchema.parse(data);
};
