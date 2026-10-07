import { AppError } from '../middleware/errorHandler.js';

export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

/**
 * Validates file buffer magic bytes against expected file signatures.
 * Rejects renamed executables or spoofed MIME types.
 */
export function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (!buffer || buffer.length < 4) {
    return false;
  }

  // PDF signature: %PDF (0x25 0x50 0x44 0x46)
  if (mimeType === 'application/pdf') {
    return (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    );
  }

  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (mimeType === 'image/png') {
    if (buffer.length < 8) return false;
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  // JPEG signature: FF D8 FF
  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  return false;
}

/**
 * Strips EXIF metadata from JPEG buffers to prevent leaking GPS/device data.
 */
export function stripExifMetadata(buffer: Buffer, mimeType: string): Buffer {
  if (mimeType !== 'image/jpeg' || buffer.length < 4) {
    return buffer;
  }

  // Quick check for JPEG SOI marker (0xFF, 0xD8)
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return buffer;
  }

  const chunks: Buffer[] = [buffer.subarray(0, 2)]; // Keep SOI
  let offset = 2;

  while (offset < buffer.length - 1) {
    if (buffer[offset] !== 0xff) {
      // Append remainder if standard marker framing is lost
      chunks.push(buffer.subarray(offset));
      break;
    }

    const marker = buffer[offset + 1];
    // Stop at Start of Scan (SOS 0xDA) or End of Image (EOI 0xD9)
    if (marker === 0xda || marker === 0xd9) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    if (offset + 4 > buffer.length) break;
    const length = buffer.readUInt16BE(offset + 2);
    const segmentEnd = offset + 2 + length;

    // 0xE1 is APP1 (EXIF metadata segment) - skip it
    if (marker === 0xe1) {
      offset = segmentEnd;
      continue;
    }

    // Keep other segments
    chunks.push(buffer.subarray(offset, Math.min(segmentEnd, buffer.length)));
    offset = segmentEnd;
  }

  return Buffer.concat(chunks);
}
