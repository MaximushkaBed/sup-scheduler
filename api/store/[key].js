// Key-value API поверх Upstash Redis (бесплатный план из Vercel Marketplace).
//   GET /api/store/:key            -> {value: string|null}
//   PUT /api/store/:key {value}    -> {ok: true}
// Если задан env SUP_PASSWORD — требуется заголовок Authorization: Bearer <пароль>.

const KEY_RE = /^[\w.-]+$/;

function redisEnv(){
  // Vercel/Upstash в зависимости от интеграции задают разные имена переменных.
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

export default async function handler(req, res){
  const password = process.env.SUP_PASSWORD;
  if(password){
    const auth = req.headers.authorization || '';
    if(auth !== 'Bearer ' + password){
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
  }

  const { url, token } = redisEnv();
  if(!url || !token){
    res.status(500).json({ error: 'Redis не подключён: добавь Upstash for Redis в Storage проекта на Vercel' });
    return;
  }

  const key = req.query.key;
  if(typeof key !== 'string' || !KEY_RE.test(key)){
    res.status(400).json({ error: 'bad key' });
    return;
  }
  const headers = { Authorization: 'Bearer ' + token };

  if(req.method === 'GET'){
    const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, { headers });
    if(!r.ok){
      res.status(502).json({ error: 'redis error' });
      return;
    }
    const data = await r.json();
    res.status(200).json({ value: data.result ?? null });
    return;
  }

  if(req.method === 'PUT'){
    const value = req.body && typeof req.body.value === 'string' ? req.body.value : null;
    if(value === null){
      res.status(400).json({ error: 'bad body' });
      return;
    }
    const r = await fetch(`${url}/set/${encodeURIComponent(key)}`, { method: 'POST', headers, body: value });
    if(!r.ok){
      res.status(502).json({ error: 'redis error' });
      return;
    }
    res.status(200).json({ ok: true });
    return;
  }

  res.setHeader('Allow', 'GET, PUT');
  res.status(405).json({ error: 'method not allowed' });
}
