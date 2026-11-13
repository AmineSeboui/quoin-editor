/** Reads the picture at an address into a file, named from its type, or null when the page cannot read one there. */
export async function readPicture(url: string, name: (type: string) => string): Promise<File | null> {
  const response = await fetch(url).catch(() => null);
  const picture = response?.ok ? await response.blob().catch(() => null) : null;
  if (!picture?.type.startsWith('image/')) return null;
  return new File([picture], name(picture.type), { type: picture.type });
}
