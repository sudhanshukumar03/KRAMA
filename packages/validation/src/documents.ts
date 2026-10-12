import { z } from 'zod';

/**
 * Validate metadata fields before they reach Prisma. expectedUpdatedAt is the
 * server revision last seen by the editor and is checked during the update.
 */
export const UpdateDocumentMetadataSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  subtitle: z.string().max(2000).nullable().optional(),
  statusBadges: z.array(z.string().max(100)).max(20).optional(),
  documentType: z.enum(['SPEC', 'NOTE', 'MEETING', 'IDEA', 'RFC', 'GENERAL']).optional(),
  isFavorite: z.boolean().optional(),
  icon: z.string().max(128).nullable().optional(),
  projectId: z.string().nullable().optional(),
  linkedProjectId: z.string().nullable().optional(),
  expectedUpdatedAt: z.string().datetime().optional(),
});
