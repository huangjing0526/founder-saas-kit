# ⑥ 测试 / 验收

> "做完了"不是说出来的,是跑出证据证明的。这一步专治"拿 lint 通过当完成"。

这一阶段**没有独立内容目录**:它由 `engineering/` 的验收闸 + 门禁脚本覆盖。下面是该用的——

| 你在做 | 用什么 | 在哪 |
|--------|--------|------|
| 准备宣布"做完 / 已修复 / 可交付" | S8 交付验收门禁(5 步核验有无新鲜证据) | [`../../engineering/governance-skills/S8-delivery-verification-gate.md`](../../engineering/governance-skills/S8-delivery-verification-gate.md) |
| 想要"一条命令本地门禁" | `harness.mjs`(聚合 lint + 测试,任一失败即拦) | [`../../engineering/quality-scripts/harness.mjs`](../../engineering/quality-scripts/harness.mjs) |
| 想证明 skill / 规则真拦得住 AI 越界 | 可跑 eval 骨架 | [`../../engineering/governance-skills/eval/`](../../engineering/governance-skills/eval/) |
| 想让验收员独立复核 | delivery-verification-reviewer(只读) | [`../../engineering/enforcement/subagents/delivery-verification-reviewer.md`](../../engineering/enforcement/subagents/delivery-verification-reviewer.md) |

**核心纪律**:验收勾选必须**附证据**(测试输出 / 可跑命令 / `文件:行号`),禁止盲勾(见 [`../../engineering/methodology/north-star-rules.md`](../../engineering/methodology/north-star-rules.md))。

**上游**:⑤ 编码([`../5-coding/`](../5-coding/))。
**下游**:⑦ 上线([`../7-deploy/`](../7-deploy/))——测通了才发生产。
