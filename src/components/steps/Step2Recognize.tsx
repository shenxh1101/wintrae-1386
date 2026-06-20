import React, { useState, useMemo } from 'react';
import {
  FileSearch,
  Play,
  RotateCcw,
  Edit2,
  Check,
  X,
  User,
  Calendar,
  DollarSign,
  Hash,
  Building2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Save,
  Table2,
  ClipboardEdit,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { INVOICE_TYPE_LABELS } from '@/types';
import type { ReimbursementFile, ExcelRowRecord } from '@/types';
import { formatAmount, cn } from '@/utils/common';

const SOURCE_LABELS: Record<string, string> = {
  filename: '文件名识别',
  excel: '表格识别',
  pdf: 'PDF识别',
  image: '图片识别',
  manual: '人工补录',
  none: '未识别',
};

const SOURCE_COLORS: Record<string, string> = {
  filename: 'bg-sky-100 text-sky-700',
  excel: 'bg-emerald-100 text-emerald-700',
  pdf: 'bg-rose-100 text-rose-700',
  image: 'bg-violet-100 text-violet-700',
  manual: 'bg-amber-100 text-amber-700',
  none: 'bg-gray-100 text-gray-500',
};

function RecognitionSourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  return (
    <span className={cn('inline-block px-2 py-0.5 text-xs rounded-full font-medium', SOURCE_COLORS[source])}>
      {SOURCE_LABELS[source] || source}
    </span>
  );
}

export const Step2Recognize: React.FC = () => {
  const { files, runRecognition, updateInvoiceInfo, updateExcelRow, isProcessing, recognitionCompleted } = useAppStore();

  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string | number>>({});

  const [manualForms, setManualForms] = useState<Record<string, { employeeName: string; amount: string; invoiceDate: string; projectName: string }>>({});

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowForm, setRowForm] = useState<Record<string, string>>({});

  const [rowManualForms, setRowManualForms] = useState<Record<string, { employeeName: string; amount: string; invoiceDate: string; projectName: string }>>({});

  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchField, setBatchField] = useState<'projectName' | 'department' | 'employeeName'>('projectName');
  const [batchValue, setBatchValue] = useState('');
  const [activeBatchFileId, setActiveBatchFileId] = useState<string | null>(null);

  const manualQueueItems = useMemo(() => {
    const items: Array<
      | { kind: 'file'; file: ReimbursementFile }
      | { kind: 'row'; file: ReimbursementFile; row: ExcelRowRecord }
    > = [];
    for (const file of files) {
      const hasFileLevel = file.issues.some((i) => i.type === 'unrecognized' && !i.rowId);
      if (hasFileLevel) {
        items.push({ kind: 'file', file });
      }
      const rowIssues = file.issues.filter((i) => i.type === 'unrecognized' && i.rowId);
      for (const issue of rowIssues) {
        const row = file.excelSubRows?.find((r) => r.id === issue.rowId);
        if (row) {
          items.push({ kind: 'row', file, row });
        }
      }
    }
    return items;
  }, [files]);

  const recognizedCount = files.filter((f) => f.invoiceInfo).length;

  const handleStartRecognition = async () => {
    await runRecognition();
  };

  const getManualForm = (fileId: string) => {
    if (manualForms[fileId]) return manualForms[fileId];
    const file = files.find((f) => f.id === fileId);
    return {
      employeeName: file?.invoiceInfo?.employeeName || '',
      amount: String(file?.invoiceInfo?.amount || ''),
      invoiceDate: file?.invoiceInfo?.invoiceDate || '',
      projectName: file?.invoiceInfo?.projectName || '',
    };
  };

  const handleManualFormChange = (fileId: string, field: string, value: string) => {
    setManualForms((prev) => ({
      ...prev,
      [fileId]: { ...getManualForm(fileId), [field]: value },
    }));
  };

  const handleManualSave = (fileId: string) => {
    const form = getManualForm(fileId);
    updateInvoiceInfo(fileId, {
      employeeName: form.employeeName,
      amount: Number(form.amount) || 0,
      invoiceDate: form.invoiceDate,
      projectName: form.projectName,
    });
    setManualForms((prev) => {
      const next = { ...prev };
      delete next[fileId];
      return next;
    });
  };

  const getRowManualForm = (rowId: string, row?: ExcelRowRecord) => {
    if (rowManualForms[rowId]) return rowManualForms[rowId];
    return {
      employeeName: row?.employeeName || '',
      amount: String(row?.amount || ''),
      invoiceDate: row?.invoiceDate || '',
      projectName: row?.projectName || '',
    };
  };

  const handleRowManualFormChange = (rowId: string, field: string, value: string, row?: ExcelRowRecord) => {
    setRowManualForms((prev) => ({
      ...prev,
      [rowId]: { ...getRowManualForm(rowId, row), [field]: value },
    }));
  };

  const handleRowManualSave = (fileId: string, rowId: string, row?: ExcelRowRecord) => {
    const form = getRowManualForm(rowId, row);
    updateExcelRow(fileId, rowId, {
      employeeName: form.employeeName,
      amount: Number(form.amount) || 0,
      invoiceDate: form.invoiceDate,
      projectName: form.projectName,
    });
    setRowManualForms((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  };

  const toggleExpanded = (fileId: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const toggleRowSelect = (rowId: string, fileId: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
    setActiveBatchFileId(fileId);
  };

  const selectAllRows = (file: ReimbursementFile) => {
    if (!file.excelSubRows) return;
    setSelectedRowIds(new Set(file.excelSubRows.map(r => r.id)));
    setActiveBatchFileId(file.id);
  };

  const clearSelectedRows = () => {
    setSelectedRowIds(new Set());
    setActiveBatchFileId(null);
  };

  const openBatchModal = (fileId: string) => {
    setActiveBatchFileId(fileId);
    setBatchField('projectName');
    setBatchValue('');
    setBatchModalOpen(true);
  };

  const handleBatchSave = () => {
    if (!activeBatchFileId || !batchValue.trim()) return;
    const file = files.find(f => f.id === activeBatchFileId);
    if (!file?.excelSubRows) return;

    const updates: Partial<ExcelRowRecord> = { [batchField]: batchValue.trim() } as Partial<ExcelRowRecord>;
    for (const rowId of selectedRowIds) {
      updateExcelRow(activeBatchFileId, rowId, updates);
    }

    clearSelectedRows();
    setBatchModalOpen(false);
  };

  const handleRowEdit = (row: ExcelRowRecord) => {
    setEditingRowId(row.id);
    setRowForm({
      employeeName: row.employeeName,
      amount: String(row.amount),
      invoiceDate: row.invoiceDate,
      projectName: row.projectName,
      department: row.department,
    });
  };

  const handleRowSave = (fileId: string, rowId: string) => {
    updateExcelRow(fileId, rowId, {
      employeeName: rowForm.employeeName,
      amount: Number(rowForm.amount) || 0,
      invoiceDate: rowForm.invoiceDate,
      projectName: rowForm.projectName,
      department: rowForm.department,
    });
    setEditingRowId(null);
    setRowForm({});
  };

  const handleEdit = (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (file?.invoiceInfo) {
      setEditForm({
        employeeName: file.invoiceInfo.employeeName,
        invoiceDate: file.invoiceInfo.invoiceDate,
        amount: file.invoiceInfo.amount,
        invoiceNumber: file.invoiceInfo.invoiceNumber,
        invoiceType: file.invoiceInfo.invoiceType,
        projectName: file.invoiceInfo.projectName,
      });
      setEditingFileId(fileId);
    }
  };

  const handleSaveEdit = () => {
    if (editingFileId) {
      updateInvoiceInfo(editingFileId, {
        employeeName: String(editForm.employeeName || ''),
        invoiceDate: String(editForm.invoiceDate || ''),
        amount: Number(editForm.amount) || 0,
        invoiceNumber: String(editForm.invoiceNumber || ''),
        invoiceType: editForm.invoiceType as any,
        projectName: String(editForm.projectName || ''),
      });
      setEditingFileId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingFileId(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">智能识别发票信息</h2>
        <p className="text-gray-500">自动识别发票类型、金额、员工等关键信息</p>
      </div>

      {manualQueueItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardEdit size={18} className="text-amber-600" />
            <h3 className="font-semibold text-amber-800">待人工补录队列</h3>
            <span className="ml-auto px-2.5 py-0.5 bg-amber-200 text-amber-800 text-xs font-bold rounded-full">
              {manualQueueItems.length} 项待补录
            </span>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {manualQueueItems.map((item) => {
              if (item.kind === 'file') {
                const file = item.file;
                const form = getManualForm(file.id);
                const issue = file.issues.find((i) => i.type === 'unrecognized' && !i.rowId);
                return (
                  <div
                    key={`file-${file.id}`}
                    className="bg-white border border-amber-200 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-800 truncate">{file.name}</span>
                      <RecognitionSourceBadge source={file.recognitionSource} />
                      <span className="text-xs text-amber-600 truncate flex-shrink-0">
                        {issue?.description || '待补录'}
                      </span>
                    </div>

                    <div className="flex items-end gap-2 flex-wrap">
                      <div className="flex-1 min-w-[120px]">
                        <label className="text-xs text-gray-500 mb-0.5 block">姓名</label>
                        <input
                          type="text"
                          className="input text-sm py-1"
                          placeholder="员工姓名"
                          value={form.employeeName}
                          onChange={(e) => handleManualFormChange(file.id, 'employeeName', e.target.value)}
                        />
                      </div>
                      <div className="flex-1 min-w-[100px]">
                        <label className="text-xs text-gray-500 mb-0.5 block">金额</label>
                        <input
                          type="number"
                          className="input text-sm py-1"
                          placeholder="0.00"
                          value={form.amount}
                          onChange={(e) => handleManualFormChange(file.id, 'amount', e.target.value)}
                        />
                      </div>
                      <div className="flex-1 min-w-[130px]">
                        <label className="text-xs text-gray-500 mb-0.5 block">日期</label>
                        <input
                          type="date"
                          className="input text-sm py-1"
                          value={form.invoiceDate}
                          onChange={(e) => handleManualFormChange(file.id, 'invoiceDate', e.target.value)}
                        />
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <label className="text-xs text-gray-500 mb-0.5 block">项目</label>
                        <input
                          type="text"
                          className="input text-sm py-1"
                          placeholder="项目名称"
                          value={form.projectName}
                          onChange={(e) => handleManualFormChange(file.id, 'projectName', e.target.value)}
                        />
                      </div>
                      <button
                        className="btn btn-primary text-sm py-1 px-3 flex items-center gap-1 flex-shrink-0"
                        onClick={() => handleManualSave(file.id)}
                        disabled={!form.employeeName.trim()}
                      >
                        <Save size={14} />
                        保存
                      </button>
                    </div>
                  </div>
                );
              }

              const { file, row } = item;
              const form = getRowManualForm(row.id, row);
              const rowIssue = file.issues.find((i) => i.type === 'unrecognized' && i.rowId === row.id);
              return (
                <div
                  key={`row-${file.id}-${row.id}`}
                  className="bg-white border border-amber-200 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {file.name} · 第 {row.rowIndex} 行
                    </span>
                    <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700">
                      表格明细
                    </span>
                    <span className="text-xs text-amber-600 truncate flex-shrink-0">
                      {rowIssue?.description || '待补录'}
                    </span>
                  </div>

                  <div className="flex items-end gap-2 flex-wrap">
                    <div className="flex-1 min-w-[120px]">
                      <label className="text-xs text-gray-500 mb-0.5 block">姓名</label>
                      <input
                        type="text"
                        className="input text-sm py-1"
                        placeholder="员工姓名"
                        value={form.employeeName}
                        onChange={(e) => handleRowManualFormChange(row.id, 'employeeName', e.target.value, row)}
                      />
                    </div>
                    <div className="flex-1 min-w-[100px]">
                      <label className="text-xs text-gray-500 mb-0.5 block">金额</label>
                      <input
                        type="number"
                        className="input text-sm py-1"
                        placeholder="0.00"
                        value={form.amount}
                        onChange={(e) => handleRowManualFormChange(row.id, 'amount', e.target.value, row)}
                      />
                    </div>
                    <div className="flex-1 min-w-[130px]">
                      <label className="text-xs text-gray-500 mb-0.5 block">日期</label>
                      <input
                        type="date"
                        className="input text-sm py-1"
                        value={form.invoiceDate}
                        onChange={(e) => handleRowManualFormChange(row.id, 'invoiceDate', e.target.value, row)}
                      />
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <label className="text-xs text-gray-500 mb-0.5 block">项目</label>
                      <input
                        type="text"
                        className="input text-sm py-1"
                        placeholder="项目名称"
                        value={form.projectName}
                        onChange={(e) => handleRowManualFormChange(row.id, 'projectName', e.target.value, row)}
                      />
                    </div>
                    <button
                      className="btn btn-primary text-sm py-1 px-3 flex items-center gap-1 flex-shrink-0"
                      onClick={() => handleRowManualSave(file.id, row.id, row)}
                      disabled={!form.employeeName.trim()}
                    >
                      <Save size={14} />
                      保存
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          className="btn btn-primary"
          onClick={handleStartRecognition}
          disabled={isProcessing || files.length === 0}
        >
          {isProcessing ? (
            <>
              <RotateCcw size={18} className="animate-spin" />
              识别中...
            </>
          ) : (
            <>
              <Play size={18} />
              开始识别
            </>
          )}
        </button>

        {files.length > 0 && recognizedCount > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-success-600">
              ✓ 已识别 {recognizedCount} 个
            </span>
            {manualQueueItems.length > 0 && (
              <span className="text-warning-600">
                ⚠ 待补录 {manualQueueItems.length} 项
              </span>
            )}
          </div>
        )}
      </div>

      {files.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileSearch size={48} className="mx-auto mb-4" />
          <p className="text-lg">请先在第一步导入文件</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto p-1">
          {files.map((file) => (
            <div
              key={file.id}
              className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow"
            >
              {editingFileId === file.id ? (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-800 truncate flex-1">
                      {file.name}
                    </span>
                    <div className="flex gap-1">
                      <button
                        className="p-1.5 rounded-lg bg-success-100 text-success-600 hover:bg-success-200"
                        onClick={handleSaveEdit}
                      >
                        <Check size={16} />
                      </button>
                      <button
                        className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                        onClick={handleCancelEdit}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                        <User size={12} /> 员工姓名
                      </label>
                      <input
                        type="text"
                        className="input text-sm py-1.5"
                        value={editForm.employeeName || ''}
                        onChange={(e) =>
                          setEditForm({ ...editForm, employeeName: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                        <Calendar size={12} /> 开票日期
                      </label>
                      <input
                        type="date"
                        className="input text-sm py-1.5"
                        value={editForm.invoiceDate || ''}
                        onChange={(e) =>
                          setEditForm({ ...editForm, invoiceDate: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                        <DollarSign size={12} /> 金额
                      </label>
                      <input
                        type="number"
                        className="input text-sm py-1.5"
                        value={editForm.amount || 0}
                        onChange={(e) =>
                          setEditForm({ ...editForm, amount: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                        <Hash size={12} /> 发票号码
                      </label>
                      <input
                        type="text"
                        className="input text-sm py-1.5"
                        value={editForm.invoiceNumber || ''}
                        onChange={(e) =>
                          setEditForm({ ...editForm, invoiceNumber: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1">发票类型</label>
                      <select
                        className="input text-sm py-1.5"
                        value={editForm.invoiceType || 'other'}
                        onChange={(e) =>
                          setEditForm({ ...editForm, invoiceType: e.target.value })
                        }
                      >
                        {Object.entries(INVOICE_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                        <Building2 size={12} /> 项目名称
                      </label>
                      <input
                        type="text"
                        className="input text-sm py-1.5"
                        value={editForm.projectName || ''}
                        onChange={(e) =>
                          setEditForm({ ...editForm, projectName: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <FileSearch size={20} className="text-primary-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <span
                          className="font-medium text-gray-800 truncate flex-1"
                          title={file.name}
                        >
                          {file.name}
                        </span>
                        <button
                          className="ml-2 p-1 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded"
                          onClick={() => handleEdit(file.id)}
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>

                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <RecognitionSourceBadge source={file.recognitionSource} />
                        {file.manuallySupplemented && (
                          <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                            已补录
                          </span>
                        )}
                      </div>

                      {file.invoiceInfo ? (
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <div className="flex items-center gap-1 text-gray-600">
                            <User size={12} />
                            <span className="truncate">
                              {file.invoiceInfo.employeeName || '未识别'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Calendar size={12} />
                            <span>{file.invoiceInfo.invoiceDate || '未识别'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-primary-600 font-medium">
                            <DollarSign size={12} />
                            <span>¥{formatAmount(file.invoiceInfo.amount || 0)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                              {INVOICE_TYPE_LABELS[file.invoiceInfo.invoiceType]}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-warning-600">
                          未识别到发票信息，点击编辑手动填写
                        </div>
                      )}
                    </div>
                  </div>

                  {file.excelSubRows && file.excelSubRows.length > 0 && (
                    <div className="mt-3 border-t border-gray-100 pt-2">
                      <button
                        className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
                        onClick={() => toggleExpanded(file.id)}
                      >
                        <Table2 size={14} />
                        <span>明细行 ({file.excelSubRows.length})</span>
                        {expandedFiles.has(file.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {expandedFiles.has(file.id) && (
                        <div className="mt-2 overflow-x-auto">
                          {selectedRowIds.size > 0 && activeBatchFileId === file.id && (
                            <div className="mb-2 flex items-center gap-2 p-2 bg-primary-50 rounded-lg border border-primary-200">
                              <span className="text-xs text-primary-700 font-medium">
                                已选 {selectedRowIds.size} 行
                              </span>
                              <button
                                className="btn btn-primary text-xs py-0.5 px-2"
                                onClick={() => openBatchModal(file.id)}
                              >
                                批量补录
                              </button>
                              <button
                                className="btn btn-secondary text-xs py-0.5 px-2"
                                onClick={clearSelectedRows}
                              >
                                取消选择
                              </button>
                            </div>
                          )}
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="px-2 py-1.5 text-left text-gray-500 font-medium border-b w-8">
                                  <input
                                    type="checkbox"
                                    className="rounded text-primary-600"
                                    checked={file.excelSubRows?.every(r => selectedRowIds.has(r.id)) || false}
                                    onChange={() => {
                                      if (file.excelSubRows?.every(r => selectedRowIds.has(r.id))) {
                                        clearSelectedRows();
                                      } else {
                                        selectAllRows(file);
                                      }
                                    }}
                                  />
                                </th>
                                <th className="px-2 py-1.5 text-left text-gray-500 font-medium border-b">行号</th>
                                <th className="px-2 py-1.5 text-left text-gray-500 font-medium border-b">姓名</th>
                                <th className="px-2 py-1.5 text-left text-gray-500 font-medium border-b">金额</th>
                                <th className="px-2 py-1.5 text-left text-gray-500 font-medium border-b">日期</th>
                                <th className="px-2 py-1.5 text-left text-gray-500 font-medium border-b">项目</th>
                                <th className="px-2 py-1.5 text-left text-gray-500 font-medium border-b">部门</th>
                                <th className="px-2 py-1.5 text-left text-gray-500 font-medium border-b">状态</th>
                                <th className="px-2 py-1.5 text-left text-gray-500 font-medium border-b">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {file.excelSubRows.map((row) => (
                                <tr
                                  key={row.id}
                                  className={cn(
                                    'border-b border-gray-50',
                                    row.needsManual && 'bg-amber-50',
                                    selectedRowIds.has(row.id) && 'bg-primary-50/60'
                                  )}
                                >
                                  <td className="px-2 py-1.5">
                                    <input
                                      type="checkbox"
                                      className="rounded text-primary-600"
                                      checked={selectedRowIds.has(row.id)}
                                      onChange={() => toggleRowSelect(row.id, file.id)}
                                    />
                                  </td>
                                  <td className="px-2 py-1.5 text-gray-500">{row.rowIndex}</td>
                                  {editingRowId === row.id ? (
                                    <>
                                      <td className="px-1 py-1">
                                        <input
                                          type="text"
                                          className="input text-xs py-0.5 px-1 w-full"
                                          value={rowForm.employeeName || ''}
                                          onChange={(e) => setRowForm({ ...rowForm, employeeName: e.target.value })}
                                        />
                                      </td>
                                      <td className="px-1 py-1">
                                        <input
                                          type="number"
                                          className="input text-xs py-0.5 px-1 w-20"
                                          value={rowForm.amount || ''}
                                          onChange={(e) => setRowForm({ ...rowForm, amount: e.target.value })}
                                        />
                                      </td>
                                      <td className="px-1 py-1">
                                        <input
                                          type="date"
                                          className="input text-xs py-0.5 px-1 w-full"
                                          value={rowForm.invoiceDate || ''}
                                          onChange={(e) => setRowForm({ ...rowForm, invoiceDate: e.target.value })}
                                        />
                                      </td>
                                      <td className="px-1 py-1">
                                        <input
                                          type="text"
                                          className="input text-xs py-0.5 px-1 w-full"
                                          value={rowForm.projectName || ''}
                                          onChange={(e) => setRowForm({ ...rowForm, projectName: e.target.value })}
                                        />
                                      </td>
                                      <td className="px-1 py-1">
                                        <input
                                          type="text"
                                          className="input text-xs py-0.5 px-1 w-full"
                                          value={rowForm.department || ''}
                                          onChange={(e) => setRowForm({ ...rowForm, department: e.target.value })}
                                        />
                                      </td>
                                      <td className="px-2 py-1.5">
                                        <span className={cn(
                                          'inline-block px-1.5 py-0.5 text-xs rounded',
                                          row.needsManual ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                                        )}>
                                          {row.needsManual ? '待补录' : '已识别'}
                                        </span>
                                      </td>
                                      <td className="px-1 py-1">
                                        <div className="flex gap-1">
                                          <button
                                            className="p-1 rounded bg-success-100 text-success-600 hover:bg-success-200"
                                            onClick={() => handleRowSave(file.id, row.id)}
                                          >
                                            <Check size={12} />
                                          </button>
                                          <button
                                            className="p-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            onClick={() => { setEditingRowId(null); setRowForm({}); }}
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="px-2 py-1.5 text-gray-700">{row.employeeName || '-'}</td>
                                      <td className="px-2 py-1.5 text-primary-600 font-medium">
                                        {row.amount > 0 ? `¥${formatAmount(row.amount)}` : '-'}
                                      </td>
                                      <td className="px-2 py-1.5 text-gray-600">{row.invoiceDate || '-'}</td>
                                      <td className="px-2 py-1.5 text-gray-600">{row.projectName || '-'}</td>
                                      <td className="px-2 py-1.5 text-gray-600">{row.department || '-'}</td>
                                      <td className="px-2 py-1.5">
                                        {row.needsManual ? (
                                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded bg-amber-100 text-amber-700">
                                            <AlertTriangle size={10} />
                                            待补录
                                          </span>
                                        ) : (
                                          <span className="inline-block px-1.5 py-0.5 text-xs rounded bg-green-100 text-green-700">
                                            已识别
                                          </span>
                                        )}
                                        {row.manuallySupplemented && (
                                          <span className="ml-1 inline-block px-1 py-0.5 text-xs rounded bg-amber-50 text-amber-600 border border-amber-200">
                                            补
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-2 py-1.5">
                                        {row.needsManual && (
                                          <button
                                            className="p-1 rounded hover:bg-primary-50 text-primary-500"
                                            onClick={() => handleRowEdit(row)}
                                          >
                                            <Edit2 size={12} />
                                          </button>
                                        )}
                                      </td>
                                    </>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {batchModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">批量补录</h3>
            <p className="text-sm text-gray-500 mb-4">
              已选择 <span className="font-medium text-primary-600">{selectedRowIds.size}</span> 行，将统一填充以下字段：
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">选择字段</label>
                <select
                  className="input w-full"
                  value={batchField}
                  onChange={(e) => setBatchField(e.target.value as any)}
                >
                  <option value="projectName">项目名称</option>
                  <option value="department">所属部门</option>
                  <option value="employeeName">员工姓名</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">填充值</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="请输入要批量填充的值"
                  value={batchValue}
                  onChange={(e) => setBatchValue(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setBatchModalOpen(false);
                  clearSelectedRows();
                }}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleBatchSave}
                disabled={!batchValue.trim()}
              >
                确认批量补录
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Step2Recognize;
