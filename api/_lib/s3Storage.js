import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

let cachedClient = null;

function getS3Config() {
  const endpoint = String(process.env.S3_ENDPOINT ?? "").trim().replace(/\/+$/, "");
  const bucket = String(process.env.S3_BUCKET ?? "viziom").trim();
  const accessKeyId = String(process.env.S3_ACCESS_KEY ?? "").trim();
  const secretAccessKey = String(process.env.S3_SECRET_KEY ?? "").trim();
  const region = String(process.env.S3_REGION ?? "us-east-1").trim();
  const publicBase = String(process.env.S3_PUBLIC_URL ?? "").trim().replace(/\/+$/, "");

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return { endpoint, bucket, accessKeyId, secretAccessKey, region, publicBase };
}

function getS3Client(config) {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });
  return cachedClient;
}

export function isS3Configured() {
  return getS3Config() !== null;
}

export function buildS3PublicUrl(key) {
  const config = getS3Config();
  if (!config) return null;
  if (config.publicBase) return `${config.publicBase}/${key}`;
  return `${config.endpoint}/${config.bucket}/${key}`;
}

/**
 * @param {string} key
 * @param {Buffer|Uint8Array} body
 * @param {string} contentType
 */
export async function uploadToS3(key, body, contentType) {
  const config = getS3Config();
  if (!config) {
    throw new Error("S3 não configurado (S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY).");
  }

  const client = getS3Client(config);
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType || "application/octet-stream",
    })
  );

  return buildS3PublicUrl(key);
}

export function extensionFromMime(mime, fallback = "bin") {
  const map = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "audio/ogg": "ogg",
    "audio/ogg; codecs=opus": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  };
  const normalized = String(mime ?? "").toLowerCase().split(";")[0].trim();
  return map[normalized] ?? fallback;
}

export function buildMensagemMediaKey({ contaId, cliqueId, messageId, ext }) {
  const safeMessageId = String(messageId ?? "sem-id").replace(/[^a-zA-Z0-9_-]/g, "_");
  return `mensagens/${contaId}/${cliqueId}/${safeMessageId}.${ext}`;
}
