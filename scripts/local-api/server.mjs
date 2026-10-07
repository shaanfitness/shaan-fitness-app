// Local stand-in for Supabase's API (PostgREST + the bits of Auth the app uses),
// for testing on a laptop or in CI against a throwaway Postgres. Never deployed.
//
// It runs every request as the "authenticated" role with the caller's user id, the
// same way Supabase does, so the database's row-level security is what decides
// what each login sees. Any password is accepted for an existing auth.users email.
//
// Usage: DATABASE_URL=postgres://... PORT=54321 node scripts/local-api/server.mjs
import http from 'node:http'
import crypto from 'node:crypto'
import pg from 'pg'

const PORT = Number(process.env.PORT ?? 54321)
const SECRET = process.env.JWT_SECRET ?? 'local-dev-secret-not-for-production'
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 8 })

// ---------------------------------------------------------------------------
// JWT (HS256)
// ---------------------------------------------------------------------------
const b64url = (buf) => Buffer.from(buf).toString('base64url')
export function signJwt(claims) {
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64url(JSON.stringify(claims))
  const sig = b64url(crypto.createHmac('sha256', SECRET).update(`${head}.${body}`).digest())
  return `${head}.${body}.${sig}`
}
function verifyJwt(token) {
  const [head, body, sig] = (token ?? '').split('.')
  if (!head || !body || !sig) return null
  const expect = b64url(crypto.createHmac('sha256', SECRET).update(`${head}.${body}`).digest())
  if (expect !== sig) return null
  const claims = JSON.parse(Buffer.from(body, 'base64url').toString())
  if (claims.exp && claims.exp < Date.now() / 1000) return null
  return claims
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const qi = (s) => '"' + String(s).replace(/"/g, '""') + '"'

const columnTypes = new Map()
async function typesOf(client, table) {
  if (columnTypes.has(table)) return columnTypes.get(table)
  const { rows } = await client.query(
    `select a.attname, format_type(a.atttypid, a.atttypmod) as type, a.attgenerated <> '' as generated
     from pg_attribute a where a.attrelid = ('public.' || quote_ident($1))::regclass and a.attnum > 0 and not a.attisdropped`, [table])
  const map = new Map(rows.map((r) => [r.attname, r]))
  columnTypes.set(table, map)
  return map
}

// Split on commas that are not inside parentheses or double quotes.
function splitTop(s) {
  const out = []; let depth = 0, quote = false, cur = ''
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch === '"' && s[i - 1] !== '\\') quote = !quote
    if (!quote && ch === '(') depth++
    if (!quote && ch === ')') depth--
    if (!quote && depth === 0 && ch === ',') { out.push(cur); cur = ''; continue }
    cur += ch
  }
  if (cur !== '') out.push(cur)
  return out
}
const unquote = (v) => (v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1).replace(/\\"/g, '"') : v)

class ApiError extends Error {
  constructor(status, body) { super(body.message); this.status = status; this.body = body }
}

// Builds a WHERE fragment from a PostgREST filter like "eq.5" or "not.in.(a,b)".
function filterSql(col, expr, params, types) {
  let neg = false
  if (expr.startsWith('not.')) { neg = true; expr = expr.slice(4) }
  const dot = expr.indexOf('.')
  const op = expr.slice(0, dot)
  const raw = expr.slice(dot + 1)
  const type = types?.get(col)?.type
  const cast = type ? `::${type}` : ''
  const p = (v) => { params.push(v); return `$${params.length}${cast}` }
  const c = qi(col)
  let sql
  switch (op) {
    case 'eq': sql = `${c} = ${p(raw)}`; break
    case 'neq': sql = `${c} <> ${p(raw)}`; break
    case 'gt': sql = `${c} > ${p(raw)}`; break
    case 'gte': sql = `${c} >= ${p(raw)}`; break
    case 'lt': sql = `${c} < ${p(raw)}`; break
    case 'lte': sql = `${c} <= ${p(raw)}`; break
    case 'like': params.push(raw.replace(/\*/g, '%')); sql = `${c}::text like $${params.length}`; break
    case 'ilike': params.push(raw.replace(/\*/g, '%')); sql = `${c}::text ilike $${params.length}`; break
    case 'is': {
      const v = raw.toLowerCase()
      if (!['null', 'true', 'false', 'unknown'].includes(v)) throw new ApiError(400, { message: `bad is value ${raw}` })
      sql = `${c} is ${v}`; break
    }
    case 'in': {
      const items = splitTop(raw.replace(/^\(/, '').replace(/\)$/, '')).map(unquote)
      if (items.length === 0) { sql = 'false'; break }
      const elemCast = type ? `::${type}` : ''
      sql = `${c} in (${items.map((v) => { params.push(v); return `$${params.length}${elemCast}` }).join(',')})`; break
    }
    case 'cs': sql = `${c} @> ${p(raw)}`; break
    case 'cd': sql = `${c} <@ ${p(raw)}`; break
    case 'ov': sql = `${c} && ${p(raw)}`; break
    default: throw new ApiError(400, { message: `unsupported operator ${op}` })
  }
  return neg ? `not (${sql})` : sql
}

// "or=(a.eq.1,b.ilike.*x*)" and nested and()/or().
function logicSql(kind, inner, params, types) {
  const parts = splitTop(inner.replace(/^\(/, '').replace(/\)$/, '')).map((part) => {
    const m = part.match(/^(not\.)?(and|or)(\(.*\))$/)
    if (m) return (m[1] ? 'not ' : '') + logicSql(m[2], m[3], params, types)
    const dot = part.indexOf('.')
    return filterSql(part.slice(0, dot), part.slice(dot + 1), params, types)
  })
  return '(' + parts.join(kind === 'or' ? ' or ' : ' and ') + ')'
}

const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'columns', 'on_conflict'])
function whereSql(url, params, types) {
  const parts = []
  for (const [k, v] of url.searchParams) {
    if (RESERVED.has(k)) continue
    if (k === 'or' || k === 'and') parts.push(logicSql(k, v, params, types))
    else if (k === 'not.or' || k === 'not.and') parts.push('not ' + logicSql(k.slice(4), v, params, types))
    else parts.push(filterSql(k, v, params, types))
  }
  return parts.length ? ' where ' + parts.join(' and ') : ''
}

function selectList(sel) {
  if (!sel || sel === '*') return '*'
  return splitTop(sel).map((item) => {
    item = item.trim()
    if (item.includes('(')) throw new ApiError(400, { message: 'embedded resources are not supported by the local API; use a view' })
    let alias = null
    const ci = item.indexOf(':')
    if (ci > 0 && item[ci + 1] !== ':') { alias = item.slice(0, ci); item = item.slice(ci + 1) }
    let cast = ''
    const cc = item.indexOf('::')
    if (cc > 0) { cast = '::' + item.slice(cc + 2); item = item.slice(0, cc) }
    if (item === '*') return '*'
    return `${qi(item)}${cast}${alias ? ' as ' + qi(alias) : ''}`
  }).join(', ')
}

function orderSql(order) {
  if (!order) return ''
  return ' order by ' + order.split(',').map((o) => {
    const [col, ...mods] = o.split('.')
    let s = qi(col)
    if (mods.includes('desc')) s += ' desc'
    if (mods.includes('asc')) s += ' asc'
    if (mods.includes('nullsfirst')) s += ' nulls first'
    if (mods.includes('nullslast')) s += ' nulls last'
    return s
  }).join(', ')
}

function valueSql(v, type, params) {
  if (v === null || v === undefined) return 'null'
  if (type?.endsWith('[]')) {
    params.push(JSON.stringify(v))
    return `array(select json_array_elements_text($${params.length}::json))::${type}`
  }
  if (type === 'jsonb' || type === 'json') { params.push(JSON.stringify(v)); return `$${params.length}::${type}` }
  params.push(typeof v === 'object' ? JSON.stringify(v) : String(v))
  return `$${params.length}::${type ?? 'text'}`
}

function pgError(e) {
  const code = e.code
  let status = 400
  if (code === '42501') status = 403
  else if (code === '23505' || code === '23503') status = 409
  else if (code === '42P01' || code === '42883') status = 404
  else if (code === 'PGRST116') status = 406
  return new ApiError(status, { code, message: e.message, details: e.detail ?? null, hint: e.hint ?? null })
}

// ---------------------------------------------------------------------------
// Data API
// ---------------------------------------------------------------------------
async function withRole(claims, fn) {
  const client = await pool.connect()
  try {
    await client.query('begin')
    if (claims?.sub) {
      await client.query(`select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claims', $2, true)`,
        [claims.sub, JSON.stringify(claims)])
      await client.query('set local role authenticated')
    } else {
      await client.query('set local role anon')
    }
    const out = await fn(client)
    await client.query('commit')
    return out
  } catch (e) {
    await client.query('rollback').catch(() => {})
    throw e instanceof ApiError ? e : pgError(e)
  } finally {
    client.release()
  }
}

async function handleRest(req, url, claims, body) {
  const path = url.pathname.replace(/^\/rest\/v1\/?/, '')
  const prefer = req.headers['prefer'] ?? ''
  const wantsObject = (req.headers['accept'] ?? '').includes('vnd.pgrst.object')
  const countExact = /count=exact/.test(prefer)
  const returnRep = /return=representation/.test(prefer)

  return withRole(claims, async (client) => {
    // RPC -------------------------------------------------------------------
    if (path.startsWith('rpc/')) {
      const fn = path.slice(4)
      const { rows: [proc] } = await client.query(
        `select p.proretset, t.typtype, p.proargnames, p.proargmodes, format_type(p.prorettype, null) as rettype,
                (select array_agg(format_type(x, null)) from unnest(p.proargtypes) x) as argtypes
         from pg_proc p join pg_type t on t.oid = p.prorettype
         where p.proname = $1 and p.pronamespace = 'public'::regnamespace limit 1`, [fn])
      if (!proc) throw new ApiError(404, { code: 'PGRST202', message: `Could not find the function public.${fn}` })
      const args = req.method === 'GET' || req.method === 'HEAD' ? Object.fromEntries([...url.searchParams].filter(([k]) => !RESERVED.has(k))) : (body ?? {})
      const params = []
      const names = proc.proargnames ?? []
      const inTypes = proc.argtypes ?? []
      const argSql = Object.entries(args).map(([k, v]) => {
        const idx = names.indexOf(k)
        return `${qi(k)} => ${valueSql(v, inTypes[idx], params)}`
      }).join(', ')
      const call = `public.${qi(fn)}(${argSql})`
      if (proc.proretset || proc.typtype === 'c') {
        const filterUrl = new URL(url)
        if (req.method === 'POST') for (const k of Object.keys(args)) filterUrl.searchParams.delete(k)
        const where = whereSql(filterUrl, params, null)
        const lim = url.searchParams.get('limit'); const off = url.searchParams.get('offset')
        const inner = `select ${selectList(url.searchParams.get('select'))} from ${call} as t${where}${orderSql(url.searchParams.get('order'))}${lim ? ' limit ' + Number(lim) : ''}${off ? ' offset ' + Number(off) : ''}`
        const { rows: [r] } = await client.query(`select coalesce(json_agg(t), '[]'::json) as data from (${inner}) t`, params)
        if (proc.typtype === 'c' && !proc.proretset) return { data: r.data[0] ?? null }
        return { data: wantsObject ? single(r.data) : r.data }
      }
      const { rows: [r] } = await client.query(`select to_json(${call}) as data`, params)
      return { data: r.data }
    }

    // Tables and views -------------------------------------------------------
    const table = path
    if (!/^[a-z_][a-z0-9_]*$/.test(table)) throw new ApiError(404, { message: 'not found' })
    const types = await typesOf(client, table)
    const params = []
    const where = whereSql(url, params, types)
    const sel = selectList(url.searchParams.get('select'))

    if (req.method === 'GET' || req.method === 'HEAD') {
      const lim = url.searchParams.get('limit'); const off = url.searchParams.get('offset')
      const q = `select ${sel} from public.${qi(table)}${where}${orderSql(url.searchParams.get('order'))}${lim ? ' limit ' + Number(lim) : ''}${off ? ' offset ' + Number(off) : ''}`
      const { rows: [r] } = await client.query(`select coalesce(json_agg(t), '[]'::json) as data from (${q}) t`, params)
      let total = null
      if (countExact) {
        const { rows: [c] } = await client.query(`select count(*)::int as n from public.${qi(table)}${where}`, params)
        total = c.n
      }
      const from = Number(off ?? 0)
      const range = r.data.length ? `${from}-${from + r.data.length - 1}` : '*'
      return { data: req.method === 'HEAD' ? null : wantsObject ? single(r.data) : r.data, range: `${range}/${total ?? '*'}` }
    }

    if (req.method === 'POST') {
      const rowsIn = Array.isArray(body) ? body : [body]
      const colsParam = url.searchParams.get('columns')
      const cols = colsParam ? splitTop(colsParam).map(unquote) : [...new Set(rowsIn.flatMap((r) => Object.keys(r)))]
      const values = rowsIn.map((r) => '(' + cols.map((c) => (c in r ? valueSql(r[c], types.get(c)?.type, params) : 'default')).join(', ') + ')').join(', ')
      let q = `insert into public.${qi(table)} (${cols.map(qi).join(', ')}) values ${values}`
      if (/resolution=(merge|ignore)-duplicates/.test(prefer)) {
        const target = (url.searchParams.get('on_conflict') ?? 'id').split(',').map((c) => qi(c.trim())).join(', ')
        q += /merge/.test(prefer)
          ? ` on conflict (${target}) do update set ${cols.map((c) => `${qi(c)} = excluded.${qi(c)}`).join(', ')}`
          : ` on conflict (${target}) do nothing`
      }
      q += ` returning ${returnRep ? sel : '1'}`
      const { rows } = await client.query(`with ins as (${q}) select coalesce(json_agg(ins), '[]'::json) as data from ins`, params)
      return { data: returnRep ? (wantsObject ? single(rows[0].data) : rows[0].data) : null, status: 201 }
    }

    if (req.method === 'PATCH') {
      if (!body || !Object.keys(body).length) throw new ApiError(400, { message: 'nothing to update' })
      // SET values first, then the filters, so parameter numbers line up.
      const p2 = []
      const setsSql = Object.entries(body).map(([k, v]) => `${qi(k)} = ${valueSql(v, types.get(k)?.type, p2)}`).join(', ')
      const where2 = whereSql(url, p2, types)
      const q = `update public.${qi(table)} set ${setsSql}${where2} returning ${returnRep ? sel : '1'}`
      const { rows } = await client.query(`with u as (${q}) select coalesce(json_agg(u), '[]'::json) as data from u`, p2)
      return { data: returnRep ? (wantsObject ? single(rows[0].data) : rows[0].data) : null }
    }

    if (req.method === 'DELETE') {
      const q = `delete from public.${qi(table)}${where} returning ${returnRep ? sel : '1'}`
      const { rows } = await client.query(`with d as (${q}) select coalesce(json_agg(d), '[]'::json) as data from d`, params)
      return { data: returnRep ? rows[0].data : null }
    }
    throw new ApiError(405, { message: 'method not allowed' })
  })
}

function single(arr) {
  if (arr.length !== 1) throw new ApiError(406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${arr.length} rows` })
  return arr[0]
}

// ---------------------------------------------------------------------------
// Auth (the parts of Supabase Auth the app uses)
// ---------------------------------------------------------------------------
function sessionFor(user) {
  const now = Math.floor(Date.now() / 1000)
  const claims = { sub: user.id, role: 'authenticated', aud: 'authenticated', email: user.email, phone: user.phone, iat: now, exp: now + 3600 }
  return {
    access_token: signJwt(claims), token_type: 'bearer', expires_in: 3600, expires_at: now + 3600,
    refresh_token: signJwt({ ...claims, typ: 'refresh', exp: now + 86400 * 30 }), user: userJson(user),
  }
}
function userJson(u) {
  return {
    id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, phone: u.phone ?? '',
    app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: u.raw_user_meta_data ?? {},
    created_at: u.created_at, updated_at: u.created_at, email_confirmed_at: u.created_at,
  }
}
async function handleAuth(req, url, body) {
  const path = url.pathname.replace(/^\/auth\/v1\/?/, '')
  if (path === 'token') {
    const grant = url.searchParams.get('grant_type')
    let user
    if (grant === 'password') {
      const { rows } = await pool.query('select * from auth.users where lower(email) = lower($1) or phone = $2 limit 1', [body?.email ?? '', (body?.phone ?? '').replace(/\D/g, '')])
      user = rows[0]
      if (!user) throw new ApiError(400, { error: 'invalid_grant', error_description: 'Invalid login credentials', message: 'Invalid login credentials', code: 'invalid_credentials' })
    } else if (grant === 'refresh_token') {
      const claims = verifyJwt(body?.refresh_token)
      if (!claims) throw new ApiError(400, { message: 'Invalid Refresh Token', code: 'refresh_token_not_found' })
      user = (await pool.query('select * from auth.users where id = $1', [claims.sub])).rows[0]
    } else throw new ApiError(400, { message: 'unsupported grant' })
    return { data: sessionFor(user) }
  }
  if (path === 'user') {
    const claims = verifyJwt((req.headers.authorization ?? '').replace(/^Bearer /, ''))
    if (!claims?.sub) throw new ApiError(401, { message: 'invalid JWT', code: 'bad_jwt' })
    const user = (await pool.query('select * from auth.users where id = $1', [claims.sub])).rows[0]
    if (!user) throw new ApiError(404, { message: 'user not found' })
    return { data: userJson(user) }
  }
  if (path === 'logout') return { data: null, status: 204 }
  throw new ApiError(404, { message: `auth endpoint ${path} is not available locally` })
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,HEAD,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization,apikey,content-type,prefer,accept,accept-profile,content-profile,range,x-client-info,x-supabase-api-version',
  'Access-Control-Expose-Headers': 'content-range',
}

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end() }
  const url = new URL(req.url, `http://${req.headers.host}`)
  let raw = ''
  for await (const chunk of req) raw += chunk
  const body = raw ? JSON.parse(raw) : undefined
  try {
    let out
    if (url.pathname.startsWith('/auth/v1')) out = await handleAuth(req, url, body)
    else if (url.pathname.startsWith('/rest/v1')) {
      const claims = verifyJwt((req.headers.authorization ?? '').replace(/^Bearer /, ''))
      out = await handleRest(req, url, claims?.role === 'authenticated' ? claims : null, body)
    } else throw new ApiError(404, { message: 'not found' })
    const headers = { ...CORS, 'Content-Type': 'application/json' }
    if (out.range) headers['Content-Range'] = out.range
    res.writeHead(out.status ?? 200, headers)
    res.end(out.status === 204 || out.data === null && req.method === 'HEAD' ? undefined : JSON.stringify(out.data))
  } catch (e) {
    const status = e.status ?? 500
    if (status >= 500) console.error(e)
    res.writeHead(status, { ...CORS, 'Content-Type': 'application/json' })
    res.end(JSON.stringify(e.body ?? { message: String(e.message ?? e) }))
  }
}).listen(PORT, () => console.log(`local API on http://127.0.0.1:${PORT}`))
