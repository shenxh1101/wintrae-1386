import React from 'react';
import {
  Users,
  Calendar,
  DollarSign,
  FolderKanban,
  Layers,
  FileText,
  Table2,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { CLASSIFICATION_RULE_LABELS, type ClassificationRule } from '@/types';
import { formatAmount, cn } from '@/utils/common';
import { getExpandedEntries } from '@/utils/classifier';

const ruleOptions: { value: ClassificationRule; icon: React.ReactNode; label: string; desc: string }[] = [
  {
    value: 'employee',
    icon: <Users size={24} />,
    label: '按员工姓名',
    desc: '以员工姓名为文件夹分类',
  },
  {
    value: 'month',
    icon: <Calendar size={24} />,
    label: '按月份',
    desc: '以开票月份为文件夹分类',
  },
  {
    value: 'amount',
    icon: <DollarSign size={24} />,
    label: '按金额区间',
    desc: '按金额大小分档归类',
  },
  {
    value: 'project',
    icon: <FolderKanban size={24} />,
    label: '按项目名称',
    desc: '以项目名称为文件夹分类',
  },
];

export const Step3Classify: React.FC = () => {
  const { files, config, updateClassificationRule } = useAppStore();

  const expandedEntries = getExpandedEntries(files, config.classificationRule, config.amountRanges);

  const categoryAgg = new Map<string, { count: number; totalAmount: number; labels: string[] }>();
  for (const entry of expandedEntries) {
    if (!categoryAgg.has(entry.category)) {
      categoryAgg.set(entry.category, { count: 0, totalAmount: 0, labels: [] });
    }
    const agg = categoryAgg.get(entry.category)!;
    agg.count++;
    agg.totalAmount += entry.amount;
    agg.labels.push(entry.label);
  }

  const categories = Array.from(categoryAgg.entries()).sort((a, b) => b[1].count - a[1].count);

  const hasRecognitionData = files.some((f) => f.invoiceInfo);

  const totalAmount = expandedEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalEntries = expandedEntries.length;
  const subRowCount = expandedEntries.filter(e => e.source === 'row').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">按维度归类附件</h2>
        <p className="text-gray-500">选择分类方式，自动整理报销文件</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {ruleOptions.map((option) => (
          <div
            key={option.value}
            className={cn(
              'p-4 rounded-xl border-2 cursor-pointer transition-all duration-200',
              config.classificationRule === option.value
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 bg-white hover:border-primary-200 hover:bg-gray-50'
            )}
            onClick={() => updateClassificationRule(option.value)}
          >
            <div
              className={cn(
                'w-12 h-12 rounded-lg flex items-center justify-center mb-3',
                config.classificationRule === option.value
                  ? 'bg-primary-100 text-primary-600'
                  : 'bg-gray-100 text-gray-500'
              )}
            >
              {option.icon}
            </div>
            <div className="font-medium text-gray-800">{option.label}</div>
            <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
          </div>
        ))}
      </div>

      {files.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Layers size={48} className="mx-auto mb-4" />
          <p className="text-lg">请先导入文件并进行识别</p>
        </div>
      ) : !hasRecognitionData ? (
        <div className="text-center py-12 text-warning-500">
          <FileText size={48} className="mx-auto mb-4" />
          <p className="text-lg">请先完成发票识别步骤</p>
          <p className="text-sm text-gray-500 mt-2">识别后才能按维度进行分类</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto p-1">
          {categories.map(([category, agg]) => {
            return (
              <div
                key={category}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                      <FolderKanban size={20} className="text-primary-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">{category}</div>
                      <div className="text-xs text-gray-500">
                        {agg.count} 条记录
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary-600">
                      ¥{formatAmount(agg.totalAmount)}
                    </div>
                    <div className="text-xs text-gray-500">总金额</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {agg.labels.slice(0, 6).map((label, i) => (
                    <div
                      key={i}
                      className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 truncate max-w-[150px]"
                      title={label}
                    >
                      {label}
                    </div>
                  ))}
                  {agg.labels.length > 6 && (
                    <div className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-500">
                      +{agg.labels.length - 6} 更多
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {categories.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm text-gray-600">
            共 <span className="font-medium text-gray-800">{categories.length}</span> 个分类，
            <span className="font-medium text-gray-800">{totalEntries}</span> 条记录
            {subRowCount > 0 && (
              <span className="text-primary-500 ml-1">
                （含 <Table2 size={12} className="inline" /> {subRowCount} 条表格子行）
              </span>
            )}
          </span>
          <span className="text-sm text-primary-600 font-medium">
            总计 ¥{formatAmount(totalAmount)}
          </span>
        </div>
      )}
    </div>
  );
};

export default Step3Classify;
