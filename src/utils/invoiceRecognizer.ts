import type { ReimbursementFile, InvoiceType, InvoiceInfo, RecognitionSource, ExcelRowRecord, Issue } from '@/types';
import { generateId, getFileNameWithoutExtension } from './common';
import { extractInfoFromFilename, readExcelFile, extractFromExcelData, extractAllRowsFromExcel, readPdfText } from './fileProcessor';

const INVOICE_KEYWORDS: Record<InvoiceType, string[]> = {
  vat_special: ['增值税专用发票', '专用发票', '专票', 'vat special'],
  vat_general: ['增值税普通发票', '普通发票', '普票', 'vat general'],
  electronic: ['电子发票', '电子', 'electronic', 'e-invoice', '数电票'],
  receipt: ['收据', '收条', 'receipt', '小票'],
  approval: ['审批单', '报销单', '申请单', 'approval'],
  other: [],
};

export function detectInvoiceType(filename: string): InvoiceType {
  const lowerName = filename.toLowerCase();

  for (const [type, keywords] of Object.entries(INVOICE_KEYWORDS) as [InvoiceType, string[]][]) {
    if (type === 'other') continue;
    for (const keyword of keywords) {
      if (lowerName.includes(keyword.toLowerCase())) {
        return type;
      }
    }
  }

  return 'other';
}

export function extractInvoiceInfoFromFile(file: ReimbursementFile): Partial<InvoiceInfo> {
  const name = getFileNameWithoutExtension(file.name);
  const filenameInfo = extractInfoFromFilename(file.name);

  const detectedType = detectInvoiceType(file.name);
  const result: Partial<InvoiceInfo> = {
    ...filenameInfo,
    invoiceType: detectedType,
  };

  const pathParts = file.relativePath.split(/[\\/]/);
  if (!result.employeeName) {
    for (const part of pathParts) {
      const match = part.match(/[\u4e00-\u9fa5]{2,4}/);
      if (match && !['报销', '发票', '附件', '文件', '部门', '项目', '市场', '技术', '产品', '运营'].includes(match[0])) {
        result.employeeName = match[0];
        break;
      }
    }
  }

  if (!result.projectName) {
    if (file.relativePath.includes('市场')) result.projectName = '市场推广项目';
    else if (file.relativePath.includes('研发')) result.projectName = '研发项目';
    else if (file.relativePath.includes('产品')) result.projectName = '产品运营';
  }

  if (!result.department) {
    if (file.relativePath.includes('技术部')) result.department = '技术部';
    else if (file.relativePath.includes('市场部')) result.department = '市场部';
    else if (file.relativePath.includes('产品部')) result.department = '产品部';
    else if (file.relativePath.includes('财务部')) result.department = '财务部';
    else if (file.relativePath.includes('行政')) result.department = '行政部';
  }

  let invoiceNumber = '';
  const invNumMatch = name.match(/(?:发票号|票据号|单号|NO\.?|no\.?)\s*[:：]?\s*([A-Za-z0-9-]{6,})/i);
  if (invNumMatch) {
    invoiceNumber = invNumMatch[1];
  } else {
    const randomNum = 'INV' + Math.random().toString(36).substring(2, 8).toUpperCase()
      + Date.now().toString().slice(-4);
    invoiceNumber = randomNum;
  }
  result.invoiceNumber = invoiceNumber;

  return result;
}

export async function recognizeInvoice(file: ReimbursementFile): Promise<{
  info: InvoiceInfo;
  needsManual: boolean;
  recognitionSource: RecognitionSource;
  excelSubRows?: ExcelRowRecord[];
}> {
  const basicInfo = extractInvoiceInfoFromFile(file);
  let contentInfo: Partial<InvoiceInfo> = {};
  let source: RecognitionSource = 'filename';
  let excelSubRows: ExcelRowRecord[] | undefined;

  if (file.rawFile) {
    if (file.type === 'excel') {
      try {
        const rows = await readExcelFile(file.rawFile);
        if (rows && rows.length > 0) {
          contentInfo = extractFromExcelData(rows);
          excelSubRows = extractAllRowsFromExcel(rows);
          source = 'excel';
        }
      } catch (e) {
        console.warn('Excel read error:', e);
      }
    } else if (file.type === 'pdf') {
      try {
        const text = await readPdfText(file.rawFile);
        if (text) {
          source = 'pdf';
        } else {
          source = 'filename';
        }
      } catch (e) {
        source = 'filename';
      }
    } else if (file.type === 'image') {
      source = 'image';
    }
  }

  const merged: Partial<InvoiceInfo> = {
    ...basicInfo,
    ...contentInfo,
  };

  const finalInfo: InvoiceInfo = {
    invoiceType: merged.invoiceType || 'other',
    invoiceNumber: merged.invoiceNumber || '',
    amount: merged.amount || 0,
    invoiceDate: merged.invoiceDate || '',
    employeeName: merged.employeeName || '',
    projectName: merged.projectName || '',
    department: merged.department || '',
  };

  const needsManual = checkNeedsManual(finalInfo, file, source);

  return {
    info: finalInfo,
    needsManual,
    recognitionSource: source,
    excelSubRows,
  };
}

function checkNeedsManual(
  info: InvoiceInfo,
  file: ReimbursementFile,
  source: string
): boolean {
  if (file.size === 0) return true;

  if (!info.employeeName || info.employeeName.trim() === '') {
    return true;
  }

  if (info.invoiceType === 'approval') {
    return false;
  }

  if (file.type === 'pdf' || file.type === 'image') {
    if (source === 'filename') {
      const hasAmountFromName = info.amount > 0;
      const hasDateFromName = info.invoiceDate && info.invoiceDate.length > 0;
      if (!hasAmountFromName || !hasDateFromName) {
        return true;
      }
    }
    if (source === 'image') {
      return true;
    }
  }

  if (info.amount <= 0) {
    return true;
  }

  return false;
}

export function processInvoiceRecognition(files: ReimbursementFile[]): ReimbursementFile[] {
  return files.map(file => {
    const basic = extractInvoiceInfoFromFile(file);
    const info: InvoiceInfo = {
      invoiceType: basic.invoiceType || 'other',
      invoiceNumber: basic.invoiceNumber || '',
      amount: basic.amount || 0,
      invoiceDate: basic.invoiceDate || '',
      employeeName: basic.employeeName || '',
      projectName: basic.projectName || '',
      department: basic.department || '',
    };

    let source: RecognitionSource = 'filename';
    if (file.type === 'excel') source = 'excel';
    else if (file.type === 'image') source = 'image';
    else if (file.type === 'pdf') source = 'filename';

    const existingUnrecognized = file.issues.filter(i => i.type === 'unrecognized');

    let needsManual = false;
    if (file.size === 0) {
      needsManual = true;
    } else if (!info.employeeName || info.employeeName.trim() === '') {
      needsManual = true;
    } else if (file.type === 'image') {
      needsManual = true;
    } else if ((file.type === 'pdf') && (info.amount <= 0 || !info.invoiceDate)) {
      needsManual = true;
    } else if (info.amount <= 0 && info.invoiceType !== 'approval') {
      needsManual = true;
    }

    const issues = [...file.issues.filter(i => i.type !== 'unrecognized')];
    if (needsManual && existingUnrecognized.length === 0) {
      let description = '';
      let suggestion = '';

      if (file.size === 0) {
        description = '文件为空，无法识别任何信息';
        suggestion = '请确认文件是否有效，或重新获取正确的报销附件';
      } else if (!info.employeeName) {
        description = '无法识别员工姓名';
        suggestion = '请手动填写员工姓名、所属部门等信息';
      } else if (file.type === 'image') {
        description = '图片文件暂无法识别内容，请人工核对';
        suggestion = '请手动核对并填写金额、日期、发票号码等信息';
      } else if (file.type === 'pdf' && info.amount <= 0) {
        description = 'PDF 无法读取内容，未能提取金额等关键字段';
        suggestion = '请手动填写金额、日期等关键字段信息';
      } else {
        description = '无法完整识别发票信息';
        suggestion = '请补充完善发票识别信息';
      }

      issues.push({
        id: generateId(),
        fileId: file.id,
        type: 'unrecognized',
        level: 'warning',
        description,
        suggestion,
      });
    }

    return {
      ...file,
      invoiceInfo: info,
      issues,
      recognitionSource: source,
      excelSubRows: file.excelSubRows,
    };
  });
}

export function updateInvoiceInfo(fileId: string, files: ReimbursementFile[], updates: Partial<InvoiceInfo>): ReimbursementFile[] {
  return files.map(file => {
    if (file.id !== fileId) return file;

    const updatedInfo = file.invoiceInfo
      ? { ...file.invoiceInfo, ...updates }
      : {
          invoiceType: 'other' as InvoiceType,
          invoiceNumber: '',
          amount: 0,
          invoiceDate: '',
          employeeName: '',
          projectName: '',
          department: '',
          ...updates,
        };

    const isInfoComplete =
      updatedInfo.employeeName &&
      updatedInfo.employeeName.trim() !== '' &&
      (updatedInfo.invoiceType === 'approval' || updatedInfo.amount > 0);

    let newIssues = file.issues.filter(i => i.type !== 'unrecognized');

    if (!isInfoComplete && file.issues.some(i => i.type === 'unrecognized')) {
      newIssues.push({
        id: generateId(),
        fileId: file.id,
        type: 'unrecognized',
        level: 'warning',
        description: '信息不完整，仍需人工补录',
        suggestion: '请填写员工姓名、金额等必填字段',
      });
    }

    return {
      ...file,
      invoiceInfo: updatedInfo,
      issues: newIssues,
      manuallySupplemented: true,
      recognitionSource: 'manual' as RecognitionSource,
    };
  });
}

export async function asyncProcessInvoiceRecognition(files: ReimbursementFile[]): Promise<ReimbursementFile[]> {
  const results = await Promise.all(
    files.map(async (file) => {
      let result: ReimbursementFile = { ...file };

      try {
        const { info, needsManual, recognitionSource, excelSubRows } = await recognizeInvoice(file);
        result.invoiceInfo = info;
        result.recognitionSource = recognitionSource;
        result.excelSubRows = excelSubRows;

        const existingRowUnrecognized = file.issues.filter(i => i.type === 'unrecognized' && i.rowId);
        const otherIssues = file.issues.filter(i => i.type !== 'unrecognized');
        const fileLevelIssues: Issue[] = [];

        if (needsManual) {
          let description = '';
          let suggestion = '';

          if (file.size === 0) {
            description = '文件为空，无法识别任何信息';
            suggestion = '请确认文件是否有效，或重新获取正确的报销附件';
          } else if (!info.employeeName) {
            description = '无法识别员工姓名';
            suggestion = '请手动填写员工姓名、所属部门等信息';
          } else if (file.type === 'image') {
            description = '图片文件暂无法识别内容，请人工核对';
            suggestion = '请手动核对并填写金额、日期、发票号码等信息';
          } else if (file.type === 'pdf' && info.amount <= 0) {
            description = 'PDF 无法读取内容，未能提取金额等关键字段';
            suggestion = '请手动填写金额、日期等关键字段信息';
          } else {
            description = '无法完整识别发票信息';
            suggestion = '请补充完善发票识别信息';
          }

          fileLevelIssues.push({
            id: generateId(),
            fileId: file.id,
            type: 'unrecognized',
            level: 'warning',
            description,
            suggestion,
          });
        }

        let rowLevelIssues: Issue[] = [];
        if (excelSubRows && excelSubRows.length > 0) {
          rowLevelIssues = excelSubRows
            .filter(row => row.needsManual)
            .map(row => {
              const missing: string[] = [];
              if (!row.employeeName) missing.push('员工姓名');
              if (row.amount <= 0 && row.invoiceType !== 'approval') missing.push('金额');
              return {
                id: generateId(),
                fileId: file.id,
                rowId: row.id,
                rowIndex: row.rowIndex,
                type: 'unrecognized' as const,
                level: 'warning' as const,
                description: `第 ${row.rowIndex} 行：缺少${missing.join('、')}，待人工补录`,
                suggestion: '请点击该行编辑按钮，补录缺失字段后保存',
              };
            });
        }

        result.issues = [...otherIssues, ...fileLevelIssues, ...rowLevelIssues];
      } catch (e) {
        console.warn('Recognition error for', file.name, e);
        result.issues = [
          ...file.issues.filter(i => i.type !== 'unrecognized'),
          {
            id: generateId(),
            fileId: file.id,
            type: 'unrecognized',
            level: 'warning',
            description: '识别过程出错',
            suggestion: '请手动检查并补充信息',
          },
        ];
      }

      return result;
    })
  );

  return results;
}

export function updateExcelRowInfo(
  fileId: string,
  rowId: string,
  files: ReimbursementFile[],
  updates: Partial<ExcelRowRecord>
): ReimbursementFile[] {
  return files.map(file => {
    if (file.id !== fileId || !file.excelSubRows) return file;

    const updatedRows = file.excelSubRows.map(row => {
      if (row.id !== rowId) return row;
      const updated = { ...row, ...updates, manuallySupplemented: true };
      const isRowComplete = updated.employeeName && (updated.invoiceType === 'approval' || updated.amount > 0);
      return { ...updated, needsManual: !isRowComplete };
    });

    const hasAnyManualRow = updatedRows.some(r => r.manuallySupplemented);
    const targetRow = updatedRows.find(r => r.id === rowId);

    let newIssues = file.issues.filter(i => !(i.type === 'unrecognized' && i.rowId === rowId));
    if (targetRow && targetRow.needsManual) {
      const missing: string[] = [];
      if (!targetRow.employeeName) missing.push('员工姓名');
      if (targetRow.amount <= 0 && targetRow.invoiceType !== 'approval') missing.push('金额');
      newIssues.push({
        id: generateId(),
        fileId: file.id,
        rowId: targetRow.id,
        rowIndex: targetRow.rowIndex,
        type: 'unrecognized',
        level: 'warning',
        description: `第 ${targetRow.rowIndex} 行：缺少${missing.join('、')}，待人工补录`,
        suggestion: '请点击该行编辑按钮，补录缺失字段后保存',
      });
    }

    return {
      ...file,
      excelSubRows: updatedRows,
      issues: newIssues,
      manuallySupplemented: hasAnyManualRow || !!file.manuallySupplemented,
    };
  });
}
