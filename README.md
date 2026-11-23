# 圣诞树互动 3D 页面

Arix Signature 交互式 3D 圣诞树 —— 深祖母绿枝叶与金属金光泽的节日场景，可切换「成型 / 散落」状态，支持鼠标拖拽旋转视角。

## 技术栈

- Vite 8 + React 19 + TypeScript 5.9
- Three.js 0.187 + React Three Fiber 9 + drei 10
- 自定义 ShaderMaterial 粒子系统 + Bloom / Vignette 后处理

## 本地运行

```bash
npm install
npm run dev
```

打开 http://localhost:5173 。构建产物使用 `npm run build`。

## 部署

推送到 `main` 分支会自动触发 GitHub Actions，构建后发布到 GitHub Pages：

https://xiatianwudi211.github.io/-/

若首次部署未生效，请在仓库 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。
