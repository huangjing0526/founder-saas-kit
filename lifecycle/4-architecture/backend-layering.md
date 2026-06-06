---
title: 后端分层规范：路由层 → 服务层 → 仓储层
status: active
version: v1.0
owner: you
---

# 后端分层规范：路由层 → 服务层 → 仓储层

> 后端的硬约束分层。架构评估阶段（见 `architect-handoff.md`）拆任务时，每个子任务都要能落到这三层结构里——说不清一个改动落在哪层，通常是还没想透。
> 经验来源：真实多租户 SaaS CRM 项目的后端分层约束（源料已脱敏）。

---

## 分层职责

```
路由层 (routes/)        → 服务层 (services/)          → 仓储层 (repositories/)        → 数据库
  请求/响应协议转换         业务逻辑、权限、聚合              数据访问、原子操作                   ORM（示例栈）
```

| 层 | 关注 | 不允许做 |
|---|---|---|
| 路由层 Routes | 请求解析、响应格式化、状态码映射 | 直接调 ORM、写业务规则 |
| 服务层 Services | 业务规则、权限校验、跨实体协调、事务编排 | 依赖请求 / 响应对象、直接调其他 Service（通过 Repository 协调）|
| 仓储层 Repositories | 增删改查、原子更新 + 计数实现乐观锁、事务封装 | 业务规则、依赖 web 框架 |

一句话记法：**路由不写业务逻辑、服务不碰请求/响应、仓储只封装数据访问。**

---

## 1. 仓储层（Repository）

**规范**：

- **接口先行** —— 先定义接口（如 `ILeadRepository`），再写具体实现（如 ORM 实现 `XxxLeadRepository`）。
- **单一职责** —— 一个 Repository 只管一个实体。
- **原子操作** —— 优先用「原子更新 + 计数」实现乐观锁，而不是「先查再改」。
- **事务支持** —— 提供 `transaction(callback)` 方法。
- ❌ 禁止写业务规则。
- ❌ 路由层禁止直接调 Repository，必须经 Service。

> 下方示例为某 ORM（示例栈）的写法，换栈时保留「接口先行 + 原子更新 + 计数防并发」这套思路即可。

```javascript
// ✅ 接口定义
export class ILeadRepository {
  async findById(id, options) { throw new Error('Not implemented') }
  async claimLead(id, tenantId, ownerId) { throw new Error('Not implemented') }
}

// ✅ ORM（示例栈）实现：用「原子更新 + 计数」做乐观锁
export class OrmLeadRepository extends ILeadRepository {
  constructor(orm) { super(); this.orm = orm }

  async claimLead(id, tenantId, ownerId) {
    const result = await this.orm.lead.updateMany({
      where: { id, tenantId, ownerId: null },          // 只更新还在公海的
      data: { ownerId, claimedAt: new Date() }
    })
    if (result.count === 0) return null                // 已被他人领走
    return this.orm.lead.findUnique({ where: { id } })
  }
}

// ❌ 错误：Repository 内写业务规则
async claimLead(id, tenantId, ownerId) {
  if (!hasClaimPermission(ownerId)) throw new Error('无权限')  // ← 业务，应在 Service
}
```

> 业务模块示例（线索 lead / 客户 customer）来自源项目，保留作示例；换成你自己的实体即可。

---

## 2. 服务层（Service）

**规范**：

- **依赖注入** —— 构造函数注入 Repository 实例（见第 4 节）。
- **命名贴近业务** —— `claimLead` / `convertToCustomer`，不是 `updateLeadOwner`。
- **抛异常** —— 业务失败抛 Error，由路由层映射到对应状态码。
- ❌ 禁止依赖请求 / 响应对象（示例栈中的 `req` / `res`）。
- ❌ 禁止 Service 互相调用（容易循环依赖），需要协调时通过 Repository。

```javascript
// ✅ 正确
export class LeadService {
  constructor(leadRepository) {
    this.leadRepository = leadRepository
  }

  async claimLead(id, user) {
    const lead = await this.leadRepository.claimLead(id, user.tenantId, user.id)
    if (!lead) throw new Error('领取失败：线索不存在或已被他人领取')
    return lead
  }

  async convertToCustomer(id, convertData, user) {
    const lead = await this.leadRepository.findById(id)
    if (!lead) throw new Error('线索不存在')
    if (lead.status === 'converted') throw new Error('线索已转化')

    const customerData = {
      tenantId: user.tenantId,
      ownerId: convertData.target === 'me' ? user.id : null,
      metadata: { ...lead.metadata, ...convertData.customerMetadata }
    }
    return this.leadRepository.convertToCustomer(id, customerData)
  }
}

// ❌ 依赖 web 框架的请求/响应对象（示例栈 req/res）
async claimLead(req, res) { res.json({ data: await ... }) }

// ❌ Service 注入其他 Service
constructor(leadRepo, customerService) { ... }
```

---

## 3. 路由层（Routes）

**规范**：

- 仅调 Service，**不**直接调 ORM / Repository。
- 捕异常并映射状态码（如 409 冲突、404 not found、403 无权限）。
- 保持统一的 API 响应格式（示例栈为 `{ code, data, message }`）。

```javascript
// ✅ 正确（示例栈：某 web 框架的路由）
import { getLeadService } from '../services/index.js'

router.post('/:id/claim', asyncHandler(async (req, res) => {
  const leadService = getLeadService()
  try {
    const lead = await leadService.claimLead(req.params.id, req.user)
    res.json({ code: 0, data: lead, message: '领取成功' })
  } catch (error) {
    if (error.message.includes('领取失败')) {
      return res.status(409).json({ code: 409, message: error.message })
    }
    throw error
  }
}))

// ❌ 路由内直接调 ORM
router.post('/:id/claim', async (req, res) => {
  const lead = await orm.lead.updateMany({ ... })
  res.json({ data: lead })
})
```

---

## 4. 依赖注入容器

把 ORM 实例和各层装配集中在一个容器里，启动时初始化一次，业务代码按需取实例——而不是在各处 `new`。这样换实现（如 ORM 换成内存 Mock）只动容器，不动业务代码。

```javascript
// 应用启动时初始化一次（示例栈）
import { initializeContainer } from './di/container.js'
import { OrmClient } from '<your-orm>'

const orm = new OrmClient()
initializeContainer({ orm, dbType: 'orm' })

// 业务代码中取实例
import { getLeadService, getCustomerService } from './services/index.js'
import { getLeadRepository } from './di/container.js'

const leadService = getLeadService()
const leadRepo = getLeadRepository()
```

**依赖注入思想**：高层（Service）依赖**接口**而非具体实现；具体实现（ORM 仓储 / Mock 仓储）从外部注入。好处——单测时注入内存 Mock 不碰真实库，换数据访问技术时只换注入的实现。

---

## 5. 接口驱动开发（IDD）4 步流

新增功能的固定顺序——**先定接口，再填实现**：

1. **定义接口**（服务层 + 仓储层各一份 `I*`）—— 类型签名 + 文档注释，标注 `@throws` 业务异常。
2. **写 Mock 实现**（内存版）—— 给单测用，不碰真实库。
3. **真实实现**（服务层 + 仓储层 ORM 实现）。
4. **路由层接入**。

好处：接口一锁定，单测（靠 Mock）和真实实现可以并行推进；接口就是两层之间的契约。

---

## 6. 给老项目的渐进式迁移路径

老代码**不一次性重写**，按接口逐步迁移：

1. 保留现有路由文件，先不动。
2. **逐个接口**往 Service 迁：把一个接口的业务逻辑从路由里抽到 Service + Repository。
3. 测试验证通过后提交。
4. 重复，直到全部迁完。

**迁移优先级**：核心业务（如领取 / 转化 / 转移）> 复杂查询（统计 / 聚合）> 简单 CRUD。先迁最容易出并发 / 业务错误的，简单 CRUD 放最后。

---

## 禁止事项

- ❌ 路由层直接调 ORM（必须经 Service）。
- ❌ Service 之间互相调用（必须通过 Repository 协调）。
- ❌ Repository 中写业务规则（必须留在 Service）。
- ❌ 创建不带接口定义的新 Service（必须先定义接口 `I*`）。
- ❌ 抢占 / 批量改归属用「先查再改」模式（必须用「原子更新 + 计数」或事务，防并发）。

---

**相关文档**：

- `architect-handoff.md` —— 上游：PRD→技术方案评估清单（拆任务时落到本文三层结构）。
- `../../engineering/governance-skills/` —— 编码全程的治理守卫（出码前自检、多租户隔离、安全提交、交付验收）。
