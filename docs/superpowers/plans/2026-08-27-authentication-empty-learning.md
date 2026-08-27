# 登录注册与空白学习空间实施计划

> 执行方式：当前专用功能分支内直接执行；用户明确禁止子智能体并授权全权决策。

**目标：** 交付生产可用的登录注册、服务端会话、显式选课和无默认学习的新用户体验，并安全退役历史匿名学习数据。

**架构：** FastAPI + SQLAlchemy 新增独立认证表和 HttpOnly Cookie 会话；React 通过 AuthProvider/AuthGate 在业务 Router 外统一门控。既有领域 API 保持入参兼容，但由当前会话校验 learner/course 所有权。

**技术栈：** Python 3.12、FastAPI、SQLAlchemy、Pydantic、React 18、TypeScript、Axios、Vitest、Testing Library、pnpm。

---

## 任务 1：认证领域与 API

**文件：**
- 新建 `apps/api/app/auth/{__init__,models,passwords,service,dependencies}.py`
- 新建 `apps/api/app/api/routes/auth.py`
- 修改 `apps/api/app/core/config.py`
- 修改 `apps/api/app/main.py`
- 修改 `apps/api/app/api/__init__.py`
- 测试 `apps/api/tests/test_auth.py`

**步骤：**
1. 先写注册、登录、会话、退出、重复用户名、密码校验、锁定与课程选择失败测试并确认失败。
2. 实现 scrypt 密码哈希、认证表、会话服务、Cookie 和路由。
3. 将认证模型纳入 `Base.metadata` 建表流程，开启凭据 CORS。
4. 运行认证测试直至通过。

## 任务 2：业务 API 访问控制与数据所有权

**文件：**
- 修改 `apps/api/app/api/__init__.py`
- 修改用户型路由：`diagnosis.py`、`profile.py`、`plans.py`、`learning.py`、`practice.py`、`agents.py`、`assessment.py`、`exams.py`、`reports.py`、`tutor.py`
- 修改必要的查询服务/仓储
- 修改 `apps/api/tests/conftest.py`
- 新建/修改访问控制测试

**步骤：**
1. 先写未登录 401、跨账号 403、未选课 409 和证据隔离测试并确认失败。
2. 增加 `require_current_account` 与 learner/course 范围校验。
3. 认证默认开启；旧领域测试明确关闭认证，专门认证测试明确开启。
4. 运行相关后端测试直至通过。

## 任务 3：前端认证门控

**文件：**
- 新建 `src/auth/authApi.ts`
- 新建 `src/auth/AuthProvider.tsx`
- 新建 `src/auth/AuthGate.tsx`
- 新建 `src/auth/AuthScreen.tsx`
- 新建 `src/auth/CourseSelectionScreen.tsx`
- 新建对应测试
- 修改 `src/App.tsx`
- 修改 `src/lib/api.ts`

**步骤：**
1. 先写登录/注册切换、表单验证、会话恢复、选课与退出测试并确认失败。
2. 实现 API 类型与 Provider 状态机。
3. 实现完整登录注册页和显式选课页，只有 ready 状态挂载 Router。
4. 运行前端定向测试直至通过。

## 任务 4：移除匿名与默认学习上下文

**文件：**
- 修改 `src/config/learnerContext.ts`
- 修改 `src/config/learnerContext.test.ts`
- 修改 `src/config/runtime.ts` 及测试
- 修改 `src/components/layout/TopCompanionBar.tsx` 及测试
- 新建 `apps/api/scripts/retire_anonymous_learning.py`
- 新建脚本测试

**步骤：**
1. 先将测试改为“无账号时不生成匿名 ID、无显式课程时无默认课程”。
2. 实现认证上下文存取和未登录哨兵，删除匿名 localStorage 兼容残留。
3. 顶栏接入显示名与退出。
4. 实现 dry-run + 自动备份 + 精确删除 `anon:*` 数据的脚本并测试。

## 任务 5：元数据、真实数据迁移与正式交付

**文件：**
- 修改 `package.json`、`meta.json`、`cpage_config.json`、`README.md`、部署文档/示例环境变量
- 更新 `deploy/`、`release/` 正式包

**步骤：**
1. 提升版本至 1.4.0，平台元数据改为需要登录。
2. 对 `.local/runtime/education.db` 先 dry-run，再 `--apply`；核对备份、匿名记录归零、共享目录不变。
3. 运行后端全量测试、前端全量测试、`pnpm check`、`pnpm build`。
4. 启动真实前后端，验证注册→选课→空白学习→学习数据产生→退出→401，并做浏览器渲染检查。
5. 生成包含完整前后端代码的正式部署 ZIP，验证可解压、文件清单、版本和 SHA-256。

