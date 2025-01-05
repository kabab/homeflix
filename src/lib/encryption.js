
const crypto = require("crypto");

// Generate a random key and IV (in practice, store the key securely!)
const algorithm = "aes-256-cbc";
const key = crypto.randomBytes(32); // 256-bit key
const iv = crypto.randomBytes(16); // Initialization vector (16 bytes for AES)

module.exports.encrypt = function encrypt(text) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return { encryptedData: encrypted, iv: iv.toString("hex") };
}

module.exports.decrypt = function decrypt(encryptedData, ivHex = iv.toString("hex")) {
  const decipher = crypto.createDecipheriv(
    algorithm,
    key,
    Buffer.from(ivHex, "hex")
  );
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

module.exports.generateHashFromObject = function generateHashFromObject(obj) {
  // Serialize the object to a JSON string
  const jsonString = JSON.stringify(obj, Object.keys(obj).sort());

  // Create a hash (e.g., SHA-256)
  const hash = crypto.createHash("sha256").update(jsonString).digest("hex");

  return hash;
};