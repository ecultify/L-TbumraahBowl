// AES/CBC/PKCS5Padding compatible with the provided Java reference
// Key and IV come from the screenshot constants
import crypto from 'crypto';

const KEY_MAIN = (process.env.LTFS_AES_KEY || 'njCYgvluCmiQoeWydE32jjTTrdpB9Wg8');
const IV_VECTOR = (process.env.LTFS_AES_IV || 'VFoEgjZNsT1pAtXS');

const keyBuf = Buffer.from(KEY_MAIN, 'utf8');
const ivBuf = Buffer.from(IV_VECTOR, 'utf8');

// Determine correct AES variant from key length
const algo = keyBuf.length === 32 ? 'aes-256-cbc' : keyBuf.length === 16 ? 'aes-128-cbc' : 'aes-256-cbc';

export function aesEncryptBase64(plaintext: string): string {
  const cipher = crypto.createCipheriv(algo, keyBuf, ivBuf);
  const enc1 = cipher.update(plaintext, 'utf8');
  const enc2 = cipher.final();
  return Buffer.concat([enc1, enc2]).toString('base64');
}

export function aesDecryptBase64(encryptedB64: string): string {
  const data = Buffer.from(encryptedB64, 'base64');
  const decipher = crypto.createDecipheriv(algo, keyBuf, ivBuf);
  const dec1 = decipher.update(data);
  const dec2 = decipher.final();
  return Buffer.concat([dec1, dec2]).toString('utf8');
}
