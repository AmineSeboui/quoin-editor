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
export type { CodeHighlighter, CodeToken } from './blocks/code/code-highlighter';
export { UploadField, type UploadFieldProps } from './upload/UploadField';
export { FilePickerButton, type FilePickerButtonProps } from './upload/FilePickerButton';
export { QuoinProvider, useQuoin, type QuoinConfig, type QuoinConfigInput } from './context';
export { englishLabels } from './i18n/english-labels';
export type { QuoinLabels } from './i18n/labels';
export { resolveLabels } from './i18n/resolve-labels';
export type { ExtensionUI, SlashGroup, SlashItem, SuggestionRange, ToolbarItem } from './extensions/ui-types';
export type { BlockMenuAction } from './gutter/block-menu-items';
export { useLabels } from './i18n/use-labels';
export { formatShortcut, type ShortcutPlatform } from './shortcuts/format-shortcut';
export {
  useAutosave,
  type AutosaveStatus,
  type UseAutosaveInput,
  type UseAutosaveResult,
} from './hooks/useAutosave';
export type { QuoinBlock, UploadResult, UploadFn, BlockEditorProps, BlockPreviewProps } from './types';
export * from './view';
export * from './engine';
