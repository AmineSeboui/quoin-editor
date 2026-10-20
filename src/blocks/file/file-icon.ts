import { FileArchive, FileIcon, FileImage, FileMusic, FilePlay, FileText, type LucideIcon } from 'lucide-react';

const KINDS: readonly (readonly [LucideIcon, RegExp])[] = [
  [FileImage, /^(image\/|(png|jpe?g|gif|webp|svg|heic|bmp)$)/],
  [FileMusic, /^(audio\/|(mp3|wav|ogg|flac|m4a|aac)$)/],
  [FilePlay, /^(video\/|(mp4|mov|webm|mkv|avi|mpe?g)$)/],
  [FileArchive, /^(zip|rar|7z|tar|gz|xz)$/],
  [FileText, /^(text\/|(txt|md|csv|pdf|rtf|docx?)$)/],
];

const kindOf = (value: string): LucideIcon | undefined => KINDS.find(([, pattern]) => pattern.test(value))?.[0];

/** The icon of a file: by the top-level type it declares, else by the extension of its name, else a plain file. */
export const fileIcon = (mime: string, filename: string): LucideIcon =>
  kindOf(mime) ?? kindOf(/\.([^.]+)$/.exec(filename)?.[1].toLowerCase() ?? '') ?? FileIcon;
