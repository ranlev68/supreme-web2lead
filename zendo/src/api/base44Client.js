// Backend has moved from Base44 to Supabase. This file keeps the same
// `base44.entities.X` / `base44.auth` shape the rest of the app already calls,
// so pages/components didn't need to change — only what's behind them did.
import { entities } from '@/api/entitiesAdapter';
import { auth } from '@/api/authAdapter';
import { UploadFile } from '@/api/storageAdapter';

// InvokeLLM (AI checklist generation, image-to-card, status summaries, news
// feed) isn't wired up yet — deliberately deferred, not part of this pass.
export const base44 = { entities, auth, integrations: { Core: { UploadFile } } };
