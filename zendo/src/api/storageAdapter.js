import { supabase } from '@/api/supabaseClient';

const BUCKET = 'uploads';

// Matches the shape the app already expects from Base44's file-upload
// integration: pass a File, get back { file_url }.
export async function UploadFile({ file }) {
  const ext = file.name?.split('.').pop() || 'bin';
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { file_url: data.publicUrl };
}
