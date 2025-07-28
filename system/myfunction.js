//=========HELO FRIEND==========//
const { extractMessageContent, getDevice, jidNormalizedUser, proto, delay, getContentType, areJidsSameUser, generateWAMessage } = require("@whiskeysockets/baileys")
const chalk = require('chalk')
const fs = require('fs-extra')
const util = require('util')
//=====================//
const unixTimestampSeconds = (date = new Date()) => Math.floor(date.getTime() / 1000)
exports.unixTimestampSeconds = unixTimestampSeconds
exports.generateMessageTag = (epoch) => {
let tag = (0, exports.unixTimestampSeconds)().toString();
if (epoch)
tag += '.--' + epoch; // attach epoch if provided
return tag;
}
//=====================//
exports.runtime = function(seconds) {
seconds = Number(seconds);
const d = Math.floor(seconds / (3600 * 24));
const h = Math.floor((seconds % (3600 * 24)) / 3600);
const m = Math.floor((seconds % 3600) / 60); 
return `${d > 0 ? `${d} hari ` : ""}${h > 0 ? `${h} jam ` : ""}${m > 0 ? `${m} *menit*` : ""}`.trim();
}
//=====================//
exports.jsonformat = (string) => {
return JSON.stringify(string, null, 2)
}
//=====================//
exports.sleep = async (ms) => {
return new Promise(resolve => setTimeout(resolve, ms));
}
exports.isUrl = (url) => {
return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%.+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%+.~#?&/=]*)/, 'gi'))
}
exports.parseMention = (text = '') => {
return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')
}
//=====================//
exports.getGroupAdmins = (participants) => {
let admins = []
for (let i of participants) {
i.admin === "superadmin" ? admins.push(i.id) :i.admin === "admin" ? admins.push(i.id) : ''
}
return admins || []
}
//=====================//
exports.smsg = (conn, m, store) => {
if (!m) return m
let M = proto.WebMessageInfo
if (m.key) {
m.id = m.key.id
m.from = m.key.remoteJid.startsWith('status') ? jidNormalizedUser(m.key?.participant || m.participant) : jidNormalizedUser(m.key.remoteJid);
m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16
m.chat = m.key.remoteJid
m.fromMe = m.key.fromMe
m.isGroup = m.chat.endsWith('@g.us')
m.sender = conn.decodeJid(m.fromMe && conn.user.id || m.participant || m.key.participant || m.chat || '')
if (m.isGroup) m.participant = conn.decodeJid(m.key.participant) || ''
}
//=====================//
if (m.message) {
m.mtype = getContentType(m.message);
m.msg = (m.mtype === 'viewOnceMessage' ? 
m.message[m.mtype]?.message?.[getContentType(m.message[m.mtype]?.message)] : 
m.message[m.mtype]
) || {};
m.body = m.message.conversation || 
 m.msg.caption || 
 m.msg.text || 
 (m.mtype === 'listResponseMessage' && m.msg.singleSelectReply?.selectedRowId) || 
 (m.mtype === 'buttonsResponseMessage' && m.msg.selectedButtonId) || 
 (m.mtype === 'viewOnceMessage' && m.msg.caption) || 
 m.text || '';
let quoted = m.quoted = m.msg?.contextInfo?.quotedMessage || null;
m.mentionedJid = m.msg?.contextInfo?.mentionedJid || [];
if (m.quoted) {
let type = getContentType(quoted);
m.quoted = quoted?.[type] || {};
if (type === 'productMessage') {
type = getContentType(m.quoted);
m.quoted = m.quoted?.[type] || {};
}
if (typeof m.quoted === 'string') {
m.quoted = { text: m.quoted };
}
m.quoted.key = {
remoteJid: m.msg?.contextInfo?.remoteJid || m.chat || "",
participant: jidNormalizedUser(m.msg?.contextInfo?.participant || m.sender || ""),
fromMe: areJidsSameUser(
jidNormalizedUser(m.msg?.contextInfo?.participant || m.sender || ""), 
jidNormalizedUser(conn?.user?.id || "")
),
id: m.msg?.contextInfo?.stanzaId || ""
};
m.quoted.mtype = type;
m.quoted.from = /g\.us|status/.test(m.msg?.contextInfo?.remoteJid || "") 
? m.quoted.key.participant 
: m.quoted.key.remoteJid;
m.quoted.id = m.msg?.contextInfo?.stanzaId || "";
m.quoted.chat = m.msg?.contextInfo?.remoteJid || m.chat || "";
m.quoted.isBaileys = m.quoted.id 
? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 
: false;
m.quoted.sender = conn.decodeJid(m.msg?.contextInfo?.participant || "");
m.quoted.fromMe = m.quoted.sender === (conn.user?.id);
m.quoted.text = m.quoted.text || 
m.quoted.caption || 
m.quoted.conversation || 
m.quoted.contentText || 
m.quoted.selectedDisplayText || 
m.quoted.title || '';
m.quoted.mentionedJid = m.msg?.contextInfo?.mentionedJid || [];
m.getQuotedObj = m.getQuotedMessage = async () => {
if (!m.quoted.id) return false;
let q = await store.loadMessage(m.chat, m.quoted.id, conn);
return exports.smsg(conn, q, store);
};
let vM = m.quoted.fakeObj = M.fromObject({
key: { remoteJid: m.quoted.chat, fromMe: m.quoted.fromMe, id: m.quoted.id },
message: quoted,
...(m.isGroup ? { participant: m.quoted.sender } : {})
});
m.quoted.delete = () => conn.sendMessage(m.quoted.chat, { delete: vM.key });
m.quoted.copyNForward = (jid, forceForward = false, options = {}) => 
conn.copyNForward(jid, vM, forceForward, options);
m.quoted.download = () => conn.downloadMediaMessage(m.quoted);
}
}
//=====================//
if (m.msg.url) m.download = () => conn.downloadMediaMessage(m.msg)
m.text = m.msg.text || m.msg.caption || m.message.conversation || m.msg.contentText || m.msg.selectedDisplayText || m.msg.title || ''
m.reply = (text, chatId = m.chat, options = {}) => Buffer.isBuffer(text) ? conn.sendMedia(chatId, text, 'file', '', m, { ...options }) : conn.sendText(chatId, text, m, { ...options })
m.copy = () => exports.smsg(conn, M.fromObject(M.toObject(m)))
m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => conn.copyNForward(jid, m, forceForward, options)
return m
}