import { supabase } from '@/api/supabaseClient';

// Maps the entity names used throughout the app (Base44-style, PascalCase)
// to the actual Postgres table names created by the Supabase setup script.
const TABLES = {
  Board: 'boards',
  TaskList: 'task_lists',
  Card: 'cards',
  Workspace: 'workspaces',
  BoardMember: 'board_members',
  WorkspaceMember: 'workspace_members',
  Activity: 'activities',
  CardTimeEntry: 'card_time_entries',
  User: 'profiles',
  BoardTemplate: 'board_templates',
  CardTemplate: 'card_templates',
  UserNewsPreferences: 'user_news_preferences',
};

// The app's date fields carry over from Base44 naming (created_date/updated_date);
// Postgres columns use created_at/updated_at. Translate both ways at the edges
// so page/component code doesn't need to change.
const FIELD_ALIASES = { created_date: 'created_at', updated_date: 'updated_at' };

// Base44 auto-stamped created_by (email) / created_by_id on every record.
// The app reads that back (e.g. to tell if the current user owns a board).
// Only these tables carry those columns — see the follow-up migration.
const SUPPORTS_CREATED_BY = new Set(['Board', 'TaskList', 'Card', 'Workspace']);

function toDbSortField(sort) {
  if (!sort) return undefined;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort.replace(/^\+/, '');
  return { column: FIELD_ALIASES[field] || field, ascending: !desc };
}

function withDisplayAliases(record) {
  if (!record) return record;
  const out = { ...record };
  if (out.created_at !== undefined) out.created_date = out.created_at;
  if (out.updated_at !== undefined) out.updated_date = out.updated_at;
  return out;
}

function applyFilterOperators(query, key, value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if ('$gte' in value) query = query.gte(key, value.$gte);
    if ('$gt' in value) query = query.gt(key, value.$gt);
    if ('$lte' in value) query = query.lte(key, value.$lte);
    if ('$lt' in value) query = query.lt(key, value.$lt);
    if ('$ne' in value) query = query.neq(key, value.$ne);
    if ('$in' in value) query = query.in(key, value.$in);
    return query;
  }
  if (Array.isArray(value)) return query.in(key, value);
  if (value === null) return query.is(key, null);
  return query.eq(key, value);
}

function createEntityHandler(entityName) {
  const table = TABLES[entityName];
  if (!table) {
    throw new Error(`[entitiesAdapter] No table mapped for entity "${entityName}" yet — this feature hasn't been wired to Supabase.`);
  }

  const base = () => supabase.from(table);

  async function runList({ query, sort, limit, skip, fields } = {}) {
    let q = base().select(fields ? fields.join(',') : '*');
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        q = applyFilterOperators(q, FIELD_ALIASES[key] || key, value);
      }
    }
    const sortSpec = toDbSortField(sort) || { column: 'created_at', ascending: false };
    q = q.order(sortSpec.column, { ascending: sortSpec.ascending });
    if (limit) q = q.limit(limit);
    if (skip) q = q.range(skip, skip + (limit || 50) - 1);
    const { data, error } = await q;
    if (error) throw error;
    return data.map(withDisplayAliases);
  }

  return {
    async list(sort, limit, skip, fields) {
      return runList({ sort, limit, skip, fields });
    },
    async filter(query, sort, limit, skip, fields) {
      return runList({ query, sort, limit, skip, fields });
    },
    async get(id) {
      const { data, error } = await base().select('*').eq('id', id).single();
      if (error) throw error;
      return withDisplayAliases(data);
    },
    async create(data) {
      let payload = data;
      if (SUPPORTS_CREATED_BY.has(entityName) && !data.created_by) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) payload = { ...data, created_by: user.email, created_by_id: user.id };
      }
      const { data: created, error } = await base().insert(payload).select().single();
      if (error) throw error;
      return withDisplayAliases(created);
    },
    async update(id, data) {
      const { data: updated, error } = await base().update(data).eq('id', id).select().single();
      if (error) throw error;
      return withDisplayAliases(updated);
    },
    async delete(id) {
      const { error } = await base().delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },
    subscribe(callback) {
      const channel = supabase
        .channel(`entities:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          const type = payload.eventType === 'INSERT' ? 'create' : payload.eventType === 'DELETE' ? 'delete' : 'update';
          const record = payload.new ?? payload.old;
          callback({
            type,
            data: withDisplayAliases(record),
            id: record?.id,
            timestamp: new Date().toISOString(),
          });
        })
        .subscribe();
      return () => supabase.removeChannel(channel);
    },
  };
}

export const entities = new Proxy({}, {
  get(target, entityName) {
    if (typeof entityName !== 'string' || entityName === 'then' || entityName.startsWith('_')) {
      return undefined;
    }
    return createEntityHandler(entityName);
  },
});
