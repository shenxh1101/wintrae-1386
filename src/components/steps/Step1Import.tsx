import React, { useState, useCallback, useRef } from 'react';
import {
  FolderOpen,
  FolderPlus,
  Upload,
  FileText,
  Image as ImageIcon,
  Table,
  Trash2,
  Database,
  AlertCircle,
  ChevronRight,
  File as FileIcon,
  Filter,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { FileCard } from '@/components/FileCard';
import { createFileFromBrowserFile, isSupportedFile } from '@/utils/fileProcessor';
import { formatFileSize, cn } from '@/utils/common';

export const Step1Import: React.FC = () => {
  const {
    files,
    addFiles,
    removeFile,
    clearFiles,
    loadMockData,
    toggleFileSelection,
    selectedFileIds,
  } = useAppStore();
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const reimbursementFiles = droppedFiles
        .filter((f) => isSupportedFile(f.name))
        .map((file) => createFileFromBrowserFile(file));
      addFiles(reimbursementFiles);
    },
    [addFiles]
  );

  const handleFolderSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const fileArray = Array.from(e.target.files);
        const validFiles = fileArray
          .filter((f) => isSupportedFile(f.name))
          .map((f) => createFileFromBrowserFile(f));
        addFiles(validFiles);
      }
      e.target.value = '';
    },
    [addFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files);
        const reimbursementFiles = selectedFiles
          .filter((f) => isSupportedFile(f.name))
          .map((file) => createFileFromBrowserFile(file));
        addFiles(reimbursementFiles);
      }
      e.target.value = '';
    },
    [addFiles]
  );

  const pdfCount = files.filter((f) => f.type === 'pdf').length;
  const imageCount = files.filter((f) => f.type === 'image').length;
  const excelCount = files.filter((f) => f.type === 'excel').length;
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  const folderGroups = new Map<string, typeof files>();
  files.forEach((f) => {
    const parts = f.relativePath.split(/[\\/]/);
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '(根目录)';
    if (!folderGroups.has(folder)) {
      folderGroups.set(folder, []);
    }
    folderGroups.get(folder)!.push(f);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">导入报销附件</h2>
        <p className="text-gray-500">
          选择包含发票、审批单等报销附件的文件夹，系统将递归扫描所有子目录
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div
          className={cn(
            'border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer',
            isDragging
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 bg-gray-50 hover:border-primary-300 hover:bg-white'
          )}
          onClick={() => folderInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mb-3">
              <FolderPlus size={28} className="text-primary-600" />
            </div>
            <p className="text-base font-semibold text-gray-700 mb-1">选择文件夹</p>
            <p className="text-sm text-gray-500 mb-3">
              推荐方式，自动递归扫描所有子目录及相对路径
            </p>
            <span className="btn btn-primary">
              <Upload size={16} />
              选择报销文件夹
            </span>
            <input
              ref={folderInputRef}
              type="file"
              // @ts-ignore
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
              onChange={handleFolderSelect}
            />
          </div>
        </div>

        <div
          className="border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer border-gray-300 bg-gray-50 hover:border-primary-300 hover:bg-white"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-success-100 flex items-center justify-center mb-3">
              <FileIcon size={28} className="text-success-600" />
            </div>
            <p className="text-base font-semibold text-gray-700 mb-1">选择文件</p>
            <p className="text-sm text-gray-500 mb-3">
              手动选择 PDF/图片/Excel 等零散报销文件
            </p>
            <span className="btn btn-secondary">
              <FolderOpen size={16} />
              选择多个文件
            </span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInput}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.xls,.xlsx,.csv,.doc,.docx"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <div className="text-gray-300 text-sm">— 或 —</div>
      </div>

      <div className="flex justify-center">
        <button className="btn btn-secondary" onClick={loadMockData}>
          <Database size={18} />
          加载含子目录的示例数据
        </button>
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FolderOpen size={20} className="text-primary-600" />
              已导入 {files.length} 个文件
              <span className="text-sm font-normal text-gray-500">
                · 分布于 {folderGroups.size} 个目录
              </span>
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
              <button className="btn btn-danger text-sm py-1.5" onClick={clearFiles}>
                <Trash2 size={16} />
                清空
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto p-1 bg-gray-50 rounded-xl">
            {Array.from(folderGroups.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([folder, folderFiles]) => (
                <div
                  key={folder}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                >
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <ChevronRight size={14} className="text-gray-400" />
                      <FolderOpen size={14} className="text-amber-500" />
                      <span className="font-medium text-gray-700">{folder}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {folderFiles.length} 个文件
                    </span>
                  </div>

                  <div className="p-2">
                    {viewMode === 'card' ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {folderFiles.map((file) => (
                          <FileCard
                            key={file.id}
                            file={file}
                            onRemove={removeFile}
                            isSelected={selectedFileIds.includes(file.id)}
                            onClick={() => toggleFileSelection(file.id)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {folderFiles.map((file) => (
                          <div
                            key={file.id}
                            className={cn(
                              'flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all border',
                              selectedFileIds.includes(file.id)
                                ? 'border-primary-300 bg-primary-50'
                                : 'border-transparent hover:bg-gray-50'
                            )}
                            onClick={() => toggleFileSelection(file.id)}
                          >
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                              {file.type === 'pdf' && (
                                <FileText size={16} className="text-red-500" />
                              )}
                              {file.type === 'image' && (
                                <ImageIcon size={16} className="text-green-500" />
                              )}
                              {file.type === 'excel' && (
                                <Table size={16} className="text-blue-500" />
                              )}
                              {file.type === 'other' && (
                                <FileIcon size={16} className="text-gray-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-800 truncate">
                                {file.name}
                              </div>
                              <div className="text-xs text-gray-400 truncate">
                                {file.relativePath}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 flex-shrink-0">
                              {formatFileSize(file.size)}
                            </div>
                            <span className="text-xs uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                              {file.type}
                            </span>
                            <button
                              className="p-1 text-gray-400 hover:text-danger-500 rounded hover:bg-danger-50 flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(file.id);
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {files.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <AlertCircle size={32} className="mx-auto mb-2" />
          <p className="text-sm">暂无文件，请导入报销附件</p>
          <p className="text-xs text-gray-300 mt-1">
            支持格式：PDF · JPG/PNG/GIF · XLS/XLSX/CSV · DOC/DOCX
          </p>
        </div>
      )}
    </div>
  );
};

export default Step1Import;
