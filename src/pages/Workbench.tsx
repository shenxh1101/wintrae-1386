import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  HelpCircle,
  Settings,
  Receipt,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import StepIndicator from '@/components/StepIndicator';
import Step1Import from '@/components/steps/Step1Import';
import Step2Recognize from '@/components/steps/Step2Recognize';
import Step3Classify from '@/components/steps/Step3Classify';
import Step4Rename from '@/components/steps/Step4Rename';
import Step5Check from '@/components/steps/Step5Check';
import Step6Export from '@/components/steps/Step6Export';
import { formatAmount, cn } from '@/utils/common';

const stepComponents = [
  Step1Import,
  Step2Recognize,
  Step3Classify,
  Step4Rename,
  Step5Check,
  Step6Export,
];

export const WorkbenchPage: React.FC = () => {
  const {
    currentStep,
    setCurrentStep,
    files,
    isProcessing,
  } = useAppStore();

  const totalAmount = files.reduce((sum, f) => sum + (f.invoiceInfo?.amount || 0), 0);
  const totalIssues = files.reduce((sum, f) => sum + f.issues.length, 0);

  const canGoBack = currentStep > 0;
  const canGoForward = currentStep < 5;

  const StepComponent = stepComponents[currentStep];

  const handlePrev = () => {
    if (canGoBack) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (canGoForward) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleStepClick = (step: number) => {
    setCurrentStep(step);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
                <Receipt size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">
                  报销附件整理工具
                </h1>
                <p className="text-xs text-gray-500">智能分类 · 快速校验 · 一键导出</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {files.length > 0 && (
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-gray-800">{files.length}</div>
                    <div className="text-xs text-gray-500">文件数</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-primary-600">
                      ¥{formatAmount(totalAmount)}
                    </div>
                    <div className="text-xs text-gray-500">总金额</div>
                  </div>
                  {totalIssues > 0 && (
                    <div className="text-center">
                      <div
                        className={cn(
                          'font-semibold',
                          totalIssues > 3 ? 'text-danger-600' : 'text-warning-600'
                        )}
                      >
                        {totalIssues}
                      </div>
                      <div className="text-xs text-gray-500">问题数</div>
                    </div>
                  )}
                </div>
              )}

              <div className="h-8 w-px bg-gray-200" />

              <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                <HelpCircle size={20} />
              </button>
              <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                <Settings size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <StepIndicator
            currentStep={currentStep}
            onStepClick={handleStepClick}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[500px]">
          <StepComponent />
        </div>
      </div>

      <footer className="bg-white border-t border-gray-200 sticky bottom-0">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              第 {currentStep + 1} / 6 步
            </div>
            <div className="flex items-center gap-3">
              <button
                className={cn(
                  'btn btn-secondary',
                  !canGoBack && 'opacity-50 cursor-not-allowed'
                )}
                onClick={handlePrev}
                disabled={!canGoBack || isProcessing}
              >
                <ChevronLeft size={18} />
                上一步
              </button>
              <button
                className={cn(
                  'btn btn-primary',
                  (!canGoForward || isProcessing) && 'opacity-50 cursor-not-allowed'
                )}
                onClick={handleNext}
                disabled={!canGoForward || isProcessing}
              >
                下一步
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WorkbenchPage;
