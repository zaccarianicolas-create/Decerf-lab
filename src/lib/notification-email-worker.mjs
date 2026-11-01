const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

export async function processNotificationEmails({ rpc, send, appUrl, from }) {
  const jobs = await rpc("claim_notification_emails", { p_limit: 20 });
  const result = { claimed: jobs.length, sent: 0, skipped: 0, errors: 0 };
  for (const job of jobs) {
    try {
      const payload = await rpc("notification_email_payload", { p_job_id: job.id });
      if (!payload) {
        await rpc("finish_notification_email", { p_job_id: job.id, p_lease_id: job.lease_id, p_skipped: true });
        result.skipped++;
        continue;
      }
      const path = payload.path.startsWith("/") && !payload.path.startsWith("//") ? payload.path : "/";
      const url = `${appUrl.replace(/\/$/, "")}${path}`;
      const settings = payload.path.startsWith("/atelier") ? "/atelier/parametres" : payload.path.startsWith("/admin") ? "/admin/parametres" : "/dashboard/profil";
      const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f3f6f8;font-family:Helvetica,Arial,sans-serif;color:#182332"><div style="max-width:600px;margin:24px auto;padding:24px;background:white;border:1px solid #dfe7ed"><img src="${escape(appUrl)}/images/logodecerflabslogan.png" width="260" alt="DECERF LAB" style="max-width:100%;height:auto"><h1 style="font-size:22px">${escape(payload.title)}</h1><p style="white-space:pre-wrap;line-height:1.6">${escape(payload.message)}</p><p><a href="${escape(url)}" style="color:#0369a1">Consulter dans mon espace</a></p><p style="font-size:12px"><a href="${escape(appUrl + settings)}">Mes préférences email</a></p></div></body></html>`;
      const response = await send({ from, to: payload.email, subject: payload.title, html,
        text: `${payload.title}\n\n${payload.message}\n\n${url}` }, `notification-${job.id}`);
      await rpc("finish_notification_email", { p_job_id: job.id, p_lease_id: job.lease_id, p_provider_id: response.id });
      result.sent++;
    } catch (error) {
      result.errors++;
      await rpc("finish_notification_email", { p_job_id: job.id, p_lease_id: job.lease_id,
        p_error: error instanceof Error ? error.message : "Email delivery failed" });
    }
  }
  return result;
}