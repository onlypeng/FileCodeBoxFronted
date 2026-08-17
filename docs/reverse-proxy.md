# 反向代理部署

通过 Nginx / Caddy 等反向代理访问 FileCodeBox（前端 dev server 5173 或生产静态文件 + 后端 12345）时，**必须转发 WebSocket 的升级请求**，否则：

- 直连快传（P2P）无法建立：`/ws/room/{code}` 握手失败 → 信令断 → P2P 协商失败
- 聊天/文件/媒体协商信令全部失效（都走 WebSocket）
- 前端报"无法连接/房间无法进入"或白屏

## 关键原理

- 前端在生产/反代场景下，WebSocket 地址为**同源**：`wss://你的域名/ws/room/{code}`
  （`src/utils/share-url.ts` 的 `buildWebSocketUrl` 在 `VITE_API_BASE_URL_PROD` 为空时取 `window.location.origin`）
- 反代必须把 `/ws` 路径连同 **`Upgrade` / `Connection` 头** 一起转发到后端（或 dev 的 5173，由 Vite 再代理到 12345）

## Nginx 配置示例

```nginx
server {
    listen 443 ssl;
    server_name tfb.ylpxz.top;

    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    # ---------- 生产（静态前端文件 + 后端 API） ----------
    # 前端构建产物目录（npm run build 生成的 dist/）
    root /opt/FileCodeBoxFronted/dist;
    index index.html;

    # SPA 回退（hash 路由通常不需要，但保留无妨）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端 API
    location ~ ^/(admin|share|chunk|presign|collection|delivery|room)/ {
        proxy_pass http://127.0.0.1:12345;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # 下载文件需要（Content-Disposition）
        proxy_pass_header Content-Disposition;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        client_max_body_size 100m;   # 按 uploadSize 配置调整
    }

    # 公共配置接口 POST /
    location = / {
        if ($request_method = POST) {
            proxy_pass http://127.0.0.1:12345;
            proxy_set_header Host $host;
        }
        try_files /index.html =404;
    }

    # ---------- 关键：WebSocket 升级转发 ----------
    location /ws/ {
        proxy_pass http://127.0.0.1:12345;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;      # ← 必须
        proxy_set_header Connection "upgrade";       # ← 必须
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;                    # WS 长连接
        proxy_send_timeout 3600s;
    }
}
```

> **开发环境**：反代到 5173（Vite dev server）时，`/ws` 同样需要上述 Upgrade 头；Vite 的 `/ws` proxy 已配置 `ws: true`，会把升级请求继续转发到后端 12345。

## Caddy 配置示例

```caddy
tfb.ylpxz.top {
    # 生产：静态前端 + 反向代理后端（Caddy 自动处理 WebSocket 升级，无需特殊配置）
    root * /opt/FileCodeBoxFronted/dist
    try_files {path} /index.html

    # API 与 WS 统一转发到后端（Caddy 原生支持 WS，自动带 Upgrade 头）
    @api path /admin/* /share/* /chunk/* /presign/* /collection/* /delivery/* /room/* /ws/*
    reverse_proxy @api 127.0.0.1:12345

    # 公共配置 POST /
    @config method POST path /
    reverse_proxy @config 127.0.0.1:12345
}
```

> Caddy 的 `reverse_proxy` 对 WebSocket 开箱即用（自动保留 Upgrade/Connection），无需额外指令。

## 验证反代后 WS 是否正常

```bash
# 用 curl 模拟 WS 升级握手（需返回 101 而非 4xx）
curl -i -H "Host: tfb.ylpxz.top" \
     -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" \
     -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
     http://你的反代/ws/room/TEST123
```

返回 `HTTP/1.1 101 Switching Protocols` 即正常；返回 400/404 说明升级头未转发。

## 相关配置建议

- **服务器中转限速**（`directRelaySpeedLimit`，后台系统设置）：文件分片中转可用；若用于实时媒体中转，建议设为 `0`（不限速），否则会明显卡顿
- **TURN 服务器**（`directTurnServers`）：跨运营商/对称 NAT 下 P2P 媒体与文件仍建议配置 TURN 兜底，P2P 可用时延迟最低
