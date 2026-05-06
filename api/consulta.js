export const config = { runtime: 'edge' };

const TARGET = 'https://www.migraciones.gob.ar/accesible/consultaTramitePrecaria/api/ajax_consulta_tramite.php';

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  try {
    const body = await req.arrayBuffer();
    const contentType =
      req.headers.get('content-type') || 'application/x-www-form-urlencoded';

    const upstream = await fetch(TARGET, {
      method: 'POST',
      headers: {
        'content-type': contentType,
        accept: 'application/json, text/plain, */*',
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'accept-language': 'es-AR,es;q=0.9,en;q=0.8',
        referer: 'https://www.migraciones.gob.ar/accesible/consultaTramitePrecaria/',
      },
      body,
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        'content-type':
          upstream.headers.get('content-type') ||
          'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'proxy_error', message: String(err && err.message || err) }),
      {
        status: 502,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }
    );
  }
}
