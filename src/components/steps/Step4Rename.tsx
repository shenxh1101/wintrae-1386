import React, { useState, useEffect } from 'react';
import {
  Edit3,
  Eye,
  RefreshCw,
  FileText,
  Hash,
  User,
  Calendar,
  DollarSign,
  Tag,
  FolderKanban,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { DEFAULT_NAMING_TEMPLATE } from '@/utils/classifier';
import { cn } from '@/utils/common';

const templateVariables = [
  { key: '{员工姓名}', label: '员工姓名', icon: <User size={14} /> },
  { key: '{月份}', label: '月份', icon: <Calendar size={14} /> },
  { key: '{金额}', label: '金额', icon: <DollarSign size={14} /> },
  { key: '{发票类型}', label: '发票类型', icon: <Tag size={14} /> },
  { key: '{序号}', label: '序号', icon: <Hash size={14} /> },
  { key: '{发票号码}', label: '发票号码', icon: <FileText size={14} /> },
  { key: '{项目名称}', label: '项目名称', icon: <FolderKanban size={14} /> },
];

const presetTemplates = [
  { name: '标准模板', template: '{员工姓名}_{月份}_{发票类型}_{序号}' },
  { name: '简洁模板', template: '{员工姓名}-{金额}-{序号}' },
  { name: '详细模板', template: '{月份}_{员工姓名}_{项目名称}_{发票类型}_{序号}' },
  { name: '金额优先', template: '{金额}_{员工姓名}_{序号}' },
];

export const Step4Rename: React.FC = () => {
  const { files, config, updateNamingTemplate, runRename } = useAppStore();
  const [previewCount, setPreviewCount] = useState(5);

  useEffect(() => {
    if (files.length > 0) {
      runRename();
    }
  }, [config.namingTemplate, config.classificationRule]);

  const handleInsertVariable = (variable: string) => {
    updateNamingTemplate(config.namingTemplate + variable);
  };

  const handleApplyPreset = (template: string) => {
    updateNamingTemplate(template);
  };

  const handleResetTemplate = () => {
    updateNamingTemplate(DEFAULT_NAMING_TEMPLATE);
  };

  const renamedFiles = files.filter((f) => f.newName && f.newName !== f.name);
  const sampleFiles = files.slice(0, previewCount);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">批量重命名文件</h2>
        <p className="text-gray-500">设置命名规则，自动规范所有文件名</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            命名模板
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              className="input flex-1 font-mono text-sm"
              value={config.namingTemplate}
              onChange={(e) => updateNamingTemplate(e.target.value)}
            />
            <button
              className="btn btn-secondary text-sm"
              onClick={handleResetTemplate}
            >
              <RefreshCw size={16} />
              重置
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            可用变量
          </label>
          <div className="flex flex-wrap gap-2">
            {templateVariables.map((v) => (
              <button
                key={v.key}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-primary-100 hover:text-primary-600 rounded-lg transition-colors"
                onClick={() => handleInsertVariable(v.key)}
              >
                {v.icon}
                <span>{v.key}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            快捷模板
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {presetTemplates.map((preset) => (
              <button
                key={preset.name}
                className={cn(
                  'p-3 rounded-lg border text-left transition-all',
                  config.namingTemplate === preset.template
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-200 hover:bg-gray-50'
                )}
                onClick={() => handleApplyPreset(preset.template)}
              >
                <div className="text-sm font-medium text-gray-800">
                  {preset.name}
                </div>
                <div className="text-xs text-gray-500 font-mono mt-1 truncate">
                  {preset.template}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {files.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Eye size={20} className="text-primary-500" />
              命名预览
            </h3>
            <span className="text-sm text-gray-500">
              共 {renamedFiles.length} 个文件将被重命名
            </span>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {sampleFiles.map((file, index) => (
              <div
                key={file.id}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
              >
                <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 text-xs font-medium flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-400 line-through truncate">
                    {file.name}
                  </div>
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {file.newName || file.name}
                  </div>
                </div>
                {file.newName && file.newName !== file.name && (
                  <span className="badge badge-success flex-shrink-0">
                    已重命名
                  </span>
                )}
              </div>
            ))}
          </div>

          {files.length > previewCount && (
            <button
              className="w-full mt-3 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
              onClick={() =>
                setPreviewCount(Math.min(previewCount + 10, files.length))
              }
            >
              查看更多 ({files.length - previewCount})
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <Edit3 size={48} className="mx-auto mb-4" />
          <p className="text-lg">请先导入文件</p>
        </div>
      )}
    </div>
  );
};

export default Step4Rename;
