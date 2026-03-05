// Uploader.js – v12.0-roy
// Dark theme – #0D0D0D bg + #E57C23 gold – pour AI Agent Pricing
// Base: v11.3 © Corentin – fix double click zone + fix 0-byte dead File (SPA Bubble) + FileReader timeout
// v12.0: Double interact pattern pour compatibilité Agent step
//
export const Uploader = {
  name: 'Uploader',
  type: 'response',
  match(context) {
    try {
      const t = context?.trace || {};
      const type = t.type || '';
      const pname = t.payload?.name || '';
      const isMe = s => /(^ext_)?Uploader(Dev)?$/i.test(s || '');
      return isMe(type) || (type === 'extension' && isMe(pname)) || (/^ext_/i.test(type) && isMe(pname));
    } catch (e) {
      console.error('[UploadExt] match error:', e);
      return false;
    }
  },
  render({ trace, element }) {
    if (!element) {
      console.error('[UploadExt] Élément parent introuvable');
      return;
    }
    if (window.__uploaderInstance) {
      console.log('[UploadExt] Cleanup instance précédente');
      try { window.__uploaderInstance(); } catch(e) {}
      window.__uploaderInstance = null;
    }
    console.log('[UploadExt] v12.0-roy - Init (double interact)');
    const findChatContainer = () => {
      const el = document.getElementById('vf-chat') || document.getElementById('voiceflow-chat');
      if (el?.shadowRoot) return el;
      const allWithShadow = document.querySelectorAll('*');
      for (const e of allWithShadow) {
        if (e.shadowRoot?.querySelector('[class*="vfrc"]')) return e;
      }
      return null;
    };
    let _eventBlockers = [];
    let _blockStyle = null;
    const getChatSR = () => {
      const el = document.getElementById('vf-chat') || document.getElementById('voiceflow-chat') || document.querySelector('[id*="vf-chat"]');
      return el?.shadowRoot || null;
    };
    const blockChatInput = () => {
      const sr = getChatSR();
      if (!sr) { setTimeout(blockChatInput, 200); return; }
      if (_eventBlockers.length) return;
      const footer   = sr.querySelector('.vfrc-footer');
      const textarea = sr.querySelector('textarea');
      const sendBtn  = sr.querySelector('#vfrc-send-message') || sr.querySelector('button[type="submit"]') || sr.querySelector('.vfrc-chat-input__send');
      const blockEvent = (e) => { e.stopPropagation(); e.stopImmediatePropagation(); e.preventDefault(); };
      const eventsToBlock = ['click','mousedown','mouseup','mousemove','touchstart','touchend','touchmove','keydown','keyup','keypress','input','focus','blur','submit'];
      [footer, textarea, sendBtn].filter(Boolean).forEach(el => {
        eventsToBlock.forEach(type => { el.addEventListener(type, blockEvent, true); _eventBlockers.push({ el, type, fn: blockEvent }); });
      });
      if (textarea) textarea.blur();
      if (!_blockStyle) {
        _blockStyle = document.createElement('style');
        _blockStyle.id = 'upl-block-visual';
        _blockStyle.textContent = `
          .vfrc-footer { opacity:0.3!important; filter:grayscale(0.6)!important; cursor:not-allowed!important; }
          textarea.vfrc-chat-input::placeholder { color:#555!important; }
          #vfrc-send-message, .vfrc-chat-input__send { background:#333!important; border-color:#333!important; color:#666!important; box-shadow:none!important; cursor:not-allowed!important; }
        `;
        sr.appendChild(_blockStyle);
      }
      console.log('[UploadExt] Chat bloqué');
    };
    const unblockChatInput = () => {
      _eventBlockers.forEach(({ el, type, fn }) => el.removeEventListener(type, fn, true));
      _eventBlockers = [];
      if (_blockStyle) { _blockStyle.remove(); _blockStyle = null; }
      console.log('[UploadExt] Chat débloqué');
    };
    const scrollToSelf = () => { setTimeout(() => element.scrollIntoView({ behavior:'smooth', block:'nearest' }), 80); };
    let isComponentActive = true;
    let isUploading = false;
    let timedTimer = null;
    let cleanupObserver = null;
    const setupAutoUnlock = () => {
      const container = findChatContainer();
      if (!container?.shadowRoot) return null;
      const shadowRoot = container.shadowRoot;
      const selectors = ['.vfrc-chat--dialog','[class*="Dialog"]','[class*="dialog"]','.vfrc-chat','[class*="Messages"]','[class*="messages"]'];
      let dialogEl = null;
      for (const sel of selectors) { dialogEl = shadowRoot.querySelector(sel); if (dialogEl) break; }
      if (!dialogEl) return null;
      const observer = new MutationObserver((mutations) => {
        if (!isComponentActive || isUploading) return;
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;
            if (node.dataset?.uploadExtension === 'true') continue;
            const isUser = node.classList?.contains('vfrc-user-response') || node.classList?.contains('vfrc-message--user') || node.querySelector?.('[class*="user"]');
            const isSys  = node.classList?.contains('vfrc-system-response') || node.classList?.contains('vfrc-assistant') || node.querySelector?.('[class*="assistant"]') || node.querySelector?.('[class*="system"]');
            if (isUser || isSys) { autoUnlock(); return; }
          }
        }
      });
      observer.observe(dialogEl, { childList:true, subtree:true });
      return () => observer.disconnect();
    };
    const autoUnlock = () => {
      if (!isComponentActive) return;
      isComponentActive = false;
      if (cleanupObserver) { cleanupObserver(); cleanupObserver = null; }
      if (timedTimer) { clearInterval(timedTimer); timedTimer = null; }
      root.style.display = 'none';
      unblockChatInput();
    };
    setTimeout(() => { if (isComponentActive && !isUploading) cleanupObserver = setupAutoUnlock(); }, 500);
    const p = trace?.payload || {};
    const title         = p.title || '';
    const subtitle      = p.subtitle || '';
    const description   = p.description || 'Glissez-déposez votre document';
    const descSub       = p.descSub || '(Brief, cahier des charges, PDF...)';
    const accept        = p.accept || '.pdf,.docx,.doc,.txt,.png,.jpg,.jpeg';
    const maxFileSizeMB = p.maxFileSizeMB || 25;
    const maxFiles      = p.maxFiles || 10;
    const variables     = p.variables || {};
    const textDelay     = Number(p.textDelay) || 1500;
    // ═══════════════════════════════════
    // 🎨 DARK THEME — ROY / AI Agent Pricing
    // bg: #0D0D0D  cards: #1A1A1A  accent: #E57C23
    // ═══════════════════════════════════
    const colors = {
      text:       '#F5F5F5',
      textLight:  '#9CA3AF',
      textMuted:  '#6B7280',
      border:     '#2A2A2A',
      borderHover:'#E57C23',
      bg:         '#141414',
      card:       '#1A1A1A',
      surface:    '#0D0D0D',
      white:      '#FFFFFF',
      success:    '#10B981',
      error:      '#EF4444',
      warning:    '#F59E0B',
      accent:     '#E57C23',
      accentHover:'#D06A1A',
      accentGlow: 'rgba(229,124,35,0.15)'
    };
    const webhook          = p.webhook || {};
    const webhookUrl       = webhook.url;
    const webhookMethod    = (webhook.method || 'POST').toUpperCase();
    const webhookHeaders   = webhook.headers || {};
    const webhookTimeoutMs = Number.isFinite(webhook.timeoutMs) ? webhook.timeoutMs : 60000;
    const webhookRetries   = Number.isFinite(webhook.retries) ? webhook.retries : 1;
    const fileFieldName    = webhook.fileFieldName || 'files';
    const extra            = webhook.extra || {};
    const requiredFiles    = Math.max(1, Math.min(Number(p.minFiles) || 1, maxFiles));
    const awaitResponse    = p.awaitResponse !== false;
    const polling          = p.polling || {};
    const pollingEnabled   = !!polling.enabled;
    const pollingIntervalMs  = Number.isFinite(polling.intervalMs) ? polling.intervalMs : 2000;
    const pollingMaxAttempts = Number.isFinite(polling.maxAttempts) ? polling.maxAttempts : 120;
    const pollingHeaders     = polling.headers || {};
    const sendButtonText   = p.sendButtonText || 'Analyser le document';
    const vfContext = { conversation_id: p.conversation_id || null, user_id: p.user_id || null, locale: p.locale || null };
    const loaderCfg        = p.loader || {};
    const loaderMode       = (loaderCfg.mode || 'auto').toLowerCase();
    const minLoadingTimeMs = Number(loaderCfg.minLoadingTimeMs) > 0 ? Number(loaderCfg.minLoadingTimeMs) : 0;
    const autoCloseDelayMs = Number(loaderCfg.autoCloseDelayMs) > 0 ? Number(loaderCfg.autoCloseDelayMs) : 800;
    const defaultAutoSteps = [{ progress:0 },{ progress:30 },{ progress:60 },{ progress:85 },{ progress:100 }];
    const timedPhases      = Array.isArray(loaderCfg.phases) ? loaderCfg.phases : [];
    const totalSeconds     = Number(loaderCfg.totalSeconds) > 0 ? Number(loaderCfg.totalSeconds) : 120;
    // ── Message formaté configurable ──
    const uploadTextTemplate = p.uploadText || '📄 Document{plural} uploadé{plural_e} : {files}';
    if (!webhookUrl) {
      element.innerHTML = `<div style="padding:16px;color:${colors.error};background:${colors.card};border:1px solid ${colors.border};border-radius:12px;font-family:sans-serif">Config manquante: webhook.url</div>`;
      return;
    }
    const hasTitle = title?.trim(), hasSubtitle = subtitle?.trim(), showHeader = hasTitle || hasSubtitle;
    // ═══════════════════════════════════
    // 🎨 CSS — DARK THEME
    // ═══════════════════════════════════
    const styles = `
      @keyframes fadeIn  { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
      @keyframes pulseGold { 0%,100%{box-shadow:0 0 0 0 ${colors.accentGlow}} 50%{box-shadow:0 0 16px 4px ${colors.accentGlow}} }
      .upl{width:100%;max-width:100%;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;font-size:14px;color:${colors.text};animation:fadeIn 0.3s ease;box-sizing:border-box}
      .upl *{box-sizing:border-box}
      .upl-card{background:${colors.card};border:1px solid ${colors.border};border-radius:12px;overflow:hidden;width:100%}
      .upl-header{padding:20px 20px 0}
      .upl-title{font-size:15px;font-weight:600;margin:0 0 2px;color:${colors.accent}}
      .upl-subtitle{font-size:13px;color:${colors.textLight}}
      .upl-body{padding:14px 16px 16px;overflow:hidden}
      .upl-zone{background:${colors.bg};border-radius:10px;padding:32px 20px;text-align:center;cursor:pointer;position:relative;transition:all 0.2s;width:100%}
      .upl-zone::before{content:'';position:absolute;inset:8px;border:1px dashed ${colors.textMuted};border-radius:8px;pointer-events:none;transition:border-color 0.2s}
      .upl-zone:hover{background:#1C1C1C}
      .upl-zone:hover::before{border-color:${colors.accent}}
      .upl-zone.drag{background:#1C1C1C;animation:pulseGold 1.5s infinite}
      .upl-zone.drag::before{border-color:${colors.accent}}
      .upl-zone-icon{width:32px;height:32px;margin:0 auto 10px;color:${colors.accent}}
      .upl-zone-text{font-size:13px;color:${colors.textLight};line-height:1.5}
      .upl-zone-sub{font-size:12px;color:${colors.textMuted};opacity:.7;margin-top:4px}
      .upl-zone.compact{padding:14px 10px;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:120px}
      .upl-zone.compact .upl-zone-icon{width:20px;height:20px;margin:0 0 6px}
      .upl-zone.compact .upl-zone-text{font-size:11px}
      .upl-zone.compact .upl-zone-sub{font-size:10px}
      .upl-zone.compact::before{inset:5px}
      .upl-two-col{display:flex;gap:10px;align-items:flex-start;width:100%;min-width:0}
      .upl-col-left{flex:0 0 110px;min-width:0}
      .upl-col-right{flex:1;display:flex;flex-direction:column;gap:8px;min-width:0}
      .upl-send-wrapper{display:flex;flex-direction:column;gap:4px}
      .upl-btn{padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none;width:100%;text-align:center;transition:all 0.2s}
      .upl-btn-primary{background:${colors.accent};color:${colors.surface}}
      .upl-btn-primary:hover:not(:disabled){background:${colors.accentHover};transform:translateY(-1px);box-shadow:0 4px 16px ${colors.accentGlow}}
      .upl-btn-primary:disabled{opacity:.3;cursor:not-allowed;transform:none;box-shadow:none}
      .upl-send-hint{font-size:11px;color:${colors.textMuted};text-align:center}
      .upl-file-list{display:flex;flex-direction:column;gap:5px}
      .upl-item{display:flex;align-items:center;padding:8px 10px;background:${colors.bg};border:1px solid ${colors.border};border-radius:8px;transition:border-color 0.15s}
      .upl-item:hover{border-color:#3A3A3A}
      .upl-item-icon{width:14px;height:14px;color:${colors.accent};margin-right:8px;flex-shrink:0}
      .upl-item-info{flex:1;min-width:0}
      .upl-item-name{font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${colors.text}}
      .upl-item-size{font-size:10px;color:${colors.textMuted};margin-top:1px}
      .upl-item-del{width:20px;height:20px;border:none;background:none;color:${colors.textMuted};cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:4px;margin-left:6px;flex-shrink:0;transition:all 0.15s}
      .upl-item-del:hover{background:rgba(239,68,68,.15);color:${colors.error}}
      .upl-count{font-size:11px;color:${colors.textMuted}}
      .upl-count.ok{color:${colors.success}}
      .upl-msg{margin-top:10px;padding:8px 12px;border-radius:8px;font-size:12px;display:none}
      .upl-msg.show{display:block}
      .upl-msg.err{background:rgba(239,68,68,.1);color:${colors.error};border:1px solid rgba(239,68,68,.2)}
      .upl-msg.warn{background:rgba(245,158,11,.1);color:${colors.warning};border:1px solid rgba(245,158,11,.2)}
      .upl-loader{display:none;padding:32px 24px}
      .upl-loader.show{display:block}
      .upl-loader-container{display:flex;align-items:center;gap:16px}
      .upl-loader-bar{flex:1;height:6px;background:${colors.border};border-radius:3px;overflow:hidden}
      .upl-loader-fill{height:100%;width:0%;background:linear-gradient(90deg,${colors.accent},#F5A623);border-radius:3px;transition:width .4s;position:relative}
      .upl-loader-fill::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.2) 50%,transparent 100%);background-size:200% 100%;animation:shimmer 2s infinite}
      .upl-loader-pct{font-size:15px;font-weight:600;min-width:48px;text-align:right;color:${colors.accent}}
      .upl-loader.complete .upl-loader-fill{background:linear-gradient(90deg,${colors.success},#34D399)}
      .upl-loader.complete .upl-loader-pct{color:${colors.success}}
      .upl-overlay{display:none;position:absolute;inset:0;z-index:10}
      .upl-overlay.show{display:block}
    `;
    const icons = {
      upload: `<svg class="upl-zone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 15V3m0 0l-4 4m4-4l4 4"/><path d="M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17"/></svg>`,
      file:   `<svg class="upl-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>`,
      x:      `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`
    };
    const root = document.createElement('div');
    root.className = 'upl';
    root.style.cssText = 'position:relative;overflow:hidden;max-width:100%';
    root.dataset.uploadExtension = 'true';
    root.innerHTML = `
      <style>${styles}</style>
      <div class="upl-overlay"></div>
      <div class="upl-card">
        ${showHeader ? `<div class="upl-header">${hasTitle ? `<div class="upl-title">${title}</div>` : ''}${hasSubtitle ? `<div class="upl-subtitle">${subtitle}</div>` : ''}</div>` : ''}
        <div class="upl-body">
          <div class="upl-initial-view">
            <div class="upl-zone" id="drop-zone-main">
              ${icons.upload}
              <div class="upl-zone-text">${description}</div>
              <div class="upl-zone-sub">${descSub}</div>
              <input type="file" accept="${accept}" multiple style="display:none" />
            </div>
          </div>
          <div class="upl-two-col" id="two-col-view" style="display:none">
            <div class="upl-col-left">
              <div class="upl-zone compact" id="drop-zone-compact">
                ${icons.upload}
                <div class="upl-zone-text">Ajouter</div>
                <div class="upl-zone-sub">${accept.split(',').join(', ')}</div>
                <input type="file" accept="${accept}" multiple style="display:none" />
              </div>
            </div>
            <div class="upl-col-right">
              <div class="upl-send-wrapper">
                <button class="upl-btn upl-btn-primary send-btn" disabled>${sendButtonText}</button>
                <div class="upl-send-hint">Lance l'analyse OCR</div>
              </div>
              <div class="upl-count"></div>
              <div class="upl-file-list"></div>
            </div>
          </div>
          <div class="upl-msg"></div>
        </div>
        <div class="upl-loader">
          <div class="upl-loader-container">
            <div class="upl-loader-bar"><div class="upl-loader-fill"></div></div>
            <div class="upl-loader-pct">0%</div>
          </div>
        </div>
      </div>
    `;
    element.appendChild(root);
    const initialView  = root.querySelector('.upl-initial-view');
    const twoColView   = root.querySelector('#two-col-view');
    const zoneMain     = root.querySelector('#drop-zone-main');
    const zoneCompact  = root.querySelector('#drop-zone-compact');
    const inputMain    = zoneMain.querySelector('input[type="file"]');
    const inputCompact = zoneCompact.querySelector('input[type="file"]');
    const fileListEl   = root.querySelector('.upl-file-list');
    const countEl      = root.querySelector('.upl-count');
    const sendBtn      = root.querySelector('.send-btn');
    const msgDiv       = root.querySelector('.upl-msg');
    const loader       = root.querySelector('.upl-loader');
    const loaderPct    = root.querySelector('.upl-loader-pct');
    const loaderFill   = root.querySelector('.upl-loader-fill');
    const overlay      = root.querySelector('.upl-overlay');
    const bodyDiv      = root.querySelector('.upl-body');
    let selectedFiles = [];
    const clamp      = (v, a, b) => Math.max(a, Math.min(b, v));
    const formatSize = bytes => bytes < 1024 ? bytes + ' o' : bytes < 1024*1024 ? (bytes/1024).toFixed(1) + ' Ko' : (bytes/(1024*1024)).toFixed(1) + ' Mo';
    const showMsg    = (text, type = 'warn') => { msgDiv.textContent = text; msgDiv.className = `upl-msg show ${type}`; };
    const hideMsg    = () => { msgDiv.className = 'upl-msg'; };
    // ── Helper: build formatted text for Agent step ──
    const buildFormattedText = (files) => {
      const plural = files.length > 1 ? 's' : '';
      const plural_e = files.length > 1 ? 's' : '';
      const fileNames = files.map(f => f.name).join(', ');
      return uploadTextTemplate
        .replace(/\{plural\}/g, plural)
        .replace(/\{plural_e\}/g, plural_e)
        .replace(/\{files\}/g, fileNames)
        .replace(/\{count\}/g, String(files.length));
    };
    const updateList = () => {
      hideMsg();
      if (!selectedFiles.length) {
        initialView.style.display = '';
        twoColView.style.display = 'none';
        sendBtn.disabled = true;
        fileListEl.innerHTML = '';
        countEl.textContent = '';
        return;
      }
      initialView.style.display = 'none';
      twoColView.style.display = 'flex';
      const total  = selectedFiles.reduce((s, f) => s + f.size, 0);
      const enough = selectedFiles.length >= requiredFiles;
      countEl.className = `upl-count${enough ? ' ok' : ''}`;
      countEl.textContent = `${selectedFiles.length} fichier${selectedFiles.length > 1 ? 's' : ''} · ${formatSize(total)}`;
      fileListEl.innerHTML = '';
      selectedFiles.forEach((f, i) => {
        const item = document.createElement('div');
        item.className = 'upl-item';
        item.innerHTML = `${icons.file}<div class="upl-item-info"><div class="upl-item-name">${f.name}</div><div class="upl-item-size">${formatSize(f.size)}</div></div><button class="upl-item-del" data-i="${i}">${icons.x}</button>`;
        fileListEl.appendChild(item);
      });
      root.querySelectorAll('.upl-item-del').forEach(btn => {
        btn.onclick = () => { selectedFiles.splice(parseInt(btn.dataset.i), 1); updateList(); scrollToSelf(); };
      });
      sendBtn.disabled = !enough;
      if (selectedFiles.length > 0 && !enough) showMsg(`${requiredFiles - selectedFiles.length} fichier(s) manquant(s)`, 'warn');
      scrollToSelf();
    };
    // ── ✅ FIX 1 : rejet immédiat size=0 + timeout FileReader ──────────
    const readFileToMemory = (file) => {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Lecture timeout pour "${file.name}" — actualisez la page`));
        }, 5000);
        const reader = new FileReader();
        reader.onload = (e) => {
          clearTimeout(timeoutId);
          const blob = new Blob([e.target.result], { type: file.type });
          const freshFile = new File([blob], file.name, { type: file.type, lastModified: file.lastModified || Date.now() });
          console.log(`[UploadExt] ✅ En mémoire — "${freshFile.name}" ${freshFile.size} bytes`);
          resolve(freshFile);
        };
        reader.onerror = (e) => {
          clearTimeout(timeoutId);
          reject(new Error(`Erreur lecture "${file.name}"`));
        };
        reader.readAsArrayBuffer(file);
      });
    };
    const addFiles = async (files) => {
      const errs  = [];
      const toRead = [];
      for (const f of files) {
        if (selectedFiles.length + toRead.length >= maxFiles) { errs.push('Limite atteinte'); break; }
        if (f.size === 0) {
          console.warn(`[UploadExt] ⚠️ "${f.name}" = 0 bytes — contexte navigateur invalide`);
          errs.push('Fichier invalide (0 octet). Actualisez la page et réessayez.');
          continue;
        }
        if (maxFileSizeMB && f.size > maxFileSizeMB * 1024 * 1024) { errs.push(`${f.name} trop gros`); continue; }
        if (selectedFiles.some(x => x.name === f.name && x.size === f.size)) continue;
        toRead.push(f);
      }
      if (toRead.length) {
        try {
          const freshFiles = await Promise.all(toRead.map(readFileToMemory));
          selectedFiles.push(...freshFiles);
          updateList();
        } catch(err) {
          console.error('[UploadExt] Erreur lecture:', err.message);
          errs.push(err.message);
        }
      }
      if (errs.length) showMsg(errs[0], 'err');
    };
    // ── ✅ FIX 2 : stopPropagation sur input pour éviter double click ───
    const bindZone = (zone, input) => {
      input.addEventListener('click', (e) => e.stopPropagation());
      zone.addEventListener('click', (e) => {
        if (e.target.closest('.upl-item-del')) return;
        input.click();
      });
      zone.ondragover  = e => { e.preventDefault(); zone.classList.add('drag'); };
      zone.ondragleave = () => zone.classList.remove('drag');
      zone.ondrop      = e => { e.preventDefault(); zone.classList.remove('drag'); addFiles(Array.from(e.dataTransfer?.files || [])); };
      input.onchange   = () => { addFiles(Array.from(input.files || [])); input.value = ''; };
    };
    bindZone(zoneMain,    inputMain);
    bindZone(zoneCompact, inputCompact);
    blockChatInput();
    sendBtn.onclick = async () => {
      if (selectedFiles.length < requiredFiles || !isComponentActive) return;
      console.log('[UploadExt] Envoi — fichiers:', selectedFiles.map(f => `${f.name}(${f.size})`));
      isUploading = true;
      if (cleanupObserver) { cleanupObserver(); cleanupObserver = null; }
      const corruptFiles = selectedFiles.filter(f => f.size === 0);
      if (corruptFiles.length > 0) {
        isUploading = false;
        showMsg('Fichier invalide. Actualisez la page et réessayez.', 'err');
        window?.voiceflow?.chat?.interact?.({ type:'complete', payload:{ webhookSuccess:false, error:'corrupt_files', buttonPath:'error' } });
        return;
      }
      root.style.pointerEvents = 'none';
      overlay.classList.add('show');
      sendBtn.disabled = true;
      const startTime = Date.now();
      const ui = showLoaderUI();
      if (loaderMode === 'timed') ui.timed(buildPlan());
      else ui.auto(defaultAutoSteps);
      try {
        const resp = await post({ url:webhookUrl, method:webhookMethod, headers:webhookHeaders, timeoutMs:webhookTimeoutMs, retries:webhookRetries, files:selectedFiles, fileFieldName, extra, vfContext, variables });
        console.log('[UploadExt] Response:', resp);
        let data = resp?.data ?? null;
        if (awaitResponse && pollingEnabled) {
          const jobId = data?.jobId, statusUrl = data?.statusUrl || polling?.statusUrl;
          if (statusUrl || jobId) {
            data = await poll({ statusUrl: statusUrl || `${webhookUrl.split('/webhook')[0]}/rest/jobs/${jobId}`, headers:pollingHeaders, intervalMs:pollingIntervalMs, maxAttempts:pollingMaxAttempts, onTick: st => { if (loaderMode==='external' && Number.isFinite(st?.percent)) ui.set(st.percent); } });
          }
        }
        const elapsed = Date.now() - startTime;
        if (minLoadingTimeMs - elapsed > 0) { ui.to(98, Math.min(minLoadingTimeMs - elapsed, 1500)); await new Promise(r => setTimeout(r, minLoadingTimeMs - elapsed)); }
        ui.done(data);
      } catch (err) {
        console.error('[UploadExt] Error:', err);
        isUploading = false; isComponentActive = false;
        loader.classList.remove('show');
        bodyDiv.style.display = '';
        root.style.pointerEvents = '';
        overlay.classList.remove('show');
        sendBtn.disabled = false;
        const errMsg = String(err?.message || err);
        const isFetchError = errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('AbortError');
        showMsg(isFetchError ? 'Veuillez réactualiser la page' : errMsg, 'err');
        window?.voiceflow?.chat?.interact?.({ type:'complete', payload:{ webhookSuccess:false, error:errMsg, buttonPath:'error' } });
      }
    };
    // ═══════════════════════════════════════════════════════════
    // 🔄 LOADER UI — avec double interact dans done()
    // ═══════════════════════════════════════════════════════════
    function showLoaderUI() {
      loader.classList.add('show');
      bodyDiv.style.display = 'none';
      let cur = 0, locked = false;
      const paint = () => { loaderFill.style.width = `${cur}%`; loaderPct.textContent = `${Math.round(cur)}%`; };
      const clear = () => { if (timedTimer) { clearInterval(timedTimer); timedTimer = null; } };
      return {
        auto(steps) { let i=0; const go=()=>{ if(i>=steps.length||locked)return; this.to(steps[i].progress,1800,()=>{i++;go();}); }; go(); },
        timed(plan) {
          let idx=0;
          const next=()=>{
            if(idx>=plan.length||locked)return;
            const ph=plan[idx++], t0=Date.now(); clear();
            timedTimer=setInterval(()=>{
              if(locked){clear();return;}
              const r=clamp((Date.now()-t0)/ph.durationMs,0,1), nv=ph.progressStart+(ph.progressEnd-ph.progressStart)*r;
              if(nv>cur){cur=nv;paint();}
              if(Date.now()>=t0+ph.durationMs){clear();cur=Math.max(cur,ph.progressEnd);paint();next();}
            },80);
          };
          next();
        },
        set(p_) { if(!locked&&p_>cur){cur=clamp(p_,0,100);paint();} },
        to(target,ms=1200,cb) {
          const t=clamp(target,0,100); if(t<=cur){cb?.();return;}
          const s=cur,t0=performance.now();
          const step=now=>{ if(locked){cb?.();return;} const k=clamp((now-t0)/ms,0,1),nv=s+(t-s)*k; if(nv>cur){cur=nv;paint();} if(k<1)requestAnimationFrame(step);else cb?.(); };
          requestAnimationFrame(step);
        },
        // ════════════════════════════════════════════════════════
        // ✅ DOUBLE INTERACT — complete (data) + text (Agent)
        // ════════════════════════════════════════════════════════
        done(data) {
          console.log('[UploadExt] Upload terminé — double interact');
          locked=true; clear();
          this.to(100,400,()=>{
            loader.classList.add('complete');
            setTimeout(()=>{
              isUploading=false; isComponentActive=false;
              root.style.display='none';
              unblockChatInput();

              const formatted = buildFormattedText(selectedFiles);

              // 1. COMPLETE — Resolve le Custom Action (silencieux)
              //    Stocke les données dans last_event.payload
              //    Le flow traverse le JS capture → Default → dead-end
              window?.voiceflow?.chat?.interact?.({
                type: 'complete',
                payload: {
                  webhookSuccess: true,
                  webhookResponse: data,
                  files: selectedFiles.map(f=>({name:f.name, size:f.size, type:f.type})),
                  formattedResult: formatted,
                  buttonPath: 'success'
                }
              });

              // 2. TEXT — Après que le flow ait traversé et atteint le dead-end,
              //    envoie un message visible dans le chat + vf_memory
              //    → L'Agent step capte ce message et réagit
              setTimeout(() => {
                console.log('[UploadExt] Envoi text différé pour Agent step:', formatted);
                window?.voiceflow?.chat?.interact?.({
                  type: 'text',
                  payload: formatted,
                });
              }, textDelay);

            }, autoCloseDelayMs);
          });
        }
      };
    }
    function buildPlan() {
      const haveSeconds = timedPhases.every(ph=>Number(ph.seconds)>0);
      const total = haveSeconds ? timedPhases.reduce((s,ph)=>s+Number(ph.seconds),0) : totalSeconds;
      const alloc = timedPhases.map(ph=>({seconds: haveSeconds?Number(ph.seconds):total/timedPhases.length}));
      const startP=5, endP=98, totalMs=alloc.reduce((s,a)=>s+a.seconds*1000,0);
      let acc=0, last=startP;
      return alloc.map((a,i)=>{
        const pStart=i===0?startP:last;
        const pEnd=i===alloc.length-1?endP:startP+(endP-startP)*((acc+a.seconds*1000)/totalMs);
        acc+=a.seconds*1000; last=pEnd;
        return {durationMs:Math.max(500,a.seconds*1000), progressStart:pStart, progressEnd:pEnd};
      });
    }
    async function post({ url, method, headers, timeoutMs, retries, files, fileFieldName, extra, vfContext, variables }) {
      const buildFormData = () => {
        const fd = new FormData();
        files.forEach(f => fd.append(fileFieldName, f, f.name));
        Object.entries(extra).forEach(([k,v]) => fd.append(k, typeof v==='object'?JSON.stringify(v):String(v??'')));
        Object.entries(variables).forEach(([k,v]) => fd.append(k, typeof v==='object'?JSON.stringify(v):String(v??'')));
        if (vfContext.conversation_id) fd.append('conversation_id', vfContext.conversation_id);
        if (vfContext.user_id) fd.append('user_id', vfContext.user_id);
        return fd;
      };
      const cleanHeaders = () => { const h={...headers}; delete h['Content-Type']; return h; };
      let err;
      for (let i=0; i<=retries; i++) {
        try {
          const ctrl=new AbortController(), to=setTimeout(()=>ctrl.abort(), timeoutMs);
          const r=await fetch(url,{method,headers:cleanHeaders(),body:buildFormData(),signal:ctrl.signal});
          clearTimeout(to);
          if(!r.ok) throw new Error(`HTTP ${r.status}`);
          return {ok:true, data:await r.json().catch(()=>null)};
        } catch(e) {
          err=e; console.warn(`[UploadExt] Attempt ${i+1} failed:`, e.message);
          if (e.message?.includes('Failed to fetch')||e.name==='AbortError') {
            await new Promise(r=>setTimeout(r,500));
            try {
              const r2=await fetch(url,{method,headers:cleanHeaders(),body:buildFormData()});
              if(!r2.ok) throw new Error(`HTTP ${r2.status}`);
              return {ok:true, data:await r2.json().catch(()=>null)};
            } catch(e2) { err=e2; }
          }
          if (i<retries) await new Promise(r=>setTimeout(r,900));
        }
      }
      throw err||new Error('Failed');
    }
    async function poll({ statusUrl, headers, intervalMs, maxAttempts, onTick }) {
      for (let i=1; i<=maxAttempts; i++) {
        const r=await fetch(statusUrl,{headers});
        if(!r.ok) throw new Error(`Poll ${r.status}`);
        const j=await r.json().catch(()=>({}));
        if(j?.status==='error') throw new Error(j?.error||'Error');
        onTick?.({percent:j?.percent, phase:j?.phase});
        if(j?.status==='done') return j?.data??j;
        await new Promise(r=>setTimeout(r,intervalMs));
      }
      throw new Error('Timeout');
    }
    scrollToSelf();
    const cleanup = () => {
      if (timedTimer) clearInterval(timedTimer);
      if (cleanupObserver) cleanupObserver();
      isComponentActive = false;
      unblockChatInput();
    };
    window.__uploaderInstance = cleanup;
    return cleanup;
  }
};
try { window.Uploader = Uploader; } catch {}
