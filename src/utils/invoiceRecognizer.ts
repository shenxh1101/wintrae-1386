import type { ReimbursementFile, InvoiceType, InvoiceInfo } from '@/types';
import { generateId, getFileNameWithoutExtension } from './common';

const INVOICE_KEYWORDS: Record<InvoiceType, string[]> = {
  vat_special: ['增值税专用发票', '专用发票', '专票', 'vat special'],
  vat_general: ['增值税普通发票', '普通发票', '普票', 'vat general'],
  electronic: ['电子发票', '电子', 'electronic', 'e-invoice'],
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

export function extractInvoiceInfo(file: ReimbursementFile): InvoiceInfo {
  const name = getFileNameWithoutExtension(file.name);
  const detectedType = detectInvoiceType(file.name);

  let employeeName = '';
  const nameMatch = name.match(/[\u4e00-\u9fa5]{2,4}/);
  if (nameMatch) {
    employeeName = nameMatch[0];
  }

  let invoiceDate = '';
  const dateMatch = name.match(/(20\d{2})[-_.年]?(\d{1,2})/);
  if (dateMatch) {
    invoiceDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-01`;
  }

  let amount = 0;
  const amountMatch = name.match(/(\d+(?:\.\d{1,2})?)/);
  if (amountMatch && parseFloat(amountMatch[1]) > 10) {
    amount = parseFloat(amountMatch[1]);
  }

  let invoiceNumber = '';
  const invNumMatch = name.match(/(?:发票号|票据号|单号|NO\.?|no\.?)\s*[:：]?\s*([A-Za-z0-9-]+)/i);
  if (invNumMatch) {
    invoiceNumber = invNumMatch[1];
  } else {
    invoiceNumber = 'INV' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  let projectName = '日常运营';
  const projectKeywords = ['项目', '市场', '推广', '研发', '行政', '销售', '生产'];
  for (const kw of projectKeywords) {
    if (name.includes(kw)) {
      projectName = name.substring(name.indexOf(kw), name.indexOf(kw) + 4);
      break;
    }
  }

  return {
    invoiceType: detectedType,
    invoiceNumber,
    amount,
    invoiceDate,
    employeeName,
    projectName,
    department: employeeName ? '技术部' : '未知',
  };
}

export function processInvoiceRecognition(files: ReimbursementFile[]): ReimbursementFile[] {
  return files.map(file => {
    if (file.invoiceInfo) {
      return file;
    }

    const invoiceInfo = extractInvoiceInfo(file);

    if (invoiceInfo.invoiceType === 'other' || !invoiceInfo.employeeName) {
      const issue = {
        id: generateId(),
        fileId: file.id,
        type: 'unrecognized' as const,
        level: 'warning' as const,
        description: '无法完整识别发票信息，请手动补充',
        suggestion: '请检查文件名是否包含员工姓名、发票类型等关键信息',
      };
      return {
        ...file,
        invoiceInfo,
        issues: [...file.issues, issue],
      };
    }

    return {
      ...file,
      invoiceInfo,
    };
  });
}

export function updateInvoiceInfo(fileId: string, files: ReimbursementFile[], updates: Partial<InvoiceInfo>): ReimbursementFile[] {
  return files.map(file => {
    if (file.id !== fileId) return file;
    return {
      ...file,
      invoiceInfo: file.invoiceInfo
        ? { ...file.invoiceInfo, ...updates }
        : { invoiceType: 'other', invoiceNumber: '', amount: 0, invoiceDate: '', employeeName: '', projectName: '', department: '', ...updates },
    };
  });
}
