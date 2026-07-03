const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const clients = new Set();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp4": "video/mp4",
  ".md": "text/markdown; charset=utf-8"
};

function safePath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const relativePath = cleanPath === "/" ? "main.html" : cleanPath.replace(/^\/+/, "");
  const fullPath = path.resolve(ROOT, relativePath);
  return fullPath.startsWith(ROOT) ? fullPath : null;
}

const server = http.createServer((request, response) => {
  const filePath = safePath(request.url || "/");

  if (!filePath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extension] || "application/octet-stream";
    const range = request.headers.range;

    if (range) {
      const match = range.match(/bytes=(\d*)-(\d*)/);
      const start = match && match[1] ? Number(match[1]) : 0;
      const end = match && match[2] ? Number(match[2]) : stats.size - 1;

      if (start >= stats.size || end >= stats.size || start > end) {
        response.writeHead(416, { "Content-Range": `bytes */${stats.size}` });
        response.end();
        return;
      }

      response.writeHead(206, {
        "Content-Type": contentType,
        "Content-Length": end - start + 1,
        "Content-Range": `bytes ${start}-${end}/${stats.size}`,
        "Accept-Ranges": "bytes"
      });

      if (request.method === "HEAD") {
        response.end();
        return;
      }

      fs.createReadStream(filePath, { start, end }).pipe(response);
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": stats.size,
      "Accept-Ranges": "bytes"
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    fs.createReadStream(filePath).pipe(response);
  });
});

function acceptKey(key) {
  return crypto
    .createHash("sha1")
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");
}

function encodeFrame(message) {
  const payload = Buffer.from(message);
  const length = payload.length;

  if (length < 126) {
    return Buffer.concat([Buffer.from([0x81, length]), payload]);
  }

  if (length < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
    return Buffer.concat([header, payload]);
  }

  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(length), 2);
  return Buffer.concat([header, payload]);
}

function decodeFrame(buffer) {
  const firstByte = buffer[0];
  const opcode = firstByte & 0x0f;
  if (opcode === 0x08) return null;

  const secondByte = buffer[1];
  const isMasked = Boolean(secondByte & 0x80);
  let length = secondByte & 0x7f;
  let offset = 2;

  if (length === 126) {
    length = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (length === 127) {
    length = Number(buffer.readBigUInt64BE(offset));
    offset += 8;
  }

  const mask = isMasked ? buffer.subarray(offset, offset + 4) : null;
  offset += isMasked ? 4 : 0;

  const payload = buffer.subarray(offset, offset + length);
  if (!isMasked) return payload.toString();

  const decoded = Buffer.alloc(payload.length);
  for (let index = 0; index < payload.length; index += 1) {
    decoded[index] = payload[index] ^ mask[index % 4];
  }
  return decoded.toString();
}

function broadcast(message) {
  const frame = encodeFrame(message);
  for (const client of clients) {
    if (!client.destroyed) client.write(frame);
  }
}

function residentReply(message) {
  try {
    const payload = JSON.parse(message);
    if (payload.type !== "chat" || !payload.text) return null;

    return JSON.stringify({
      type: "chat",
      clientId: "resident-desk",
      author: "Resident Desk",
      text: `Thanks for the update. Resident support received "${String(payload.text).slice(0, 120)}" and will respond shortly.`
    });
  } catch (error) {
    return null;
  }
}

server.on("upgrade", (request, socket) => {
  const key = request.headers["sec-websocket-key"];
  if (!key) {
    socket.destroy();
    return;
  }

  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${acceptKey(key)}`,
    "",
    ""
  ].join("\r\n"));

  clients.add(socket);

  socket.on("data", (buffer) => {
    const message = decodeFrame(buffer);
    if (!message) {
      clients.delete(socket);
      socket.end();
      return;
    }

    broadcast(message);

    const reply = residentReply(message);
    if (reply) broadcast(reply);
  });

  socket.on("close", () => clients.delete(socket));
  socket.on("error", () => clients.delete(socket));
});

server.listen(PORT, () => {
  console.log(`NestIQ server running at http://localhost:${PORT}`);
});
