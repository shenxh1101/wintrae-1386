import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Play,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronRight,
  Search,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ISSUE_TYPE_LABELS, type IssueType, type IssueLevel } from '@/types';
import { getIssueSummary } from '@/utils/checker';
import { cn } from '@/utils/common';

const issueTypeList: { type: IssueType; icon: React.ReactNode; color: string }[] = [
  { type: 'duplicate', icon: <CopyIcon size={16} />, color: 'text-danger-600' },
  { type: 'blank_file', icon: <FileText size={16} />, color: 'text-danger-600' },
  { type: 'amount_mismatch', icon: <DollarSignIcon size={16} />, color: 'text-warning-600' },
  { type: 'missing_approval', icon: <FileX size={16} />, color: 'text-warning-600' },
  { type: 'naming_issue', icon: <TagIcon size={16} />, color: 'text-primary-600' },
  { type: 'unrecognized', icon: <HelpCircleIcon size={16} />, color: 'text-warning-600' },
];

function CopyIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function DollarSignIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function FileX({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <line x1="9.5" y1="13.5" x2="14.5" y2="18.5" />
      <line x1="14.5" y1="13.5" x2="9.5" y2="18.5" />
    </svg>
  );
}

function TagIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function HelpCircleIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export const Step5Check: React.FC = () => {
  const {
    files,
    runChecks,
    isProcessing,
    config,
    updateCheckRule,
    checksCompleted,
  } = useAppStore();
  const [selectedType, setSelectedType] = useState<IssueType | 'all'>('all');
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);

  const issueSummary = getIssueSummary(files);
  const totalIssues = Object.values(issueSummary).reduce((sum, n) => sum + n, 0);

  const filesWithIssues = checksCompleted ? files.filter((f) => f.issues.length > 0) : [];
  const filesWithoutIssues = checksCompleted
    ? files.filter((f) => f.issues.length === 0)
    : [];

  const filteredFiles =
    selectedType === 'all'
      ? filesWithIssues
      : filesWithIssues.filter((f) => f.issues.some((i) => i.type === selectedType));

  const levelColors: Record<IssueLevel, string> = {
    error: 'bg-danger-100 text-danger-700 border-danger-200',
    warning: 'bg-warning-100 text-warning-700 border-warning-200',
    info: 'bg-primary-50 text-primary-700 border-primary-200',
  };

  const levelIcons: Record<IssueLevel, React.ReactNode> = {
    error: <XCircle size={16} />,
    warning: <AlertTriangle size={16} />,
    info: <Info size={16} />,
  };

  const checkRuleItems: { key: keyof typeof config.checkRules; label: string; desc: string }[] = [
    { key: 'checkDuplicate', label: '重复票据检测', desc: '检测发票号码重复的文件' },
    { key: 'checkBlankFile', label: '空白文件检测', desc: '检测大小为 0 的空文件' },
    { key: 'checkAmountMismatch', label: '金额一致性检查', desc: '比对文件名金额与识别金额' },
    { key: 'checkMissingApproval', label: '审批单缺失检查', desc: '检查每位员工是否有审批单' },
    { key: 'checkNaming', label: '命名规范检查', desc: '检查文件名是否符合规范' },
  ];

  const errorCount = files.reduce(
    (sum, f) => sum + f.issues.filter((i) => i.level === 'error').length,
    0
  );
  const warningCount = files.reduce(
    (sum, f) => sum + f.issues.filter((i) => i.level === 'warning').length,
    0
  );
  const infoCount = files.reduce(
    (sum, f) => sum + f.issues.filter((i) => i.level === 'info').length,
    0
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">缺失检查</h2>
        <p className="text-gray-500">自动检测重复、空白、金额不一致等问题</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-700 flex items-center gap-2">
            <Search size={18} className="text-primary-500" />
            检查项
          </h3>
          <button
            className="btn btn-primary text-sm py-1.5"
            onClick={runChecks}
            disabled={isProcessing || files.length === 0}
          >
            {isProcessing ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                检查中...
              </>
            ) : (
              <>
                <Play size={16} />
                开始检查
              </>
            )}
          </button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {checkRuleItems.map((item) => (
            <label
              key={item.key}
              className={cn(
                'p-3 rounded-lg border cursor-pointer transition-all',
                config.checkRules[item.key]
                  ? 'border-primary-300 bg-primary-50'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="checkbox"
                  checked={config.checkRules[item.key]}
                  onChange={(e) => updateCheckRule(item.key, e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
              </div>
              <p className="text-xs text-gray-500 ml-6">{item.desc}</p>
            </label>
          ))}
        </div>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <AlertTriangle size={48} className="mx-auto mb-4" />
          <p className="text-lg">请先导入文件</p>
          <p className="text-sm text-gray-300 mt-1">导入报销附件后才能进行缺失检查</p>
        </div>
      ) : !checksCompleted ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <div className="w-20 h-20 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
            <Search size={36} className="text-primary-400" />
          </div>
          <p className="text-lg font-medium text-gray-600 mb-2">等待开始检查</p>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            请确认上方的检查项后，点击「开始检查」按钮。
            <br />
            系统将对 {files.length} 个文件进行全量扫描，可能需要几秒钟。
          </p>
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-danger-400"></span>
              <span>错误级问题</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-warning-400"></span>
              <span>警告级问题</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary-400"></span>
              <span>提示级问题</span>
            </div>
          </div>
        </div>
      ) : totalIssues === 0 && !isProcessing ? (
        <div className="text-center py-12 text-success-600 bg-success-50 rounded-xl">
          <CheckCircle size={48} className="mx-auto mb-4" />
          <p className="text-lg font-medium">全部检查通过 ✓</p>
          <p className="text-sm text-success-600/70 mt-1">
            共检查 {files.length} 个文件，未发现任何问题
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700">检查结果统计</h3>
              <div className="text-sm text-gray-500">
                已检查 {files.length} 个文件
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-danger-50 border border-danger-100">
                <div className="flex items-center gap-2">
                  <XCircle size={18} className="text-danger-600" />
                  <span className="text-sm text-danger-700">错误</span>
                </div>
                <div className="text-2xl font-bold text-danger-700 mt-1">{errorCount}</div>
              </div>
              <div className="p-3 rounded-lg bg-warning-50 border border-warning-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-warning-600" />
                  <span className="text-sm text-warning-700">警告</span>
                </div>
                <div className="text-2xl font-bold text-warning-700 mt-1">{warningCount}</div>
              </div>
              <div className="p-3 rounded-lg bg-primary-50 border border-primary-100">
                <div className="flex items-center gap-2">
                  <Info size={18} className="text-primary-600" />
                  <span className="text-sm text-primary-700">提示</span>
                </div>
                <div className="text-2xl font-bold text-primary-700 mt-1">{infoCount}</div>
              </div>
              <div className="p-3 rounded-lg bg-success-50 border border-success-100">
                <div className="flex items-center gap-2">
                  <CheckCircle size={18} className="text-success-600" />
                  <span className="text-sm text-success-700">通过</span>
                </div>
                <div className="text-2xl font-bold text-success-700 mt-1">
                  {filesWithoutIssues.length}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
            <button
              className={cn(
                'p-3 rounded-xl border-2 text-center transition-all',
                selectedType === 'all'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
              onClick={() => setSelectedType('all')}
            >
              <div className="text-2xl font-bold text-gray-800">{totalIssues}</div>
              <div className="text-xs text-gray-500 mt-1">全部问题</div>
            </button>
            {issueTypeList.map((item) => (
              <button
                key={item.type}
                className={cn(
                  'p-3 rounded-xl border-2 text-center transition-all',
                  selectedType === item.type
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                )}
                onClick={() => setSelectedType(item.type)}
              >
                <div className={cn('text-2xl font-bold', item.color)}>
                  {issueSummary[item.type] || 0}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {ISSUE_TYPE_LABELS[item.type]}
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[350px] overflow-y-auto p-1">
            {filteredFiles.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                该类型下暂无问题
              </div>
            ) : (
              filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  <div
                    className="p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() =>
                      setExpandedFileId(expandedFileId === file.id ? null : file.id)
                    }
                  >
                    <div className="w-10 h-10 rounded-lg bg-danger-50 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle size={20} className="text-danger-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 truncate">
                        {file.name}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {file.relativePath}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm">
                        <span className="text-gray-500">{file.issues.length} 个问题</span>
                        {file.invoiceInfo?.employeeName && (
                          <span className="text-primary-600">
                            👤 {file.invoiceInfo.employeeName}
                          </span>
                        )}
                      </div>
                    </div>
                    {expandedFileId === file.id ? (
                      <ChevronDown size={20} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={20} className="text-gray-400" />
                    )}
                  </div>

                  {expandedFileId === file.id && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <div className="pt-3 space-y-2">
                        {file.issues.map((issue) => (
                          <div
                            key={issue.id}
                            className={cn(
                              'p-3 rounded-lg border',
                              levelColors[issue.level]
                            )}
                          >
                            <div className="flex items-start gap-2">
                              {levelIcons[issue.level]}
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium text-sm">
                                    {ISSUE_TYPE_LABELS[issue.type]}
                                  </div>
                                  <span className="text-xs uppercase px-1.5 py-0.5 rounded bg-white/60">
                                    {issue.level === 'error'
                                      ? '错误'
                                      : issue.level === 'warning'
                                      ? '警告'
                                      : '提示'}
                                  </span>
                                </div>
                                <div className="text-sm mt-1">{issue.description}</div>
                                <div className="text-sm mt-2 opacity-80">
                                  💡 {issue.suggestion}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {filesWithoutIssues.length > 0 && (
            <div className="text-sm text-success-600 text-center pt-2">
              <CheckCircle size={14} className="inline mr-1" />
              另有 {filesWithoutIssues.length} 个文件通过检查，无异常
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Step5Check;
