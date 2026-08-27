'use strict';

/* ---------------------------------------------------------------- utils */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let toastTimer = null;
function toast(message, kind = 'ok', ms = 5200) {
  const el = $('#toast');
  el.className = `show ${kind}`;
  el.innerHTML = esc(message).replace(/\n/g, '<br>');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; }, ms);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let payload = null;
  try { payload = await response.json(); } catch { /* corpo vazio */ }
  if (!response.ok) {
    throw new Error(payload?.detail || `HTTP ${response.status}`);
  }
  return payload;
}

function scoreClass(rec) {
  if (!rec) return 'score-nao';
  if (rec.startsWith('EXCELENTE')) return 'score-excelente';
  if (rec.startsWith('MUITO')) return 'score-muito';
  if (rec.startsWith('BOA')) return 'score-boa';
  if (rec.startsWith('STRETCH')) return 'score-stretch';
  return 'score-nao';
}

function recencyPill(job) {
  const map = { excellent: 'fresh', good: 'fresh', acceptable: 'ok', low: 'old', unknown: 'unknown' };
  const cls = map[job.recency] || 'unknown';
  const label = job.posted_at === 'desconhecida'
    ? 'desconhecida'
    : `${job.posted_at}${job.recency_days != null ? ` · ${job.recency_days}d` : ''}`;
  return `<span class="pill ${cls}">${esc(label)}</span>`;
}

function barList(items, containerId, unit = '') {
  const container = $(containerId);
  if (!items || !items.length) { container.innerHTML = '<p class="muted small">Sem dados ainda.</p>'; return; }
  const max = Math.max(...items.map((i) => i[1])) || 1;
  container.innerHTML = `<div class="bars">${items.map(([label, value]) => `
    <div class="bar-row">
      <span class="small" title="${esc(label)}">${esc(label)}</span>
      <div class="bar"><div style="width:${(value / max) * 100}%"></div></div>
      <span class="small muted">${value}${unit}</span>
    </div>`).join('')}</div>`;
}

/* ------------------------------------------------------------ navigation */
$$('nav button').forEach((button) => {
  button.addEventListener('click', () => {
    $$('nav button').forEach((b) => b.classList.remove('active'));
    $$('.view').forEach((v) => v.classList.remove('active'));
    button.classList.add('active');
    $(`#view-${button.dataset.view}`).classList.add('active');
    LOADERS[button.dataset.view]?.();
  });
});

function closeModal() { $('#modal').classList.remove('open'); }
$('#modal').addEventListener('click', (event) => {
  if (event.target.id === 'modal') closeModal();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

/* ------------------------------------------------------------------ jobs */
async function loadJobCards() {
  const data = await api('/api/metrics');
  const o = data.overview;
  $('#job-cards').innerHTML = [
    ['info', o.new_jobs, 'Novas'],
    ['good', o.excellent_jobs, 'Excelentes'],
    ['good', o.very_good_jobs, 'Muito boas'],
    ['warn', o.to_review, 'Para revisar'],
    ['info', o.approved, 'Aprovadas'],
    ['info', o.ready_to_apply, 'Prontas'],
    ['', o.applications_sent, 'Aplicadas'],
    ['', o.duplicates, 'Duplicatas'],
  ].map(([cls, value, label]) =>
    `<div class="card ${cls}"><div class="value">${value}</div><div class="label">${label}</div></div>`
  ).join('');
}

async function loadJobs() {
  const params = new URLSearchParams({ limit: '200' });
  const status = $('#filter-status').value;
  const rec = $('#filter-rec').value;
  const score = $('#filter-score').value;
  const search = $('#filter-search').value.trim();
  if (status) params.set('status', status);
  if (rec) params.set('recommendation', rec);
  if (score) params.set('min_score', score);
  if (search) params.set('search', search);
  if ($('#filter-dups').checked) params.set('include_duplicates', 'true');

  const body = $('#jobs-body');
  body.innerHTML = '<tr><td colspan="8" class="muted">Carregando…</td></tr>';
  try {
    const data = await api(`/api/jobs?${params}`);
    if (!data.jobs.length) {
      body.innerHTML = '<tr><td colspan="8" class="muted">Nenhuma vaga encontrada. '
        + 'Clique em “Buscar vagas agora” ou importe uma manualmente.</td></tr>';
      return;
    }
    body.innerHTML = data.jobs.map((job) => `
      <tr>
        <td><span class="score ${scoreClass(job.recommendation)}">${job.fit_score.toFixed(0)}</span></td>
        <td>
          <div><strong>${esc(job.title)}</strong>${job.is_stretch ? ' <span class="tag flag">stretch</span>' : ''}</div>
          <div class="small muted">${esc(job.recommendation)} · ${esc(job.source)}
            ${job.duplicate_of_id ? ` · dup. de #${job.duplicate_of_id}` : ''}</div>
          ${job.filter_flags.length ? `<div>${job.filter_flags.slice(0, 3).map((f) => `<span class="tag flag">${esc(f)}</span>`).join('')}</div>` : ''}
        </td>
        <td>${esc(job.company)}<div class="small muted">${esc(job.location || '—')}</div></td>
        <td>${recencyPill(job)}</td>
        <td class="small">${esc(job.remote)}</td>
        <td class="small">${esc(job.seniority)}</td>
        <td class="small">${esc(job.status)}</td>
        <td>
          <button class="btn" data-detail="${job.id}">Analisar</button>
          <a class="btn" href="${esc(job.url)}" target="_blank" rel="noopener"
             style="display:inline-block;text-decoration:none">Ver vaga</a>
        </td>
      </tr>`).join('');
    $$('[data-detail]').forEach((b) =>
      b.addEventListener('click', () => showJob(b.dataset.detail)));
  } catch (err) {
    body.innerHTML = `<tr><td colspan="8" class="danger-box">${esc(err.message)}</td></tr>`;
  }
}

async function showJob(jobId) {
  const job = await api(`/api/jobs/${jobId}`);
  const analysis = job.fit_analysis || {};
  const breakdown = job.fit_breakdown || {};
  const weightMax = {
    experience_match: 25, tech_stack: 25, job_level: 20, modality_location: 10,
    seniority_required: 10, growth_potential: 5, compensation: 5,
  };
  const labels = {
    experience_match: 'Compatibilidade de experiência', tech_stack: 'Stack técnica',
    job_level: 'Nível da vaga', modality_location: 'Modalidade/localização',
    seniority_required: 'Senioridade exigida', growth_potential: 'Potencial de crescimento',
    compensation: 'Salário/compensação',
  };
  const applied = (job.applications || []).find((a) => a.applied_at);

  $('#modal-content').innerHTML = `
    <div class="modal-head">
      <div>
        <h2>${esc(job.title)}</h2>
        <div class="muted">${esc(job.company)} · ${esc(job.location || 'local não informado')}
          · ${esc(job.remote)} · nível: ${esc(job.seniority)}</div>
        <div style="margin-top:8px">
          <span class="score ${scoreClass(job.recommendation)}" style="font-size:22px">${job.fit_score.toFixed(0)}</span>
          <span class="rec-${esc((job.recommendation || '').split(' ')[0])}"><strong>${esc(job.recommendation)}</strong></span>
          · publicada: ${recencyPill(job)}
          ${job.years_required != null ? ` · exige ~${job.years_required} anos` : ''}
        </div>
      </div>
      <button class="close" onclick="closeModal()">&times;</button>
    </div>

    ${applied ? `<div class="ok-box">Você já aplicou para esta vaga em ${esc(applied.applied_at)}
      (candidatura #${applied.id}). O agente não permite aplicação duplicada.</div>` : ''}

    <h3>Composição do score</h3>
    <div class="bars">${Object.entries(breakdown).map(([key, value]) => `
      <div class="bar-row">
        <span class="small">${esc(labels[key] || key)}</span>
        <div class="bar"><div style="width:${(value / (weightMax[key] || 25)) * 100}%"></div></div>
        <span class="small muted">${value.toFixed(1)}/${weightMax[key] || '?'}</span>
      </div>`).join('')}</div>

    <div class="grid-2" style="margin-top:16px">
      <div>
        <h3>Por que combina com você</h3>
        <ul class="clean small">${(analysis.why_it_fits || []).map((w) => `<li>${esc(w)}</li>`).join('') || '<li class="muted">—</li>'}</ul>
        <h3>Requisitos que você já possui</h3>
        <div>${(analysis.matched_requirements || []).map((t) => `<span class="tag match">${esc(t)}</span>`).join('') || '<span class="muted small">nenhum identificado</span>'}</div>
        <h3>Oportunidade de crescimento</h3>
        <div>${(analysis.growth_opportunities || []).map((t) => `<span class="tag growth">${esc(t)}</span>`).join('') || '<span class="muted small">nenhuma</span>'}</div>
      </div>
      <div>
        <h3>Pontos de atenção</h3>
        <ul class="clean small">${(analysis.concerns || []).map((c) => `<li>${esc(c)}</li>`).join('') || '<li class="muted">nenhum</li>'}</ul>
        <h3>Requisitos críticos que faltam</h3>
        <div>${(analysis.critical_missing || []).map((t) => `<span class="tag gap">${esc(t)}</span>`).join('') || '<span class="muted small">nenhum</span>'}</div>
        <h3>Nice to have que faltam</h3>
        <div>${(analysis.nice_to_have_missing || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('') || '<span class="muted small">nenhum</span>'}</div>
      </div>
    </div>

    <h3>Devo aplicar?</h3>
    <div class="${analysis.should_apply ? 'ok-box' : 'warning'}">
      <strong>${analysis.should_apply ? 'SIM' : 'NÃO PRIORITÁRIO'}</strong> —
      ${esc(analysis.should_apply_reason || '')}
      <div class="small" style="margin-top:6px">A decisão final é sua. O agente não aplica sozinho.</div>
    </div>

    <h3>Ações</h3>
    <div class="toolbar">
      <a class="btn" href="${esc(job.url)}" target="_blank" rel="noopener" style="text-decoration:none">Ver vaga</a>
      <button class="btn" onclick="reanalyze(${job.id})">Reanalisar</button>
      <button class="btn green" onclick="approveJob(${job.id})">Aprovar candidatura</button>
      <button class="btn primary" onclick="prepareApplication(${job.id})">Preparar candidatura</button>
      <button class="btn danger" onclick="ignoreJob(${job.id})">Ignorar</button>
    </div>
    <div class="toolbar">
      <input id="note-body" placeholder="Adicionar nota…" style="flex:1;min-width:240px">
      <button class="btn" onclick="addNote(${job.id})">Adicionar nota</button>
    </div>
    ${(job.notes || []).length ? `<ul class="clean small">${job.notes.map((n) =>
      `<li><span class="muted">${esc(n.created_at)}</span> — ${esc(n.body)}</li>`).join('')}</ul>` : ''}

    <h3>Requisitos extraídos do anúncio</h3>
    <ul class="clean small">${(job.requirements || []).slice(0, 15).map((r) => `<li>${esc(r)}</li>`).join('') || '<li class="muted">nenhum</li>'}</ul>

    <h3>Tecnologias detectadas</h3>
    <div>${(job.technologies || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('') || '<span class="muted small">nenhuma</span>'}</div>

    <h3>Descrição</h3>
    <pre class="block">${esc((job.description || '').slice(0, 6000)) || 'sem descrição'}</pre>
  `;
  $('#modal').classList.add('open');
}

window.closeModal = closeModal;

window.reanalyze = async (jobId) => {
  try {
    const result = await api(`/api/jobs/${jobId}/analyze`, { method: 'POST' });
    toast(`Reanalisada: score ${result.fit_score} — ${result.recommendation}`, 'ok');
    await showJob(jobId); await loadJobs(); await loadJobCards();
  } catch (err) { toast(err.message, 'err'); }
};

window.approveJob = async (jobId) => {
  try {
    const result = await api(`/api/jobs/${jobId}/approve`, { method: 'POST' });
    toast(`Vaga aprovada (${result.status}). ${result.next_step}`, 'ok');
    await showJob(jobId); await loadJobs(); await loadJobCards();
  } catch (err) { toast(err.message, 'err'); }
};

window.ignoreJob = async (jobId) => {
  try {
    await api(`/api/jobs/${jobId}/ignore`, { method: 'POST' });
    toast('Vaga ignorada. Ela continua registrada no banco.', 'ok');
    closeModal(); await loadJobs(); await loadJobCards();
  } catch (err) { toast(err.message, 'err'); }
};

window.addNote = async (jobId) => {
  const body = $('#note-body').value.trim();
  if (!body) { toast('Escreva a nota primeiro.', 'err'); return; }
  try {
    await api(`/api/jobs/${jobId}/notes`, { method: 'POST', body: JSON.stringify({ body }) });
    toast('Nota adicionada.', 'ok');
    await showJob(jobId);
  } catch (err) { toast(err.message, 'err'); }
};

window.prepareApplication = async (jobId) => {
  const raw = prompt(
    'Perguntas do formulário de candidatura (uma por linha, opcional).\n'
    + 'O agente só responde o que puder fundamentar no seu perfil.', '');
  if (raw === null) return;
  const questions = raw.split('\n').map((q) => q.trim()).filter(Boolean);
  try {
    const prepared = await api(`/api/applications/prepare/${jobId}`, {
      method: 'POST', body: JSON.stringify({ questions, language: 'pt' }),
    });
    toast(`Candidatura #${prepared.application_id} preparada. Nada foi enviado.`, 'ok');
    await showApplication(prepared.application_id);
    await loadJobs(); await loadJobCards();
  } catch (err) { toast(err.message, 'err'); }
};

/* --------------------------------------------------------- applications */
async function loadApplications() {
  const body = $('#apps-body');
  try {
    const data = await api('/api/applications');
    if (!data.applications.length) {
      body.innerHTML = '<tr><td colspan="6" class="muted">Nenhuma candidatura preparada ainda.</td></tr>';
      return;
    }
    body.innerHTML = data.applications.map((a) => `
      <tr>
        <td>${a.id}</td>
        <td>vaga #${a.job_id}${a.pending_answers ? ` <span class="tag flag">${a.pending_answers} pergunta(s) pendente(s)</span>` : ''}</td>
        <td class="small">${esc(a.status)}</td>
        <td class="small">${a.approved_by_user ? '<span class="pill fresh">sim</span>' : '<span class="pill">não</span>'}</td>
        <td class="small">${esc(a.applied_at || '—')}</td>
        <td><button class="btn" onclick="showApplication(${a.id})">Abrir</button></td>
      </tr>`).join('');
  } catch (err) {
    body.innerHTML = `<tr><td colspan="6" class="danger-box">${esc(err.message)}</td></tr>`;
  }
}

window.showApplication = async (applicationId) => {
  const app = await api(`/api/applications/${applicationId}`);
  const tailoring = app.tailoring || {};

  $('#modal-content').innerHTML = `
    <div class="modal-head">
      <div>
        <h2>Candidatura #${app.id}</h2>
        <div class="muted">vaga #${app.job_id} · status: ${esc(app.status)}
          ${app.resume_version ? ` · CV: <code>${esc(app.resume_version)}</code>` : ''}</div>
      </div>
      <button class="close" onclick="closeModal()">&times;</button>
    </div>

    <div class="${app.can_submit ? 'ok-box' : 'warning'}">
      <strong>Portões de aprovação:</strong>
      ${app.approved_by_user ? '✓' : '✗'} material aprovado ·
      ${app.submission_confirmed_by_user ? '✓' : '✗'} envio confirmado
      ${app.submit_blocked_reason ? `<div class="small" style="margin-top:6px">${esc(app.submit_blocked_reason)}</div>` : ''}
    </div>

    ${(app.answers || []).length ? `<h3>Perguntas de candidatura</h3>
      ${app.answers.map((ans) => `
        <div class="q-item ${ans.needs_confirmation ? 'pending' : ''}">
          <div class="q">PERGUNTA: ${esc(ans.question)}</div>
          <div class="small muted">Confiança: ${esc(ans.confidence)}
            ${ans.source_of_truth ? ` · Base: ${esc(ans.source_of_truth)}` : ''}</div>
          <div style="margin-top:8px">
            <div class="small muted">RESPOSTA SUGERIDA:</div>
            <textarea id="ans-${ans.id}" style="min-height:56px">${esc(ans.final_answer || ans.suggested_answer)}</textarea>
          </div>
          ${ans.needs_confirmation
            ? `<div class="toolbar" style="margin:8px 0 0">
                 <button class="btn green" onclick="confirmAnswer(${ans.id}, ${app.id})">CONFIRMAR</button>
                 <span class="small muted">Edite o texto acima antes de confirmar, se precisar.</span>
               </div>`
            : '<div class="small" style="color:var(--green);margin-top:6px">✓ confirmada por você</div>'}
        </div>`).join('')}` : ''}

    <h3>Sugestões de personalização do currículo</h3>
    <ul class="clean small">${(tailoring.suggestions || []).map((s) =>
      `<li><strong>[${esc(s.kind)}]</strong> ${esc(s.message)}
        ${s.evidence ? `<br><span class="muted">evidência no seu CV: “${esc(s.evidence)}”</span>` : ''}</li>`
    ).join('') || '<li class="muted">nenhuma</li>'}</ul>
    ${app.resume_path ? `<p class="small muted">Versão adaptada gravada em
      <code>${esc(app.resume_path)}</code>. Seu CV original permanece intacto.</p>` : ''}

    <h3>Cover letter</h3>
    <pre class="block">${esc(app.cover_letter || '—')}</pre>
    <h3>Mensagem para recrutador</h3>
    <pre class="block">${esc(app.recruiter_message || '—')}</pre>

    <h3>Ações</h3>
    <div class="toolbar">
      <button class="btn green" onclick="approveApplication(${app.id})">Aprovar candidatura</button>
      <button class="btn" onclick="confirmSubmission(${app.id})">Confirmar envio</button>
      <button class="btn primary" onclick="markApplied(${app.id})">Marcar como aplicada</button>
    </div>
    <div class="toolbar">
      <select id="stage-${app.id}">
        <option value="SCREENING">SCREENING</option>
        <option value="INTERVIEW">INTERVIEW</option>
        <option value="TECHNICAL_INTERVIEW">TECHNICAL_INTERVIEW</option>
        <option value="OFFER">OFFER</option>
        <option value="REJECTED">REJECTED</option>
        <option value="WITHDRAWN">WITHDRAWN</option>
      </select>
      <button class="btn" onclick="updateStage(${app.id})">Atualizar estágio</button>
    </div>
    <p class="small muted">O agente nunca clica em “enviar” por você. Abra a vaga,
      cole o material revisado, envie — e então registre aqui.</p>
  `;
  $('#modal').classList.add('open');
};

window.confirmAnswer = async (answerId, applicationId) => {
  const value = $(`#ans-${answerId}`).value.trim();
  if (!value) { toast('A resposta não pode ficar vazia.', 'err'); return; }
  try {
    await api(`/api/applications/answers/${answerId}/confirm`, {
      method: 'POST', body: JSON.stringify({ final_answer: value }),
    });
    toast('Resposta confirmada.', 'ok');
    await showApplication(applicationId);
  } catch (err) { toast(err.message, 'err'); }
};

window.approveApplication = async (applicationId) => {
  try {
    const result = await api(`/api/applications/${applicationId}/approve`, { method: 'POST' });
    toast(result.next_step, 'ok');
    await showApplication(applicationId); await loadApplications();
  } catch (err) { toast(err.message, 'err'); }
};

window.confirmSubmission = async (applicationId) => {
  if (!confirm('Confirmar autorização de envio desta candidatura?\n\n'
    + 'Isso NÃO envia nada: apenas registra sua autorização. '
    + 'O envio continua sendo feito por você, no navegador.')) return;
  try {
    const result = await api(`/api/applications/${applicationId}/confirm-submission`, { method: 'POST' });
    toast(result.reminder, 'ok', 9000);
    await showApplication(applicationId);
  } catch (err) { toast(err.message, 'err', 9000); }
};

window.markApplied = async (applicationId) => {
  if (!confirm('Registrar que VOCÊ enviou esta candidatura?')) return;
  try {
    const result = await api(`/api/applications/${applicationId}/mark-applied`, {
      method: 'POST', body: JSON.stringify({ submitted_via: 'manual', notes: '' }),
    });
    toast(`Registrada como aplicada em ${result.applied_at}.`, 'ok');
    await showApplication(applicationId); await loadApplications(); await loadJobCards();
  } catch (err) { toast(err.message, 'err'); }
};

window.updateStage = async (applicationId) => {
  const status = $(`#stage-${applicationId}`).value;
  try {
    await api(`/api/applications/${applicationId}/stage`, {
      method: 'POST', body: JSON.stringify({ status }),
    });
    toast(`Estágio atualizado para ${status}.`, 'ok');
    await showApplication(applicationId); await loadApplications();
  } catch (err) { toast(err.message, 'err'); }
};

/* ----------------------------------------------------------- interviews */
async function loadInterviews() {
  const body = $('#interviews-body');
  try {
    const data = await api('/api/applications/interviews/all');
    body.innerHTML = data.interviews.length
      ? data.interviews.map((i) => `
        <tr><td>${i.id}</td><td class="small">${esc(i.date || '—')}</td>
        <td class="small">${esc(i.type || '—')}</td>
        <td class="small">${esc(i.questions || '')} ${esc(i.notes || '')}</td>
        <td class="small">${esc(i.result || '—')}</td></tr>`).join('')
      : '<tr><td colspan="5" class="muted">Nenhuma entrevista registrada.</td></tr>';
  } catch (err) {
    body.innerHTML = `<tr><td colspan="5" class="danger-box">${esc(err.message)}</td></tr>`;
  }
}

/* -------------------------------------------------------------- metrics */
async function loadMetrics() {
  const data = await api('/api/metrics');
  const o = data.overview;
  $('#metric-cards').innerHTML = [
    ['info', o.total_jobs, 'Vagas (únicas)'],
    ['', o.duplicates, 'Duplicatas'],
    ['good', o.excellent_jobs, 'Excelentes'],
    ['warn', o.to_review, 'Para revisar'],
    ['info', o.applications_sent, 'Candidaturas'],
    ['info', o.interviews, 'Entrevistas'],
    ['bad', o.rejections, 'Rejeições'],
    ['good', o.offers, 'Ofertas'],
    ['', `${o.response_rate}%`, 'Taxa de resposta'],
    ['', `${o.interview_rate}%`, 'Taxa de entrevista'],
    ['', o.in_pipeline, 'Em processo'],
    ['', o.avg_salary_brl_month ? `R$${(o.avg_salary_brl_month / 1000).toFixed(1)}k` : '—', 'Salário médio/mês'],
  ].map(([cls, value, label]) =>
    `<div class="card ${cls}"><div class="value">${value}</div><div class="label">${label}</div></div>`
  ).join('');

  barList(data.top_technologies, '#m-techs');
  barList(data.top_companies, '#m-companies');
  barList(Object.entries(data.by_stage), '#m-stages');
  barList(data.applications_per_week.map((w) => [w.week_start, w.count]), '#m-weeks');
  barList(data.by_source, '#m-sources');
  barList(Object.entries(data.recency_distribution), '#m-recency');
}

/* --------------------------------------------------------------- report */
async function loadReport() { /* gerado sob demanda */ }

$('#btn-report').addEventListener('click', async () => {
  const days = $('#rep-days').value || 7;
  $('#report-text').textContent = 'Gerando…';
  try {
    const report = await api(`/api/report/weekly?days=${days}`);
    $('#report-text').textContent = report.text;
  } catch (err) { $('#report-text').textContent = `Erro: ${err.message}`; }
});

/* -------------------------------------------------------------- sources */
async function loadSources() {
  const data = await api('/api/search/sources');
  $('#sources-note').textContent = data.note;
  const enabled = new Set(data.enabled);
  $('#sources-body').innerHTML = data.available.map((s) => `
    <tr><td><code>${esc(s.id)}</code></td><td>${esc(s.label)}</td>
    <td class="small muted">${esc(s.compliance_note)}</td>
    <td>${enabled.has(s.id) ? '<span class="pill fresh">sim</span>' : '<span class="pill">não</span>'}</td></tr>`).join('');

  $('#manual-links').innerHTML = data.manual_search_links.length
    ? data.manual_search_links.map((l) => `
      <div style="margin-bottom:7px">
        <a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.name)} — “${esc(l.query)}”</a>
        <div class="small muted">${esc(l.note)}</div>
      </div>`).join('')
    : '<p class="muted small">Nenhum link configurado em config/sources.yaml.</p>';
}

/* --------------------------------------------------------------- status */
async function loadStatus() {
  const data = await api('/api/status');
  const profile = data.profile || {};

  $('#status-boxes').innerHTML = data.dry_run
    ? `<div class="ok-box"><strong>DRY_RUN=true</strong> — o sistema pesquisa, analisa e
        prepara candidaturas, mas <strong>não pode enviar nada</strong>. Este é o modo seguro.</div>`
    : `<div class="danger-box"><strong>DRY_RUN=false</strong> — envios habilitados por
        configuração. Ainda assim, cada candidatura exige sua aprovação explícita
        e o clique final continua sendo seu.</div>`;

  $('#status-mode').innerHTML = `
    <table>
      <tr><td>DRY_RUN</td><td><strong>${data.dry_run}</strong></td></tr>
      <tr><td>Aprovação manual obrigatória</td><td><strong>${data.require_manual_approval}</strong></td></tr>
      <tr><td>Provedor de LLM</td><td>${esc(data.llm_provider)} ${data.llm_available
        ? '<span class="pill fresh">disponível</span>'
        : '<span class="pill">indisponível — usando templates locais</span>'}</td></tr>
      <tr><td>Respeita robots.txt</td><td><strong>${data.respect_robots_txt}</strong></td></tr>
      <tr><td>Intervalo mín. entre requisições</td><td>${data.min_seconds_between_requests}s</td></tr>
      <tr><td>Máx. requisições por execução</td><td>${data.max_requests_per_run}</td></tr>
    </table>
    <p class="small muted" style="margin-top:8px">${esc(data.submission_note)}</p>`;

  $('#status-profile').innerHTML = profile.ok === false
    ? `<div class="danger-box">${esc(profile.error)}</div>`
    : `<table>
        <tr><td>Arquivo</td><td><code>${esc(profile.profile_path || '')}</code></td></tr>
        <tr><td>Currículo carregado</td><td>${profile.resume_loaded
          ? `<span class="pill fresh">${esc(profile.resume_file)}</span>`
          : '<span class="pill">nenhum</span>'}</td></tr>
        <tr><td>Experiência total</td><td>${profile.total_years} anos</td></tr>
        <tr><td>Tecnologias</td><td>${(profile.technologies || []).map((t) => `<span class="tag match">${esc(t)}</span>`).join('')}</td></tr>
        <tr><td>Objetivos</td><td>${(profile.growth_technologies || []).map((t) => `<span class="tag growth">${esc(t)}</span>`).join('')}</td></tr>
      </table>
      ${(profile.missing_fields || []).length ? `<div class="warning" style="margin-top:10px">
        Campos importantes vazios em <code>profile.yaml</code>:
        ${profile.missing_fields.map((f) => `<code>${esc(f)}</code>`).join(', ')}.
        Sem eles o agente pedirá sua confirmação em mais perguntas.</div>` : ''}
      ${(profile.warnings || []).map((w) => `<div class="warning">${esc(w)}</div>`).join('')}`;

  $('#runs-body').innerHTML = (data.recent_runs || []).length
    ? data.recent_runs.map((r) => `
      <tr><td><code>${esc(r.source)}</code></td><td class="small">${esc(r.started_at || '')}</td>
      <td>${r.fetched}</td><td>${r.kept}</td><td>${r.duplicates}</td><td>${r.discarded}</td>
      <td class="small">${r.status === 'ok' ? '<span class="pill fresh">ok</span>'
        : `<span class="pill old" title="${esc(r.error || '')}">${esc(r.status)}</span>`}</td></tr>`).join('')
    : '<tr><td colspan="7" class="muted">Nenhuma busca executada ainda.</td></tr>';
}

$('#btn-reload-profile').addEventListener('click', async () => {
  try { await api('/api/profile/reload', { method: 'POST' }); toast('Perfil e CV recarregados.', 'ok'); await loadStatus(); }
  catch (err) { toast(err.message, 'err'); }
});

$('#btn-q-test').addEventListener('click', async () => {
  const question = $('#q-test').value.trim();
  if (!question) { toast('Escreva uma pergunta.', 'err'); return; }
  try {
    const result = await api('/api/questions/answer', {
      method: 'POST', body: JSON.stringify({ question }),
    });
    $('#q-result').innerHTML = `
      <div class="q-item ${result.needs_confirmation ? 'pending' : ''}">
        <div class="q">PERGUNTA: ${esc(result.question)}</div>
        <div style="margin:6px 0"><strong>RESPOSTA SUGERIDA:</strong>
          ${result.suggested_answer ? esc(result.suggested_answer) : '<span class="muted">(nenhuma — sem base factual)</span>'}</div>
        <div class="small muted">Confiança: ${esc(result.confidence)}
          ${result.source_of_truth ? `<br>Base: ${esc(result.source_of_truth)}` : ''}
          ${result.reason ? `<br>Motivo: ${esc(result.reason)}` : ''}</div>
        <div class="small" style="margin-top:6px;color:${result.needs_confirmation ? 'var(--yellow)' : 'var(--green)'}">
          ${result.needs_confirmation ? '⚠ Exige [CONFIRMAR] / [EDITAR] seu antes de usar' : '✓ Pode ser usada — derivada diretamente do seu perfil'}</div>
      </div>`;
  } catch (err) { toast(err.message, 'err'); }
});

/* ---------------------------------------------------------------- search */
$('#btn-search').addEventListener('click', async () => {
  const button = $('#btn-search');
  button.disabled = true;
  button.innerHTML = '<span class="spin">◠</span> Buscando…';
  $('#search-result').innerHTML = '<div class="warning">Busca em andamento. '
    + 'O agente respeita robots.txt e limita a taxa de requisições, então isso leva alguns minutos.</div>';
  try {
    const summary = await api('/api/search/run', { method: 'POST', body: JSON.stringify({}) });
    const perSource = summary.per_source.map((s) =>
      `<tr><td><code>${esc(s.source)}</code></td><td>${s.fetched}</td><td>${s.kept}</td>
       <td>${s.duplicates}</td><td>${s.discarded}</td>
       <td class="small">${s.status === 'ok' ? '<span class="pill fresh">ok</span>'
         : `<span class="pill old">${esc(s.status)}</span>`}</td></tr>`).join('');
    $('#search-result').innerHTML = `
      <div class="ok-box">Busca concluída: <strong>${summary.new_jobs} novas</strong>,
        ${summary.updated_jobs} atualizadas, ${summary.duplicates} duplicatas,
        ${summary.discarded} descartadas — em ${summary.requests_made} requisições.</div>
      ${summary.human_intervention.length ? `<div class="warning">
        <strong>Intervenção humana necessária:</strong><br>
        ${summary.human_intervention.map((h) => esc(h)).join('<br>')}</div>` : ''}
      <table><thead><tr><th>Fonte</th><th>Buscadas</th><th>Mantidas</th>
        <th>Duplicatas</th><th>Descartadas</th><th>Status</th></tr></thead>
        <tbody>${perSource}</tbody></table>`;
    await loadJobs(); await loadJobCards();
  } catch (err) {
    $('#search-result').innerHTML = `<div class="danger-box">${esc(err.message)}</div>`;
  } finally {
    button.disabled = false;
    button.textContent = 'Buscar vagas agora';
  }
});

$('#btn-import').addEventListener('click', async () => {
  const title = $('#mi-title').value.trim();
  if (!title) { toast('O título é obrigatório.', 'err'); return; }
  const postedRaw = $('#mi-posted').value;
  try {
    const result = await api('/api/search/manual-import', {
      method: 'POST',
      body: JSON.stringify({
        title,
        company: $('#mi-company').value.trim(),
        url: $('#mi-url').value.trim(),
        description: $('#mi-desc').value,
        location: $('#mi-location').value.trim(),
        salary: $('#mi-salary').value.trim(),
        posted_at: postedRaw ? `${postedRaw}T00:00:00` : null,
      }),
    });
    toast(`Importada: ${result.title} — score ${result.fit_score} (${result.recommendation}). `
      + `Publicada: ${result.posted_at}.`, 'ok', 8000);
    ['#mi-title', '#mi-company', '#mi-url', '#mi-location', '#mi-salary', '#mi-desc', '#mi-posted']
      .forEach((sel) => { $(sel).value = ''; });
    await loadJobs(); await loadJobCards();
  } catch (err) { toast(err.message, 'err'); }
});

$('#btn-add-interview').addEventListener('click', async () => {
  const applicationId = parseInt($('#iv-app').value, 10);
  if (!applicationId) { toast('Informe o ID da candidatura.', 'err'); return; }
  try {
    await api('/api/applications/interviews', {
      method: 'POST',
      body: JSON.stringify({
        application_id: applicationId,
        date: $('#iv-date').value || null,
        type: $('#iv-type').value,
        notes: $('#iv-notes').value,
        result: $('#iv-result').value,
      }),
    });
    toast('Entrevista registrada.', 'ok');
    $('#iv-notes').value = '';
    await loadInterviews();
  } catch (err) { toast(err.message, 'err'); }
});

/* -------------------------------------------------------------- wiring */
['#filter-status', '#filter-rec', '#filter-dups'].forEach((sel) =>
  $(sel).addEventListener('change', loadJobs));
$('#filter-score').addEventListener('change', loadJobs);
$('#btn-refresh').addEventListener('click', () => { loadJobs(); loadJobCards(); });
let searchDebounce = null;
$('#filter-search').addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(loadJobs, 350);
});

const LOADERS = {
  jobs: () => { loadJobs(); loadJobCards(); },
  applications: loadApplications,
  interviews: loadInterviews,
  metrics: loadMetrics,
  report: loadReport,
  sources: loadSources,
  status: loadStatus,
};

(async function init() {
  try { await loadJobCards(); } catch (err) { toast(err.message, 'err', 9000); }
  await loadJobs();
})();
