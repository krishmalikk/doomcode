/**
 * Encode a Uint8Array to a Base64 string.
 */
export function encodeBase64(data: Uint8Array): string {
  return Buffer.from(data).toString('base64');
}

/**
 * Decode a Base64 string to a Uint8Array.
 */
export function decodeBase64(data: string): Uint8Array {
  return new Uint8Array(Buffer.from(data, 'base64'));
}

/**
 * Encode a string to Uint8Array (UTF-8).
 */
export function encodeUTF8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Decode a Uint8Array to a string (UTF-8).
 */
export function decodeUTF8(data: Uint8Array): string {
  return new TextDecoder().decode(data);
}
