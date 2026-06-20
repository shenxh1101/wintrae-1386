import React from 'react';
import {
  FolderOpen,
  FileText,
  Users,
  Edit3,
  AlertTriangle,
  Download,
  Check,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/utils/common';

interface StepIndicatorProps {
  currentStep: number;
  steps?: { id: number; name: string; description: string; icon: string }[];
  onStepClick?: (step: number) => void;
}

const defaultSteps = [
  { id: 0, name: '导入文件夹', description: '选择报销附件目录', icon: 'folder' },
  { id: 1, name: '识别发票类型', description: '智能提取发票信息', icon: 'file' },
  { id: 2, name: '按人员归类', description: '按维度分类整理', icon: 'users' },
  { id: 3, name: '重命名', description: '批量规范命名', icon: 'edit' },
  { id: 4, name: '缺失检查', description: '检查问题票据', icon: 'alert' },
  { id: 5, name: '汇总导出', description: '生成整理结果', icon: 'download' },
];

const iconMap: Record<string, React.ReactNode> = {
  folder: <FolderOpen size={20} />,
  file: <FileText size={20} />,
  users: <Users size={20} />,
  edit: <Edit3 size={20} />,
  alert: <AlertTriangle size={20} />,
  download: <Download size={20} />,
};

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  steps = defaultSteps,
  onStepClick,
}) => {
  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'pending';
  };

  return (
    <div className="w-full py-6">
      <div className="flex items-start justify-between">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const isClickable = onStepClick && step.id <= currentStep + 1;

          return (
            <React.Fragment key={step.id}>
              <div
                className={cn(
                  'flex flex-col items-center flex-shrink-0 w-28',
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                )}
                onClick={() => isClickable && onStepClick?.(step.id)}
              >
                <div
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 mb-3',
                    status === 'completed' && 'bg-success-500 text-white',
                    status === 'current' && 'bg-primary-600 text-white ring-4 ring-primary-100',
                    status === 'pending' && 'bg-gray-100 text-gray-400'
                  )}
                >
                  {status === 'completed' ? (
                    <Check size={20} />
                  ) : (
                    iconMap[step.icon] || <FileText size={20} />
                  )}
                </div>
                <div
                  className={cn(
                    'text-sm font-medium text-center mb-1',
                    status === 'current' && 'text-primary-700',
                    status === 'completed' && 'text-success-700',
                    status === 'pending' && 'text-gray-400'
                  )}
                >
                  {step.name}
                </div>
                <div
                  className={cn(
                    'text-xs text-center',
                    status === 'current' && 'text-primary-500',
                    status === 'completed' && 'text-success-500',
                    status === 'pending' && 'text-gray-300'
                  )}
                >
                  {step.description}
                </div>
              </div>

              {index < steps.length - 1 && (
                <div className="flex-1 flex items-center pt-5 mx-2">
                  <div
                    className={cn(
                      'h-1 w-full rounded-full transition-all duration-500',
                      status === 'completed' ? 'bg-success-400' : 'bg-gray-200'
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;
