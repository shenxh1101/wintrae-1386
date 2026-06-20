import type { ReimbursementFile, ExportResult, ExportSummaryItem, RollbackEntry, ClassificationRule, AmountRange, ExcelRowRecord } from '@/types';
import { generateId, formatDate, formatAmount } from './common';
import { getCategory, getCategoryForRow, getExpandedEntries } from './classifier';
import { INVOICE_TYPE_LABELS } from '@/types';
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
  const categoryMap = new Map<string, { files: ReimbursementFile[]; totalAmount: number; fileNames: string[] }>();

  for (const file of files) {
    if (file.excelSubRows && file.excelSubRows.length > 0) {
      for (const row of file.excelSubRows) {
        const category = getCategoryForRow(row, rule, amountRanges);
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { files: [], totalAmount: 0, fileNames: [] });
        }
        const entry = categoryMap.get(category)!;
        entry.totalAmount += row.amount;
        entry.fileNames.push(`${file.name}(第${row.rowIndex}行:${row.employeeName || '未知'})`);
        if (!entry.files.includes(file)) {
          entry.files.push(file);
        }
      }
    } else {
      const category = getCategory(file, rule, amountRanges);
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { files: [], totalAmount: 0, fileNames: [] });
      }
      const entry = categoryMap.get(category)!;
      entry.files.push(file);
      entry.totalAmount += file.invoiceInfo?.amount || 0;
      entry.fileNames.push(file.newName || file.name);
    }
  }

  const summaryData: ExportSummaryItem[] = [];
  for (const [category, data] of categoryMap) {
    summaryData.push({
      employeeName: category,
      fileCount: data.fileNames.length,
      totalAmount: data.totalAmount,
      fileNames: data.fileNames,
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
    ['序号', '分类', '条目数量', '总金额（元）', '包含文件'],
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
    unrecognized: '待人工补录',
  };

  const worksheetData = [
    ['序号', '文件名', '所在行', '问题类型', '严重级别', '问题描述', '修复建议'],
    ...allIssues.map((item, index) => [
      index + 1,
      item.file.name,
      item.issue.rowIndex ? `第 ${item.issue.rowIndex} 行` : '-',
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
    { wch: 12 },
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

function generateIndexExcel(files: ReimbursementFile[], rule: ClassificationRule, amountRanges: AmountRange[]): Blob {
  const sourceLabels: Record<string, string> = {
    filename: '文件名识别',
    excel: '表格内容识别',
    pdf: 'PDF识别',
    image: '图片识别',
    manual: '人工补录',
    none: '未识别',
  };

  const rows: any[][] = [
    ['序号', '新文件名', '分类文件夹', '来源原路径', '识别来源', '是否人工补录', '员工姓名', '金额（元）', '日期', '项目名称'],
  ];

  let index = 0;
  for (const file of files) {
    if (file.excelSubRows && file.excelSubRows.length > 0) {
      for (const row of file.excelSubRows) {
        index++;
        const category = getCategoryForRow(row, rule, amountRanges);
        rows.push([
          index,
          `${file.name}(第${row.rowIndex}行)`,
          category,
          file.relativePath,
          sourceLabels[file.recognitionSource || 'none'],
          row.manuallySupplemented ? '是' : '否',
          row.employeeName,
          row.amount,
          row.invoiceDate,
          row.projectName,
        ]);
      }
    } else {
      index++;
      rows.push([
        index,
        file.newName || file.name,
        file.category || '未分类',
        file.relativePath,
        sourceLabels[file.recognitionSource || 'none'],
        file.manuallySupplemented ? '是' : '否',
        file.invoiceInfo?.employeeName || '',
        file.invoiceInfo?.amount || 0,
        file.invoiceInfo?.invoiceDate || '',
        file.invoiceInfo?.projectName || '',
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 8 },
    { wch: 30 },
    { wch: 15 },
    { wch: 40 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '目录索引');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function generateDetailListExcel(
  files: ReimbursementFile[],
  rule: ClassificationRule,
  amountRanges: AmountRange[]
): Blob {
  const entries = getExpandedEntries(files, rule, amountRanges);

  const worksheetData = [
    ['序号', '来源文件', '行号', '员工姓名', '金额', '日期', '项目名称', '所属部门', '分类文件夹', '是否人工补录', '发票类型'],
    ...entries.map((entry, index) => {
      const file = entry.file;
      const manuallySupplemented = entry.row
        ? entry.row.manuallySupplemented
        : !!file.manuallySupplemented;
      const employeeName = entry.row ? entry.row.employeeName : file.invoiceInfo?.employeeName || '';
      const amount = entry.amount;
      const invoiceDate = entry.row ? entry.row.invoiceDate : file.invoiceInfo?.invoiceDate || '';
      const projectName = entry.row ? entry.row.projectName : file.invoiceInfo?.projectName || '';
      const department = entry.row ? entry.row.department : file.invoiceInfo?.department || '';
      const invoiceType = entry.row
        ? INVOICE_TYPE_LABELS[entry.row.invoiceType]
        : INVOICE_TYPE_LABELS[file.invoiceInfo?.invoiceType || 'other'];
      const rowNumber = entry.row ? `第 ${entry.row.rowIndex} 行` : '-';

      return [
        index + 1,
        file.name,
        rowNumber,
        employeeName,
        amount,
        invoiceDate,
        projectName,
        department,
        entry.category,
        manuallySupplemented ? '是' : '否',
        invoiceType,
      ];
    }),
  ];

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  ws['!cols'] = [
    { wch: 8 },
    { wch: 35 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 25 },
    { wch: 15 },
    { wch: 25 },
    { wch: 14 },
    { wch: 15 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '明细清单');
  return new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export async function generateFileListZip(
  files: ReimbursementFile[],
  rule?: ClassificationRule,
  amountRanges?: AmountRange[]
): Promise<Blob> {
  const zip = new JSZip();

  const folderMap = new Map<string, JSZip>();

  const addedRawFiles = new WeakSet<File>();

  for (const file of files) {
    const category = file.category || '未分类';
    const newName = file.newName || file.name;

    let folder = folderMap.get(category);
    if (!folder) {
      folder = zip.folder(category);
      folderMap.set(category, folder!);
    }

    if (file.rawFile && !addedRawFiles.has(file.rawFile)) {
      folder!.file(newName, file.rawFile);
      addedRawFiles.add(file.rawFile);
    } else if (!file.rawFile) {
      folder!.file(newName, new ArrayBuffer(0));
    }
  }

  if (rule && amountRanges) {
    const indexBlob = generateIndexExcel(files, rule, amountRanges);
    const indexData = await indexBlob.arrayBuffer();
    zip.file('目录索引表.xlsx', indexData);
    const detailBlob = generateDetailListExcel(files, rule, amountRanges);
    const detailData = await detailBlob.arrayBuffer();
    zip.file('明细清单.xlsx', detailData);
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
  const zipBlob = await generateFileListZip(files, rule, amountRanges);

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
