import type { ReimbursementFile, Issue, CheckRules, IssueType } from '@/types';
import { generateId, getFileNameWithoutExtension } from './common';

export function runAllChecks(files: ReimbursementFile[], rules: CheckRules): ReimbursementFile[] {
  let result = files.map(f => {
    const preservedIssues = f.issues.filter(i => i.type === 'unrecognized');
    return { ...f, issues: preservedIssues };
  });

  if (rules.checkDuplicate) {
    result = checkDuplicates(result);
  }

  if (rules.checkBlankFile) {
    result = checkBlankFiles(result);
  }

  if (rules.checkAmountMismatch) {
    result = checkAmountMismatch(result);
  }

  if (rules.checkMissingApproval) {
    result = checkMissingApproval(result);
  }

  if (rules.checkNaming) {
    result = checkNamingConvention(result);
  }

  return result;
}

function checkDuplicates(files: ReimbursementFile[]): ReimbursementFile[] {
  const invoiceNumberMap = new Map<string, ReimbursementFile[]>();
  const contentHashMap = new Map<string, ReimbursementFile[]>();

  for (const file of files) {
    if (file.invoiceInfo?.invoiceNumber) {
      const num = file.invoiceInfo.invoiceNumber;
      if (!invoiceNumberMap.has(num)) {
        invoiceNumberMap.set(num, []);
      }
      invoiceNumberMap.get(num)!.push(file);
    }

    const sizeKey = `${file.size}_${file.name.substring(0, 10)}`;
    if (!contentHashMap.has(sizeKey)) {
      contentHashMap.set(sizeKey, []);
    }
    contentHashMap.get(sizeKey)!.push(file);
  }

  const duplicateFileIds = new Set<string>();

  for (const [, group] of invoiceNumberMap) {
    if (group.length > 1) {
      group.forEach(f => duplicateFileIds.add(f.id));
    }
  }

  for (const [, group] of contentHashMap) {
    if (group.length > 1 && group.every(f => f.size > 0)) {
      group.forEach(f => duplicateFileIds.add(f.id));
    }
  }

  return files.map(file => {
    if (duplicateFileIds.has(file.id)) {
      const issue: Issue = {
        id: generateId(),
        fileId: file.id,
        type: 'duplicate',
        level: 'error',
        description: '检测到重复的票据',
        suggestion: '请确认是否为重复报销，删除其中一张或标记为不同的报销事项',
      };
      return { ...file, issues: [...file.issues, issue] };
    }
    return file;
  });
}

function checkBlankFiles(files: ReimbursementFile[]): ReimbursementFile[] {
  return files.map(file => {
    if (file.size === 0) {
      const issue: Issue = {
        id: generateId(),
        fileId: file.id,
        type: 'blank_file',
        level: 'error',
        description: '文件大小为 0，可能是空白文件或损坏文件',
        suggestion: '请检查文件是否有效，必要时重新获取该票据',
      };
      return { ...file, issues: [...file.issues, issue] };
    }
    return file;
  });
}

function checkAmountMismatch(files: ReimbursementFile[]): ReimbursementFile[] {
  return files.map(file => {
    const info = file.invoiceInfo;
    if (!info || !info.amount) return file;

    const nameAmount = extractAmountFromFilename(file.name);
    if (nameAmount !== null && Math.abs(nameAmount - info.amount) > 0.01) {
      const issue: Issue = {
        id: generateId(),
        fileId: file.id,
        type: 'amount_mismatch',
        level: 'warning',
        description: `文件名金额(${nameAmount.toFixed(2)}元)与识别金额(${info.amount.toFixed(2)}元)不一致`,
        suggestion: '请核实实际报销金额，确保票据金额与报销金额一致',
      };
      return { ...file, issues: [...file.issues, issue] };
    }
    return file;
  });
}

function extractAmountFromFilename(filename: string): number | null {
  const name = getFileNameWithoutExtension(filename);
  const patterns = [
    /(\d+(?:\.\d{1,2})?)\s*元/,
    /金额\s*[:：]?\s*(\d+(?:\.\d{1,2})?)/,
    /(\d+(?:\.\d{1,2})?)\s*RMB/i,
  ];

  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }

  return null;
}

function checkMissingApproval(files: ReimbursementFile[]): ReimbursementFile[] {
  const employeeFiles = new Map<string, ReimbursementFile[]>();

  for (const file of files) {
    const employee = file.invoiceInfo?.employeeName;
    if (!employee) continue;

    if (!employeeFiles.has(employee)) {
      employeeFiles.set(employee, []);
    }
    employeeFiles.get(employee)!.push(file);
  }

  const employeesWithoutApproval: string[] = [];

  for (const [employee, empFiles] of employeeFiles) {
    const hasApproval = empFiles.some(f => f.invoiceInfo?.invoiceType === 'approval');
    const hasInvoices = empFiles.some(f =>
      f.invoiceInfo?.invoiceType && f.invoiceInfo.invoiceType !== 'approval' && f.invoiceInfo.invoiceType !== 'other'
    );
    if (hasInvoices && !hasApproval) {
      employeesWithoutApproval.push(employee);
    }
  }

  return files.map(file => {
    const employee = file.invoiceInfo?.employeeName;
    if (employee && employeesWithoutApproval.includes(employee) && file.invoiceInfo?.invoiceType !== 'approval') {
      const issue: Issue = {
        id: generateId(),
        fileId: file.id,
        type: 'missing_approval',
        level: 'warning',
        description: `员工 ${employee} 的报销缺少审批单`,
        suggestion: '请确保每位员工的报销都附有对应的审批单据',
      };
      return { ...file, issues: [...file.issues, issue] };
    }
    return file;
  });
}

function checkNamingConvention(files: ReimbursementFile[]): ReimbursementFile[] {
  return files.map(file => {
    const name = getFileNameWithoutExtension(file.name);
    const issues: Issue[] = [];

    const hasChinese = /[\u4e00-\u9fa5]/.test(name);
    const hasDate = /\d{4}[-_.]?\d{1,2}/.test(name);

    if (!hasChinese) {
      issues.push({
        id: generateId(),
        fileId: file.id,
        type: 'naming_issue',
        level: 'info',
        description: '文件名中未找到中文姓名',
        suggestion: '建议文件名包含员工姓名，如"张三_差旅费发票.pdf"',
      });
    }

    if (!hasDate && file.type !== 'excel') {
      issues.push({
        id: generateId(),
        fileId: file.id,
        type: 'naming_issue',
        level: 'info',
        description: '文件名中未找到日期信息',
        suggestion: '建议文件名包含月份信息，如"202401_张三_报销.pdf"',
      });
    }

    if (issues.length > 0) {
      return { ...file, issues: [...file.issues, ...issues] };
    }

    return file;
  });
}

export function getIssueSummary(files: ReimbursementFile[]): Record<IssueType, number> {
  const summary: Record<string, number> = {
    duplicate: 0,
    blank_file: 0,
    amount_mismatch: 0,
    missing_approval: 0,
    naming_issue: 0,
    unrecognized: 0,
  };

  for (const file of files) {
    for (const issue of file.issues) {
      summary[issue.type] = (summary[issue.type] || 0) + 1;
    }
  }

  return summary as Record<IssueType, number>;
}

export function getTotalIssueCount(files: ReimbursementFile[]): number {
  return files.reduce((sum, file) => sum + file.issues.length, 0);
}

export function getErrorCount(files: ReimbursementFile[]): number {
  return files.reduce((sum, file) => {
    return sum + file.issues.filter(i => i.level === 'error').length;
  }, 0);
}

export function getWarningCount(files: ReimbursementFile[]): number {
  return files.reduce((sum, file) => {
    return sum + file.issues.filter(i => i.level === 'warning').length;
  }, 0);
}

export const DEFAULT_CHECK_RULES: CheckRules = {
  checkDuplicate: true,
  checkBlankFile: true,
  checkAmountMismatch: true,
  checkMissingApproval: true,
  checkNaming: true,
};
