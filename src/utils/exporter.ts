import type { ReimbursementFile, ExportResult, ExportSummaryItem, RollbackEntry, ClassificationRule, AmountRange } from '@/types';
import { generateId, formatDate, formatAmount } from './common';
import { getCategory } from './classifier';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

export async function generateExportData(
  files: ReimbursementFile[],
  rule: ClassificationRule,
  amountRanges: AmountRange[]
): Promise<{
  summaryData: ExportSummaryItem[];
  rollbackLog: RollbackEntry[];
}> {
  const categoryMap = new Map<string, ReimbursementFile[]>();

  for (const file of files) {
    const category = getCategory(file, rule, amountRanges);
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category)!.push(file);
  }

  const summaryData: ExportSummaryItem[] = [];
  for (const [category, catFiles] of categoryMap) {
    const totalAmount = catFiles.reduce((sum, f) => sum + (f.invoiceInfo?.amount || 0), 0);
    summaryData.push({
      employeeName: category,
      fileCount: catFiles.length,
      totalAmount,
      fileNames: catFiles.map(f => f.newName || f.name),
    });
  }

  summaryData.sort((a, b) => b.totalAmount - a.totalAmount);

  const rollbackLog: RollbackEntry[] = files.map(file => ({
    id: file.id,
    originalPath: file.relativePath,
    originalName: file.originalName,
    newPath: `${file.category}/${file.newName || file.name}`,
    newName: file.newName || file.name,
  }));

  return { summaryData, rollbackLog };
}

export function generateSummaryExcel(summaryData: ExportSummaryItem[]): Blob {
  const worksheetData = [
    ['序号', '分类', '文件数量', '总金额（元）', '包含文件'],
    ...summaryData.map((item, index) => [
      index + 1,
      item.employeeName,
      item.fileCount,
      item.totalAmount,
      item.fileNames.join('; '),
    ]),
    [],
    ['合计', '', summaryData.reduce((sum, i) => sum + i.fileCount, 0), summaryData.reduce((sum, i) => sum + i.totalAmount, 0), ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  ws['!cols'] = [
    { wch: 8 },
    { wch: 20 },
    { wch: 12 },
    { wch: 15 },
    { wch: 60 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '报销汇总');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function generateIssuesExcel(files: ReimbursementFile[]): Blob {
  const allIssues: { file: ReimbursementFile; issue: typeof files[0]['issues'][0] }[] = [];

  for (const file of files) {
    for (const issue of file.issues) {
      allIssues.push({ file, issue });
    }
  }

  const levelLabels: Record<string, string> = {
    error: '错误',
    warning: '警告',
    info: '提示',
  };

  const typeLabels: Record<string, string> = {
    duplicate: '重复票据',
    blank_file: '空白文件',
    amount_mismatch: '金额不一致',
    missing_approval: '缺少审批单',
    naming_issue: '命名不规范',
    unrecognized: '无法识别',
  };

  const worksheetData = [
    ['序号', '文件名', '问题类型', '严重级别', '问题描述', '修复建议'],
    ...allIssues.map((item, index) => [
      index + 1,
      item.file.name,
      typeLabels[item.issue.type] || item.issue.type,
      levelLabels[item.issue.level] || item.issue.level,
      item.issue.description,
      item.issue.suggestion,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  ws['!cols'] = [
    { wch: 8 },
    { wch: 30 },
    { wch: 15 },
    { wch: 10 },
    { wch: 40 },
    { wch: 40 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '问题清单');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function generateRollbackJson(rollbackLog: RollbackEntry[]): Blob {
  const data = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    entries: rollbackLog,
  };
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}

export async function generateFileListZip(files: ReimbursementFile[]): Promise<Blob> {
  const zip = new JSZip();

  const folderMap = new Map<string, JSZip>();

  for (const file of files) {
    const category = file.category || '未分类';
    const newName = file.newName || file.name;

    let folder = folderMap.get(category);
    if (!folder) {
      folder = zip.folder(category);
      folderMap.set(category, folder!);
    }

    if (file.rawFile) {
      folder!.file(newName, file.rawFile);
    } else {
      folder!.file(newName, new ArrayBuffer(0));
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function runExport(
  files: ReimbursementFile[],
  rule: ClassificationRule,
  amountRanges: AmountRange[]
): Promise<ExportResult> {
  const { summaryData, rollbackLog } = await generateExportData(files, rule, amountRanges);

  const allIssues = files.flatMap(f => f.issues);

  const timestamp = Date.now();
  const dateStr = formatDate(timestamp);

  const summaryBlob = generateSummaryExcel(summaryData);
  const issuesBlob = generateIssuesExcel(files);
  const rollbackBlob = generateRollbackJson(rollbackLog);
  const zipBlob = await generateFileListZip(files);

  downloadBlob(summaryBlob, `报销汇总表_${dateStr}.xlsx`);
  await new Promise(r => setTimeout(r, 200));
  downloadBlob(issuesBlob, `问题清单_${dateStr}.xlsx`);
  await new Promise(r => setTimeout(r, 200));
  downloadBlob(rollbackBlob, `回退记录_${dateStr}.json`);
  await new Promise(r => setTimeout(r, 200));
  downloadBlob(zipBlob, `规范附件目录_${dateStr}.zip`);

  return {
    success: true,
    totalFiles: files.length,
    issueCount: allIssues.length,
    outputPath: `报销整理结果_${dateStr}`,
    summaryData,
    issues: allIssues,
    rollbackLog,
    timestamp,
  };
}
