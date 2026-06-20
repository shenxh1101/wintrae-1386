import { create } from 'zustand';
import type {
  ReimbursementFile,
  AppConfig,
  ExportResult,
  ClassificationRule,
  Issue,
} from '@/types';
import {
  DEFAULT_NAMING_TEMPLATE,
  DEFAULT_AMOUNT_RANGES,
  applyRename,
  classifyFiles,
} from '@/utils/classifier';
import { DEFAULT_CHECK_RULES, runAllChecks } from '@/utils/checker';
import { processInvoiceRecognition } from '@/utils/invoiceRecognizer';
import { runExport } from '@/utils/exporter';
import { createMockFiles } from '@/utils/fileProcessor';

interface AppState {
  currentStep: number;
  files: ReimbursementFile[];
  config: AppConfig;
  selectedFileIds: string[];
  isProcessing: boolean;
  exportResult: ExportResult | null;
  checksCompleted: boolean;
  recognitionCompleted: boolean;

  setCurrentStep: (step: number) => void;
  addFiles: (files: ReimbursementFile[]) => void;
  removeFile: (fileId: string) => void;
  clearFiles: () => void;
  toggleFileSelection: (fileId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  loadMockData: () => void;

  runRecognition: () => void;
  updateInvoiceInfo: (fileId: string, updates: Partial<ReimbursementFile['invoiceInfo']>) => void;

  updateClassificationRule: (rule: ClassificationRule) => void;

  updateNamingTemplate: (template: string) => void;
  runRename: () => void;

  runChecks: () => void;
  updateCheckRule: (key: keyof AppConfig['checkRules'], value: boolean) => void;
  resetChecks: () => void;

  runExport: () => Promise<void>;
  resetExport: () => void;

  resetAll: () => void;
}

const initialConfig: AppConfig = {
  namingTemplate: DEFAULT_NAMING_TEMPLATE,
  classificationRule: 'employee',
  amountRanges: DEFAULT_AMOUNT_RANGES,
  checkRules: { ...DEFAULT_CHECK_RULES },
};

export const useAppStore = create<AppState>((set, get) => ({
  currentStep: 0,
  files: [],
  config: initialConfig,
  selectedFileIds: [],
  isProcessing: false,
  exportResult: null,
  checksCompleted: false,
  recognitionCompleted: false,

  setCurrentStep: (step: number) => set({ currentStep: step }),

  addFiles: (newFiles: ReimbursementFile[]) =>
    set((state) => ({
      files: [...state.files, ...newFiles],
      checksCompleted: false,
    })),

  removeFile: (fileId: string) =>
    set((state) => ({
      files: state.files.filter((f) => f.id !== fileId),
      selectedFileIds: state.selectedFileIds.filter((id) => id !== fileId),
      checksCompleted: false,
    })),

  clearFiles: () =>
    set({
      files: [],
      selectedFileIds: [],
      checksCompleted: false,
      recognitionCompleted: false,
    }),

  toggleFileSelection: (fileId: string) =>
    set((state) => ({
      selectedFileIds: state.selectedFileIds.includes(fileId)
        ? state.selectedFileIds.filter((id) => id !== fileId)
        : [...state.selectedFileIds, fileId],
    })),

  selectAll: () =>
    set((state) => ({
      selectedFileIds: state.files.map((f) => f.id),
    })),

  deselectAll: () => set({ selectedFileIds: [] }),

  loadMockData: () => {
    const mockFiles = createMockFiles();
    set({ files: mockFiles, checksCompleted: false, recognitionCompleted: false });
  },

  runRecognition: () => {
    set({ isProcessing: true });
    setTimeout(() => {
      set((state) => ({
        files: processInvoiceRecognition(state.files),
        isProcessing: false,
        recognitionCompleted: true,
        checksCompleted: false,
      }));
    }, 800);
  },

  updateInvoiceInfo: (fileId: string, updates: Partial<ReimbursementFile['invoiceInfo']>) =>
    set((state) => ({
      files: state.files.map((f) => {
        if (f.id !== fileId) return f;
        return {
          ...f,
          invoiceInfo: f.invoiceInfo
            ? { ...f.invoiceInfo, ...updates }
            : {
                invoiceType: 'other',
                invoiceNumber: '',
                amount: 0,
                invoiceDate: '',
                employeeName: '',
                projectName: '',
                department: '',
                ...updates,
              },
        };
      }),
      checksCompleted: false,
    })),

  updateClassificationRule: (rule: ClassificationRule) =>
    set((state) => {
      const updatedFiles = classifyFiles(state.files, rule, state.config.amountRanges);
      return {
        config: { ...state.config, classificationRule: rule },
        files: updatedFiles,
      };
    }),

  updateNamingTemplate: (template: string) =>
    set((state) => ({
      config: { ...state.config, namingTemplate: template },
    })),

  runRename: () =>
    set((state) => ({
      files: applyRename(
        state.files,
        state.config.namingTemplate,
        state.config.classificationRule,
        state.config.amountRanges
      ),
    })),

  runChecks: () => {
    set({ isProcessing: true, checksCompleted: false });
    setTimeout(() => {
      set((state) => ({
        files: runAllChecks(state.files, state.config.checkRules),
        isProcessing: false,
        checksCompleted: true,
      }));
    }, 1000);
  },

  updateCheckRule: (key: keyof AppConfig['checkRules'], value: boolean) =>
    set((state) => ({
      config: {
        ...state.config,
        checkRules: { ...state.config.checkRules, [key]: value },
      },
      checksCompleted: false,
    })),

  resetChecks: () => set({ checksCompleted: false }),

  runExport: async () => {
    set({ isProcessing: true });
    try {
      const state = get();
      const result = await runExport(
        state.files,
        state.config.classificationRule,
        state.config.amountRanges
      );
      set({ exportResult: result, isProcessing: false });
    } catch (error) {
      console.error('Export failed:', error);
      set({ isProcessing: false });
    }
  },

  resetExport: () => set({ exportResult: null }),

  resetAll: () =>
    set({
      currentStep: 0,
      files: [],
      selectedFileIds: [],
      isProcessing: false,
      exportResult: null,
      config: initialConfig,
      checksCompleted: false,
      recognitionCompleted: false,
    }),
}));
