// @ts-ignore
import CryptoJS from 'crypto-js';

const SECRET_KEY = 'MAJ_GLC_SIM_2026_SECRET_KEY_WELD';
const IV_SALT = 'GLC_IV_SALT_2026';

// Derive 128-bit key and IV matching backend SHA-256 slice(0, 16)
const keyHex = CryptoJS.SHA256(SECRET_KEY).toString().substring(0, 32);
const key = CryptoJS.enc.Hex.parse(keyHex);

const ivHex = CryptoJS.SHA256(IV_SALT).toString().substring(0, 32);
const iv = CryptoJS.enc.Hex.parse(ivHex);

/**
 * Encrypt a numeric simulation ID to a URL-safe encrypted string
 */
export const encryptId = (id: number | string | null | undefined): string => {
  if (id === undefined || id === null || id === '') return '';
  try {
    const encrypted = CryptoJS.AES.encrypt(String(id), key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    // Convert standard base64 to url-safe base64
    return encrypted.toString()
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (err) {
    console.error('Failed to encrypt ID:', err);
    return String(id);
  }
};

/**
 * Decrypt a URL-safe encrypted ID back to a numeric ID.
 * Supports fallback if already numeric.
 */
export const decryptId = (encryptedId: string | number | null | undefined): number | null => {
  if (encryptedId === undefined || encryptedId === null || encryptedId === '') return null;
  const str = String(encryptedId).trim();
  
  // If already pure integer, return directly (backward compatibility)
  if (/^\d+$/.test(str)) {
    return parseInt(str, 10);
  }
  
  try {
    // Convert url-safe base64 back to normal base64
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const decrypted = CryptoJS.AES.decrypt(base64, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    const resultStr = decrypted.toString(CryptoJS.enc.Utf8);
    if (/^\d+$/.test(resultStr)) {
      return parseInt(resultStr, 10);
    }
    return null;
  } catch (err) {
    console.error('Failed to decrypt ID:', err);
    return null;
  }
};
