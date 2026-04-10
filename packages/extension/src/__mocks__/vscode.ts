import { vi } from 'vitest';

export const commands = {
  executeCommand: vi.fn().mockResolvedValue(undefined),
};
export const window = {
  showWarningMessage: vi.fn().mockResolvedValue(undefined),
  showInformationMessage: vi.fn().mockResolvedValue(undefined),
  showErrorMessage: vi.fn().mockResolvedValue(undefined),
};
export const version = '1.99.0';
