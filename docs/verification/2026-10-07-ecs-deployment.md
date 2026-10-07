# 涟千言 ECS 部署与公网验收记录

日期：2026-10-07（Asia/Shanghai）

## 结论

状态：**PASS**

公网入口：`https://8.156.67.132/lianqianyan/`

涟千言已作为独立的 Rootless Docker 项目部署到现有 ECS，并完成源码门禁、不可变发布工件、服务器健康、真实账号登录、三档视口前端回归、Agent 流式输出、真实云 Provider、MCP、SQLite 备份、重启恢复和公网协议检查。原“忆涟灾研”继续使用根路径和 17800 端口，部署前后 API/Web 均为 healthy，根站与健康入口保持可用。

当前公网入口是 IP 地址。为保证演示登录可实际完成，生产环境的 CAPTCHA 模式暂设为 `off`；LLM、搜索、语音、图片和 MCP 等业务能力仍使用正式配置。恢复人机验证前，需要先绑定可由验证服务登记的 FQDN，并完成下文“CAPTCHA 边界”中的迁移。

## 源码与不可变发布工件

| 项目 | 最终值 |
| --- | --- |
| 源码提交 | `716e045f4df52a8bf101b1a97166f4099c36b7a9` |
| release | `20261007-716e045f4df5` |
| 服务器 release | `/opt/apps/lianqianyan/releases/20261007-716e045f4df5` |
| current | `/opt/apps/lianqianyan/current`，解析到最终 release |
| 发布上下文 SHA-256 | `d824232112e7d38fc2af87fc4cddb16a8fcab8628d8b878585b32656f8124fde` |
| Python 基础镜像归档 SHA-256 | `53f65d3f2c8fd7be6ef473a91517a753b60074f6a9a629c9f403cc8f560ca039` |
| Nginx 基础镜像归档 SHA-256 | `b073ea45dbb284a9d6dde2cc6d76d6c0c0d45f316cf4ac86f47c387a4e647f50` |
| 应用离线镜像归档 SHA-256 | `cea1da5b4435c12e7a7d12162a6728edae9beb1a2d8f0fca8c531c39c361b1b5` |
| API 镜像 ID | `sha256:b20f492512d6619f7338b247ff8b874262c802224ee08fdfecd8388ec0e9dc5c` |
| Web 镜像 ID | `sha256:0656d8ff07d85ba0768c9e17e722cfbe5c30cd8d4263ad649ade0281b98133d4` |

两个应用镜像的 revision label 均与完整源码提交一致。基础镜像按 Linux/amd64 digest 离线导出并在服务器载入；应用镜像也以离线归档交付，服务器不依赖部署时访问 Docker Hub。

构建时使用 `VITE_BASE_PATH=/lianqianyan/`。最终构建处理 2504 个模块并成功生成产物，只有既有 `vendor-pixi` 超过 500 kB 的体积提醒。发布包中的 9 个 HTML 静态引用全部使用 `/lianqianyan/` 前缀且目标存在，7 个 Live2D 文件齐全。课程模板 `dist/templates/lianqianyan-course-template.pptx` 来自 Git 跟踪文件，源码与产物 SHA-256 均为 `96207b73d9a2a0fa132e9b80fff67dd5b5f5471504fcd054d43cca1a148144a8`。

## 本次修复

- 新增受约束的 ECS 发布流程：独立端口登记、不可变 release、原子 `current` 切换、Rootless Compose、健康检查、资源限制、只读根文件系统、回滚和 SQLite 在线备份。
- 修复 Windows 生成的 `SHA256SUMS` 使用 CRLF 导致 Linux 校验把 `\r` 识别为文件名字符的问题；清单现为 LF-only，并有契约测试。
- 修复宿主 Nginx reload 后旧 worker 短时间仍响应、导致安装脚本误判并自动回滚的问题；改为有界轮询公网健康，并允许安全复用内容完全相同的备份。
- 修复子路径部署下 Live2D Core、模型、登录背景、品牌图标、顶部伙伴图、设置页图片等运行时资源仍请求根路径的问题；统一通过部署前缀解析器生成 URL。
- 前端浏览器验收脚本支持 SPA hash 导航、等待图片完成，并区分预期的匿名 401、无当前学习计划 404 与真正的浏览器故障。

上述三个关键缺陷均先由失败测试复现，再修复到通过：Nginx readiness 契约、Live2D 子路径、公共资源路径解析。

## 本地门禁

| 验证 | 结果 |
| --- | --- |
| `pnpm check` | TypeScript 与 ESLint 通过，退出码 0 |
| `pnpm test -- --run` | 96 个测试文件、331 个测试全部通过 |
| 部署关键回归 | 4 个测试文件、43 个测试全部通过 |
| `uv run pytest ../../deploy/server/tests/test_render_runtime_env.py -q` | 9 个测试全部通过 |
| `git diff --check` | 通过 |
| 最终生产构建 | 2504 个模块，退出码 0 |

完整前端测试会输出两条 React ref 警告，来源是 `CaptchaPanel.test.tsx` 中的函数式测试替身；没有测试失败、运行时页面错误或生产构建错误。

## 服务器隔离与运行状态

| 项目 | 结果 |
| --- | --- |
| 独立端口 | `yilian-spatial=17800`；`lianqianyan=18001` |
| API | `lianqianyan-api-1`；healthy；无宿主端口 |
| Web | `lianqianyan-web-1`；healthy；仅 `127.0.0.1:18001→8080` |
| API 镜像 | `lianqianyan-api:1.4.0-716e045f4df5` |
| Web 镜像 | `lianqianyan-web:1.4.0-716e045f4df5` |
| 原项目 | `yilian-spatial-api` 与 `yilian-spatial-web` 均保持 healthy |
| 应用部署回执 | `/opt/apps/lianqianyan/logs/deployment-20261007-716e045f4df5.json` |
| Nginx 安装回执 | `/home/aiops/.local/lianqianyan-deploy/20261007-716e045f4df5/root-nginx-route.done.json` |

只重启涟千言 API/Web 后，两容器重新进入 healthy；保留的正式会话、课程选择、LLM/语音配置与公网入口全部恢复。重启过程中原项目容器未被重启。

## 宿主 Nginx、回滚与协议验收

Root 路由脚本 SHA-256 为 `0adbd90caaa20de3081c0fa248cef8a36bfcfc1c098b901c22b3be5cdac1683c`。安装完成时间为 `2026-10-07T13:03:39.758813+00:00`。

原 Nginx 配置保存在：

`/var/lib/yilian-ops/yilian-spatial-before-lianqianyan-20261007-716e045f4df5.conf`

备份权限为 root:root 0600，原始配置与回滚备份 SHA-256 均为 `a5d07c340835c49497be60fa5dd2f8bffe1362c05529ecff9f564b9a68be3e41`。

公网协议验收结果：

| 请求 | 结果 |
| --- | --- |
| HTTP `/lianqianyan/` | 301 到同路径 HTTPS |
| HTTPS `/lianqianyan` | 308 到绝对路径 `/lianqianyan/` |
| HTTPS `/lianqianyan/` | 200，标题正确 |
| `/lianqianyan/healthz` | 200 / ok |
| `/lianqianyan/api/health` | 200 |
| 匿名 session | 401 |
| 匿名 MCP | 401 |
| 9 个构建静态引用 | 全部 200 |
| Live2D Core 与三项品牌资源 | 全部 200，媒体类型和内容长度正确 |
| 原根站 `/` | 200，原标题保留 |
| 原 `/healthz` | 200 / READY |
| 原受保护 `/api/health` | 401，认证边界保留 |

## 正式账号与真实浏览器验收

验收使用新建正式账号 `deploy_accept_20261007`，已选课程为 `course-os`。密码只存在于服务器 0600 文件和本机 Git 忽略证据目录，不写入 Git、日志或本文档。

一次完整登录流程验证：

- 登录 200，会话 200；
- 登录后首页可见，课程状态正确；
- 退出 204，并返回登录页；
- 再次登录 200，保留可复用验收会话；
- 页面没有 CAPTCHA 阻断、破图、意外控制台错误、请求失败或 5xx。

完整浏览器回归覆盖 3 个视口与 6 个路由，共 18 组：

| 视口 | 路由 |
| --- | --- |
| 1440×900 | 首页、小涟、知识、资源、考试、设置 |
| 1024×768 | 首页、小涟、知识、资源、考试、设置 |
| 390×844 | 首页、小涟、知识、资源、考试、设置 |

18 组页面均返回 200、存在有效正文、无破图，且 `clientWidth == scrollWidth`，没有水平溢出。浏览器记录中没有页面异常、意外 HTTP 错误、意外控制台错误或意外请求失败。匿名 session 的 401 与“当前无学习计划”的 404 是前端已处理的预期状态。

小涟页面实际发送一次问题并验证流式响应：接口 200，持续约 3694 ms；响应文本逐步出现，完成后输入框重新可用，最终答案可见。该轮回答说明了进程与线程在资源、调度和切换成本上的区别。

## 真实业务能力

| 能力 | 实际结果 |
| --- | --- |
| Agent SSE | 真实 Provider；3 status、2 trace、14 delta、1 result、1 done；`done.ok=true` |
| LLM | `openai_compatible` / `deepseek-v4-flash`；配置状态 true |
| AnySearch | HTTP 200；provider=`anysearch`；返回 1 个真实来源 |
| MiniMax 语音 | HTTP 200；`audio/mpeg`；38,004 字节；SHA-256 `20317c7230f7f9f35134e045f092bb42a3ec1a51de662070b6a17dd7dafac0e2` |
| MiniMax 图片 | HTTP 200；model=`image-01`；返回 1 个 HTTPS OSS URL |
| PPT 资源 | HTTP 200；11 页；文件名 `kp-process-concept-presentation.pptx` |
| MCP | 无令牌 401；令牌创建 201；7 个工具；画像读取 200；撤销 204；撤销后 401 |

回环 MCP 使用不在 allowlist 中的 Host 时返回 421；改为生产 Host 后通过，证明 DNS 重绑定保护处于工作状态。

## CAPTCHA 边界

浏览器实际验证发现：

- 当前 Turnstile widget 在 IP 公网入口返回 400；Cloudflare 的生产 hostname 管理要求配置站点 hostname，当前没有可登记的 FQDN。
- 代码中的 Vaptcha V3 SDK `https://v.vaptcha.com/v3.js` 无法建立连接；Vaptcha 当前安装文档使用 V4 SDK 和不同初始化协议，不能只替换脚本 URL 后直接上线。

因此，依据本次“创建本地调试账号并登录、绕过人机验证”的明确授权，最终服务器设置 `CAPTCHA_MODE=off`，公开配置返回空验证链，使 IP 演示入口可以稳定登录。修改前配置备份为：

`/opt/apps/lianqianyan/shared/secrets/api.env.before-captcha-off-20261007`

备份与当前环境文件权限均为 0600。修改前 SHA-256 为 `61d5ef3540fce5e39675a9d56aba727da6636d5881d98bd6cc46b4623a6b698a`，修改后为 `b0c873c331c8180f153afdf6b8a914d35768f7d99beb801bea36fb0615e6ae61`。Turnstile/Vaptcha 的配置值仍保留在服务器私有环境中，没有写入前端或仓库。

恢复路径：

1. 绑定正式 FQDN，并把该 hostname 加入 Turnstile widget；
2. 在公网浏览器验证 Turnstile token 的签发与服务端校验；
3. 将 Vaptcha V3 集成正式迁移为 V4，或从 fallback 链中移除；
4. 将 `CAPTCHA_MODE` 改回 `auto`，只重建涟千言 API；
5. 重新执行登录、回退链、控制台和失败请求验收。

参考：Cloudflare Turnstile hostname 管理 <https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/>；Cloudflare 客户端错误码 <https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/error-codes/>；Vaptcha 安装文档 <https://www.vaptcha.com/document/install.html>。

## 数据、备份与恢复

涟千言使用独立 `lianqianyan_data` 卷，没有上传或覆盖开发机 SQLite。最终验收后生成在线备份：

`/opt/apps/lianqianyan/shared/backups/education-20261007-133134.sqlite3`

SHA-256：`c74a4e3a29f1fb3f3ae6a1582649ad4aa2d5f7b7fcec6a86af3d3e083ae57fa4`

数据库与摘要文件权限均为 0600。在线库和备份的 `quick_check` 均为 `ok`，两者计数一致：1 个账号、8 条会话、3 门课程、15 个知识点。

升级前备份：

`/opt/apps/lianqianyan/shared/backups/education-20261007-130018.sqlite3`

SHA-256：`25d474d78b853ec569127bc5e0e97a2867e6008bc41f57e24a90032487f6f891`

应用回滚时可将 `current` 原子切回前一 release 并重建涟千言项目；宿主路由回滚使用上文的 root-only Nginx 配置备份。两类回滚均不操作原项目容器、卷或数据库。

## 本机验收证据

最终证据目录：

`.local/ecs-lianqianyan-20261007/20261007-716e045f4df5`

其中包含：

- `public-acceptance.json`：协议、静态资源与原站保护；
- `browser-login-acceptance.json`：登录、会话、退出和再登录；
- `browser-acceptance.json`：18 组页面与一次真实 SSE；
- `post-restart-acceptance.json`：重启后的会话、课程、Provider 和原站状态；
- `acceptance-account.json`：Git 忽略的验收账号凭据；
- `browser/*.png`：桌面与移动端登录、首页和小涟结果截图。

证据文件不会提交到 Git；部署文档只记录非敏感摘要。
