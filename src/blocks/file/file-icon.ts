import { FileArchive, FileIcon, FileImage, FileMusic, FilePlay, FileText } from '../../icons';

type KindIcon = typeof FileIcon;

const KINDS: readonly (readonly [KindIcon, RegExp])[] = [
  [FileImage, /^(image\/|(png|jpe?g|gif|webp|svg|heic|bmp)$)/],
  [FileMusic, /^(audio\/|(mp3|wav|ogg|flac|m4a|aac)$)/],
  [FilePlay, /^(video\/|(mp4|mov|webm|mkv|avi|mpe?g)$)/],
  [FileArchive, /^(zip|rar|7z|tar|gz|xz)$/],
  [FileText, /^(text\/|(txt|md|csv|pdf|rtf|docx?)$)/],
];

const kindOf = (value: string): KindIcon | undefined => KINDS.find(([, pattern]) => pattern.test(value))?.[0];

/** The icon of a file: by the top-level type it declares, else by the extension of its name, else a plain file. */
export const fileIcon = (mime: string, filename: string): KindIcon =>
  kindOf(mime) ?? kindOf(/\.([^.]+)$/.exec(filename)?.[1].toLowerCase() ?? '') ?? FileIcon;
