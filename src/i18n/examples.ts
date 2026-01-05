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

  en: `# Q3 2024 API Gateway Performance Analysis Report

**Author:** Platform Engineering Team
**Date:** October 15, 2024

## Executive Summary

This report presents a comprehensive analysis of the API Gateway performance during Q3 2024. Overall system availability reached 99.97%, exceeding our SLA target of 99.9%. Response latency improved by 23% compared to Q2, primarily due to the new caching layer implementation.

## 1. Performance Metrics Overview

### 1.1 Key Performance Indicators

| Metric | Q2 2024 | Q3 2024 | Change | Target |
|--------|---------|---------|--------|--------|
| Availability | 99.94% | 99.97% | +0.03% | 99.9% |
| Avg Response Time | 127ms | 98ms | -22.8% | <150ms |
| P99 Latency | 892ms | 645ms | -27.7% | <1000ms |
| Error Rate | 0.12% | 0.08% | -33.3% | <0.5% |
| Requests/Second | 45,200 | 58,400 | +29.2% | - |

### 1.2 Traffic Distribution

Total API calls processed in Q3: 4.52 billion requests

- Authentication endpoints: 1.8B (39.8%)
- Data retrieval APIs: 1.5B (33.2%)
- Write operations: 0.9B (19.9%)
- Administrative APIs: 0.32B (7.1%)

## 2. System Improvements

### 2.1 Caching Layer Enhancement

The new Redis cluster deployment significantly improved read performance:

1. Implemented distributed caching across 12 nodes
2. Achieved 94.7% cache hit ratio for frequently accessed endpoints
3. Reduced database load by 62% during peak hours

### 2.2 Infrastructure Changes

Key infrastructure updates completed this quarter:

1. Upgraded load balancers to support HTTP/3
2. Deployed additional edge nodes in APAC region
3. Migrated to Kubernetes 1.28 with:
   - Horizontal Pod Autoscaler improvements
   - Enhanced resource quotas
   - Zero-downtime deployment pipeline

#### 2.2.1 Regional Latency Improvements

After the APAC edge node deployment:

- Tokyo: 45ms → 12ms (73% reduction)
- Singapore: 67ms → 18ms (73% reduction)
- Sydney: 89ms → 24ms (73% reduction)

## 3. Incident Analysis

### 3.1 Incident Summary

Two significant incidents occurred during Q3:

| Date | Duration | Impact | Root Cause |
|------|----------|--------|------------|
| Aug 12 | 23 min | 2.1% error spike | Certificate rotation failure |
| Sep 28 | 8 min | 0.4% timeout increase | Memory leak in auth service |

### 3.2 Remediation Actions

1. Implemented automated certificate monitoring
2. Added memory profiling to CI/CD pipeline
3. Enhanced alerting thresholds for early detection

## 4. Capacity Planning

### 4.1 Growth Projections

Based on current trends, we project Q4 traffic to reach 6.2 billion requests, representing a 37% increase. The throughput capacity formula used:

$$
C_{\\text{required}} = R_{\\text{peak}} \\times (1 + M_{\\text{buffer}}) \\times G_{\\text{factor}}
$$

Where $R_{\\text{peak}}$ is peak requests per second, $M_{\\text{buffer}} = 0.3$ (30% buffer), and $G_{\\text{factor}} = 1.37$ (growth factor). Substituting values:

$$
C_{\\text{required}} = 58400 \\times 1.3 \\times 1.37 = 104,018 \\text{ req/s}
$$

### 4.2 Recommended Actions

1. Scale Redis cluster to 18 nodes by November
2. Add 4 additional API Gateway instances
3. Implement request rate limiting for non-critical endpoints

## 5. Conclusion

Q3 demonstrated strong performance improvements across all key metrics. The engineering team successfully delivered infrastructure upgrades while maintaining high availability. Continued investment in caching and edge infrastructure will be critical to support projected growth.

---

*Platform Engineering Team*
*October 2024*`,
};
