import { FileArchive, FileIcon, FileImage, FileMusic, FilePlay, FileText } from 'lucide-react';
import { fileIcon } from './file-icon';

describe('the icon of a file', () => {
  it('follows the type the file declares', () => {
    expect(fileIcon('image/png', 'a')).toBe(FileImage);
    expect(fileIcon('audio/mpeg', 'a')).toBe(FileMusic);
    expect(fileIcon('video/mp4', 'a')).toBe(FilePlay);
    expect(fileIcon('application/zip', 'a')).toBe(FileArchive);
    expect(fileIcon('application/x-7z-compressed', 'a')).toBe(FileArchive);
    expect(fileIcon('text/csv', 'a')).toBe(FileText);
    expect(fileIcon('application/pdf', 'a')).toBe(FileText);
    expect(fileIcon('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'a')).toBe(FileText);
  });

  it('falls back to the extension of its name, in any case, when the type says nothing it knows', () => {
    expect(fileIcon('', 'photo.JPEG')).toBe(FileImage);
    expect(fileIcon('application/octet-stream', 'song.mp3')).toBe(FileMusic);
    expect(fileIcon('', 'clip.mov')).toBe(FilePlay);
    expect(fileIcon('', 'backup.tar.gz')).toBe(FileArchive);
    expect(fileIcon('', 'notes.md')).toBe(FileText);
    expect(fileIcon('image/png', 'scan.pdf')).toBe(FileImage);
  });

  it('is a plain file for anything else', () => {
    expect(fileIcon('application/json', 'data.json')).toBe(FileIcon);
    expect(fileIcon('', 'README')).toBe(FileIcon);
  });
});
