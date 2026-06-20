export type FileType = 'pdf' | 'image' | 'excel' | 'other';

export type InvoiceType = 
  | 'vat_special'
  | 'vat_general' 
  | 'electronic'
  | 'receipt'
  | 'approval'
  | 'other';

export type IssueLevel = 'error' | 'warning' | 'info';

export type IssueType =
  | 'duplicate'
  | 'blank_file'
  | 'amount_mismatch'
  | 'missing_approval'
  | 'naming_issue'
  | 'unrecognized';

export type ClassificationRule = 'employee' | 'month' | 'amount' | 'project';

export type RecognitionSource = 'filename' | 'excel' | 'pdf' | 'image' | 'manual' | 'none';

export interface ExcelRowRecord {
  id: string;
  rowIndex: number;
  employeeName: string;
  amount: number;
  invoiceDate: string;
  projectName: string;
  department: string;
  invoiceType: InvoiceType;
  invoiceNumber: string;
  needsManual: boolean;
  manuallySupplemented: boolean;
}

export interface InvoiceInfo {
  invoiceType: InvoiceType;
  invoiceNumber: string;
  amount: number;
  invoiceDate: string;
  employeeName: string;
  projectName: string;
  department: string;
}

export interface Issue {
  id: string;
  fileId: string;
  type: IssueType;
  level: IssueLevel;
  description: string;
  suggestion: string;
}

export interface ReimbursementFile {
  id: string;
  name: string;
  originalName: string;
  newName?: string;
  path: string;
  relativePath: string;
  type: FileType;
  size: number;
  lastModified: number;
  previewUrl?: string;
  invoiceInfo?: InvoiceInfo;
  issues: Issue[];
  category: string;
  isSelected: boolean;
  rawFile?: File;
  recognitionSource?: RecognitionSource;
  manuallySupplemented?: boolean;
  excelSubRows?: ExcelRowRecord[];
}

export interface AmountRange {
  min: number;
  max: number;
  label: string;
}

export interface CheckRules {
  checkDuplicate: boolean;
  checkBlankFile: boolean;
  checkAmountMismatch: boolean;
  checkMissingApproval: boolean;
  checkNaming: boolean;
}

export interface AppConfig {
  namingTemplate: string;
  classificationRule: ClassificationRule;
  amountRanges: AmountRange[];
  checkRules: CheckRules;
}

export interface ExportResult {
  success: boolean;
  totalFiles: number;
  issueCount: number;
  outputPath: string;
  summaryData: ExportSummaryItem[];
  issues: Issue[];
  rollbackLog: RollbackEntry[];
  timestamp: number;
}

export interface ExportSummaryItem {
  employeeName: string;
  fileCount: number;
  totalAmount: number;
  fileNames: string[];
}

export interface RollbackEntry {
  id: string;
  originalPath: string;
  originalName: string;
  newPath: string;
  newName: string;
}

export interface StepInfo {
  id: number;
  name: string;
  description: string;
  icon: string;
  status: 'pending' | 'current' | 'completed';
}

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  vat_special: '增值税专用发票',
  vat_general: '增值税普通发票',
  electronic: '电子发票',
  receipt: '收据',
  approval: '审批单',
  other: '其他',
};

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  duplicate: '重复票据',
  blank_file: '空白文件',
  amount_mismatch: '金额不一致',
  missing_approval: '缺少审批单',
  naming_issue: '命名不规范',
  unrecognized: '无法识别',
};

export const CLASSIFICATION_RULE_LABELS: Record<ClassificationRule, string> = {
  employee: '按员工姓名',
  month: '按月份',
  amount: '按金额区间',
  project: '按项目名称',
};
