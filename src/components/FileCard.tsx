import React from 'react';
import {
  FileText,
  Image as ImageIcon,
  Table,
  File as FileIcon,
  X,
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronRight,
} from 'lucide-react';
import type { ReimbursementFile } from '@/types';
import { INVOICE_TYPE_LABELS } from '@/types';
import { formatFileSize, formatAmount, cn } from '@/utils/common';

interface FileCardProps {
  file: ReimbursementFile;
  onRemove?: (id: string) => void;
  onClick?: (id: string) => void;
  isSelected?: boolean;
  showNewName?: boolean;
}

const typeIconMap: Record<string, React.ReactNode> = {
  pdf: <FileText size={24} className="text-red-500" />,
  image: <ImageIcon size={24} className="text-green-500" />,
  excel: <Table size={24} className="text-blue-500" />,
  other: <FileIcon size={24} className="text-gray-500" />,
};

const typeBgMap: Record<string, string> = {
  pdf: 'bg-red-50',
  image: 'bg-green-50',
  excel: 'bg-blue-50',
  other: 'bg-gray-50',
};

export const FileCard: React.FC<FileCardProps> = ({
  file,
  onRemove,
  onClick,
  isSelected,
  showNewName = false,
}) => {
  const errorCount = file.issues.filter((i) => i.level === 'error').length;
  const warningCount = file.issues.filter((i) => i.level === 'warning').length;
  const infoCount = file.issues.filter((i) => i.level === 'info').length;

  const displayName = showNewName && file.newName ? file.newName : file.name;

  return (
    <div
      className={cn(
        'relative bg-white rounded-lg border-2 p-3 transition-all duration-200 cursor-pointer hover:shadow-md',
        isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
      )}
      onClick={() => onClick?.(file.id)}
    >
      {onRemove && (
        <button
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors z-10"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(file.id);
          }}
        >
          <X size={14} />
        </button>
      )}

      <div className="flex items-start gap-3">
        <div
          className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
            typeBgMap[file.type]
          )}
        >
          {file.previewUrl ? (
            <img
              src={file.previewUrl}
              alt={file.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            typeIconMap[file.type]
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-800 truncate" title={displayName}>
            {displayName}
          </div>
          {showNewName && file.newName && file.newName !== file.name && (
            <div className="text-xs text-gray-400 truncate" title={`原名: ${file.name}`}>
              原名: {file.name}
            </div>
          )}
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            <span>{formatFileSize(file.size)}</span>
            <span>·</span>
            <span className="capitalize">{file.type}</span>
          </div>

          {file.invoiceInfo && (
            <div className="mt-2 text-xs">
              {file.invoiceInfo.employeeName && (
                <span className="inline-block mr-2 text-gray-600">
                  👤 {file.invoiceInfo.employeeName}
                </span>
              )}
              {file.invoiceInfo.amount > 0 && (
                <span className="text-primary-600 font-medium">
                  ¥{formatAmount(file.invoiceInfo.amount)}
                </span>
              )}
            </div>
          )}

          {file.invoiceInfo?.invoiceType && (
            <div className="mt-1">
              <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                {INVOICE_TYPE_LABELS[file.invoiceInfo.invoiceType]}
              </span>
            </div>
          )}
        </div>
      </div>

      {file.issues.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-100 flex items-center gap-2">
          {errorCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-danger-600">
              <AlertCircle size={12} />
              {errorCount}
            </span>
          )}
          {warningCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-warning-600">
              <AlertCircle size={12} />
              {warningCount}
            </span>
          )}
          {infoCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-primary-600">
              <Info size={12} />
              {infoCount}
            </span>
          )}
          <span className="text-xs text-gray-400">个问题</span>
        </div>
      )}

      {file.category && file.category !== '未分类' && (
        <div className="mt-2 flex items-center gap-1">
          <span className="text-xs text-gray-400">分类:</span>
          <span className="text-xs text-primary-600 font-medium">{file.category}</span>
        </div>
      )}
    </div>
  );
};

export default FileCard;
