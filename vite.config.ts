import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import appdevDesignMode from '@xagi/vite-plugin-design-mode';
import { resolveManualChunk } from './src/config/buildChunks';
import { resolveDevIntegrations } from './src/config/devIntegrations';

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

const devIntegrations = resolveDevIntegrations(process.env);
const plugins: Plugin[] = [react()];

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
