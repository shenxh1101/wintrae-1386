import type { FileType, ReimbursementFile, InvoiceInfo, InvoiceType, ExcelRowRecord } from '@/types';
import { generateId, getFileExtension, getFileNameWithoutExtension } from './common';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff'];
const PDF_EXTENSIONS = ['pdf'];
const EXCEL_EXTENSIONS = ['xls', 'xlsx', 'csv'];

export const SUPPORTED_EXTENSIONS = [
  ...IMAGE_EXTENSIONS,
  ...PDF_EXTENSIONS,
  ...EXCEL_EXTENSIONS,
  'doc', 'docx', 'txt'
];

export function detectFileType(filename: string): FileType {
  const ext = getFileExtension(filename);
  if (PDF_EXTENSIONS.includes(ext)) return 'pdf';
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (EXCEL_EXTENSIONS.includes(ext)) return 'excel';
  return 'other';
}

export function isSupportedFile(filename: string): boolean {
  const ext = getFileExtension(filename).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}

export function createFileFromBrowserFile(file: File): ReimbursementFile {
  const type = detectFileType(file.name);
  const relativePath = (file as any).webkitRelativePath || file.name;
  return {
    id: generateId(),
    name: file.name,
    originalName: file.name,
    path: file.name,
    relativePath,
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

export function createFileListFromFolder(files: FileList | File[]): ReimbursementFile[] {
  const result: ReimbursementFile[] = [];
  const fileArray = Array.from(files);

  for (const file of fileArray) {
    if (isSupportedFile(file.name)) {
      result.push(createFileFromBrowserFile(file));
    }
  }

  return result;
}

interface MockFileData {
  name: string;
  relativePath: string;
  type: string;
  size: number;
  amount: number;
  employee: string;
  date: string;
  invoiceType: InvoiceType;
  hasExcelContent?: boolean;
  isUnrecognizable?: boolean;
  invoiceNumber?: string;
  excelSubRows?: ExcelRowRecord[];
}

export function createMockFiles(): ReimbursementFile[] {
  const mockData: MockFileData[] = [
    {
      name: '张三_202401_差旅费报销1280.50元.pdf',
      relativePath: '2024年1月报销/技术部/张三/张三_202401_差旅费报销1280.50元.pdf',
      type: 'pdf', size: 245000, amount: 1280.50, employee: '张三',
      date: '2024-01-15', invoiceType: 'vat_general', invoiceNumber: 'INV20240115001'
    },
    {
      name: '张三_交通费356元.pdf',
      relativePath: '2024年1月报销/技术部/张三/张三_交通费356元.pdf',
      type: 'pdf', size: 128000, amount: 356.00, employee: '张三',
      date: '2024-01-20', invoiceType: 'electronic', invoiceNumber: 'DZ20240120088'
    },
    {
      name: '张三_报销审批单.pdf',
      relativePath: '2024年1月报销/技术部/张三/张三_报销审批单.pdf',
      type: 'pdf', size: 45000, amount: 0, employee: '张三',
      date: '2024-01-10', invoiceType: 'approval'
    },
    {
      name: '发票扫描件_001.jpg',
      relativePath: '2024年1月报销/技术部/张三/发票扫描件_001.jpg',
      type: 'image', size: 1560000, amount: 0, employee: '',
      date: '', invoiceType: 'other', isUnrecognizable: true
    },
    {
      name: '李四_餐饮568元.jpg',
      relativePath: '2024年1月报销/市场部/李四/李四_餐饮568元.jpg',
      type: 'image', size: 890000, amount: 568.00, employee: '李四',
      date: '2024-01-12', invoiceType: 'vat_general', invoiceNumber: 'INV20240112045'
    },
    {
      name: '李四_住宿费899元_202401.pdf',
      relativePath: '2024年1月报销/市场部/李四/李四_住宿费899元_202401.pdf',
      type: 'pdf', size: 312000, amount: 999.00, employee: '李四',
      date: '2024-01-18', invoiceType: 'vat_special', invoiceNumber: 'ZZ20240118012'
    },
    {
      name: '报销汇总_王五.xlsx',
      relativePath: '2024年1月报销/产品部/王五/报销汇总_王五.xlsx',
      type: 'excel', size: 23000, amount: 1200.00, employee: '王五',
      date: '2024-01-05', invoiceType: 'vat_special', hasExcelContent: true,
      invoiceNumber: 'ZZ20240105033'
    },
    {
      name: '王五_通讯费199元.pdf',
      relativePath: '2024年1月报销/产品部/王五/王五_通讯费199元.pdf',
      type: 'pdf', size: 98000, amount: 199.00, employee: '王五',
      date: '2024-01-22', invoiceType: 'electronic', invoiceNumber: 'DZ20240122156'
    },
    {
      name: '王五_审批单.pdf',
      relativePath: '2024年1月报销/产品部/王五/王五_审批单.pdf',
      type: 'pdf', size: 38000, amount: 0, employee: '王五',
      date: '2024-01-01', invoiceType: 'approval'
    },
    {
      name: '赵六_出租车票234.50元.pdf',
      relativePath: '2024年1月报销/市场部/赵六/赵六_出租车票234.50元.pdf',
      type: 'pdf', size: 156000, amount: 234.50, employee: '赵六',
      date: '2024-01-08', invoiceType: 'receipt', invoiceNumber: 'SK20240108211'
    },
    {
      name: '赵六_会务费_市场推广项目.pdf',
      relativePath: '2024年1月报销/市场部/赵六/赵六_会务费_市场推广项目.pdf',
      type: 'pdf', size: 425000, amount: 3500.00, employee: '赵六',
      date: '2024-01-25', invoiceType: 'vat_special', invoiceNumber: 'ZZ20240125007'
    },
    {
      name: '空白文件.pdf',
      relativePath: '2024年1月报销/异常文件/空白文件.pdf',
      type: 'pdf', size: 0, amount: 0, employee: '',
      date: '', invoiceType: 'other'
    },
    {
      name: '重复发票_差旅1280.5元.pdf',
      relativePath: '2024年1月报销/技术部/张三/重复发票_差旅1280.5元.pdf',
      type: 'pdf', size: 245000, amount: 1280.50, employee: '张三',
      date: '2024-01-15', invoiceType: 'vat_general', invoiceNumber: 'INV20240115001'
    },
    {
      name: '未命名扫描件_0001.pdf',
      relativePath: '2024年1月报销/待处理/未命名扫描件_0001.pdf',
      type: 'pdf', size: 267000, amount: 0, employee: '',
      date: '', invoiceType: 'other', isUnrecognizable: true
    },
    {
      name: '部门消费记录.csv',
      relativePath: '2024年1月报销/汇总/部门消费记录.csv',
      type: 'excel', size: 5600, amount: 0, employee: '',
      date: '', invoiceType: 'other', hasExcelContent: true,
      excelSubRows: [
        { id: generateId(), rowIndex: 2, employeeName: '张三', amount: 450.00, invoiceDate: '2024-01-10', projectName: '研发项目', department: '技术部', invoiceType: 'receipt', invoiceNumber: 'SK20240110101', needsManual: false, manuallySupplemented: false },
        { id: generateId(), rowIndex: 3, employeeName: '李四', amount: 780.00, invoiceDate: '2024-01-11', projectName: '市场推广项目', department: '市场部', invoiceType: 'vat_general', invoiceNumber: 'INV20240111099', needsManual: false, manuallySupplemented: false },
        { id: generateId(), rowIndex: 4, employeeName: '王五', amount: 320.00, invoiceDate: '2024-01-12', projectName: '产品运营', department: '产品部', invoiceType: 'receipt', invoiceNumber: 'SK20240112077', needsManual: false, manuallySupplemented: false },
        { id: generateId(), rowIndex: 5, employeeName: '赵六', amount: 1250.00, invoiceDate: '2024-01-13', projectName: '市场推广项目', department: '市场部', invoiceType: 'vat_special', invoiceNumber: 'ZZ20240113055', needsManual: false, manuallySupplemented: false },
        { id: generateId(), rowIndex: 6, employeeName: '', amount: 0, invoiceDate: '', projectName: '', department: '', invoiceType: 'other', invoiceNumber: '', needsManual: true, manuallySupplemented: false },
      ],
    },
  ];

  return mockData.map(item => {
    const issues: ReimbursementFile['issues'] = [];

    if (item.isUnrecognizable) {
      issues.push({
        id: generateId(),
        fileId: '',
        type: 'unrecognized',
        level: 'warning',
        description: '无法从内容识别发票信息，请人工补录',
        suggestion: '点击编辑按钮手动填写员工姓名、金额等信息',
      });
    }

    if (item.employee === '李四' && item.amount === 999.00 && item.name.includes('899')) {
      issues.push({
        id: generateId(),
        fileId: '',
        type: 'amount_mismatch',
        level: 'warning',
        description: `文件名金额(899.00元)与识别金额(999.00元)不一致`,
        suggestion: '请核实实际报销金额，确保票据金额与报销金额一致',
      });
    }

    const file: ReimbursementFile = {
      id: generateId(),
      name: item.name,
      originalName: item.name,
      path: item.relativePath,
      relativePath: item.relativePath,
      type: item.type as FileType,
      size: item.size,
      lastModified: new Date(item.date || '2024-01-01').getTime(),
      issues: [],
      category: '未分类',
      isSelected: false,
      invoiceInfo: {
        invoiceType: item.invoiceType,
        invoiceNumber: item.invoiceNumber || ('INV' + Math.random().toString(36).substring(2, 8).toUpperCase()),
        amount: item.amount,
        invoiceDate: item.date,
        employeeName: item.employee,
        projectName: item.relativePath.includes('市场推广') ? '市场推广项目' : '日常运营',
        department: item.relativePath.includes('技术部') ? '技术部'
          : item.relativePath.includes('市场部') ? '市场部'
          : item.relativePath.includes('产品部') ? '产品部' : '未知',
      },
      excelSubRows: item.excelSubRows,
    };

    issues.forEach(i => i.fileId = file.id);
    file.issues = issues;

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

export async function readExcelFile(file: File): Promise<Record<string, any>[] | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return null;
    const worksheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  } catch (e) {
    console.warn('Failed to read Excel:', e);
    return null;
  }
}

export function extractFromExcelData(rows: Record<string, any>[]): Partial<InvoiceInfo> {
  if (!rows || rows.length === 0) return {};
  const result: Partial<InvoiceInfo> = {};
  const firstRow = rows[0];

  const findValue = (keywords: string[]): any => {
    for (const key of Object.keys(firstRow)) {
      const lowerKey = key.toLowerCase();
      if (keywords.some(kw => lowerKey.includes(kw))) {
        return firstRow[key];
      }
    }
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        const lowerKey = key.toLowerCase();
        if (keywords.some(kw => lowerKey.includes(kw))) {
          return row[key];
        }
      }
    }
    return undefined;
  };

  const nameVal = findValue(['姓名', '员工', '报销人', 'name', 'employee']);
  if (nameVal && typeof nameVal === 'string') {
    result.employeeName = nameVal.trim();
  }

  const amountVal = findValue(['金额', '费用', '合计', '总价', 'amount', 'price', 'total']);
  if (amountVal !== undefined && !isNaN(parseFloat(String(amountVal)))) {
    result.amount = parseFloat(String(amountVal));
  }

  const dateVal = findValue(['日期', '时间', 'date', 'time']);
  if (dateVal || dateVal === 0) {
    let parsed = '';
    if (typeof dateVal === 'number') {
      const utcDays = Math.floor(dateVal - 25569);
      const utcValue = utcDays * 86400;
      const d = new Date(utcValue * 1000);
      if (!isNaN(d.getTime())) {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        parsed = `${y}-${m}-${day}`;
      }
    } else if (dateVal instanceof Date) {
      if (!isNaN(dateVal.getTime())) {
        const y = dateVal.getFullYear();
        const m = String(dateVal.getMonth() + 1).padStart(2, '0');
        const day = String(dateVal.getDate()).padStart(2, '0');
        parsed = `${y}-${m}-${day}`;
      }
    } else if (typeof dateVal === 'string') {
      const trimmed = dateVal.trim();
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        parsed = `${y}-${m}-${day}`;
      } else {
        parsed = trimmed;
      }
    }
    if (parsed) result.invoiceDate = parsed;
  }

  const projectVal = findValue(['项目', 'project', '用途', '科目']);
  if (projectVal && typeof projectVal === 'string') {
    result.projectName = projectVal.trim();
  }

  const deptVal = findValue(['部门', 'department', 'dept']);
  if (deptVal && typeof deptVal === 'string') {
    result.department = deptVal.trim();
  }

  return result;
}

export function extractAllRowsFromExcel(rows: Record<string, any>[]): ExcelRowRecord[] {
  if (!rows || rows.length === 0) return [];

  const findColValue = (row: Record<string, any>, keywords: string[]): any => {
    for (const key of Object.keys(row)) {
      const lowerKey = key.toLowerCase();
      if (keywords.some(kw => lowerKey.includes(kw))) {
        return row[key];
      }
    }
    return undefined;
  };

  const parseDate = (val: any): string => {
    if (!val && val !== 0) return '';
    if (typeof val === 'number') {
      const utcDays = Math.floor(val - 25569);
      const utcValue = utcDays * 86400;
      const d = new Date(utcValue * 1000);
      if (!isNaN(d.getTime())) {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
      return '';
    }
    if (val instanceof Date) {
      if (!isNaN(val.getTime())) {
        const y = val.getFullYear();
        const m = String(val.getMonth() + 1).padStart(2, '0');
        const day = String(val.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
      return '';
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed) return '';
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
      return trimmed;
    }
    return '';
  };

  const parseAmount = (val: any): number => {
    if (val === undefined || val === null) return 0;
    const n = parseFloat(String(val));
    return isNaN(n) ? 0 : n;
  };

  const parseString = (val: any): string => {
    if (!val) return '';
    return String(val).trim();
  };

  const detectType = (row: Record<string, any>): InvoiceType => {
    const typeVal = findColValue(row, ['发票类型', '类型', 'type']);
    if (typeVal) {
      const s = String(typeVal);
      if (s.includes('专票') || s.includes('专用')) return 'vat_special';
      if (s.includes('普票') || s.includes('普通')) return 'vat_general';
      if (s.includes('电子')) return 'electronic';
      if (s.includes('收据') || s.includes('小票')) return 'receipt';
      if (s.includes('审批') || s.includes('申请')) return 'approval';
    }
    return 'other';
  };

  return rows.map((row, index) => {
    const employeeName = parseString(findColValue(row, ['姓名', '员工', '报销人', 'name', 'employee']));
    const amount = parseAmount(findColValue(row, ['金额', '费用', '合计', '总价', 'amount', 'price', 'total']));
    const invoiceDate = parseDate(findColValue(row, ['日期', '时间', 'date', 'time']));
    const projectName = parseString(findColValue(row, ['项目', 'project', '用途', '科目']));
    const department = parseString(findColValue(row, ['部门', 'department', 'dept']));
    const invoiceType = detectType(row);
    const invoiceNumber = parseString(findColValue(row, ['发票号', '票据号', '单号', '号码', 'invoice', 'no']));

    const needsManual = !employeeName || (invoiceType !== 'approval' && amount <= 0);

    return {
      id: generateId(),
      rowIndex: index + 2,
      employeeName,
      amount,
      invoiceDate,
      projectName,
      department,
      invoiceType,
      invoiceNumber,
      needsManual,
      manuallySupplemented: false,
    };
  });
}

export async function readPdfText(file: File): Promise<string | null> {
  return null;
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
