export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const { host, pathname } = url;

  if (pathname === '/robots.txt') {
    const robots = `User-agent: *
Disallow: /`;
    return res.status(200).send(robots);
  }

  const targetDomains = ['castopia-wiki.wikidot.com', 'www.wikidot.com', 'castopia-wiki.wdfiles.com', 'd3g0gp89917ko0.cloudfront.net'];
  let targetDomain = 'castopia-wiki.wikidot.com';

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

    // Skip modifying URLs for http://www.w3.org/2000/svg
    text = text.replace(new RegExp(`(//|https?://)(?!www\.w3\.org/2000/svg)(${targetDomains.join('|')})`, 'g'), `$1${host}`);

    // Modify http URLs, except those starting with http://www.w3.org/2000/svg
    text = text.replace(/http:\/\/(?!localhost|127\.0\.0\.1|www\.w3\.org\/2000\/svg)([^"']+)/g, 'https://$1');

    text = removeAdScripts(text);

    text = replaceLoginStatus(text);

    // Добавляем Google Tag Manager в конец тега <head>
    text = insertGoogleTagManager(text);

    body = new TextEncoder().encode(text).buffer;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', contentType);
  res.status(response.status).send(Buffer.from(body));
}

function removeAdScripts(text) {
  return text.replace(/<script[^>]*>(.*?)<\/script>/gs, (match, scriptContent) => {
    if (/\"wording\"\s*:\s*\"Report Ad\"/.test(scriptContent) ||
        /(floors\.nitropay\.com|id5-sync\.com)/.test(scriptContent)) {
      return '';
    }
    return match;
  });
}

function replaceLoginStatus(text) {
  const loginStatusRegex = /<div id="login-status">.*?<\/div>/s;
  const newContent = '<div id="login-status"><a href="http://castopia.ct.ws" class="login-status-create-account btn">Прокси-зеркало</a> <span>|</span> <a href="http://wd.castopia.ct.ws" class="login-status-sign-in btn btn-primary">Wikidot</a></div>';
  return text.replace(loginStatusRegex, newContent);
}

function insertGoogleTagManager(text) {
  const gtmScript = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-N2KV4N8T');</script>
<!-- End Google Tag Manager -->`;

  return text.replace(/<head>/i, `<head>${gtmScript}`);
}
