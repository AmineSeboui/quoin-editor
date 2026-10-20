import { FileArchive, FileIcon, FileImage, FileMusic, FilePlay, FileText } from 'lucide-react';
import { fileIcon } from './file-icon';

describe('the icon of a file', () => {
  it('follows the top-level type the file declares', () => {
    expect(fileIcon('image/png', 'a')).toBe(FileImage);
    expect(fileIcon('audio/mpeg', 'a')).toBe(FileMusic);
    expect(fileIcon('video/mp4', 'a')).toBe(FilePlay);
    expect(fileIcon('video/ogg', 'clip.ogg')).toBe(FilePlay);
    expect(fileIcon('text/csv', 'a')).toBe(FileText);
    expect(fileIcon('image/png', 'scan.pdf')).toBe(FileImage);
  });

  it('falls back to the exact extension of its name, in any case, for any other type', () => {
    expect(fileIcon('application/zip', 'a.zip')).toBe(FileArchive);
    expect(fileIcon('application/pdf', 'notes.pdf')).toBe(FileText);
    expect(fileIcon('', 'photo.JPEG')).toBe(FileImage);
    expect(fileIcon('application/octet-stream', 'song.mp3')).toBe(FileMusic);
    expect(fileIcon('', 'backup.tar.gz')).toBe(FileArchive);
    for (const [name, icon] of [
      ['clip.avi', FilePlay],
      ['clip.mpg', FilePlay],
      ['song.aac', FileMusic],
      ['photo.heic', FileImage],
      ['scan.bmp', FileImage],
      ['logs.xz', FileArchive],
    ] as const) {
      expect(fileIcon('', name)).toBe(icon);
    }
  });

  it('is a plain file for anything else, whatever words its type or name contain', () => {
    expect(fileIcon('application/x-apple-diskimage', 'installer')).toBe(FileIcon);
    expect(fileIcon('', 'build.cmd')).toBe(FileIcon);
    expect(fileIcon('application/json', 'data.json')).toBe(FileIcon);
    expect(fileIcon('', 'README')).toBe(FileIcon);
  });
});
