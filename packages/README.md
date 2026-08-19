# packages —— 共享包（预留）

> 本轮为独立单工程交付，Education Domain 采用双实现且契约一致：
>
> - **TS**：`src/domain`（Web 侧事实来源）
> - **Python**：`apps/api/app/domain`（API 侧事实来源）
>
> 未来引入 monorepo 工具链（pnpm workspace + uv workspace）后，
> 可将领域模型收敛为 `packages/domain` 共享包。

详情见 `docs/architecture.md`。
