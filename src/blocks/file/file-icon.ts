import { FileArchive, FileIcon, FileImage, FileMusic, FilePlay, FileText, type LucideIcon } from 'lucide-react';

// Each kind of file by the words of the types it declares and of the extensions of its name.
const KINDS: readonly (readonly [LucideIcon, RegExp])[] = [
  [FileImage, /image|png|jpe?g|gif|webp|svg/],
  [FileMusic, /audio|mp3|wav|ogg|flac|m4a/],
  [FilePlay, /video|mp4|mov|webm|mkv/],
  [FileArchive, /zip|rar|7z|tar|gz/],
  [FileText, /text|pdf|doc|rtf|csv|txt|md/],
];

const kindOf = (value: string): LucideIcon | undefined => KINDS.find(([, words]) => words.test(value))?.[0];

/** The icon of a file: by the type it declares, else by the extension of its name, else a plain file. */
export const fileIcon = (mime: string, filename: string): LucideIcon =>
  kindOf(mime) ?? kindOf(/\.([^.]+)$/.exec(filename)?.[1].toLowerCase() ?? '') ?? FileIcon;
