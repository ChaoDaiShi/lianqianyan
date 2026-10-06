# 涟千言 ECS 部署

这套配置把涟千言部署到现有 ECS 的独立 Rootless Docker 项目，并通过宿主 Nginx 暴露：

<https://8.156.67.132/lianqianyan/>

服务器上的“忆涟灾研”继续使用根路径和 `127.0.0.1:17800`。涟千言只使用 `127.0.0.1:18001`、独立 Compose 项目、网络、镜像、release、密钥文件和 `lianqianyan_data` 卷。

## 安全边界

- 不得上传本机 SQLite、`apps/api/.env`、本地调试账号、`.git`、`.local`、worktree、PPT、视频或其他用户产物。
- `render_runtime_env.py` 只迁移明确允许的 Provider 变量，并为生产生成新的 JWT 与模型加密密钥。
- API 没有宿主端口；Web 仅监听 `127.0.0.1:18001`。
- 宿主 Nginx 是唯一 root 变更；脚本先备份、再 `nginx -t`，失败时恢复原文件。
- 不运行 `docker prune`、全局 Compose、系统 Docker 或其它项目命令。

## 1. 本地门禁与发布包

从干净的 `codex/server-deployment` 分支运行：

```powershell
pnpm test -- --run src/config/deployment.test.ts src/config/serverDeploymentContract.test.ts
pnpm check
Set-Location apps\api
uv run pytest ..\..\deploy\server\tests\test_render_runtime_env.py -q
Set-Location ..\..
```

发布脚本要求经过 SHA-256 固定的 `regctl v0.11.4` 位于：

```text
.local/tools/regctl-v0.11.4/regctl-windows-amd64.exe
```

固定摘要为：

```text
3dcf16028cbe95ead5d2706c5a646e5614478e4782b5fdd11e274a0d92973267
```

`build-release.ps1` 执行带 `/lianqianyan/` 前缀的 `pnpm build`，只复制白名单文件，并通过 `regctl image export` 导出两个 Linux/amd64 基础镜像。它不会依赖本机 Docker Desktop。

```powershell
powershell -ExecutionPolicy Bypass -File deploy\server\build-release.ps1
```

输出位于 `.local/ecs-lianqianyan-YYYYMMDD/YYYYMMDD-<commit12>/`，包含：

- `lianqianyan-context-<release>.tar.gz` 与 SHA-256；
- `python-base-linux-amd64.tar` 与 SHA-256；
- `nginx-base-linux-amd64.tar` 与 SHA-256；
- 白名单构建上下文和逐文件 `SHA256SUMS`。

## 2. 生成私有生产环境

把实际本机 Provider 配置过滤到发布目录。命令输出只显示路径和键数量，不显示值：

```powershell
python deploy\server\render_runtime_env.py `
  --source apps\api\.env `
  --output .local\ecs-lianqianyan-YYYYMMDD\YYYYMMDD-commit12\api.env `
  --origin https://8.156.67.132 `
  --public-prefix /lianqianyan `
  --app-version 1.4.0+commit12
```

首次部署生成的新 JWT 和模型加密密钥必须长期保留。升级时复用服务器已有 `/opt/apps/lianqianyan/shared/secrets/api.env`，不得通过重新生成文件隐式轮换密钥。

## 3. 上传与 Rootless 部署

在服务器创建精确 release 目录并上传四个文件及各自摘要：

```powershell
ssh aliyun-ai "install -d -m 0700 /home/aiops/.local/lianqianyan-deploy/YYYYMMDD-commit12"
scp .local\ecs-lianqianyan-YYYYMMDD\YYYYMMDD-commit12\lianqianyan-context-*.tar.gz* aliyun-ai:/home/aiops/.local/lianqianyan-deploy/YYYYMMDD-commit12/
scp .local\ecs-lianqianyan-YYYYMMDD\YYYYMMDD-commit12\*-base-linux-amd64.tar* aliyun-ai:/home/aiops/.local/lianqianyan-deploy/YYYYMMDD-commit12/
scp .local\ecs-lianqianyan-YYYYMMDD\YYYYMMDD-commit12\api.env aliyun-ai:/home/aiops/.local/lianqianyan-deploy/YYYYMMDD-commit12/api.env
ssh aliyun-ai "chmod 0600 /home/aiops/.local/lianqianyan-deploy/YYYYMMDD-commit12/api.env"
```

上传 `prepare-release.sh`，先执行 `bash -n`，再运行：

```bash
bash prepare-release.sh \
  YYYYMMDD-commit12 \
  lianqianyan-context-YYYYMMDD-commit12.tar.gz \
  python-base-linux-amd64.tar \
  nginx-base-linux-amd64.tar \
  api.env
```

脚本依次核对摘要、验证归档边界、载入基础镜像、构建固定应用镜像、保存离线镜像归档、初始化项目与数据卷、stage 并 deploy。只有 API/Web 健康后，发布框架才切换 `current`。

部署状态：

```bash
python3 /opt/apps/.framework/appctl.py status lianqianyan
docker --context rootless ps --filter label=service=lianqianyan
curl -fsS http://127.0.0.1:18001/healthz
curl -fsS http://127.0.0.1:18001/api/health
```

## 4. 安装公网路径

这一步必须使用已经认证的 root 会话。先在本机和服务器核对 `install-nginx-route.sh` 的 SHA-256，再只执行这一份脚本：

```bash
bash /home/aiops/.local/lianqianyan-deploy/YYYYMMDD-commit12/install-nginx-route.sh YYYYMMDD-commit12
```

脚本只向现有 HTTPS server 增加 `/lianqianyan/`，不读取或输出原站私有代理 token。成功后检查：

```bash
curl -fsSI https://8.156.67.132/lianqianyan/
curl -fsS https://8.156.67.132/lianqianyan/api/health
curl -fsS https://8.156.67.132/ >/dev/null
```

## 5. 备份

备份脚本调用 SQLite 在线 backup API，不复制正在写入的数据库文件。它在容器内和宿主副本上分别执行 `PRAGMA quick_check`：

```bash
bash /opt/apps/lianqianyan/current/deploy/server/backup.sh
```

备份保存到 `/opt/apps/lianqianyan/shared/backups/`，数据库和摘要文件权限均为 0600。

## 6. 日志、升级与回滚

```bash
docker --context rootless logs --tail 200 lianqianyan-api-1
docker --context rootless logs --tail 200 lianqianyan-web-1
python3 /opt/apps/.framework/appctl.py status lianqianyan
python3 /opt/apps/.framework/appctl.py rollback lianqianyan
```

回滚只允许相同 `db_schema` 的 current/previous。它不会自动恢复 SQLite。需要恢复数据时，先把备份恢复到隔离卷并完成 `quick_check` 和业务核对，再显式切换；不得直接覆盖生产卷。

如果宿主 Nginx 安装失败，root 脚本会恢复 `/var/lib/yilian-ops/` 中的本次备份，涟千言容器仍可通过服务器回环端口诊断。不要为了恢复涟千言而停止或重建 `yilian-spatial`。
