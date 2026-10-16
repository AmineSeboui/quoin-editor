'use client';

export { BlockCanvas } from './canvas/BlockCanvas';
export type { BlockCanvasProps, QuoinEditorHandle } from './canvas/canvas-props';
export { defineBlock, blockByType, paletteBlocks, type BlockDefinition, type AnyBlockDefinition } from './registry';
export { coreBlocks } from './blocks/core';
export type {
  MarkdownBlockData,
  CalloutBlockData,
  CodeBlockData,
  ImageBlockData,
  FileBlockData,
  CoreBlockData,
} from './blocks/data';
export { UploadField, type UploadFieldProps } from './upload/UploadField';
export { FilePickerButton, type FilePickerButtonProps } from './upload/FilePickerButton';
export { QuoinProvider, useQuoin, type QuoinConfig, type QuoinConfigInput } from './context';
export { englishLabels, resolveLabels, type QuoinLabels } from './i18n/labels';
export type { ExtensionUI, SlashGroup, SlashItem, SuggestionRange, ToolbarItem } from './extensions/ui-types';
export type { BlockMenuAction } from './gutter/block-menu-items';
export { replaceTrigger } from './menus/suggestion/replace-trigger';
export { useLabels } from './i18n/use-labels';
export {
  useAutosave,
  type AutosaveStatus,
  type UseAutosaveInput,
  type UseAutosaveResult,
} from './hooks/useAutosave';
export type { QuoinBlock, UploadResult, UploadFn, BlockEditorProps, BlockPreviewProps } from './types';
export * from './view';
export * from './engine';
