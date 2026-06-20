import React, { useState, useMemo } from 'react';
import {
  Download,
  FileText,
  Table as TableIcon,
  Archive,
  RotateCcw,
  CheckCircle2,
  FileJson,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatAmount, cn } from '@/utils/common';
import { generateSummaryExcel, generateIssuesExcel, generateRollbackJson, generateFileListZip, downloadBlob } from '@/utils/exporter';
import { getExpandedEntries } from '@/utils/classifier';

export const Step6Export: React.FC = () => {
  const { files, exportResult, runExport, isProcessing, resetAll, config } = useAppStore();
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const expandedEntries = useMemo(
    () => getExpandedEntries(files, config.classificationRule, config.amountRanges),
    [files, config.classificationRule, config.amountRanges]
  );

  const totalAmount = expandedEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalIssues = files.reduce((sum, f) => sum + f.issues.length, 0);
  const errorCount = files.reduce(
    (sum, f) => sum + f.issues.filter((i) => i.level === 'error').length,
    0
  );

  const categoryAgg = useMemo(() => {
    const agg = new Map<string, { count: number; totalAmount: number; files: typeof files }>();
    for (const entry of expandedEntries) {
      if (!agg.has(entry.category)) {
        agg.set(entry.category, { count: 0, totalAmount: 0, files: [] });
      }
      const cat = agg.get(entry.category)!;
      cat.count++;
      cat.totalAmount += entry.amount;
      if (!cat.files.includes(entry.file)) {
        cat.files.push(entry.file);
      }
    }
    return agg;
  }, [expandedEntries]);

  const summaryData = useMemo(() => {
    return Array.from(categoryAgg.entries()).map(([category, data]) => ({
      employeeName: category,
      fileCount: data.count,
      totalAmount: data.totalAmount,
      fileNames: expandedEntries
        .filter((e) => e.category === category)
        .map((e) => e.label),
    }));
  }, [categoryAgg, expandedEntries]);

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    const steps = [10, 30, 50, 70, 85, 100];
    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 300));
      setExportProgress(steps[i]);
    }

    await runExport();
    setIsExporting(false);
  };

  const handleDownloadSummary = () => {
    const blob = generateSummaryExcel(summaryData);
    downloadBlob(blob, '报销汇总表.xlsx');
  };

  const handleDownloadIssues = () => {
    const blob = generateIssuesExcel(files);
    downloadBlob(blob, '问题清单.xlsx');
  };

  const handleDownloadRollback = () => {
    const rollbackData = files.map((f) => ({
      id: f.id,
      originalPath: f.relativePath,
      originalName: f.originalName,
      newPath: `${f.category}/${f.newName || f.name}`,
      newName: f.newName || f.name,
    }));
    const blob = generateRollbackJson(rollbackData);
    downloadBlob(blob, '回退记录.json');
  };

  const handleDownloadZip = async () => {
    const blob = await generateFileListZip(files, config.classificationRule, config.amountRanges);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    downloadBlob(blob, `规范附件目录_${dateStr}.zip`);
  };

  const handleStartOver = () => {
    if (window.confirm('确定要重新开始吗？所有数据将被清空。')) {
      resetAll();
    }
  };

  if (files.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-2">汇总导出</h2>
          <p className="text-gray-500">生成整理结果和汇总报告</p>
        </div>
        <div className="text-center py-16 text-gray-400">
          <Download size={48} className="mx-auto mb-4" />
          <p className="text-lg">请先完成前面的步骤</p>
          <p className="text-sm text-gray-400 mt-2">导入文件并处理后才能导出</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">汇总导出</h2>
        <p className="text-gray-500">生成整理结果和汇总报告</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-3xl font-bold text-primary-600">{expandedEntries.length}</div>
          <div className="text-sm text-gray-500 mt-1">明细条数</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-3xl font-bold text-success-600">
            ¥{formatAmount(totalAmount)}
          </div>
          <div className="text-sm text-gray-500 mt-1">总金额</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-3xl font-bold text-gray-700">
            {categoryAgg.size}
          </div>
          <div className="text-sm text-gray-500 mt-1">分类数</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div
            className={cn(
              'text-3xl font-bold',
              errorCount > 0 ? 'text-danger-600' : 'text-success-600'
            )}
          >
            {totalIssues}
          </div>
          <div className="text-sm text-gray-500 mt-1">问题数</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Archive size={20} className="text-primary-500" />
          导出内容
        </h3>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-3">
              <TableIcon size={24} className="text-green-600" />
            </div>
            <div className="font-medium text-gray-800">报销汇总表</div>
            <div className="text-sm text-gray-500 mt-1">
              Excel 格式，包含各分类的文件和金额统计
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center mb-3">
              <FileText size={24} className="text-orange-600" />
            </div>
            <div className="font-medium text-gray-800">问题清单</div>
            <div className="text-sm text-gray-500 mt-1">
              Excel 格式，列出所有检测到的问题和建议
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
              <FileJson size={24} className="text-blue-600" />
            </div>
            <div className="font-medium text-gray-800">回退记录</div>
            <div className="text-sm text-gray-500 mt-1">
              JSON 格式，记录原始路径和新路径的映射
            </div>
          </div>

          <div className="p-4 bg-primary-50 rounded-xl border border-primary-200">
            <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center mb-3">
              <RefreshCw size={24} className="text-primary-600" />
            </div>
            <div className="font-medium text-gray-800">规范附件目录包</div>
            <div className="text-sm text-gray-500 mt-1">
              ZIP 压缩包，按分类规则整理并重命名原附件
            </div>
          </div>
        </div>

        {isExporting && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>正在导出...</span>
              <span>{exportProgress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

        {exportResult && !isExporting ? (
          <div className="bg-success-50 border border-success-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-success-600" />
              <div>
                <div className="font-medium text-success-800">导出成功！</div>
                <div className="text-sm text-success-600">
                  文件已下载到本地，请检查下载文件夹
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-center gap-3">
          <button
            className="btn btn-primary px-8 py-3 text-base"
            onClick={handleExport}
            disabled={isExporting || isProcessing}
          >
            {isExporting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                导出中...
              </>
            ) : (
              <>
                <Download size={20} />
                开始导出
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-800 mb-4">分类预览</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {Array.from(categoryAgg.entries()).map(([category, data]) => {
            return (
              <div
                key={category}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-primary-100 flex items-center justify-center">
                    <FileText size={16} className="text-primary-600" />
                  </div>
                  <span className="font-medium text-gray-800">{category}</span>
                  <span className="text-sm text-gray-500">{data.count} 条记录</span>
                </div>
                <span className="font-semibold text-primary-600">
                  ¥{formatAmount(data.totalAmount)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <button
          className="btn btn-secondary"
          onClick={handleStartOver}
        >
          <RotateCcw size={18} />
          重新开始
        </button>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-secondary text-sm" onClick={handleDownloadSummary}>
            <TableIcon size={16} />
            下载汇总表
          </button>
          <button className="btn btn-secondary text-sm" onClick={handleDownloadIssues}>
            <FileText size={16} />
            下载问题清单
          </button>
          <button className="btn btn-secondary text-sm" onClick={handleDownloadRollback}>
            <FileJson size={16} />
            下载回退记录
          </button>
          <button className="btn btn-primary text-sm" onClick={handleDownloadZip}>
            <Archive size={16} />
            下载规范附件包
          </button>
        </div>
      </div>
    </div>
  );
};

export default Step6Export;
