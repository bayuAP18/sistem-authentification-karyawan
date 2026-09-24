import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { Sequelize, DataTypes, Op } from "sequelize";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ════════════════════════════════════════════════════════════════════════════
// DATABASE — Sequelize + MySQL (auto-connect + auto table creation)
// ════════════════════════════════════════════════════════════════════════════

const sequelize = new Sequelize("webauth", "root", "", {
  host: "localhost",
  dialect: "mysql",
  timezone: "+07:00",
  logging: false,
  define: {
    timestamps: false,
    underscored: true,
  },
});

// ── Model: User ─────────────────────────────────────────────────────────────
const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    employee_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM("admin", "employee"),
      defaultValue: "employee",
    },
    fingerprint_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    passkey_reset: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  { tableName: "users" },
);

// ── Model: Passkey ───────────────────────────────────────────────────────────
const Passkey = sequelize.define(
  "Passkey",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    credential_id: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: true,
    },
    credential_public_key: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },
    counter: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    device_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    backed_up: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    transports: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    fingerprint_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    last_used: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  { tableName: "passkeys" },
);

// ── Model: Attendance ────────────────────────────────────────────────────────
const Attendance = sequelize.define(
  "Attendance",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("checkin", "checkout"),
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    fingerprint_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  { tableName: "attendances" },
);

// Relasi
User.hasMany(Passkey, {
  foreignKey: "user_id",
  as: "passkeys",
  onDelete: "CASCADE",
});
Passkey.belongsTo(User, { foreignKey: "user_id", as: "user" });
User.hasMany(Attendance, {
  foreignKey: "user_id",
  as: "attendances",
  onDelete: "CASCADE",
});
Attendance.belongsTo(User, { foreignKey: "user_id", as: "user" });

// ════════════════════════════════════════════════════════════════════════════
// EXPRESS SETUP
// ════════════════════════════════════════════════════════════════════════════

const app = express();
app.set("trust proxy", 1);
app.use(express.json());

// Routes eksplisit halaman
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});
app.get("/user", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "user.html"));
});

app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "webauthn-super-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 }, // 1 jam
  }),
);

// ── Config ───────────────────────────────────────────────────────────────────
const RP_NAME = "WebAuthn Fingerprint Demo";
const ADMIN_PASSWORD = "admin123";

// RP_ID = hostname tanpa port (misal: localhost, abc.trycloudflare.com)
// ORIGIN = scheme + host lengkap (misal: http://localhost:3000, https://abc.trycloudflare.com)
function getRpId(req) {
  const host =
    req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  return host.split(":")[0]; // buang port
}
function getOrigin(req) {
  const proto =
    req.headers["x-forwarded-proto"] || (req.secure ? "https" : "http");
  const host =
    req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  return `${proto}://${host}`;
}

// ════════════════════════════════════════════════════════════════════════════
// WEBSOCKET SERVER (real-time attendance broadcast)
// ════════════════════════════════════════════════════════════════════════════

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

// Kirim pesan ke semua client yang terkoneksi
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1 /* OPEN */) {
      client.send(msg);
    }
  });
}

wss.on("connection", (ws, req) => {
  console.log("[WS] Client terhubung");
  ws.send(
    JSON.stringify({ type: "connected", message: "WebSocket terhubung" }),
  );
  ws.on("close", () => console.log("[WS] Client terputus"));
  ws.on("error", (err) => console.error("[WS] Error:", err.message));
});

// ════════════════════════════════════════════════════════════════════════════
// REGISTRATION ROUTES
// ════════════════════════════════════════════════════════════════════════════

app.post("/auth/register/begin", async (req, res) => {
  const { employee_id } = req.body;
  if (!employee_id) return res.status(400).json({ error: "ID Karyawan wajib diisi" });

  let user = await User.findOne({ where: { employee_id } });
  if (!user) {
    user = await User.create({ employee_id, name: employee_id, role: "employee" });
  }

  if (user.passkey_reset) {
    return res
      .status(403)
      .json({
        error: "Passkey perlu di-reset oleh administrator terlebih dahulu",
      });
  }

  const existingPasskeys = await Passkey.findAll({
    where: { user_id: user.id },
  });

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getRpId(req),
    userID: Buffer.from(user.id),
    userName: user.employee_id,
    userDisplayName: user.name || user.employee_id,
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred",
    },
    excludeCredentials: existingPasskeys.map((pk) => ({
      id: Buffer.from(pk.credential_id, "base64url"),
      type: "public-key",
      transports: Array.isArray(pk.transports) ? pk.transports : [],
    })),
    attestation: "none",
  });

  req.session.registrationChallenge = options.challenge;
  req.session.registrationUserId = user.id;
  res.json(options);
});

app.post("/auth/register/complete", async (req, res) => {
  const { body } = req;
  const expectedChallenge = req.session.registrationChallenge;
  const userId = req.session.registrationUserId;

  if (!expectedChallenge || !userId) {
    return res
      .status(400)
      .json({ error: "Sesi tidak valid, mulai ulang registrasi" });
  }

  let verified;
  try {
    verified = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: getOrigin(req),
      expectedRPID: getRpId(req),
      requireUserVerification: true,
    });
  } catch (err) {
    console.error("Registration verification error:", err);
    return res.status(400).json({ error: err.message });
  }

  if (!verified.verified) {
    return res.status(400).json({ error: "Verifikasi fingerprint gagal" });
  }

  const { registrationInfo } = verified;
  const fingerprintId = req.body.fingerprintId || null;

  await Passkey.create({
    user_id: userId,
    credential_id: Buffer.from(registrationInfo.credentialID).toString(
      "base64url",
    ),
    credential_public_key: Buffer.from(
      registrationInfo.credentialPublicKey,
    ).toString("base64"),
    counter: registrationInfo.counter,
    device_type: registrationInfo.credentialDeviceType,
    backed_up: registrationInfo.credentialBackedUp,
    transports: Array.isArray(body.response?.transports)
      ? body.response.transports
      : [],
    fingerprint_id: fingerprintId,
  });

  // Set fingerprint_id ke user jika belum ada
  if (fingerprintId) {
    const user = await User.findByPk(userId);
    if (user && !user.fingerprint_id) {
      await user.update({ fingerprint_id: fingerprintId });
    }
  }

  delete req.session.registrationChallenge;
  delete req.session.registrationUserId;

  const user = await User.findByPk(userId);
  res.json({
    ok: true,
    message: `Fingerprint berhasil didaftarkan untuk ${user.employee_id}!`,
  });
});

// ════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION ROUTES
// ════════════════════════════════════════════════════════════════════════════

app.post("/auth/login/begin", async (req, res) => {
  const { employee_id } = req.body;
  if (!employee_id) return res.status(400).json({ error: "ID Karyawan wajib diisi" });

  const user = await User.findOne({ where: { employee_id } });
  if (!user) return res.status(404).json({ error: "ID Karyawan tidak ditemukan" });

  const passkeys = await Passkey.findAll({ where: { user_id: user.id } });
  if (passkeys.length === 0) {
    return res
      .status(400)
      .json({ error: "Belum ada fingerprint terdaftar untuk user ini" });
  }

  const options = await generateAuthenticationOptions({
    rpID: getRpId(req),
    userVerification: "required",
    allowCredentials: passkeys.map((pk) => ({
      id: Buffer.from(pk.credential_id, "base64url"),
      type: "public-key",
      transports: Array.isArray(pk.transports) ? pk.transports : [],
    })),
  });

  req.session.authChallenge = options.challenge;
  req.session.authUserId = user.id;
  res.json(options);
});

app.post("/auth/login/complete", async (req, res) => {
  const { body } = req;
  const expectedChallenge = req.session.authChallenge;
  const userId = req.session.authUserId;

  if (!expectedChallenge || !userId) {
    return res
      .status(400)
      .json({ error: "Sesi tidak valid, mulai ulang login" });
  }

  const credentialId = body.id;
  const passkey = await Passkey.findOne({
    where: { credential_id: credentialId },
  });
  if (!passkey) {
    return res.status(400).json({ error: "Passkey tidak ditemukan" });
  }

  let authVerified;
  try {
    authVerified = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: getOrigin(req),
      expectedRPID: getRpId(req),
      authenticator: {
        credentialID: Buffer.from(passkey.credential_id, "base64url"),
        credentialPublicKey: Buffer.from(
          passkey.credential_public_key,
          "base64",
        ),
        counter: passkey.counter,
        transports: Array.isArray(passkey.transports) ? passkey.transports : [],
      },
      requireUserVerification: true,
    });
  } catch (err) {
    console.error("Authentication verification error:", err);
    return res.status(400).json({ error: err.message });
  }

  if (!authVerified.verified) {
    return res.status(401).json({ error: "Autentikasi fingerprint gagal" });
  }

  // Update counter
  await passkey.update({
    counter: authVerified.authenticationInfo.newCounter,
    last_used: new Date(),
  });

  // Cek FingerprintJS device match
  const currentFpId = req.body.fingerprintId || null;
  let deviceWarning = null;
  if (currentFpId && passkey.fingerprint_id) {
    if (currentFpId !== passkey.fingerprint_id) {
      deviceWarning = "BEDA_DEVICE";
    }
  }

  delete req.session.authChallenge;
  delete req.session.authUserId;
  req.session.loggedInUserId = userId;

  const user = await User.findByPk(userId);
  res.json({
    ok: true,
    deviceWarning,
    message: deviceWarning
      ? `Perangkat berbeda terdeteksi! Silakan hubungi administrator untuk reset passkey jika ini bukan Anda.`
      : `Selamat datang, ${user.employee_id}! Login berhasil via fingerprint`,
    user: {
      id: user.id,
      employee_id: user.employee_id,
      name: user.name,
      role: user.role,
    },
  });
});

app.get("/auth/me", async (req, res) => {
  if (!req.session.loggedInUserId) {
    return res.status(401).json({ loggedIn: false });
  }
  const user = await User.findByPk(req.session.loggedInUserId);
  if (!user) return res.status(401).json({ loggedIn: false });
  const passkeyCount = await Passkey.count({ where: { user_id: user.id } });
  res.json({
    loggedIn: true,
    user: {
      id: user.id,
      employee_id: user.employee_id,
      name: user.name,
      role: user.role,
      fingerprint_id: user.fingerprint_id,
      created_at: user.created_at,
      passkeyCount,
    },
  });
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ════════════════════════════════════════════════════════════════════════════

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin)
    return res
      .status(401)
      .json({ error: "Akses ditolak. Login sebagai admin." });
  next();
}

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: "Password admin salah" });
  }
});

app.post("/api/admin/logout", (req, res) => {
  delete req.session.isAdmin;
  res.json({ ok: true });
});

app.get("/api/admin/me", (req, res) => {
  res.json({ isAdmin: !!req.session.isAdmin });
});

app.get("/api/admin/employees", requireAdmin, async (req, res) => {
  const employees = await User.findAll({
    where: { role: { [Op.ne]: "admin" } },
    include: [{ model: Passkey, as: "passkeys" }],
  });
  res.json(
    employees.map((u) => {
      const pks = u.passkeys || [];
      return {
        id: u.id,
        employee_id: u.employee_id,
        name: u.name,
        role: u.role,
        fingerprint_id: u.fingerprint_id,
        passkey_reset: u.passkey_reset,
        created_at: u.created_at,
        passkeys: pks.map((pk) => ({
          id: pk.id,
          credential_id: pk.credential_id,
          device_type: pk.device_type,
          fingerprint_id: pk.fingerprint_id,
          created_at: pk.created_at,
          last_used: pk.last_used,
        })),
        passkeyCount: pks.length,
      };
    }),
  );
});

app.post("/api/admin/employees", requireAdmin, async (req, res) => {
  const { employee_id, name } = req.body;
  if (!employee_id) return res.status(400).json({ error: "ID Karyawan wajib diisi" });

  const existing = await User.findOne({ where: { employee_id } });
  if (existing)
    return res.status(409).json({ error: "ID Karyawan sudah dipakai" });

  const user = await User.create({
    employee_id,
    name: name || employee_id,
    role: "employee",
  });
  res.json({ ok: true, user });
});

app.put("/api/admin/employees/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, employee_id } = req.body;
  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

  if (employee_id && employee_id !== user.employee_id) {
    const dup = await User.findOne({ where: { employee_id } });
    if (dup) return res.status(409).json({ error: "ID Karyawan sudah dipakai" });
  }

  await user.update({
    ...(name ? { name } : {}),
    ...(employee_id ? { employee_id } : {}),
  });
  res.json({ ok: true, user });
});

app.delete("/api/admin/passkeys/:passkeyId", requireAdmin, async (req, res) => {
  const { passkeyId } = req.params;
  const passkey = await Passkey.findByPk(passkeyId);
  if (!passkey)
    return res.status(404).json({ error: "Passkey tidak ditemukan" });

  const userId = passkey.user_id;
  await passkey.destroy();

  // Jika tidak ada passkey lagi, reset fingerprint_id user
  const remaining = await Passkey.count({ where: { user_id: userId } });
  if (remaining === 0) {
    await User.update({ fingerprint_id: null }, { where: { id: userId } });
  }

  res.json({ ok: true });
});

app.post(
  "/api/admin/employees/:id/reset-passkey",
  requireAdmin,
  async (req, res) => {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

    await Passkey.destroy({ where: { user_id: id } });
    await user.update({ fingerprint_id: null, passkey_reset: false });

    res.json({
      ok: true,
      message: "Passkey berhasil di-reset. Karyawan dapat daftar ulang.",
    });
  },
);

app.delete("/api/admin/employees/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ error: "User tidak ditemukan" });
  if (user.role === "admin")
    return res.status(403).json({ error: "Tidak bisa hapus admin" });

  await Passkey.destroy({ where: { user_id: id } });
  await Attendance.destroy({ where: { user_id: id } });
  await user.destroy();
  res.json({ ok: true });
});

app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  const totalEmployees = await User.count({
    where: { role: { [Op.ne]: "admin" } },
  });
  const totalPasskeys = await Passkey.count();

  // Karyawan yang sudah punya passkey
  const usersWithPasskey = await User.findAll({
    where: { role: { [Op.ne]: "admin" } },
    include: [{ model: Passkey, as: "passkeys", required: true }],
  });

  res.json({
    totalEmployees,
    totalPasskeys,
    withPasskey: usersWithPasskey.length,
    withoutPasskey: totalEmployees - usersWithPasskey.length,
  });
});

// Admin: daftar absensi semua karyawan (untuk dashboard admin)
app.get("/api/admin/attendances", requireAdmin, async (req, res) => {
  const { date } = req.query;
  const where = date ? { date } : {};
  const records = await Attendance.findAll({
    where,
    include: [
      { model: User, as: "user", attributes: ["id", "employee_id", "name"] },
    ],
    order: [["time", "DESC"]],
  });
  res.json(records);
});

// Admin: laporan absensi dengan filter tanggal range
app.get("/api/admin/report", requireAdmin, async (req, res) => {
  const { from, to } = req.query;
  const where = {};
  if (from && to) {
    where.date = { [Op.between]: [from, to] };
  } else if (from) {
    where.date = { [Op.gte]: from };
  } else if (to) {
    where.date = { [Op.lte]: to };
  }

  const records = await Attendance.findAll({
    where,
    include: [
      { model: User, as: "user", attributes: ["id", "employee_id", "name"] },
    ],
    order: [
      ["date", "ASC"],
      ["time", "ASC"],
    ],
  });

  // Kelompokkan: per user per tanggal → checkin & checkout
  const map = {};
  for (const rec of records) {
    const key = `${rec.user_id}_${rec.date}`;
    if (!map[key]) {
      map[key] = {
        userId: rec.user_id,
        employee_id: rec.user?.employee_id || "",
        name: rec.user?.name || "",
        date: rec.date,
        checkin: null,
        checkout: null,
      };
    }
    if (rec.type === "checkin") map[key].checkin = rec.time;
    else map[key].checkout = rec.time;
  }

  res.json(
    Object.values(map).sort((a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      return (a.name || a.employee_id).localeCompare(b.name || b.employee_id);
    }),
  );
});

// ════════════════════════════════════════════════════════════════════════════
// IDENTIFY
// ════════════════════════════════════════════════════════════════════════════

app.post("/auth/identify", async (req, res) => {
  const { employee_id } = req.body;
  if (!employee_id)
    return res.status(400).json({ error: "ID Karyawan wajib diisi" });

  const user = await User.findOne({ where: { employee_id } });
  if (!user)
    return res
      .status(404)
      .json({
        error: "ID Karyawan tidak ditemukan. Hubungi administrator.",
      });
  if (user.role === "admin")
    return res.status(403).json({ error: "Akses ditolak" });

  const passkeys = await Passkey.findAll({ where: { user_id: user.id } });
  const hasPasskey = passkeys.length > 0;

  req.session.identifiedUserId = user.id;

  res.json({
    ok: true,
    hasPasskey,
    user: { id: user.id, employee_id: user.employee_id, name: user.name },
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ATTENDANCE ROUTES (WIB / GMT+7)
// ════════════════════════════════════════════════════════════════════════════

// Helper: ambil tanggal YYYY-MM-DD sesuai zona waktu WIB (Asia/Jakarta)
function getWIBDate(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    d,
  );
}

app.get("/attendance/today", async (req, res) => {
  const userId = req.session.loggedInUserId;
  if (!userId) return res.status(401).json({ error: "Belum login" });

  const today = getWIBDate();
  const records = await Attendance.findAll({
    where: { user_id: userId, date: today },
  });

  const checkIn = records.find((a) => a.type === "checkin") || null;
  const checkOut = records.find((a) => a.type === "checkout") || null;

  res.json({ date: today, checkIn, checkOut });
});

app.post("/attendance/checkin", async (req, res) => {
  const userId = req.session.loggedInUserId;
  if (!userId) return res.status(401).json({ error: "Belum login" });

  const today = getWIBDate();
  const alreadyIn = await Attendance.findOne({
    where: { user_id: userId, date: today, type: "checkin" },
  });
  if (alreadyIn)
    return res
      .status(409)
      .json({ error: "Anda sudah check-in hari ini", record: alreadyIn });

  const record = await Attendance.create({
    user_id: userId,
    type: "checkin",
    date: today,
    time: new Date(),
    fingerprint_id: req.body.fingerprintId || null,
  });

  // Broadcast ke semua WebSocket client
  const user = await User.findByPk(userId, {
    attributes: ["employee_id", "name"],
  });
  broadcast({
    type: "attendance_update",
    action: "checkin",
    userId,
    user: { employee_id: user.employee_id, name: user.name },
    date: today,
    time: record.time,
  });

  res.json({ ok: true, record });
});

app.post("/attendance/checkout", async (req, res) => {
  const userId = req.session.loggedInUserId;
  if (!userId) return res.status(401).json({ error: "Belum login" });

  const today = getWIBDate();
  const checkIn = await Attendance.findOne({
    where: { user_id: userId, date: today, type: "checkin" },
  });
  if (!checkIn)
    return res.status(400).json({ error: "Anda belum check-in hari ini" });

  const alreadyOut = await Attendance.findOne({
    where: { user_id: userId, date: today, type: "checkout" },
  });
  if (alreadyOut)
    return res
      .status(409)
      .json({ error: "Anda sudah check-out hari ini", record: alreadyOut });

  const record = await Attendance.create({
    user_id: userId,
    type: "checkout",
    date: today,
    time: new Date(),
    fingerprint_id: req.body.fingerprintId || null,
  });

  // Broadcast ke semua WebSocket client
  const user = await User.findByPk(userId, {
    attributes: ["employee_id", "name"],
  });
  broadcast({
    type: "attendance_update",
    action: "checkout",
    userId,
    user: { employee_id: user.employee_id, name: user.name },
    date: today,
    time: record.time,
  });

  res.json({ ok: true, record });
});

// ════════════════════════════════════════════════════════════════════════════
// SEED DEFAULT ADMIN + DB SYNC + START SERVER
// ════════════════════════════════════════════════════════════════════════════

async function ensureDefaultAdmin() {
  const adminExists = await User.findOne({ where: { role: "admin" } });
  if (!adminExists) {
    await User.create({
      employee_id: "admin",
      name: "Administrator",
      role: "admin",
    });
    console.log("✅ Default admin user created (ID Karyawan: admin)");
  }
}

const PORT = 3000;

sequelize
  .authenticate()
  .then(() => {
    console.log("✅ Koneksi MySQL berhasil");
    return sequelize.sync({ alter: true });
  })
  .then(async () => {
    console.log("✅ Tabel tersinkronisasi (alter)");
    await ensureDefaultAdmin();
    httpServer.listen(PORT, () => {
      console.log(`✅ Server berjalan di http://localhost:${PORT}`);
      console.log(`   WebSocket aktif di ws://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Gagal koneksi ke MySQL:", err.message);
    console.error("   Detail:", err);
    console.error(
      '   Pastikan MySQL berjalan dan database "webauth" sudah dibuat.',
    );
    process.exit(1);
  });
