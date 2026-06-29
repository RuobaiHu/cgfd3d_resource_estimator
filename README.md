# CGFD3D 地震波模拟资源估算器

## 天地图配置

应用会优先加载天地图矢量底图和矢量注记。若你申请的是天地图“服务器端”key，创建 `.env` 并填入：

```bash
TIANDITU_KEY=your-server-side-tianditu-key
```

这时浏览器会请求本地 `/api/tianditu/...`，由 Vite dev/preview 代理在服务端带 key 请求天地图。服务器端 key 不应直接放进浏览器瓦片 URL；浏览器带 `Mozilla` User-Agent 直连时，天地图会返回 `403`，提示“Key权限类型为:服务器端，请使用服务器端访问”。

如果直接打开 `dist/index.html` 这种纯静态文件，服务端代理不存在，服务器端 key 无法使用；请用 `npm run dev` / `npm run preview`，或在正式部署时提供同等的 `/api/tianditu` 后端代理。

若你申请的是天地图“浏览器端”key，可以改用：

```bash
VITE_TIANDITU_BROWSER_KEY=your-browser-side-tianditu-key
```

天地图控制台需要给该 key 开通 `vec_w` 矢量地图和 `cva_w` 矢量注记服务权限，并确认来源限制允许当前访问域名。天地图 WAF 可能会让 `HEAD` 请求返回 418，但 Leaflet 加载瓦片使用的是 `GET`；排查时应以浏览器 Network 中的 GET 瓦片请求为准。应用会先铺一层无需 key 的备用底图，再把天地图叠在上层，避免天地图瓦片异常时地图区域整片空白。

## 开发命令

```bash
npm install
npm run dev
npm run build
```
