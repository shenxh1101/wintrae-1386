import type { ReimbursementFile, ClassificationRule, AmountRange, ExcelRowRecord } from '@/types';
import { getMonthFromDate, safeFileName } from './common';

export function classifyFiles(
  files: ReimbursementFile[],
  rule: ClassificationRule,
  amountRanges: AmountRange[]
): ReimbursementFile[] {
  return files.map(file => {
    const category = getCategory(file, rule, amountRanges);
    return { ...file, category };
  });
}

export function getCategory(
  file: ReimbursementFile,
  rule: ClassificationRule,
  amountRanges: AmountRange[]
): string {
  const info = file.invoiceInfo;
  if (!info) return '未分类';

  switch (rule) {
    case 'employee':
      return info.employeeName || '未命名员工';

    case 'month':
      return info.invoiceDate ? getMonthFromDate(info.invoiceDate) : '未知月份';

    case 'amount':
      const amount = info.amount || 0;
      const range = amountRanges.find(r => amount >= r.min && amount < r.max);
      return range ? range.label : '其他金额';

    case 'project':
      return info.projectName || '未指定项目';

    default:
      return '未分类';
  }
}

export function getCategoryForRow(
  row: ExcelRowRecord,
  rule: ClassificationRule,
  amountRanges: AmountRange[]
): string {
  switch (rule) {
    case 'employee':
      return row.employeeName || '未命名员工';
    case 'month':
      return row.invoiceDate ? getMonthFromDate(row.invoiceDate) : '未知月份';
    case 'amount':
      const range = amountRanges.find(r => row.amount >= r.min && row.amount < r.max);
      return range ? range.label : '其他金额';
    case 'project':
      return row.projectName || '未指定项目';
    default:
      return '未分类';
  }
}

export function getCategoryMap(
  files: ReimbursementFile[],
  rule: ClassificationRule,
  amountRanges: AmountRange[]
): Map<string, ReimbursementFile[]> {
  const map = new Map<string, ReimbursementFile[]>();

  for (const file of files) {
    const category = getCategory(file, rule, amountRanges);
    if (!map.has(category)) {
      map.set(category, []);
    }
    map.get(category)!.push(file);
  }

  return map;
}

export function getExpandedEntries(
  files: ReimbursementFile[],
  rule: ClassificationRule,
  amountRanges: AmountRange[]
): { category: string; label: string; amount: number; source: 'file' | 'row'; file: ReimbursementFile; row?: ExcelRowRecord }[] {
  const entries: { category: string; label: string; amount: number; source: 'file' | 'row'; file: ReimbursementFile; row?: ExcelRowRecord }[] = [];

  for (const file of files) {
    if (file.excelSubRows && file.excelSubRows.length > 0) {
      for (const row of file.excelSubRows) {
        const category = getCategoryForRow(row, rule, amountRanges);
        entries.push({
          category,
          label: `${file.name} 第${row.rowIndex}行 - ${row.employeeName || '未知'}`,
          amount: row.amount,
          source: 'row',
          file,
          row,
        });
      }
    } else {
      const category = getCategory(file, rule, amountRanges);
      entries.push({
        category,
        label: file.newName || file.name,
        amount: file.invoiceInfo?.amount || 0,
        source: 'file',
        file,
      });
    }
  }

  return entries;
}

export function generateNewFileName(
  file: ReimbursementFile,
  template: string,
  index: number
): string {
  const info = file.invoiceInfo;
  if (!info) return file.name;

  const ext = file.name.split('.').pop() || '';
  let name = template;

  name = name.replace(/{员工姓名}/g, info.employeeName || '未知员工');
  name = name.replace(/{月份}/g, info.invoiceDate ? info.invoiceDate.substring(0, 7) : '未知月份');
  name = name.replace(/{金额}/g, info.amount ? info.amount.toFixed(2) : '0.00');
  name = name.replace(/{发票类型}/g, getInvoiceTypeShortName(info.invoiceType));
  name = name.replace(/{序号}/g, String(index).padStart(3, '0'));
  name = name.replace(/{发票号码}/g, info.invoiceNumber || '未知编号');
  name = name.replace(/{项目名称}/g, info.projectName || '未知项目');

  name = safeFileName(name);

  return `${name}.${ext}`;
}

function getInvoiceTypeShortName(type: string): string {
  const names: Record<string, string> = {
    vat_special: '专票',
    vat_general: '普票',
    electronic: '电票',
    receipt: '收据',
    approval: '审批单',
    other: '其他',
  };
  return names[type] || '其他';
}

export function applyRename(
  files: ReimbursementFile[],
  template: string,
  rule: ClassificationRule,
  amountRanges: AmountRange[]
): ReimbursementFile[] {
  const categoryMap = new Map<string, number>();

  return files.map(file => {
    const category = getCategory(file, rule, amountRanges);
    const count = (categoryMap.get(category) || 0) + 1;
    categoryMap.set(category, count);

    const newName = generateNewFileName(file, template, count);
    return { ...file, newName, category };
  });
}

export const DEFAULT_NAMING_TEMPLATE = '{员工姓名}_{月份}_{发票类型}_{序号}';

export const DEFAULT_AMOUNT_RANGES: AmountRange[] = [
  { min: 0, max: 500, label: '500元以下' },
  { min: 500, max: 2000, label: '500-2000元' },
  { min: 2000, max: 5000, label: '2000-5000元' },
  { min: 5000, max: 999999, label: '5000元以上' },
];
