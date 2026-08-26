import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync, createReadStream, existsSync, lstatSync, statSync } from 'node:fs';
import path from 'path';
import appdevDesignMode from '@xagi/vite-plugin-design-mode';
import { resolveManualChunk } from './src/config/buildChunks';
import { resolveDevIntegrations } from './src/config/devIntegrations';
import { relativeLocalLive2dPath } from './src/config/localLive2d';

export { resolveDevIntegrations } from './src/config/devIntegrations';

function devMonitorPlugin(monitorUrl: string): Plugin {
  return {
    name: 'optional-dev-monitor',
    enforce: 'post',
    transformIndexHtml(html) {
      if (html.includes('data-id="dev-inject-monitor"')) return html;
      const source = JSON.stringify(monitorUrl);
      return html.replace(
        '</head>',
        `<script data-id="dev-inject-monitor">
          const script = document.createElement('script');
          script.src = ${source};
          script.dataset.id = 'dev-inject-monitor-script';
          script.defer = true;
          document.head.appendChild(script);
        </script>
        </head>`,
      );
    },
  };
}

const LOCAL_ASSET_MIME: Readonly<Record<string, string>> = {
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.moc3': 'application/octet-stream',
  '.png': 'image/png',
};

/** Serve ignored, license-restricted Live2D files in development only. */
function localLive2dPlugin(): Plugin {
  const root = path.resolve(__dirname, '.local/live2d');
  const rootPrefix = `${root}${path.sep}`;
  const buildTarget = path.resolve(__dirname, 'dist/local-live2d');

  return {
    name: 'local-live2d-assets',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const relative = relativeLocalLive2dPath(request.url ?? '');
        if (relative === null) return next();

        const absolute = path.resolve(root, relative);
        if (!absolute.startsWith(rootPrefix)) {
          response.statusCode = 400;
          response.end('invalid local asset path');
          return;
        }
        if (!existsSync(absolute) || !statSync(absolute).isFile()) {
          response.statusCode = 404;
          response.end('local Live2D asset not found');
          return;
        }

        response.setHeader(
          'Content-Type',
          LOCAL_ASSET_MIME[path.extname(absolute).toLowerCase()] ??
            'application/octet-stream',
        );
        response.setHeader('Cache-Control', 'no-store');
        const stream = createReadStream(absolute);
        stream.on('error', next);
        stream.pipe(response);
      });
    },
    closeBundle() {
      if (!existsSync(root)) return;
      cpSync(root, buildTarget, {
        recursive: true,
        filter: (source) => !lstatSync(source).isSymbolicLink(),
      });
    },
  };
}

const devIntegrations = resolveDevIntegrations(process.env);
const plugins: Plugin[] = [react(), localLive2dPlugin()];

if (devIntegrations.designMode) plugins.push(appdevDesignMode());
if (devIntegrations.monitorUrl) {
  plugins.push(devMonitorPlugin(devIntegrations.monitorUrl));
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: resolveManualChunk,
      },
    },
  },
  server: {
    proxy: {
      // 开发时把 /api/* 代理到 EducationMind FastAPI 后端（apps/api）
      '/api': {
        target: process.env.EDUCATION_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
