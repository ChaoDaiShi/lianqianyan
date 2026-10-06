# 涟千言 ECS 同机隔离部署设计

## 1. 目标

把当前 `main` 上的涟千言 React/Vite 前端与 FastAPI 后端部署到现有阿里云 ECS，并完成公网 HTTPS、账号登录、核心页面、Agent SSE、远程 MCP 和第三方能力状态的实际验收。部署必须保留服务器上已经运行的“忆涟灾研”，不得覆盖它的根路径、容器、镜像、网络、数据卷、备份或发布记录。

公网入口采用：

```text
https://8.156.67.132/lianqianyan/
```

同一 IP 已有公信 HTTPS 证书和自动续期。本轮只在既有 HTTPS `server` 中增加 `/lianqianyan/` 前缀代理，不改变证书、根路径和原项目代理。

## 2. 已确认的服务器基线

- Ubuntu 22.04，2 vCPU，约 4 GiB 内存，系统盘可用约 28 GiB；
- `aiops` 使用独立 SSH 密钥和 Rootless Docker，`linger` 已启用；
- 通用发布框架位于 `/opt/apps/.framework/appctl.py`；
- “忆涟灾研”占用公网 `/`，宿主 Nginx 转发至 `127.0.0.1:17800`；
- Rootless Docker 已运行两个健康容器，现有项目数据和镜像保持独立；
- `aiops` 没有通用 sudo，宿主 Nginx 修改必须走经审阅、哈希固定的 root 脚本；
- 当前涟千言仓库未提供 Dockerfile、Compose 或宿主 Nginx 配置；生产部署入口需要补齐。

## 3. 方案比较

### 方案 A：直接占用新的公网高端口

实现简单，但云安全组状态未知，HTTP 高端口无法满足 Secure Cookie，公网地址也不符合正式服务入口要求。

### 方案 B：替换现有根站点或把两个项目放入同一 Compose

可以复用 80/443，但会扩大故障域并破坏现有项目的隔离、回滚和数据边界，不采用。

### 方案 C：同一 HTTPS 虚拟主机下使用独立路径（采用）

宿主 Nginx只增加 `/lianqianyan/` 路由，转发到新项目的回环端口 `127.0.0.1:18001`。涟千言使用自己的 Web/API 镜像、Compose 项目、Docker 网络、SQLite 数据卷、密钥文件、release 和日志。该方案无需新域名，也不改动现有根站点的行为。

## 4. 请求路径与数据流

```text
公网 HTTPS /lianqianyan/*
  -> 宿主 Nginx
  -> 127.0.0.1:18001
  -> 涟千言 Web Nginx（非 root）
       ├─ /assets、index.html -> Vite dist
       ├─ /api/*             -> FastAPI:8000
       └─ /mcp、/mcp/*       -> FastAPI:8000
  -> 涟千言独立 Docker 网络
  -> FastAPI 单 worker
  -> lianqianyan_data 命名卷中的 SQLite
```

宿主代理会剥离 `/lianqianyan/` 前缀；内部 Web 收到普通 `/api`、`/mcp` 和静态路径。前端生产构建使用：

```text
VITE_BASE_PATH=/lianqianyan/
VITE_EDUCATION_API_URL=/lianqianyan
```

因此 HTML 和异步 chunk 请求保留公网前缀，Axios 与 Agent SSE 也会请求 `/lianqianyan/api/...`。

## 5. 镜像与运行边界

### 5.1 API 镜像

- 使用固定 Python 3.12 slim 基础镜像；
- 使用仓库 `apps/api/uv.lock` 和固定 `uv` 版本安装生产依赖；
- 只复制 `apps/api/app`、`pyproject.toml` 和 `uv.lock`，不复制 `.env`、SQLite、缓存或用户产物；
- 以 UID/GID `10001:10001` 运行 Uvicorn；
- 单 worker 运行，避免 SQLite 多进程写竞争；
- 根文件系统只读，只允许 `/tmp` tmpfs 与 `/data` 命名卷写入；
- 健康检查调用 `/api/health`。

### 5.2 Web 镜像

- 使用固定的非 root Nginx 基础镜像；
- 只复制经过 `pnpm build` 生成的 `dist` 和内部反向代理配置；
- 监听容器 `8080`，宿主只绑定 `127.0.0.1:18001`；
- `/api` 和 `/mcp` 关闭代理缓冲，保留 SSE/流式响应；
- 哈希静态资源使用长期缓存，`index.html` 使用 `no-store`；
- 健康检查调用 `/healthz`。

### 5.3 Compose 隔离

Compose 项目名固定为 `lianqianyan`，使用独立网络和 `lianqianyan_data` 命名卷。API 无宿主端口。Web/API 都删除 capabilities、禁止权限提升、限制 CPU、内存、PID 和日志大小。镜像标签包含源码提交短 SHA，不使用 `latest`。

## 6. 生产配置和秘密

生产 API 环境文件保存在服务器：

```text
/opt/apps/lianqianyan/shared/secrets/api.env
```

权限为 `0600`，不会写入 Git、镜像、release 清单、部署日志或聊天。第三方 Provider 配置从本机已忽略的 `apps/api/.env` 选择性迁移，只写入 API 真正支持的 `EDUCATION_*` 键。部署覆盖项为：

- `EDUCATION_DATABASE_URL=sqlite:////data/education.db`；
- `EDUCATION_CORS_ORIGINS=https://8.156.67.132`；
- `EDUCATION_AUTH_COOKIE_SECURE=true`；
- `EDUCATION_MCP_PUBLIC_BASE_URL=https://8.156.67.132/lianqianyan/mcp`；
- `EDUCATION_MCP_ALLOWED_HOSTS=8.156.67.132`；
- 新生成且仅用于生产的 JWT Secret；
- 新生成且仅用于生产的模型凭据加密 Key；
- `EDUCATION_CAPTCHA_MODE=auto`，沿用实际配置的 Turnstile/Vaptcha，不能把测试或关闭状态冒充为生产验证码通过。

本地 SQLite 不上传。服务器首次启动创建新的课程目录、考试元数据和空账号库。部署验收账号通过仅回环可访问的初始化阶段创建，凭据保存在本机和服务器的私有文件，不写入 Git 或公开报告；初始化后恢复正式验证码模式。

## 7. 发布与回滚

发布版本使用 `YYYYMMDD-<commit12>`。流程为：

1. 本地在精确提交上执行门禁与带前缀生产构建；
2. 生成不含密钥和数据库的构建上下文并计算 SHA-256；
3. 上传到 `/home/aiops/.local/lianqianyan-deploy/<version>/`；
4. 用 Rootless Docker 顺序构建两个固定标签镜像并核对镜像标签；
5. 初始化 `/opt/apps/lianqianyan` 与端口 `18001`，准备命名卷权限和私有环境文件；
6. 通过 `appctl.py` stage/deploy，只有 Web/API 健康才切换 `current`；
7. 用服务器回环地址验收后，执行哈希固定的 root Nginx 脚本；
8. `nginx -t` 成功才 reload；失败则恢复站点备份。

应用升级前对 SQLite 使用 Python `sqlite3.Connection.backup()` 生成一致性备份，并校验 `PRAGMA quick_check`。代码回滚使用发布框架的同 schema rollback；数据恢复只在隔离卷验证后显式执行，不自动覆盖生产卷。

## 8. 宿主 Nginx 变更

root 脚本只允许在以下前置条件全部满足时执行：

- 主机名与目标 ECS 一致；
- `127.0.0.1:18001/healthz` 返回 200；
- 现有站点仍包含原 `127.0.0.1:17800` 根代理；
- `/lianqianyan/` 尚未存在，或已与目标配置完全一致；
- 修改前创建带时间戳的 root 私有备份。

脚本新增：

- `/lianqianyan` 到 `/lianqianyan/` 的 308 规范化；
- `/lianqianyan/` 到 `127.0.0.1:18001/` 的反向代理；
- Host、客户端地址和 HTTPS 协议头；
- 流式响应所需的 HTTP/1.1、长读取超时与关闭缓冲。

它不读取、输出或改写原站点私有代理 token，不修改 HTTP 到 HTTPS 跳转、证书或根 `location /`。

## 9. 验收

### 自动门禁

- 新增前缀解析与部署配置契约测试，先 RED 后 GREEN；
- `pnpm check`；
- 相关 Vitest；
- `pnpm build`，确认产物引用 `/lianqianyan/assets/` 且不引用根 `/assets/`；
- API 镜像依赖锁与容器健康；
- Compose 配置解析、资源限制、只读文件系统和回环端口检查；
- Nginx 配置语法检查。

### 服务器验收

- 两个新容器 healthy，原两个容器持续 healthy；
- 公网 `https://8.156.67.132/lianqianyan/` 返回 200；
- `/lianqianyan/api/health` 返回涟千言服务状态；
- 未登录受保护接口返回 401；
- 实际登录、刷新后会话保持、退出登录；
- 首页、小涟、知识空间、资源工坊、考试中心和设置页可打开；
- Agent SSE 能依次收到业务事件与 `done`；
- 浏览器控制台错误、页面错误、请求失败和 HTTP 5xx 均为 0；
- `/lianqianyan/mcp` 未带令牌拒绝访问，账号令牌只能访问自身学习范围；
- LLM、MiniMax、AnySearch 分别记录真实 Provider 状态；未调用或未配置的能力不写作通过；
- 只重启涟千言项目后账号、SQLite 与测试数据保持；
- 原“忆涟灾研”首页、登录和健康状态保持不变。

## 10. 非目标

- 不推送 GitHub，除非用户另行明确要求；
- 不迁移本机 SQLite、调试账号或历史学习数据；
- 不修改“忆涟灾研”源码、镜像、Compose、卷、备份或根路径；
- 不把 API、SQLite 或第三方密钥暴露到前端镜像；
- 不清理服务器旧镜像、release、卷或本地交付物；
- 不把基础镜像拉取、Mock 测试或配置存在写作第三方云能力已真实通过。
