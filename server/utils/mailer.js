// QQ 邮箱 SMTP 发送（授权码登录）
const nodemailer = require('nodemailer');
const { buildBackupBuffer } = require('./backupExport');

function createTransport(cfg) {
  return nodemailer.createTransport({
    host: 'smtp.qq.com',
    port: 465,
    secure: true, // SSL
    auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
    tls: { rejectUnauthorized: false }
  });
}

// 发送一封测试邮件，验证邮箱/授权码是否正确
async function sendTestMail(cfg) {
  const transporter = createTransport(cfg);
  try {
    await transporter.sendMail({
      from: `"随手记备份" <${cfg.smtp_user}>`,
      to: cfg.to_email,
      subject: '随手记邮件备份 · 测试邮件',
      text: '如果你收到这封邮件，说明 QQ 邮箱与授权码配置正确，定时备份可以正常发送。'
    });
    return { ok: true };
  } finally {
    transporter.close();
  }
}

// 生成备份并发送到邮箱
async function sendBackupMail(cfg, userId, bookId) {
  const { buf, stamp } = buildBackupBuffer(userId, bookId);
  const transporter = createTransport(cfg);
  try {
    const info = await transporter.sendMail({
      from: `"随手记备份" <${cfg.smtp_user}>`,
      to: cfg.to_email,
      subject: `随手记备份 ${stamp}`,
      text: `附件为随手记 ${stamp} 的账本备份文件（.xls），包含支出、收入、余额变更、负债变更、转账 5 个工作表，可直接用于恢复。`,
      attachments: [{ filename: `myMoney-${stamp}.xls`, content: buf }]
    });
    return { ok: true, stamp, size: buf.length, messageId: info.messageId };
  } finally {
    transporter.close();
  }
}

module.exports = { createTransport, sendTestMail, sendBackupMail };
