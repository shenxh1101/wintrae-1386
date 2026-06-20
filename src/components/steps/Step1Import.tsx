import React, { useState, useCallback } from 'react';
import {
  FolderOpen,
  Upload,
  FileText,
  Image as ImageIcon,
  Table,
  Trash2,
  Database,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { FileCard } from '@/components/FileCard';
import { createFileFromBrowserFile } from '@/utils/fileProcessor';
import { formatFileSize, cn } from '@/utils/common';

export const Step1Import: React.FC = () => {
  const { files, addFiles, removeFile, clearFiles, loadMockData, toggleFileSelection, selectedFileIds } =
    useAppStore();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      const reimbursementFiles = droppedFiles.map((file) => createFileFromBrowserFile(file));
      addFiles(reimbursementFiles);
    },
    [addFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files);
        const reimbursementFiles = selectedFiles.map((file) => createFileFromBrowserFile(file));
        addFiles(reimbursementFiles);
      }
    },
    [addFiles]
  );

  const pdfCount = files.filter((f) => f.type === 'pdf').length;
  const imageCount = files.filter((f) => f.type === 'image').length;
  const excelCount = files.filter((f) => f.type === 'excel').length;
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">导入报销附件</h2>
        <p className="text-gray-500">选择包含发票、审批单等报销附件的文件夹</p>
      </div>

      <div
        className={cn(
          'border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300',
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 bg-gray-50 hover:border-primary-300 hover:bg-white'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-4">
            <FolderOpen size={32} className="text-primary-600" />
          </div>
          <p className="text-lg font-medium text-gray-700 mb-2">拖拽文件到此处</p>
          <p className="text-sm text-gray-500 mb-4">支持 PDF、图片、Excel 等格式</p>

          <label className="btn btn-primary cursor-pointer">
            <Upload size={18} />
            选择文件
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInput}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.csv"
            />
          </label>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <div className="text-gray-300">— 或者 —</div>
      </div>

      <div className="flex justify-center">
        <button className="btn btn-secondary" onClick={loadMockData}>
          <Database size={18} />
          加载示例数据体验
        </button>
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              已导入 {files.length} 个文件
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <FileText size={16} className="text-red-500" />
                <span>{pdfCount}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <ImageIcon size={16} className="text-green-500" />
                <span>{imageCount}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Table size={16} className="text-blue-500" />
                <span>{excelCount}</span>
              </div>
              <div className="text-sm text-gray-400">|</div>
              <span className="text-sm text-gray-500">{formatFileSize(totalSize)}</span>
              <button
                className="btn btn-danger text-sm py-1.5"
                onClick={clearFiles}
              >
                <Trash2 size={16} />
                清空
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 max-h-96 overflow-y-auto p-1">
            {files.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onRemove={removeFile}
                isSelected={selectedFileIds.includes(file.id)}
                onClick={() => toggleFileSelection(file.id)}
              />
            ))}
          </div>
        </div>
      )}

      {files.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <AlertCircle size={32} className="mx-auto mb-2" />
          <p>暂无文件，请导入报销附件</p>
        </div>
      )}
    </div>
  );
};

export default Step1Import;
