import React, { useState } from 'react';
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
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { FileCard } from '@/components/FileCard';
import { INVOICE_TYPE_LABELS } from '@/types';
import { formatAmount, cn } from '@/utils/common';

export const Step2Recognize: React.FC = () => {
  const { files, runRecognition, updateInvoiceInfo, isProcessing } = useAppStore();
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string | number>>({});

  const recognizedCount = files.filter((f) => f.invoiceInfo).length;
  const unrecognizedCount = files.filter(
    (f) => !f.invoiceInfo || f.invoiceInfo.employeeName === ''
  ).length;

  const handleStartRecognition = () => {
    runRecognition();
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
            {unrecognizedCount > 0 && (
              <span className="text-warning-600">
                ⚠ 待完善 {unrecognizedCount} 个
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto p-1">
          {files.map((file) => (
            <div
              key={file.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              {editingFileId === file.id ? (
                <div className="space-y-3">
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Step2Recognize;
