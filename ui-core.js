// --- 6. CORE UI LOGIC ---

function applyBranding() {
    const sidebarTitle = document.querySelector('#app-sidebar h1');
    if (sidebarTitle) sidebarTitle.innerText = state.clinicInfo.name;
    const sidebarSub = document.querySelector('#app-sidebar p.text-xs');
    if (sidebarSub) sidebarSub.innerText = state.clinicInfo.subname;
    const loginTitle = document.querySelector('#login-screen h1');
    if (loginTitle) loginTitle.innerText = state.clinicInfo.name;
    const loginSub = document.querySelector('#login-screen p');
    if (loginSub) loginSub.innerText = state.clinicInfo.subname;

    const accent = (state.pdfConfig && state.pdfConfig.accentColor) ? state.pdfConfig.accentColor : '#2563eb';
    let styleEl = document.getElementById('dynamic-accent-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-accent-style';
        document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `
        :root { --primary-color: ${accent}; }
        .print-page-wrapper h1, .print-page-wrapper h2, .print-page-wrapper h3 { color: var(--primary-color) !important; }
        .print-page-wrapper .border-b-2, .print-page-wrapper .border-t-2, .print-page-wrapper .border-slate-800 { border-color: var(--primary-color) !important; }
        @media print {
            h1, h2, h3 { color: var(--primary-color) !important; }
            .border-b-2, .border-t-2 { border-color: var(--primary-color) !important; }
            .pain-point-marker {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                background-color: #ef4444 !important; 
                border-color: white !important;
                color: white !important;
            }
        }
    `;
}

function enablePrintPageMargins() {
    let style = document.getElementById('print-margin-style');
    if (!style) {
        style = document.createElement('style');
        style.id = 'print-margin-style';
        document.head.appendChild(style);
    }
    style.innerHTML = `@media print { @page { margin: 20mm 15mm 20mm 15mm !important; } }`;
}

function disablePrintPageMargins() {
    const style = document.getElementById('print-margin-style');
    if (style) style.remove();
}

function checkOnlineStatus() {
    const status = document.getElementById('sync-status');
    if (status) {
        if (state.scriptUrl && state.scriptUrl.includes("docs.google.com/spreadsheets")) {
            status.classList.remove('hidden');
            status.innerHTML = '<i data-lucide="link" width="12"></i> Sheet Terkoneksi';
        } else {
            status.classList.add('hidden');
        }
    }
    renderIcons();
}

async function checkLicense() {
    const savedKey = localStorage.getItem('erm_license_key');
    const savedExpiry = localStorage.getItem('erm_license_expiry');
    const savedStatus = localStorage.getItem('erm_license_status');

    if (!savedKey) { renderLockScreen(); return; }

    if (savedStatus === 'ACTIVE' && savedExpiry) {
        const parts = savedExpiry.split(' ');
        const monthMap = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
        let expDate = new Date();
        if (parts.length >= 3) {
            const d = parseInt(parts[0]);
            const m = monthMap[parts[1]] !== undefined ? monthMap[parts[1]] : 0;
            const y = parseInt(parts[2]);
            expDate.setFullYear(y, m, d);
            if (parts[3]) {
                const timeParts = parts[3].split(':');
                expDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0);
            } else { expDate.setHours(23, 59, 59); }
        } else { expDate = new Date(savedExpiry); }

        if (new Date() > expDate) { renderLockScreen("Masa aktif lisensi Anda telah habis."); return; }
    }

    renderApp();
    if (navigator.onLine) {
        try {
            let sheetId = "";
            if (state.scriptUrl) {
                const match = state.scriptUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
                if (match && match[1]) sheetId = match[1];
            }
            const response = await fetch(`${LICENSE_API_URL}?action=check_license&key=${savedKey}&sheet_id=${sheetId}&t=${Date.now()}`);
            if (!response.ok) throw new Error("Server Error: " + response.status);
            const result = await response.json();
            if (result.valid) {
                localStorage.setItem('erm_license_expiry', result.expires);
                if (result.expires_iso) localStorage.setItem('erm_license_expiry_iso', result.expires_iso);
                localStorage.setItem('erm_license_plan', result.plan);
                localStorage.setItem('erm_license_status', 'ACTIVE');
                if (result.sheet_id) {
                    const autoUrl = `https://docs.google.com/spreadsheets/d/${result.sheet_id}/edit`;
                    if (autoUrl !== state.scriptUrl || result.sheet_id !== state.sheetId) {
                        localStorage.setItem('erm_script_url', autoUrl);
                        localStorage.setItem('erm_sheet_id', result.sheet_id);
                        state.scriptUrl = autoUrl;
                        state.sheetId = result.sheet_id;
                    }
                }
                if (typeof updateLicenseCountdown === 'function') updateLicenseCountdown();
            } else {
                localStorage.setItem('erm_license_status', 'EXPIRED');
                renderLockScreen(result.message);
            }
        } catch (e) { console.warn("License Server Unreachable:", e); }
    }
}
