import { supabase } from '@/api/supabaseClient';

async function loadProfile(authUser) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  return {
    id: authUser.id,
    email: authUser.email,
    full_name: profile?.full_name ?? authUser.user_metadata?.full_name ?? '',
    job_title: profile?.job_title ?? '',
    department: profile?.department ?? '',
    bio: profile?.bio ?? '',
    default_workspace_id: profile?.default_workspace_id ?? null,
    preferred_board_view: profile?.preferred_board_view ?? 'kanban',
    created_date: profile?.created_at,
  };
}

export const auth = {
  async me() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      const err = new Error('Not authenticated');
      err.status = 401;
      throw err;
    }
    return loadProfile(data.user);
  },

  async updateMe(patch) {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) throw new Error('Not authenticated');

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({ id: data.user.id, email: data.user.email, ...patch }, { onConflict: 'id' });
    if (upsertError) throw upsertError;

    return loadProfile(data.user);
  },

  async logout() {
    await supabase.auth.signOut();
  },
};
