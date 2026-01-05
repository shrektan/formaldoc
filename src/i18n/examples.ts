import type { Language } from './translations';

export const examples: Record<Language, string> = {
  cn: `# 关于XX单位202X年度上半年办公用品采购及使用情况的报告

XX主管部门：

为规范办公用品管理、严控行政成本、保障日常办公有序开展，现将我单位202X年度上半年办公用品采购及使用情况报告如下。

## 一、采购基本情况

上半年，我单位严格执行《XX单位办公用品采购管理办法》，采用"集中采购为主、零星补采为辅"的模式，所有采购均通过合规渠道完成，全程留存采购记录及发票。

### （一）采购批次及金额

| 采购类型 | 采购批次 | 采购物资 | 采购金额（元） | 占总采购额比例 |
|----------|----------|----------|----------------|----------------|
| 集中采购 | 2        | 电脑耗材、打印纸、办公文具等 | 18,500         | 85.9%          |
| 零星补采 | 3        | 应急办公物品、特殊耗材等 | 3,080          | 14.1%          |
| 合计     | 5        | -        | 21,580         | 100%           |

### （二）采购成本对比

与202X年度上半年相比，采购金额减少3,220元，降幅12.9%，主要原因包括：

1. 优化采购方案，通过批量采购降低单价；
2. 减少非必要物资采购，聚焦核心办公需求；
3. 推行绿色办公，压缩耗材采购量。

## 二、使用及管理情况

### （一）领用数据统计

上半年累计领用办公用品420件，其中：

- 消耗品（打印纸、签字笔等）：350件，占比83.3%；
- 非消耗品（文件夹、订书机等）：70件，占比16.7%。

### （二）管理措施

1. 建立《办公用品领用登记台账》，实行"按需申领、限额领用、签字确认"制度；
2. 指定专人负责库存管理，每月盘点一次，确保账物相符；
3. 推进绿色办公，明确要求：
   - 打印文件优先使用双面打印；
   - 鼓励重复利用可回收办公物品（如文件夹、信封）；
   - 杜绝浪费，对违规领用行为进行提醒。

## 三、下一步工作计划

1. 进一步优化采购流程，提前预判办公需求，减少零星补采频次；
2. 加强库存精细化管理，合理控制库存数量，避免积压；
3. 持续强化绿色办公理念，开展节约办公宣传教育，进一步压缩行政成本。

## 四、附录：成本计算公式

本报告采用以下公式计算采购成本降幅：

$$
\\text{降幅} = \\frac{C_{\\text{上年}} - C_{\\text{本年}}}{C_{\\text{上年}}} \\times 100\\%
$$

其中 $C_{\\text{上年}} = 24800$ 元，$C_{\\text{本年}} = 21580$ 元，代入公式得：

$$
\\text{降幅} = \\frac{24800 - 21580}{24800} \\times 100\\% = 12.9\\%
$$

特此报告。

XX单位（盖章）
202X年X月X日`,

  en: `# Quarterly Report on Office Supplies Procurement and Usage

To: Management Department

This report provides an overview of office supplies procurement and usage for the first half of 202X, in accordance with our commitment to cost efficiency and operational excellence.

## 1. Procurement Overview

During the first half of 202X, our department followed the Office Supplies Procurement Guidelines, utilizing a centralized purchasing approach with supplementary spot purchases when necessary.

### 1.1 Procurement Summary

| Type | Batches | Items | Amount ($) | Percentage |
|------|---------|-------|------------|------------|
| Bulk Purchase | 2 | Computer supplies, paper, stationery | 2,850 | 85.9% |
| Spot Purchase | 3 | Emergency items, specialty supplies | 470 | 14.1% |
| **Total** | 5 | - | **3,320** | 100% |

### 1.2 Cost Comparison

Compared to the same period last year, procurement costs decreased by $495 (12.9% reduction). Key factors include:

1. Optimized purchasing through bulk orders for better pricing
2. Reduced non-essential purchases, focusing on core needs
3. Implementation of green office initiatives

## 2. Usage and Management

### 2.1 Distribution Statistics

Total items distributed in the first half: 420 units

- Consumables (paper, pens, etc.): 350 units (83.3%)
- Non-consumables (folders, staplers, etc.): 70 units (16.7%)

### 2.2 Management Measures

1. Established a supply requisition log with approval workflow
2. Assigned dedicated inventory manager with monthly audits
3. Promoted sustainable practices:
   - Double-sided printing as default
   - Reuse of folders and envelopes
   - Waste reduction awareness

## 3. Next Steps

1. Further streamline procurement processes
2. Enhance inventory management for optimal stock levels
3. Continue sustainability initiatives

## 4. Appendix: Cost Calculation

The cost reduction percentage is calculated using:

$$
\\text{Reduction} = \\frac{C_{\\text{previous}} - C_{\\text{current}}}{C_{\\text{previous}}} \\times 100\\%
$$

Where $C_{\\text{previous}} = 3815$ and $C_{\\text{current}} = 3320$:

$$
\\text{Reduction} = \\frac{3815 - 3320}{3815} \\times 100\\% = 12.9\\%
$$

Respectfully submitted,

Department of Administration
Date: XX/XX/202X`,
};
