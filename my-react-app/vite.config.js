import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react'; // 假設您有安裝這個插件

export default ({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
  const BASE = process.env.VITE_BASE || '/questionnaire/';
  return defineConfig({
    plugins: [react()],
    // 這是 Vite 用於靜態資源引用的關鍵設定
    base: BASE
  });
};