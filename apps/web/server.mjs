import { createProxyMiddleware } from 'http-proxy-middleware';
import next from 'next';
import express from 'express';
import { createServer } from 'http';

const port = 3001;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  const httpServer = createServer(server);

  server.use(
    '/api',
    createProxyMiddleware({
      target: (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'),
      changeOrigin: true,
      ws: true,
      pathRewrite: { '^/api': '/api' },
      logLevel: 'info',
    })
  );

  server.all('*', (req, res) => handle(req, res));
  httpServer.listen(port, () => console.log(`> FairFlow Web + WS proxy ready on http://localhost:${port}`));
});