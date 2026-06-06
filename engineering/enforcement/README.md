# Enforcement — 可执行的强制层

> 文档里写的红线，AI 不一定照做。这一层把红线从「自觉遵守」变成「动手前被拦」。

约束分两种力度：

- **守卫 hook**（`hooks/`）—— 命令/文件级硬门禁。在 AI 执行危险 Bash 或写高危文件**之前**拦截，
  fail-open 设计（hook 自身出错一律放行，绝不卡死 agent）。
- **只读审查 subagent**（`subagents/`）—— 语义级把关。在 AI 写完某类代码 / 宣称完成**之后**，
  以独立只读身份复查，附 `文件:行号` 证据，给 BLOCK/WARN/PASS 结论。

两者互补：hook 挡「机检得出来的危险动作」，subagent 抓「脚本测不出的语义问题」。

---

## 目录

```
enforcement/
├── README.md                          ← 本文件
├── settings.example.json              ← 把 hooks 挂进 .claude/settings.json 的样例
├── hooks/
│   ├── guard-dangerous-bash.cjs       ← PreToolUse(Bash)：拦 rm -rf / reset --hard / clean -f / force push / 清库(migrate reset · db push --force-reset，示例) / dd 裸写块设备 / 截断写危险目标 / 生产发布
│   ├── guard-high-risk-edit.cjs       ← PreToolUse(Edit|Write|MultiEdit)：拦写 .env/密钥(含私钥/keystore/secrets.yaml/credentials*)；schema/迁移/登记表/CI 配置靠 ack 清单放行
│   └── guard.test.cjs                 ← 零依赖自测：喂各类绕过 payload 给两个守卫，断言该拦的拦(exit 2)、该放的放(exit 0)
└── subagents/
    ├── REVIEWER-PATTERN.md            ← 三个 reviewer 共用范式 + 怎么造你自己的第 4 个
    ├── business-rule-reviewer.md      ← 查「有没有乱加需求外的业务规则」
    ├── tenant-isolation-reviewer.md   ← 查「跨租户数据隔离是否真成立」
    └── delivery-verification-reviewer.md ← 查「说做完了是否有新鲜验证证据」
```

---

## 一、挂载守卫 hook

1. 把两个 `.cjs` 拷到你项目里（建议 `scripts/hooks/`）：

   ```bash
   mkdir -p scripts/hooks
   cp enforcement/hooks/*.cjs scripts/hooks/
   ```

2. 把 `settings.example.json` 里的 `PreToolUse` 两段合并进你项目的 `.claude/settings.json`
   （已有 `hooks` 节点就合并，没有就整段拷）。`$CLAUDE_PROJECT_DIR` 由 Claude Code
   自动注入指向项目根，路径按你放置位置调整。

3. **按你的项目改两个 guard**（文件顶部注释都标了「改成你自己项目的点」）：
   - `guard-dangerous-bash.cjs`：进程管理器规则（默认按 pm2 写，示例；systemd/docker 自行替换）、
     清库命令（默认按 Prisma `migrate reset` / `db push --force-reset` 写，示例；其它 ORM 照葫芦补一条）、
     生产分支名（默认 `main`）。
   - `guard-high-risk-edit.cjs`：**文件顶部的 `B_TIER` 数组就是「受保护文件清单」**——
     换成你自己「改了就可能搞出大事」的文件（数据库 schema / 迁移 / 计费 / CI 配置……）。
     CI 配置（GitHub Actions / GitLab CI / CircleCI）默认已生效，因为它是质量门禁总开关，
     agent 改它能一键关掉全部 enforcement。密钥文件（.env / 私钥 / keystore / secrets.yaml /
     credentials*）走「绝对禁止」段，无需在 B_TIER 重复。

4. 验证 hook 通了——直接跑自测（零依赖）：

   ```bash
   node scripts/hooks/guard.test.cjs
   # 预期：全部用例 PASS，exit=0
   ```

   或手动模拟一条 PreToolUse 输入：

   ```bash
   echo '{"tool_input":{"command":"git reset --hard HEAD"}}' | node scripts/hooks/guard-dangerous-bash.cjs; echo "exit=$?"
   # 预期：打印拦截说明，exit=2
   echo '{"tool_input":{"command":"git status"}}' | node scripts/hooks/guard-dangerous-bash.cjs; echo "exit=$?"
   # 预期：无输出，exit=0
   ```

### 守卫的紧急覆盖口

guard 不是死锁——确有授权的高危操作可以**显式、可见地**放行：

| 场景 | 覆盖方式 |
|---|---|
| A 档绝对禁止（rm -rf / reset --hard / 清库 migrate reset / dd 裸写 / 截断写危险目标…）| 命令前加 `GUARD_OFF=1`，或 `export GUARD_OFF=1` |
| B 档生产发布（push/merge main）| 命令前加 `GUARD_ALLOW_DEPLOY=1` |
| 高危文件编辑（schema/迁移/登记表/CI 配置）| 先用 Write 生成 `.claude/.guard-ack.json`（5 字段填全、`file` 必须是**精确相对路径**、60 分钟内有效）|

> 说明：写 `.env` / 密钥文件（私钥 / keystore / `secrets.yaml` / `credentials*`）是**绝对禁止**段，
> 没有 ack 覆盖口——密钥永不由 agent 改写。受保护文件清单（B 档，含 CI 配置）才走 ack。

覆盖动作会留在 transcript 里，review 时一眼可见——这是「有意识地绕过」，不是「悄悄绕过」。

---

## 二、挂载只读审查 subagent

把三个 `.md` 拷进你项目的 agent 目录（Claude Code 子代理目录）：

```bash
mkdir -p .claude/agents
cp enforcement/subagents/business-rule-reviewer.md .claude/agents/
cp enforcement/subagents/tenant-isolation-reviewer.md .claude/agents/
cp enforcement/subagents/delivery-verification-reviewer.md .claude/agents/
```

每个 `.md` 的 frontmatter（`name` / `description` / `tools: Read, Grep, Glob`）即子代理定义。
`description` 里写了 **WHEN（何时触发）+ WHEN-NOT（何时别触发）**，主 agent 据此自动调用，
你也可以显式让它跑（如「用 tenant-isolation-reviewer 审一下刚改的查询」）。

按你的项目调整 `.md` 正文里的判定标准与路径示例（如把 `business-rules-registry.md`
换成你的登记表路径、把生产就绪登记表换成你的）。

想加你自己的第 4 个 reviewer？读 `subagents/REVIEWER-PATTERN.md`。

---

## 设计原则速记

- **hook 永远 fail-open**：guard 自身异常一律放行（exit 0），宁可漏拦也不卡死 agent。
- **subagent 永远只读**：裁判不下场踢球，修复交回主 agent。
- **凡断言必附证据**：reviewer 每条结论带 `文件:行号` 或可复跑命令。
- **三级而非二元**：BLOCK / WARN / PASS，给「不确定」留诚实档位。
- **沉默也要交代**：没发现问题，也要列「查了哪些维度」的负向确认。
