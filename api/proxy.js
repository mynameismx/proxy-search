export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const { host, pathname } = url;

  if (pathname === '/robots.txt') {
    const robots = `User-agent: *\nDisallow: /`;
    return res.status(200).send(robots);
  }

  const targetDomains = ['www.bing.com'];
  let targetDomain = 'www.bing.com';

  if (targetDomains.some(domain => host.endsWith(domain))) {
    targetDomain = host;
  }

  const origin = `https://${targetDomain}`;
  const actualUrl = new URL(`${origin}${pathname}${url.search}${url.hash}`);

  const modifiedRequestInit = {
    method: req.method,
    headers: req.headers,
    redirect: 'follow',
  };

  if (!['GET', 'HEAD'].includes(req.method)) {
    const requestBody = await req.arrayBuffer();
    modifiedRequestInit.body = requestBody;
  }

  const response = await fetch(actualUrl, modifiedRequestInit);
  let body = await response.arrayBuffer();
  const contentType = response.headers.get('content-type');

  if (contentType && /^(application\/x-javascript|text\/)/i.test(contentType)) {
    let text = new TextDecoder('utf-8').decode(body);
    body = new TextEncoder().encode(text).buffer;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', contentType);
  res.status(response.status).send(Buffer.from(body));
}
