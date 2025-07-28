//========HELO FRIEND========//
const fs = require("fs-extra");
const toMs = require("ms");
//======================
let premium = [];
try {
premium = JSON.parse(fs.readFileSync("./lib/database/premium.json", "utf8"));
if (!Array.isArray(premium)) throw new Error("The premium.json file must be an array!");
} catch (err) {
console.error("⚠ Failed to read premium.json, using an empty array instead.");
premium = [];
}
const addPremiumUser = (userId, expired, _dir = premium) => {
if (!Array.isArray(_dir)) {
console.error("❌ ERROR: _dir is not an array!");
return false;
}
console.log(`🔹 Menambahkan user ${userId} dengan durasi ${expired}`);
const msTime = toMs(expired);
if (!msTime) {
console.error("❌ Invalid time format! Please use formats like '30d' for 30 days, '7d' for 7 days, or '1h' for 1 hour.");
return false;
}
const cekUser = _dir.find((user) => user.id === userId);
if (cekUser) {
cekUser.expired += msTime;
console.log(`🔄 User already exists. Expiry time has been updated to ${cekUser.expired}`);
} else {
const obj = { id: userId, expired: Date.now() + msTime };
_dir.push(obj);
console.log(`✅ New user added: ${JSON.stringify(obj)}`);
}
try {
fs.writeFileSync("./lib/database/premium.json", JSON.stringify(_dir, null, 2));
console.log("📝 Database premium diperbarui!");
} catch (error) {
console.error("❌ Failed to save premium.json:", error);
return false;
}
return true;
};;
const getPremiumPosition = (userId, _dir) => {
return _dir.findIndex((user) => user.id === userId);
};
const getPremiumExpired = (userId, _dir) => {
const user = _dir.find((u) => u.id === userId);
return user ? user.expired : null;
};
const checkPremiumUser = (userId, _dir) => {
return _dir.some((user) => user.id === userId);
};
const expiredCheck = (conn, _dir) => {
setInterval(() => {
_dir.forEach((user, index) => {
if (Date.now() >= user.expired) {
console.log(`🔥 Premium expired: ${user.id}`);
_dir.splice(index, 1);
fs.writeFileSync("./lib/database/premium.json", JSON.stringify(_dir, null, 2));
conn.sendMessage(user.id, { text: "Your premium has expired, please purchase again." });
}
});
}, 1000);
};
//======================
const delPremiumUser = (userId, _dir = premium) => {
if (!Array.isArray(_dir)) {
console.error("❌ ERROR: _dir bukan array!");
return false;
}
let index = _dir.findIndex(user => user.id === userId);
if (index !== -1) {
_dir.splice(index, 1);
try {
fs.writeFileSync("./lib/database/premium.json", JSON.stringify(_dir, null, 2));
console.log(`✅ Removed Premium: ${userId}`);
return true;
} catch (error) {
console.error("❌ Failed to save premium.json:", error);
return false;
}
}
return false;
};
const getAllPremiumUser = (_dir) => {
return _dir.map((user) => user.id);
};
//======================
module.exports = {
addPremiumUser,
getPremiumExpired,
getPremiumPosition,
delPremiumUser,
expiredCheck,
checkPremiumUser,
getAllPremiumUser,
};