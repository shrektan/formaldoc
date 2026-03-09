import type { TemplateCategory } from '../types/styles';

export interface ScenarioPreset {
  id: string;
  title: string;
  description: string;
  content: string;
}

export const SCENARIO_PRESETS: Record<TemplateCategory, ScenarioPreset[]> = {
  chinese: [
    {
      id: 'notice',
      title: '通知',
      description: '适合发布安排、制度与执行要求。',
      content: `# 关于开展专项工作的通知

主送单位：

## 一、工作背景

为进一步推进相关工作，现就有关事项通知如下。

## 二、重点安排

### （一）任务分工

请各单位结合职责抓好落实。

### （二）时间要求

请于规定时间前完成并反馈结果。

## 三、有关要求

请高度重视，做好组织实施。

发文单位

2026年3月8日`,
    },
    {
      id: 'request',
      title: '请示',
      description: '适合向上级提交事项申请与审批请求。',
      content: `# 关于申请开展专项工作的请示

主送机关：

## 一、请示事项

因工作需要，拟申请开展相关专项工作。

## 二、主要理由

### （一）现实背景

现有工作基础与需求如下。

### （二）实施必要性

开展该项工作有助于提升整体成效。

## 三、拟请示内容

妥否，请批示。

请示单位

2026年3月8日`,
    },
    {
      id: 'report',
      title: '报告',
      description: '适合阶段性工作汇报与情况说明。',
      content: `# 关于近期重点工作进展情况的报告

报送单位：

## 一、总体进展

目前各项重点任务总体推进平稳。

## 二、主要成效

### （一）任务完成情况

已完成既定阶段目标。

### （二）经验做法

通过机制协同提升执行效率。

## 三、下一步安排

将继续推进重点事项并强化复盘。

报送单位

2026年3月8日`,
    },
    {
      id: 'letter',
      title: '函',
      description: '适合跨部门沟通、协商与函复。',
      content: `# 关于协助提供相关材料的函

致：

因工作需要，现请贵单位协助提供以下材料。

## 一、所需材料

- 材料一
- 材料二
- 材料三

## 二、时间安排

请于指定日期前反馈。

此函。

发函单位

2026年3月8日`,
    },
    {
      id: 'minutes',
      title: '会议纪要',
      description: '适合整理会议结论与任务分工。',
      content: `# 重点工作推进会会议纪要

会议时间：
会议地点：
参会人员：

## 一、会议情况

会议围绕近期重点工作进行了专题研究。

## 二、形成意见

### （一）工作目标

明确阶段性目标与节点安排。

### （二）责任分工

各责任单位按照分工推进落实。

## 三、后续要求

按会议议定事项抓好执行并及时反馈。

办公室

2026年3月8日`,
    },
  ],
  english: [
    {
      id: 'memo',
      title: 'Memo',
      description: 'A fast structure for internal briefings and decisions.',
      content: `# Project Memo

To:
From:
Date:
Subject:

## Summary

State the key decision or update in one short paragraph.

## Context

Explain the background and current situation.

## Recommendation

List the proposed next steps and owners.

## Notes

- Item one
- Item two
- Item three`,
    },
    {
      id: 'briefing',
      title: 'Briefing',
      description: 'Useful for executive updates and meeting prep.',
      content: `# Executive Briefing

## Situation

Describe the current status and why it matters.

## Key Signals

- Signal one
- Signal two
- Signal three

## Recommended Actions

1. Action one
2. Action two
3. Action three`,
    },
    {
      id: 'report',
      title: 'Report',
      description: 'For periodic status and operational summaries.',
      content: `# Monthly Operations Report

## Highlights

Summarize the most important outcomes for this period.

## Performance Review

### Delivery

Explain what was delivered and what is at risk.

### Metrics

Include the most relevant numbers and trends.

## Next Steps

List the next actions with owners and timing.`,
    },
    {
      id: 'letter',
      title: 'Letter',
      description: 'For formal correspondence and requests.',
      content: `# Formal Letter

Date:
Recipient:

Dear Recipient,

State the purpose of the letter clearly and formally.

## Details

Provide the necessary context and supporting information.

Sincerely,

Sender Name`,
    },
  ],
};
