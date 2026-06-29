import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import type { IncomingMessage, ServerResponse } from 'node:http'

const TIANDITU_PROXY_PREFIX = '/api/tianditu/';

function tiandituProxyPlugin(tiandituKey?: string): Plugin {
  const proxyHandler = async (
    req: IncomingMessage,
    res: ServerResponse,
    next: (error?: unknown) => void,
  ) => {
    const requestUrl = req.url ?? '';
    if (!requestUrl.startsWith(TIANDITU_PROXY_PREFIX)) {
      next();
      return;
    }

    if (!tiandituKey) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'TIANDITU_KEY is not configured' }));
      return;
    }

    try {
      const localUrl = new URL(requestUrl, 'http://localhost');
      const pathParts = localUrl.pathname.slice(TIANDITU_PROXY_PREFIX.length).split('/');
      const subdomain = pathParts.shift();
      const service = pathParts.shift();
      const remotePath = pathParts.join('/');

      if (!subdomain?.match(/^t[0-7]$/) || !service?.match(/^(vec|cva)_w$/) || remotePath !== 'wmts') {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'Invalid Tianditu tile path' }));
        return;
      }

      localUrl.searchParams.set('tk', tiandituKey);
      const upstreamUrl = new URL(`https://${subdomain}.tianditu.gov.cn/${service}/${remotePath}`);
      upstreamUrl.search = localUrl.searchParams.toString();

      const upstreamResponse = await fetch(upstreamUrl);
      const body = Buffer.from(await upstreamResponse.arrayBuffer());

      res.statusCode = upstreamResponse.status;
      upstreamResponse.headers.forEach((value, key) => {
        if (!['connection', 'content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });
      res.setHeader('Cache-Control', upstreamResponse.ok ? 'public, max-age=432000' : 'no-store');
      res.end(body);
    } catch {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Tianditu proxy request failed' }));
    }
  };

  return {
    name: 'tianditu-tile-proxy',
    configureServer(server) {
      server.middlewares.use(proxyHandler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(proxyHandler);
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const tiandituKey = env.TIANDITU_KEY || env.VITE_TIANDITU_KEY;

  return {
    define: {
      __TIANDITU_PROXY_AVAILABLE__: JSON.stringify(Boolean(tiandituKey)),
    },
    plugins: [react(), tiandituProxyPlugin(tiandituKey), viteSingleFile()],
    base: './',
  };
})
