// 定时邮件备份调度器：每 30 秒扫描一次启用的配置，按频率+时间触发
const { db } = require('../db');
const { sendBackupMail } = require('./mailer');

let timer = null;
const pad = n => String(n).padStart(2, '0');

function dateMatch(cfg, now) {
  switch (cfg.frequency) {
    case 'weekly': return now.getDay() === Number(cfg.weekday); // 0=周日
    case 'monthly': return now.getDate() === Number(cfg.month_day);
    case 'yearly': return (now.getMonth() + 1) === Number(cfg.month) && now.getDate() === Number(cfg.year_day);
    default: return true; // daily
  }
}

function checkAndSend() {
  const now = new Date();
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const curMin = now.getHours() * 60 + now.getMinutes();
  let configs = [];
  try {
    configs = db.prepare('SELECT * FROM email_backup_settings WHERE enabled=1').all();
  } catch (e) {
    console.error('[邮件备份] 读取配置失败:', e.message);
    return;
  }
  for (const cfg of configs) {
    if (!cfg.smtp_user || !cfg.smtp_pass || !cfg.to_email) continue;
    if (!dateMatch(cfg, now)) continue;
    const [sh, sm] = String(cfg.send_time || '09:00').split(':').map(Number);
    if (curMin < sh * 60 + sm) continue; // 未到发送时间
    const key = `${today} ${pad(sh)}:${pad(sm)}`;
    if (cfg.last_sent_key === key) continue; // 本周期已发过
    // 先占位，防止并发/重启重复发送
    db.prepare('UPDATE email_backup_settings SET last_sent_key=? WHERE user_id=?').run(key, cfg.user_id);
    sendBackupMail(cfg, cfg.user_id, cfg.book_id)
      .then(r => console.log(`[邮件备份] 用户${cfg.user_id} 已发送备份 ${r.stamp}（${r.size} bytes）`))
      .catch(e => console.error(`[邮件备份] 用户${cfg.user_id} 发送失败:`, e.message));
  }
}

function startBackupScheduler() {
  if (timer) return;
  timer = setInterval(checkAndSend, 30 * 1000);
  setTimeout(checkAndSend, 8000); // 启动后先检查一次
  console.log('[邮件备份] 定时调度器已启动');
}

module.exports = { startBackupScheduler, checkAndSend };
