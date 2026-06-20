import type { FileType, ReimbursementFile, InvoiceInfo, InvoiceType } from '@/types';
import { generateId, getFileExtension, getFileNameWithoutExtension } from './common';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff'];
const PDF_EXTENSIONS = ['pdf'];
const EXCEL_EXTENSIONS = ['xls', 'xlsx', 'csv'];

export function detectFileType(filename: string): FileType {
  const ext = getFileExtension(filename);
  if (PDF_EXTENSIONS.includes(ext)) return 'pdf';
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (EXCEL_EXTENSIONS.includes(ext)) return 'excel';
  return 'other';
}

export function createFileFromBrowserFile(file: File, relativePath = ''): ReimbursementFile {
  const type = detectFileType(file.name);
  return {
    id: generateId(),
    name: file.name,
    originalName: file.name,
    path: file.name,
    relativePath: relativePath || file.name,
    type,
    size: file.size,
    lastModified: file.lastModified,
    previewUrl: type === 'image' ? URL.createObjectURL(file) : undefined,
    issues: [],
    category: '未分类',
    isSelected: false,
    rawFile: file,
  };
}

export function createMockFiles(): ReimbursementFile[] {
  const mockData: { name: string; type: string; size: number; amount: number; employee: string; date: string; invoiceType: InvoiceType }[] = [
    { name: '张三_202401_差旅费发票1.pdf', type: 'pdf', size: 245000, amount: 1280.50, employee: '张三', date: '2024-01-15', invoiceType: 'vat_general' },
    { name: '张三_202401_交通费.pdf', type: 'pdf', size: 128000, amount: 356.00, employee: '张三', date: '2024-01-20', invoiceType: 'electronic' },
    { name: '张三_报销审批单.docx', type: 'other', size: 45000, amount: 0, employee: '张三', date: '2024-01-10', invoiceType: 'approval' },
    { name: '李四_餐饮发票.jpg', type: 'image', size: 890000, amount: 568.00, employee: '李四', date: '2024-01-12', invoiceType: 'vat_general' },
    { name: '李四_住宿费.pdf', type: 'pdf', size: 312000, amount: 899.00, employee: '李四', date: '2024-01-18', invoiceType: 'vat_special' },
    { name: '王五_办公用品发票.xlsx', type: 'excel', size: 23000, amount: 1200.00, employee: '王五', date: '2024-01-05', invoiceType: 'vat_special' },
    { name: '王五_通讯费.pdf', type: 'pdf', size: 98000, amount: 199.00, employee: '王五', date: '2024-01-22', invoiceType: 'electronic' },
    { name: '赵六_出租车票.pdf', type: 'pdf', size: 156000, amount: 234.50, employee: '赵六', date: '2024-01-08', invoiceType: 'receipt' },
    { name: '赵六_会务费.pdf', type: 'pdf', size: 425000, amount: 3500.00, employee: '赵六', date: '2024-01-25', invoiceType: 'vat_special' },
    { name: '空白文件.pdf', type: 'pdf', size: 0, amount: 0, employee: '', date: '', invoiceType: 'other' },
    { name: 'IMG_20240115_123456.jpg', type: 'image', size: 1560000, amount: 789.00, employee: '张三', date: '2024-01-15', invoiceType: 'vat_general' },
    { name: '重复发票_张三.pdf', type: 'pdf', size: 245000, amount: 1280.50, employee: '张三', date: '2024-01-15', invoiceType: 'vat_general' },
  ];

  return mockData.map(item => {
    const file: ReimbursementFile = {
      id: generateId(),
      name: item.name,
      originalName: item.name,
      path: item.name,
      relativePath: item.name,
      type: item.type as FileType,
      size: item.size,
      lastModified: new Date(item.date || '2024-01-01').getTime(),
      issues: [],
      category: '未分类',
      isSelected: false,
      invoiceInfo: {
        invoiceType: item.invoiceType,
        invoiceNumber: 'INV' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        amount: item.amount,
        invoiceDate: item.date,
        employeeName: item.employee,
        projectName: item.employee === '赵六' && item.amount > 1000 ? '市场推广项目' : '日常运营',
        department: item.employee ? '技术部' : '未知',
      },
    };
    return file;
  });
}

export function extractInfoFromFilename(filename: string): Partial<InvoiceInfo> {
  const name = getFileNameWithoutExtension(filename);
  const result: Partial<InvoiceInfo> = {};

  const namePattern = /[\u4e00-\u9fa5]{2,4}/;
  const nameMatch = name.match(namePattern);
  if (nameMatch) {
    result.employeeName = nameMatch[0];
  }

  const datePattern = /(20\d{2})[-_]?(\d{1,2})/;
  const dateMatch = name.match(datePattern);
  if (dateMatch) {
    result.invoiceDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-01`;
  }

  const amountPattern = /(\d+(?:\.\d{1,2})?)\s*元?/;
  const amountMatch = name.match(amountPattern);
  if (amountMatch) {
    result.amount = parseFloat(amountMatch[1]);
  }

  return result;
}

export function createFilePreview(file: ReimbursementFile): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (file.type !== 'image' || !file.rawFile) {
      resolve(undefined);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    reader.onerror = () => {
      resolve(undefined);
    };
    reader.readAsDataURL(file.rawFile);
  });
}
