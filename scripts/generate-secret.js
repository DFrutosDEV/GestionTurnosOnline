const crypto = require('crypto');

// Genera una clave secreta aleatoria de 32 bytes (256 bits)
// Esto es perfecto para AES-256
const secret = crypto.randomBytes(32).toString('hex');

console.log('\n🔐 Clave secreta generada:');
console.log('='.repeat(60));
console.log(secret);
console.log('='.repeat(60));
console.log('\n📝 Agrega esto a tu archivo .env.local:');
console.log(`ENCRYPTION_SECRET=${secret}`);
console.log('\n⚠️  IMPORTANTE:');
console.log('   - Guarda esta clave de forma segura');
console.log('   - No la compartas ni la subas a Git');
console.log('   - Úsala en todas tus instancias (desarrollo, producción)\n');

