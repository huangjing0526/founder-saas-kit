# UI 基线落地范例（Vue 3 + Element Plus）

> **这是其中一个具体栈的落地示例，不是规范本身。** 规范（框架无关原则）在 `lifecycle/3-ui-baseline/` 的五份文档里。
> 这份文件展示：把那套基线落到 **Vue 3 + Element Plus** 的真实代码长什么样——一组真实的 token 变量名、列表页 + 抽屉的真实结构、操作列收起的真实写法、三态的真实模板、一张已有组件清单。
> **你换栈时（React / 原生 / 别的组件库），不要照抄这里的变量名和组件名——照抄上层的「原则」，用你的栈重新落地。**
>
> 命名脱敏：示例 token 前缀用通用的 `--app-*`，你可以改成自己项目的前缀。组件前缀用通用的 `App*`。

---

## 1. 设计 Token（对应 `../lifecycle/3-ui-baseline/design-tokens.md`）

落地机制：CSS 自定义属性，集中在一个全局样式文件的 `:root` 块——这是唯一权威来源，代码引用以此为准。

```css
:root {
  /* 品牌色 */
  --app-primary: #7257F5;
  --app-primary-hover: #5B45D6;
  --app-primary-light: #9580FF;

  /* 状态色（成对：前景 + 浅背景，过 WCAG AA） */
  --app-success: #16a34a;  --app-success-bg: #f0fdf4;
  --app-warning: #d97706;  --app-warning-bg: #fffbeb;
  --app-danger:  #dc2626;  --app-danger-bg:  #fef2f2;
  --app-info:    #7257F5;  --app-info-bg:    #f0edff;

  /* 中性色（按用途命名，不按深浅命名） */
  --app-text-primary:   #1a1a2e;
  --app-text-secondary: #4b5563;
  --app-text-tertiary:  #6b7280;
  --app-border-color:   #e5e7eb;
  --app-bg-page:        #f9fafb;
  --app-bg-card:        #ffffff;

  /* 间距：4px 网格 */
  --app-space-xs: 4px;   --app-space-sm: 8px;   --app-space-md: 12px;
  --app-space-base: 16px; --app-space-lg: 20px; --app-space-xl: 24px;

  /* 字号阶梯（正文 base=14 为基准） */
  --app-font-sm: 13px;  --app-font-base: 14px;  --app-font-lg: 16px;  --app-font-xl: 18px;

  /* 圆角 / 阴影 / 过渡 */
  --app-card-radius: 12px;
  --app-card-shadow: 0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.03);
  --app-transition-base: .2s ease;
}
```

用的时候只引用变量，不写字面量：

```css
/* ✅ 正例 */
.card { padding: var(--app-space-lg); border-radius: var(--app-card-radius); color: var(--app-text-primary); }
/* ❌ 反例：硬编码 */
.card { padding: 20px; border-radius: 12px; color: #1a1a2e; }
```

---

## 2. 已有组件清单（对应 `../lifecycle/3-ui-baseline/component-reuse-redline.md`）

复用红线的前提——新建前先扫这张表。这是「示例项目」的清单长相：

| 组件 / Hook | 路径（示例） | 用途 | 何时复用 |
|---|---|---|---|
| `AppEmptyState` | `src/components/AppEmptyState.vue` | 空态四件套 | 所有空态 / 错误态，**禁自画空图** |
| `AppListToolbar` | `src/components/AppListToolbar.vue` | 列表工具栏（搜索 + 按钮底对齐） | 所有列表页工具栏 |
| 状态色映射常量 | `src/shared/constants/{quote,order}.ts` | 状态 chip 取色 | 状态标签都从常量取，禁组件内硬写 |
| `useListReturnState` | `src/composables/useListReturnState.js` | 列表→详情→返回保留 tab/筛选/滚动 | 所有列表页 |

> 真要新建前，对照 `../lifecycle/3-ui-baseline/component-reuse-redline.md` 第 4 节「建前自查清单」过一遍。

---

## 3. 列表页结构（对应 `../lifecycle/3-ui-baseline/interaction-conventions.md` 第 1、3、4 节）

固定结构：工具栏 → 表格（统一行高、单行省略）→ 分页。操作列主操作 ≤2，其余收进「更多」下拉。文案全走 i18n。

```vue
<template>
  <div class="app-content-card app-table-card">
    <!-- 工具栏：搜索 + 主操作 -->
    <div class="app-list-filter-bar">
      <AppListToolbar>
        <el-input v-model="keyword" :placeholder="t('common.search')" />
        <el-button type="primary" @click="openCreate">{{ t('common.create') }}</el-button>
      </AppListToolbar>
    </div>

    <!-- 表格：统一类名 + 单行省略 + tooltip -->
    <div class="app-table-wrapper">
      <el-table :data="rows" v-loading="loading" class="app-table">
        <el-table-column prop="name" :label="t('customer.name')" show-overflow-tooltip />
        <el-table-column prop="region" :label="t('customer.region')" show-overflow-tooltip />

        <!-- 操作列：主操作≤2 平铺，其余收进「更多」 -->
        <el-table-column :label="t('common.actions')" width="160">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDetail(row)">{{ t('common.detail') }}</el-button>
            <el-button type="primary" link @click="openEdit(row)">{{ t('common.edit') }}</el-button>
            <el-dropdown>
              <el-button type="primary" link>{{ t('common.more') }}</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="transfer(row)">{{ t('customer.transfer') }}</el-dropdown-item>
                  <el-dropdown-item @click="remove(row)">{{ t('common.delete') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="app-pagination-wrap">
      <el-pagination v-model:current-page="page" :total="total" @current-change="loadData" />
    </div>
  </div>
</template>
```

---

## 4. 新增 / 编辑用右侧抽屉（对应 `../lifecycle/3-ui-baseline/interaction-conventions.md` 第 2 节）

PC 端用 `el-drawer`（右侧），**不用 `el-dialog`**。关闭即销毁，避免脏数据残留。宽度按密度选档。

```vue
<el-drawer
  v-model="drawerVisible"
  :title="t('customer.create')"
  direction="rtl"
  size="480px"          
  destroy-on-close      
>
  <el-form :model="form" label-width="100px">
    <el-form-item :label="t('customer.name')" required>
      <el-input v-model="form.name" />
    </el-form-item>
    <!-- ... -->
  </el-form>

  <template #footer>
    <el-button @click="drawerVisible = false">{{ t('common.cancel') }}</el-button>
    <el-button type="primary" :loading="saving" @click="handleSave">{{ t('common.save') }}</el-button>
  </template>
</el-drawer>
```

> 简单表单 480px / 中等 640px / 复杂可到视口 70%（上限）。超过上限改独立页面。

---

## 5. 三态模板（对应 `../lifecycle/3-ui-baseline/three-states.md`）

判定顺序：**error 优先于 empty**。列表三态封进列表组件最好；详情页常需手写三态。

```vue
<template>
  <!-- Loading：首屏用骨架屏，禁正中转圈 -->
  <div v-if="loading && rows.length === 0">
    <el-skeleton :rows="6" animated />
  </div>

  <!-- Error 优先于 Empty：失败给「重试」而非「去新建」 -->
  <AppEmptyState
    v-else-if="loadError"
    variant="error"
    :title="t('common.loadFailed')"
    :button-text="t('common.retry')"
    @action="loadData"
  />

  <!-- Empty：四件套 + 文案 i18n + 用统一组件 -->
  <AppEmptyState
    v-else-if="rows.length === 0"
    :title="t('customer.emptyTitle')"
    :description="t('customer.emptyBody')"
    :button-text="t('customer.create')"
    @action="openCreate"
  />

  <!-- 正常 -->
  <el-table v-else :data="rows" class="app-table"> ... </el-table>
</template>
```

错误兜底用统一的「友好错误信息」，禁裸 `e.message`：

```js
import { ApiError } from '@/lib/api';
try {
  await save();
} catch (e) {
  // 用人话错误，不甩英文堆栈给用户
  const msg = e instanceof ApiError ? e.friendlyMessage : (t('errors.unknown'));
  ElMessage.error(msg);        // 操作失败用非阻塞 toast
}
```

---

## 6. 状态标签统一配色映射（对应 `../lifecycle/3-ui-baseline/interaction-conventions.md` 第 6 节）

状态 chip 的颜色从一处常量映射取，禁组件内硬写：

```js
// src/shared/constants/order.ts —— 一处权威映射
export const ORDER_STATUS_TAG_CLASS = {
  signed:    'app-tag--success',     // 已签约 → 绿
  pending:   'app-tag--warning',     // 待付款 → 黄
  fulfilling:'app-tag--processing',  // 履行中 → 蓝
  terminated:'app-tag--danger',      // 已终止 → 红
  draft:     'app-tag--info',        // 草稿   → 中性
};
```

```vue
<!-- 组件里只取映射，不判断颜色 -->
<el-tag :class="ORDER_STATUS_TAG_CLASS[row.status]">{{ t(`order.status.${row.status}`) }}</el-tag>
```

---

## 7. 多端对照（同一原则，不同落地）

同一条「新增/编辑用抽屉」原则，三端落地不同——这正是 README 第 3 节「多端分治」的意义：

| 端 | 抽屉方向 | 组件（示例） | 长尾操作收纳 |
|---|---|---|---|
| PC Web | 右侧滑出 | `el-drawer direction="rtl"` | `el-dropdown` 「更多」下拉 |
| 移动 Web | 底部滑出 | `el-drawer direction="btt" size="95%"` | 底部动作面板 |
| 原生 App | 底部 sheet | 原生 bottom sheet 组件 | 长按 action sheet |

> 原则一致（新增/编辑不打断上下文、长尾操作收纳）；容器随端而变。换栈 / 换端时，照抄原则、重新落地，别照抄这页的具体组件名。
