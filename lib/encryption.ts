import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.ENCRYPTION_SECRET || 'default-secret-key-change-in-production-32-chars!!';
const IV_LENGTH = 16; // Para AES, el IV siempre es 16 bytes

/**
 * Genera una clave de 32 bytes a partir del secret
 */
function getKey(): Buffer {
  return crypto.createHash('sha256').update(SECRET_KEY).digest();
}

/**
 * Encripta datos y los devuelve como string base64
 */
export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combinar IV y texto encriptado
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Error encriptando:', error);
    throw new Error('Error al encriptar los datos');
  }
}

/**
 * Desencripta datos desde un string base64
 */
export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Formato de datos encriptados inválido');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const key = getKey();
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error desencriptando:', error);
    throw new Error('Error al desencriptar los datos');
  }
}

