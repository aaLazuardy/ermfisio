// --- 0. ERROR HANDLING & ASSET CHECK ---
// Error handler moved to index.html for better catch coverage

// Check for IMG_ASSETS immediately
if (typeof window.IMG_ASSETS === 'undefined') {
    console.error("IMG_ASSETS is missing! Creating empty object to prevent crash.");
    window.IMG_ASSETS = { body_chart: '', logo: '' };
}

// --- 1. STATE & GLOBAL VARIABLES ---
let state = {
    user: null,
    users: [],
    patients: [],
    assessments: [],
    appointments: [],
    printSelection: [],
    currentView: 'login',
    selectedPatient: null,
    currentAssessment: null,
    scriptUrl: '',
    filterPatientId: null,
    calendarDate: new Date(),
    pdfConfig: {
        layoutMode: 'normal',
        accentColor: 'blue',
        showKop: true, showPatientInfo: true, showDiagnosis: true,
        showAnamnesis: true, showBodyChart: true, showObjective: true,
        showImpairment: true, showLimitation: true, showIntervention: true,
        showEvalPlan: true, showSignature: true,
        fontFamily: 'sans', fontSize: '10pt'
    },
    clinicInfo: {
        name: 'FISIOTA',
        subname: 'Physiotherapy & Rehab',
        therapist: 'Fisio',
        sipf: 'SIPF: ....................',
        address: 'Jl. Contoh No.1, Kota, Provinsi',
        phone: '',
        mapsUrl: '',
        qrisImage: ''
    },
    notificationConfig: {
        telegramToken: '',
        telegramChatId: '',
        targetEmail: '',
        senderEmail: ''
    }
};

let currentTemplateCategory = 'Semua';
let selectedExercises = [];
window.tempFormData = {};

// --- 2. HELPER FUNCTIONS ---
function calculateAge(dob) {
    if (!dob) return '-';
    const ageDifMs = Date.now() - new Date(dob).getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function updateDate() {
    const el = document.getElementById('current-date');
    if (el) {
        const now = new Date();
        el.innerText = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
}

function renderIcons() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    } else {
        setTimeout(renderIcons, 300);
    }
}

function generateNextRM() {
    if (state.patients.length === 0) return 'PX-0001';
    const maxNum = state.patients.reduce((max, p) => {
        const numPart = p.id.includes('-') ? parseInt(p.id.split('-')[1]) : 0;
        return !isNaN(numPart) && numPart > max ? numPart : max;
    }, 0);
    const nextNum = maxNum + 1;
    return `PX-${String(nextNum).padStart(4, '0')}`;
}

function getPatientColor(id) {
    if (!id) return 'bg-slate-100 text-slate-600 border-slate-200';
    const colors = [
        'bg-red-100 text-red-800 border-red-200', 'bg-orange-100 text-orange-800 border-orange-200',
        'bg-amber-100 text-amber-800 border-amber-200', 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'bg-lime-100 text-lime-800 border-lime-200', 'bg-green-100 text-green-800 border-green-200',
        'bg-emerald-100 text-emerald-800 border-emerald-200', 'bg-teal-100 text-teal-800 border-teal-200',
        'bg-cyan-100 text-cyan-800 border-cyan-200', 'bg-sky-100 text-sky-800 border-sky-200',
        'bg-blue-100 text-blue-800 border-blue-200', 'bg-indigo-100 text-indigo-800 border-indigo-200',
        'bg-violet-100 text-violet-800 border-violet-200', 'bg-purple-100 text-purple-800 border-purple-200',
        'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200', 'bg-pink-100 text-pink-800 border-pink-200',
        'bg-rose-100 text-rose-800 border-rose-200'
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) { hash = id.charCodeAt(i) + ((hash << 5) - hash); }
    return colors[Math.abs(hash) % colors.length];
}

function formatDateForDisplay(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        return dateStr;
    }
}

// --- 3. DATA & INIT ---
// --- 3. DATA & INIT ---
function loadData() {
    try {
        state.patients = JSON.parse(localStorage.getItem('erm_patients')) || [];
        state.assessments = JSON.parse(localStorage.getItem('erm_assessments')) || [];
        state.appointments = JSON.parse(localStorage.getItem('erm_appointments')) || [];
        state.users = JSON.parse(localStorage.getItem('erm_users')) || [];

        // Jika user kosong (pertama kali), buat default
        if (state.users.length === 0) {
            state.users = [
                { id: 'usr1', username: 'admin', password: '123', role: 'ADMIN', name: 'Administrator' },
                { id: 'usr2', username: 'fisio', password: '123', role: 'FISIO', name: 'Fisio' }
            ];
            localStorage.setItem('erm_users', JSON.stringify(state.users));
        }

        // --- MIGRATION: Ensure Timestamps ---
        // If old data exists without timestamps, we mark them as 'updated now' so they get synced once.
        let mig = false;
        const ensureTs = (list) => {
            list.forEach(i => { if (!i.updatedAt) { i.updatedAt = new Date().toISOString(); mig = true; } });
        };
        ensureTs(state.patients);
        ensureTs(state.assessments);
        ensureTs(state.appointments);

        // --- MIGRATION: Sanitize Array Fields ---
        // Field seperti pain_points, intervention, b, s, dll bisa tersimpan
        // sebagai string pada data lama. Paksa menjadi array yang valid.
        const sanitized = sanitizeAssessments(state.assessments);
        const needsSanitize = JSON.stringify(sanitized) !== JSON.stringify(state.assessments);
        if (needsSanitize) {
            state.assessments = sanitized;
            mig = true;
            console.log("Migrating data: Sanitized array fields in legacy assessment records.");
        }

        if (mig) {
            console.log("Migrating data: Added timestamps to legacy records.");
            saveData();
        }
        // ------------------------------------

        // Script URL Logic
        try {
            if (typeof DEFAULT_SCRIPT_URL !== 'undefined' && DEFAULT_SCRIPT_URL) {
                state.scriptUrl = DEFAULT_SCRIPT_URL;
            } else {
                state.scriptUrl = localStorage.getItem('erm_script_url') || '';
            }
        } catch (e) { state.scriptUrl = ''; }

        // Configs
        const savedConfig = JSON.parse(localStorage.getItem('erm_clinic_config'));
        if (savedConfig) state.clinicInfo = savedConfig;

        const savedPdfConfig = JSON.parse(localStorage.getItem('erm_pdf_config'));
        if (savedPdfConfig) {
            state.pdfConfig = { ...state.pdfConfig, ...savedPdfConfig };
            document.body.classList.remove('print-compact', 'print-normal', 'print-relaxed');
            if (state.pdfConfig.layoutMode === 'compact') document.body.classList.add('print-compact');
            else if (state.pdfConfig.layoutMode === 'relaxed') document.body.classList.add('print-relaxed');
            else document.body.classList.add('print-normal');
            applyPageMargins(state.pdfConfig.layoutMode);
        }

        const savedNotifConfig = JSON.parse(localStorage.getItem('erm_notif_config'));
        if (savedNotifConfig) state.notificationConfig = { ...state.notificationConfig, ...savedNotifConfig };

        // Data Pasien Dummy jika kosong
        if (state.patients.length === 0) {
            state.patients = [{ id: 'PX-0001', name: 'Contoh Pasien', gender: 'L', dob: '1980-05-12', phone: '08123456789', job: 'Guru', address: 'Jl. Merdeka No. 45, Blitar', diagnosis: 'Cervical Syndrome (M53.1)', quota: 0, defaultFee: 0 }];
        }

    } catch (e) {
        console.error("Critical Error loading data:", e);
        alert("Gagal memuat data lokal. Sistem akan reset.");
    }

    applyBranding();
}

// ...

async function checkLicense() {
    const savedKey = localStorage.getItem('erm_license_key');
    const savedExpiry = localStorage.getItem('erm_license_expiry');
    const savedStatus = localStorage.getItem('erm_license_status');

    if (!savedKey) {
        renderLockScreen();
        return;
    }

    // 2. Cek Expiry Lokal
    if (savedStatus === 'ACTIVE' && savedExpiry) {
        // ... (Expiry Logic same as before)
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

        const now = new Date();
        if (now > expDate) {
            renderLockScreen("Masa aktif lisensi Anda telah habis.");
            return;
        }
    }

    // 3. Background Validation (Ke Server Lisensi PUSAT)
    renderApp();

    if (navigator.onLine) {
        try {
            // Extract Sheet ID from configured URL
            let sheetId = "";
            if (state.scriptUrl) {
                const match = state.scriptUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
                if (match && match[1]) sheetId = match[1];
            }
            console.log("DEBUG: Extracted Sheet ID =", sheetId); // Browser Console Log
            // alert("DEBUG ID: " + sheetId); // Optional: Enable if console invalid

            // Add Timestamp to bust cache & Include Sheet ID for Registration
            const response = await fetch(`${LICENSE_API_URL}?action=check_license&key=${savedKey}&sheet_id=${sheetId}&t=${Date.now()}`);

            // Check if response is OK
            if (!response.ok) throw new Error("Server Error: " + response.status);

            const result = await response.json();

            if (result.valid) {
                localStorage.setItem('erm_license_expiry', result.expires);
                if (result.expires_iso) localStorage.setItem('erm_license_expiry_iso', result.expires_iso);
                localStorage.setItem('erm_license_plan', result.plan);
                localStorage.setItem('erm_license_status', 'ACTIVE');

                // AUTO-CONFIG: If server returns sheet_id, auto-connect!
                if (result.sheet_id) {
                    const autoUrl = `https://docs.google.com/spreadsheets/d/${result.sheet_id}/edit`;
                    if (autoUrl !== state.scriptUrl) {
                        localStorage.setItem('erm_script_url', autoUrl);
                        state.scriptUrl = autoUrl;
                        console.log("AUTO-CONFIG: Database Connected via License");
                    }
                }

                updateLicenseCountdown();
            } else {
                localStorage.setItem('erm_license_status', 'EXPIRED');
                renderLockScreen(result.message);
            }
        } catch (e) {
            console.warn("License Server Unreachable:", e);
        }
    }
}

// ...

async function activateLicense() {
    const key = document.getElementById('license-input').value.trim();
    const btn = document.getElementById('btn-activate');
    const url = LICENSE_API_URL;

    if (!key) { alert("Masukkan kode dulu!"); return; }

    btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin" width="20"></i> Memeriksa...`;
    btn.disabled = true;
    lucide.createIcons();

    try {
        const fetchUrl = `${url}?action=check_license&key=${key}&t=${Date.now()}`;
        const resp = await fetch(fetchUrl);

        if (!resp.ok) throw new Error("HTTP Error " + resp.status);

        const result = await resp.json();

        if (result.valid) {
            alert(`✅ AKTIVASI BERHASIL!\n\nPaket: ${result.plan}\nKlien: ${result.client}\nExpired: ${result.expires}`);
            localStorage.setItem('erm_license_key', key);
            localStorage.setItem('erm_license_expiry', result.expires);
            if (result.expires_iso) localStorage.setItem('erm_license_expiry_iso', result.expires_iso);
            if (result.expiry_iso) localStorage.setItem('erm_license_expiry_iso', result.expiry_iso);

            localStorage.setItem('erm_license_status', 'ACTIVE');
            localStorage.setItem('erm_license_plan', result.plan);

            // AUTO-CONFIG on Activation
            if (result.sheet_id) {
                const autoUrl = `https://docs.google.com/spreadsheets/d/${result.sheet_id}/edit`;
                localStorage.setItem('erm_script_url', autoUrl);
                alert(`✅ DATABASE TERHUBUNG OTOMATIS!\nID: ${result.sheet_id}`);
            }

            location.reload();
        } else {
            alert(`❌ GAGAL: ${result.message}`);
            btn.innerHTML = `<i data-lucide="key" width="20"></i> Aktivasi Sekarang`;
            btn.disabled = false;
            lucide.createIcons();
        }

    } catch (e) {
        console.error(e);
        // Clean Error Message
        let msg = e.message;
        if (msg === 'Failed to fetch') msg = "Gagal terhubung ke server. Cek internet.\nJika pakai file://, coba upload ke hosting/localhost.";

        alert(`Gagal Verifikasi.\nError: ${msg}`);
        btn.innerHTML = `<i data-lucide="key" width="20"></i> Aktivasi Sekarang`;
        btn.disabled = false;
        lucide.createIcons();
    }
}

// ...

async function refreshLicenseStatus() {
    const btn = document.querySelector('#tab-content-license button');
    const oldHtml = btn.innerHTML;
    // Safe Lucide call
    btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin" width="16"></i> Memeriksa...`;
    btn.disabled = true;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const savedKey = localStorage.getItem('erm_license_key');
    if (!savedKey) {
        alert("Data lisensi lokal tidak lengkap.");
        btn.innerHTML = oldHtml; btn.disabled = false;
        return;
    }

    try {
        // Extract Sheet ID (Robust Way)
        let sheetId = "";
        const rawUrl = state.scriptUrl || localStorage.getItem('erm_config_url');

        if (rawUrl) {
            const match = rawUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (match && match[1]) sheetId = match[1];
        }

        console.log("DEBUG: Refreshing with Sheet ID =", sheetId);

        if (!sheetId) {
            alert("⚠️ PERINGATAN: Aplikasi tidak dapat menemukan URL Google Sheet Anda.\nPastikan Anda sudah 'Simpan Koneksi' di menu Konfigurasi Database.");
        }

        const fetchUrl = `${LICENSE_API_URL}?action=check_license&key=${savedKey}&sheet_id=${sheetId}&t=${Date.now()}`;
        const resp = await fetch(fetchUrl);
        const result = await resp.json();

        if (result.valid) {
            localStorage.setItem('erm_license_expiry', result.expires);
            if (result.expires_iso) localStorage.setItem('erm_license_expiry_iso', result.expires_iso);

            localStorage.setItem('erm_license_plan', result.plan);
            localStorage.setItem('erm_license_status', 'ACTIVE');

            // AUTO-CONFIG on Refresh
            if (result.sheet_id) {
                const autoUrl = `https://docs.google.com/spreadsheets/d/${result.sheet_id}/edit`;
                if (autoUrl !== (state.scriptUrl || localStorage.getItem('erm_script_url'))) {
                    localStorage.setItem('erm_script_url', autoUrl);
                    state.scriptUrl = autoUrl;
                    alert("🔄 Database Koneksi Diperbarui Otomatis!");
                }
            }

            alert(`Status Diperbarui!\n\nPaket: ${result.plan}\nExpired Terbaru: ${result.expires}\nSheet ID: Terhubung ✅`);
            updateLicenseCountdown();
        } else {
            alert(`Lisensi Tidak Valid / Expired: ${result.message}`);
            localStorage.setItem('erm_license_status', 'EXPIRED');
            checkLicense();
        }

    } catch (e) {
        console.error(e);
        alert("Gagal koneksi ke server Lisensi Pusat. Coba lagi.");
    } finally {
        btn.innerHTML = oldHtml;
        btn.disabled = false;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

function saveData() {
    localStorage.setItem('erm_patients', JSON.stringify(state.patients));
    localStorage.setItem('erm_assessments', JSON.stringify(state.assessments));
    localStorage.setItem('erm_appointments', JSON.stringify(state.appointments));
}

// Sanitize assessments: pastikan semua field array benar-benar array
// Data lama dari Google Sheet bisa tersimpan sebagai string, null, dll.
function sanitizeAssessments(assessments) {
    const ARRAY_FIELDS = ['pain_points', 'b', 's', 'd_act', 'd_part', 'intervention', 'eval'];
    return (assessments || []).map(a => {
        const fixed = { ...a };
        ARRAY_FIELDS.forEach(field => {
            if (!Array.isArray(fixed[field])) {
                // Coba parse kalau ternyata berupa JSON string, misal "[]" atau '["item1"]'
                if (typeof fixed[field] === 'string' && fixed[field].trim().startsWith('[')) {
                    try { fixed[field] = JSON.parse(fixed[field]); } catch (e) { fixed[field] = []; }
                } else if (typeof fixed[field] === 'string' && fixed[field].trim() !== '') {
                    // String biasa (bukan JSON) → bungkus jadi array satu item
                    fixed[field] = [fixed[field]];
                } else {
                    fixed[field] = [];
                }
            }
        });
        return fixed;
    });
}

function applyBranding() {
    const sidebarTitle = document.querySelector('#app-sidebar h1');
    if (sidebarTitle) sidebarTitle.innerText = state.clinicInfo.name;
    const sidebarSub = document.querySelector('#app-sidebar p.text-xs');
    if (sidebarSub) sidebarSub.innerText = state.clinicInfo.subname;
    const loginTitle = document.querySelector('#login-screen h1');
    if (loginTitle) loginTitle.innerText = state.clinicInfo.name;
    const loginSub = document.querySelector('#login-screen p');
    if (loginSub) loginSub.innerText = state.clinicInfo.subname;

    // Apply Dynamic Accent Color
    const accent = (state.pdfConfig && state.pdfConfig.accentColor) ? state.pdfConfig.accentColor : '#2563eb';
    let styleEl = document.getElementById('dynamic-accent-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-accent-style';
        document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `
        :root { --primary-color: ${accent}; }
        
        .print-page-wrapper h1, 
        .print-page-wrapper h2, 
        .print-page-wrapper h3 { color: var(--primary-color) !important; }

        .print-page-wrapper .border-b-2, 
        .print-page-wrapper .border-t-2,
        .print-page-wrapper .border-slate-800 { border-color: var(--primary-color) !important; }

        @media print {
            h1, h2, h3 { color: var(--primary-color) !important; }
            .border-b-2, .border-t-2 { border-color: var(--primary-color) !important; }
            
            /* FORCE BACKGROUND PRINTING FOR PAIN POINTS */
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
    // STRICT MARGINS ONLY WHEN PRINTING
    style.innerHTML = `
        @media print {
            @page { 
                margin: 20mm 15mm 20mm 15mm !important; 
            }
        }
    `;
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

function showSyncToast() {
    const toast = document.getElementById('sync-toast');
    if (toast && state.scriptUrl && state.scriptUrl.includes("spreadsheets")) toast.classList.remove('hidden');
}
function closeSyncToast() {
    const toast = document.getElementById('sync-toast');
    if (toast) toast.classList.add('hidden');
}

// --- 4. SYNC FUNCTIONS ---
// Helper to extract ID from URL
function getSheetIdFromUrl(url) {
    if (!url) return null;
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
}

async function pushDataToSheet() {
    if (!state.scriptUrl) { alert("URL Google Sheet belum dikonfigurasi!"); return; }

    const sheetId = getSheetIdFromUrl(state.scriptUrl);
    if (!sheetId) { alert("Format URL Google Sheet tidak valid!"); return; }

    if (!confirm("PERHATIAN: Mode SYNC TOTAL aktif.\nData di Google Sheet akan disamakan PERSIS dengan Aplikasi ini.\nJika Anda menghapus data di Aplikasi, di Sheet juga akan terhapus.\n\nLanjutkan?")) return;

    const btn = document.getElementById('btn-sync');
    const oriText = btn ? btn.innerHTML : 'Kirim Data';
    if (btn) btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin" width="16"></i> Mengirim...';

    // Update timestamps for all items to be safe (optional, but good for consistency)
    const now = new Date().toISOString();

    // Helper to ensure updated_at exists
    const ensureTs = (list) => list.map(item => ({ ...item, updatedAt: item.updatedAt || now }));

    try {
        await fetch(LICENSE_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'push', // FULL SYNC (OVERWRITE)
                sheet_id: sheetId,
                patients: ensureTs(state.patients),
                assessments: ensureTs(state.assessments),
                appointments: ensureTs(state.appointments),
                config: state.clinicInfo ? [{ key: 'clinic_info', value: JSON.stringify(state.clinicInfo) }] : []
            })
        });

        // Update Last Sync Time
        localStorage.setItem('erm_last_sync', new Date().toISOString());

        alert(`✅ Sinkronisasi Total Berhasil!\nGoogle Sheet sekarang sama persis dengan Aplikasi.`);
    } catch (error) {
        console.error('Gagal mengirim.', error);
        alert('Gagal mengirim data. Cek koneksi internet.');
    } finally {
        if (btn) btn.innerHTML = oriText;
        lucide.createIcons();
    }
}

async function pullDataFromSheet() {
    if (!state.scriptUrl) { alert('URL Google Sheet belum dikonfigurasi.'); return; }

    // NEW LOGIC: Use Central Bridge
    const sheetId = getSheetIdFromUrl(state.scriptUrl);
    if (!sheetId) { alert("Format URL Google Sheet tidak valid!"); return; }

    if (!confirm('PERHATIAN: Data lokal akan DITIMPA dengan data dari Google Sheet.\nData lokal yang belum disinkronkan akan HILANG.\n\nLanjutkan?')) return;

    const btn = document.getElementById('btn-pull');
    const oriText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin" width="18"></i> Mengambil...';
        btn.disabled = true;
        lucide.createIcons();
    }
    try {
        // Use Central API + sheet_id param
        const response = await fetch(`${LICENSE_API_URL}?action=pull&sheet_id=${sheetId}&t=${Date.now()}`);
        const data = await response.json();
        if (data.patients && data.assessments) {
            state.patients = data.patients;
            state.assessments = sanitizeAssessments(data.assessments);
            if (data.appointments) state.appointments = data.appointments;

            // Sync Config if available
            if (data.config && Array.isArray(data.config)) {
                data.config.forEach(c => {
                    if (c.key === 'clinic_info' && c.value) {
                        try { state.clinicInfo = { ...state.clinicInfo, ...JSON.parse(c.value) }; } catch (e) { }
                    }
                    if (c.key === 'CLINIC_NAME') state.clinicInfo.name = c.value;
                    if (c.key === 'CLINIC_SUBNAME') state.clinicInfo.subname = c.value;
                    if (c.key === 'CLINIC_THERAPIST') state.clinicInfo.therapist = c.value;
                    if (c.key === 'CLINIC_SIPF') state.clinicInfo.sipf = c.value;
                    if (c.key === 'CLINIC_ADDRESS') state.clinicInfo.address = c.value;
                    if (c.key === 'CLINIC_NPWP') state.clinicInfo.npwp = c.value;
                    if (c.key === 'CLINIC_PHONE') state.clinicInfo.phone = c.value;
                    if (c.key === 'CLINIC_QRIS') state.clinicInfo.qrisImage = c.value;
                });
                localStorage.setItem('erm_clinic_config', JSON.stringify(state.clinicInfo));
            }

            saveData();
            alert('✅ Data berhasil ditarik dari Cloud!');
            closeSyncToast();
            renderApp();
            applyBranding();
        } else {
            alert('⚠️ Sheet Kosong atau Format Salah.\nPastikan Sheet memiliki tab: Patients, Assessments, Appointments.');
        }
    } catch (error) {
        console.error(error);
        alert('❌ Gagal menarik data.\nPastikan Sheet sudah di-SHARE ke email Script Editor.');
    } finally {
        if (btn) {
            btn.innerHTML = oriText;
            btn.disabled = false;
            lucide.createIcons();
        }
    }
}

// --- 5. AUTH & NAV ---
function handleLogin(e) {
    e.preventDefault();
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    const user = state.users.find(user => user.username === u && user.password === p);

    if (user) {
        state.user = user;
        navigate('dashboard');
        document.getElementById('login-error').classList.add('hidden');
    } else {
        const errEl = document.getElementById('login-error');
        errEl.classList.remove('hidden');
        errEl.innerText = 'Username atau Password Salah!';
    }
}

function handleLogout() { state.user = null; state.currentView = 'login'; renderApp(); }

function navigate(view) {
    if (view === 'config' && state.user.role !== 'ADMIN') {
        alert("Akses Ditolak! Menu ini khusus Administrator.");
        return;
    }
    state.currentView = view;
    if (view !== 'assessments') state.filterPatientId = null;
    if (view === 'kasir') state.kasirTab = state.kasirTab || 'antrian';
    renderApp();
}


function toggleSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const isMobile = window.innerWidth < 768;
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        if (isMobile) overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

function closeModal() {
    document.getElementById('modal-container').classList.add('hidden');
    document.getElementById('modal-content').innerHTML = '';
}


window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
        document.getElementById('sidebar-overlay').classList.add('hidden');
        document.getElementById('app-sidebar').classList.remove('-translate-x-full');
    } else {
        document.getElementById('app-sidebar').classList.add('-translate-x-full');
    }
});

// --- 6. RENDER APP ---
function renderApp() {
    const loginScreen = document.getElementById('login-screen');
    const appLayout = document.getElementById('app-layout');
    const printContainer = document.getElementById('print-container');
    window.scrollTo(0, 0);

    if (!state.user) {
        document.body.style.overflow = 'auto';
        loginScreen.classList.remove('hidden');
        appLayout.classList.add('hidden');
        printContainer.classList.add('hidden');
        return;
    }

    loginScreen.classList.add('hidden');
    document.getElementById('user-name').innerText = state.user.name;
    document.getElementById('user-role').innerText = state.user.role === 'ADMIN' ? 'Administrator' : 'Fisioterapis';
    const configBtn = document.getElementById('nav-config');
    if (configBtn) configBtn.classList.toggle('hidden', state.user.role !== 'ADMIN');

    if (state.currentView === 'print') {
        appLayout.classList.add('hidden');
        printContainer.classList.remove('hidden');
        printContainer.style.display = 'block'; // Force override CSS ID selector
        document.body.style.overflow = 'auto';
        renderPrintView(printContainer);
    } else {
        appLayout.classList.remove('hidden');
        printContainer.classList.add('hidden');
        printContainer.style.display = 'none'; // Force override to hide
        document.body.style.overflow = 'hidden';

        ['dashboard', 'schedule', 'patients', 'assessments', 'kasir', 'config'].forEach(v => {
            const btn = document.getElementById(`nav-${v}`);
            if (btn) {
                const isActive = state.currentView === v;
                btn.className = isActive
                    ? "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 bg-blue-600 text-white shadow-lg shadow-blue-900/30 translate-x-1 font-semibold"
                    : "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1";
            }
        });

        const main = document.getElementById('main-content');
        const pageTitle = document.getElementById('page-title');
        main.innerHTML = '';

        try {
            if (state.currentView === 'dashboard') { pageTitle.innerText = 'Dashboard'; renderDashboard(main); }
            else if (state.currentView === 'schedule') { pageTitle.innerText = 'Jadwal Terapi'; renderScheduleView(main); }
            else if (state.currentView === 'patients') { pageTitle.innerText = 'Data Master Pasien'; renderPatientList(main); }
            else if (state.currentView === 'assessments') { pageTitle.innerText = 'Riwayat Assessment'; renderAssessmentList(main); }
            else if (state.currentView === 'assessment_form') { pageTitle.innerText = 'Formulir Assessment'; renderAssessmentForm(main, false); }
            else if (state.currentView === 'kasir') { pageTitle.innerText = 'Kasir & Pembayaran'; renderKasirView(main); }
            else if (state.currentView === 'config') { pageTitle.innerText = 'Konfigurasi'; renderConfigView(main); }
        } catch (err) {
            console.error("Render Error:", err);
            main.innerHTML = `
                <div class="p-10 text-center">
                    <div class="bg-red-50 text-red-700 p-6 rounded-2xl border-2 border-red-100 max-w-xl mx-auto">
                        <i data-lucide="alert-triangle" width="48" class="mx-auto mb-4 text-red-500"></i>
                        <h2 class="text-xl font-bold mb-2">Gagal Memuat Halaman</h2>
                        <p class="text-sm opacity-80 mb-4">Terjadi kesalahan teknis saat merender tampilan ini.</p>
                        <div class="bg-white/50 p-3 rounded text-left text-xs font-mono mb-6 overflow-x-auto">
                            ${err.message}
                        </div>
                        <button onclick="location.reload()" class="bg-red-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-700 transition-all">Muat Ulang Aplikasi</button>
                    </div>
                </div>`;
            renderIcons();
        }

        renderIcons();
    }
}

// --- 7. VIEW RENDERERS (DASHBOARD) ---
function renderDashboard(container) {
    const count = state.assessments.length;
    const today = new Date().toISOString().slice(0, 10);
    const todayAppointments = state.appointments.filter(a => a.date === today);
    const todayIncome = (state.appointments || [])
        .filter(a => {
            const isPaid = (a.paymentStatus || '').toUpperCase() === 'PAID';
            const isLegacyPaid = !a.paymentStatus && Number(a.fee) > 0;
            return (isPaid || isLegacyPaid) && (a.paidAt || a.date) && (a.paidAt || a.date).slice(0, 10) === today;
        })
        .reduce((sum, a) => sum + (Number(a.finalAmount) || Number(a.fee) || 0), 0);
    const unpaidToday = (state.appointments || []).filter(a => a.date === today && (a.status === 'CONFIRMED' || !a.status) && (a.paymentStatus || '').toUpperCase() !== 'PAID').length;
    const formatRp = (num) => 'Rp ' + num.toLocaleString('id-ID');

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 fade-in">
            <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
                <h3 class="text-4xl font-bold">${state.patients.length}</h3><p class="text-blue-100">Total Pasien</p>
            </div>
            <div class="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
                <h3 class="text-4xl font-bold">${count}</h3><p class="text-emerald-100">Assessment</p>
            </div>
            <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                <h3 class="text-4xl font-bold">${todayAppointments.length}</h3><p class="text-purple-100">Pasien Hari Ini</p>
            </div>
            <div class="bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl p-6 text-white shadow-lg cursor-pointer hover:opacity-90 transition-opacity" onclick="navigate('kasir')">
                <h3 class="text-3xl font-bold truncate" title="${formatRp(todayIncome)}">${formatRp(todayIncome)}</h3>
                <p class="text-orange-100">Pemasukan Hari Ini</p>
                ${unpaidToday > 0 ? `<div class="mt-2 bg-white/20 rounded-lg px-2 py-1 text-xs font-bold">${unpaidToday} belum bayar →</div>` : '<div class="mt-2 text-xs text-orange-200">Semua lunas ✓</div>'}
            </div>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 fade-in">
            <h3 class="font-bold text-lg mb-4 text-slate-800 border-b pb-2">Kasus Terbanyak</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                ${Object.keys(ICF_TEMPLATES).map(k => `
                <div class="flex justify-between items-center text-sm p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-colors">
                    <div class="flex items-center gap-3">
                        <div class="w-2 h-2 rounded-full bg-blue-500"></div> 
                        <span class="font-medium text-slate-700">${k}</span>
                    </div>
                    <span class="font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full text-xs">${state.assessments.filter(a => a.diagnosis === k).length}</span>
                </div>`).join('')}
            </div>
        </div>`;
}


// --- 7.5. VIEW RENDERERS (SCHEDULE) ---
let scheduleViewDate = new Date();

function renderScheduleView(container) {
    const year = scheduleViewDate.getFullYear();
    const month = scheduleViewDate.getMonth();
    const today = new Date();

    // Calendar Logic
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = (firstDay.getDay() + 6) % 7;

    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    const monthAppts = state.appointments.filter(a => {
        const d = new Date(a.date);
        return d.getFullYear() === year && d.getMonth() === month;
    });

    container.innerHTML = `
        <div class="space-y-6 fade-in pb-24">
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div class="flex items-center gap-4">
                    <div class="bg-blue-600 text-white p-3 rounded-xl shadow-lg shadow-blue-200"><i data-lucide="calendar" width="24"></i></div>
                    <div>
                        <h2 class="text-2xl font-black text-slate-800">${monthNames[month]} ${year}</h2>
                        <p class="text-slate-500 font-medium text-sm">Kelola Jadwal Terapi</p>
                    </div>
                </div>
                <div class="flex items-center bg-slate-100 rounded-xl p-1">
                    <button onclick="changeScheduleMonth(-1)" class="p-2 hover:bg-white hover:text-blue-600 rounded-lg text-slate-500 transition-all shadow-sm"><i data-lucide="chevron-left" width="20"></i></button>
                    <button onclick="resetScheduleMonth()" class="px-4 py-2 text-sm font-bold text-slate-600 hover:text-blue-600">Hari Ini</button>
                    <button onclick="changeScheduleMonth(1)" class="p-2 hover:bg-white hover:text-blue-600 rounded-lg text-slate-500 transition-all shadow-sm"><i data-lucide="chevron-right" width="20"></i></button>
                </div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                    ${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Ming'].map(d => `<div class="py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">${d}</div>`).join('')}
                </div>
                <div class="grid grid-cols-7 divide-x divide-slate-100 divide-y" id="calendar-grid">
                    ${Array(startingDay).fill(null).map(() => `<div class="bg-slate-50/50 min-h-[100px]"></div>`).join('')}
                    ${Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
        const dayAppts = monthAppts.filter(a => a.date === dateStr);

        return `
                        <div id="day-${dateStr}" data-date="${dateStr}" class="calendar-day-cell min-h-[100px] p-2 hover:bg-blue-50 transition-colors cursor-pointer group relative border border-transparent rounded-lg">
                            <div class="flex justify-between items-start">
                                <span class="text-sm font-bold ${isToday ? 'bg-blue-600 text-white w-7 h-7 flex items-center justify-center rounded-full shadow-md' : 'text-slate-700'}">${day}</span>
                                ${dayAppts.length > 0 ? `<span class="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded">${dayAppts.length}</span>` : ''}
                            </div>
                            <div class="mt-2 space-y-1">
                                ${dayAppts.slice(0, 3).map(a => {
            const ptType = a.patientType || 'Klinik';
            const typeIcon = ptType === 'Home Visit' ? 'home' : 'building-2';
            const typeColor = ptType === 'Home Visit' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-blue-50 border-blue-200 text-blue-700';
            const patientName = state.patients.find(p => p.id === a.patientId)?.name.split(' ')[0] || (a.name || 'Pasien');
            const isPending = a.status === 'PENDING';
            const statusClass = isPending ? 'bg-amber-100 border-amber-300 text-amber-800 ring-1 ring-amber-200 animate-pulse' : 'bg-white border-slate-200 text-slate-600';
            return `<div class="text-[9px] sm:text-[10px] truncate ${statusClass} rounded px-1 py-0.5 font-medium shadow-sm group-hover:border-blue-200 flex items-center gap-0.5 sm:gap-1"><span class="${typeColor} px-0.5 sm:px-1 py-0.5 rounded text-[7px] sm:text-[8px] font-bold flex items-center gap-0.5 shrink-0"><i data-lucide="${typeIcon}" width="7" class="hidden sm:inline"></i><span class="sm:hidden">${ptType === 'Home Visit' ? 'V' : 'K'}</span></span><span class="truncate text-[8px] sm:text-[10px]">${isPending ? '⏳ ' : ''}${a.time.substring(0, 5)} ${patientName}</span></div>`;
        }).join('')}
                                ${dayAppts.length > 3 ? `<div class="text-[9px] sm:text-[10px] text-slate-500 font-bold pl-1 bg-slate-100 rounded px-1">+${dayAppts.length - 3}</div>` : ''}
                            </div>
                            <button data-action="add" data-date="${dateStr}" class="calendar-add-btn absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 bg-blue-600 text-white p-1.5 rounded-lg shadow-md hover:scale-110 transition-all"><i data-lucide="plus" width="14"></i></button>
                        </div>`;
    }).join('')}
                </div>
            </div>

            <!-- Legend Keterangan Tipe Pasien -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div class="flex items-center justify-between flex-wrap gap-3">
                    <h4 class="text-xs font-bold text-slate-500 uppercase">Keterangan:</h4>
                    <div class="flex items-center gap-4 flex-wrap">
                        <div class="flex items-center gap-2">
                            <span class="bg-blue-50 border border-blue-200 text-blue-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                                <i data-lucide="building-2" width="10"></i>
                                <span class="hidden sm:inline">Klinik</span>
                                <span class="sm:hidden">K</span>
                            </span>
                            <span class="text-xs text-slate-600">= Pasien Klinik</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="bg-green-50 border border-green-200 text-green-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                                <i data-lucide="home" width="10"></i>
                                <span class="hidden sm:inline">Visit</span>
                                <span class="sm:hidden">V</span>
                            </span>
                            <span class="text-xs text-slate-600">= Home Visit</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Detail view removed in favor of Modal -->
        </div>
    `;
    lucide.createIcons();

    // Add event delegation for calendar clicks
    const calendarGrid = document.getElementById('calendar-grid');
    if (calendarGrid) {
        // Remove old listeners if any
        calendarGrid.replaceWith(calendarGrid.cloneNode(true));
        const newGrid = document.getElementById('calendar-grid');

        newGrid.addEventListener('click', function (e) {
            // Find the calendar cell that was clicked
            const cell = e.target.closest('.calendar-day-cell');
            const addBtn = e.target.closest('.calendar-add-btn');

            if (addBtn) {
                // Clicked the + button
                e.stopPropagation();
                const dateStr = addBtn.getAttribute('data-date');
                openAppointmentModal(dateStr);
            } else if (cell) {
                // Clicked the calendar cell
                const dateStr = cell.getAttribute('data-date');
                console.log('Calendar cell clicked:', dateStr);
                openDailyScheduleModal(dateStr);
            }
        });
    }

    if (year === today.getFullYear() && month === today.getMonth()) {
        const todayStr = today.toISOString().slice(0, 10);
        // Don't auto-open on page load - it's annoying
        // setTimeout(() => openDailyScheduleModal(todayStr), 100);
    }
}

function changeScheduleMonth(delta) {
    scheduleViewDate.setMonth(scheduleViewDate.getMonth() + delta);
    renderScheduleView(document.getElementById('main-content'));
}

function resetScheduleMonth() {
    scheduleViewDate = new Date();
    renderScheduleView(document.getElementById('main-content'));
}

function selectScheduleDate(dateStr) {
    console.log('Date clicked (wrapper):', dateStr);
    openDailyScheduleModal(dateStr);
}

// --- HELPER FUNCTIONS FOR DAILY MODAL ---
function handleAddFromDaily(dateStr) {
    closeModal();
    setTimeout(() => openAppointmentModal(dateStr), 300);
}

function handleEditFromDaily(id) {
    closeModal();
    setTimeout(() => openAppointmentModal(null, id), 300);
}

function handleDeleteFromDaily(id, dateStr) {
    if (confirm('Hapus jadwal ini?')) {
        deleteAppointment(id);
        setTimeout(() => openDailyScheduleModal(dateStr), 500);
    }
}

function openDailyScheduleModal(dateStr) {
    console.log('Opening daily modal for:', dateStr);
    const dayAppts = state.appointments.filter(a => {
        return a.date === dateStr ||
            new Date(a.date).toISOString().slice(0, 10) === new Date(dateStr).toISOString().slice(0, 10);
    }).sort((a, b) => a.time.localeCompare(b.time));

    const modalHtml = `
        <div class="bg-white px-6 py-4 border-b flex justify-between items-center sticky top-0 z-20">
            <div>
                <h3 class="text-xl font-bold text-slate-800">Jadwal: ${formatDateForDisplay(dateStr)}</h3>
                <p class="text-sm text-slate-500">${dayAppts.length} Pasien Terdaftar</p>
            </div>
            <button onclick="closeModal()" class="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"><i data-lucide="x" width="20"></i></button>
        </div>
        <div class="px-6 py-6 space-y-4 overflow-y-auto modal-scroll flex-1 max-h-[70vh]">
            <div class="flex justify-end">
                 <button onclick="handleAddFromDaily('${dateStr}')" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-all flex items-center gap-2"><i data-lucide="plus" width="16"></i> Tambah Jadwal</button>
            </div>
            <div class="space-y-3">
                ${dayAppts.length > 0 ? dayAppts.map(a => {
        const p = state.patients.find(pt => pt.id === a.patientId);
        const ptType = a.patientType || 'Klinik';
        const typeIcon = ptType === 'Home Visit' ? 'home' : 'building-2';
        const typeColor = ptType === 'Home Visit' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200';
        const isPending = a.status === 'PENDING';
        return `
                    <div class="flex items-center gap-4 p-4 rounded-xl border ${isPending ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'} hover:bg-white hover:border-blue-200 hover:shadow-md transition-all group">
                        <div class="text-center min-w-[60px]">
                            <span class="block font-black ${isPending ? 'text-amber-700' : 'text-slate-700'} text-lg">${a.time}</span>
                            ${isPending ? '<span class="text-[10px] font-bold text-amber-600 bg-amber-100 px-1 py-0.5 rounded mx-auto block w-fit mt-1">BARU</span>' : ''}
                        </div>
                        <div class="flex-1">
                            <h4 class="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">${p ? p.name : (a.name || 'Unknown')} <span class="text-xs font-normal text-slate-400 ml-1">(${p ? p.id : 'Calon Pasien'})</span></h4>
                            ${isPending ? `<div class="text-xs font-bold text-amber-700 mt-0.5"><i data-lucide="phone" width="12" class="inline"></i> ${a.contact || '-'}</div>` : ''}
                            <div class="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                <span class="${typeColor} px-2 py-0.5 rounded border flex items-center gap-1 font-bold"><i data-lucide="${typeIcon}" width="10"></i> ${ptType}</span>
                                <span class="bg-white px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1"><i data-lucide="user" width="10"></i> ${a.therapistId}</span>
                                ${a.paymentStatus === 'PAID'
                ? `<span class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 font-bold"><i data-lucide="check-circle" width="10"></i> LUNAS</span>`
                : (a.status === 'CONFIRMED' ? `<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200 flex items-center gap-1 font-bold"><i data-lucide="alert-circle" width="10"></i> BELUM BAYAR</span>` : '')}
                                ${a.notes ? `<span class="italic text-slate-400 max-w-[200px] truncate"><i data-lucide="sticky-note" width="10" class="inline mr-1"></i>${a.notes}</span>` : ''}
                            </div>
                        </div>
                        <div class="flex gap-2">
                            ${isPending ? `
                            <button onclick="confirmAppointment('${a.id}')" title="Terima Booking" class="p-2 text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm"><i data-lucide="check" width="14"></i></button>
                            <button onclick="deleteAppointment('${a.id}')" title="Tolak" class="p-2 text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm"><i data-lucide="x" width="14"></i></button>
                            ` : `
                            <button onclick="handleEditFromDaily('${a.id}')" class="p-2 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 rounded-lg"><i data-lucide="edit-2" width="14"></i></button>
                            <button onclick="handleDeleteFromDaily('${a.id}', '${dateStr}')" class="p-2 text-slate-400 hover:text-red-600 bg-white border border-slate-200 rounded-lg"><i data-lucide="trash-2" width="14"></i></button>
                            `}
                        </div>
                    </div>`;
    }).join('') : `<div class="text-center py-12 text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center gap-3">
                    <div class="bg-slate-100 p-3 rounded-full"><i data-lucide="calendar-x" width="24"></i></div>
                    <span>Tidak ada jadwal pada tanggal ini.</span>
                </div>`}
            </div>
        </div>
        <div class="bg-slate-50 px-6 py-4 border-t flex justify-end sticky bottom-0 z-20">
             <button onclick="closeModal()" class="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm">Tutup</button>
        </div>
    `;

    document.getElementById('modal-content').innerHTML = modalHtml;
    document.getElementById('modal-container').classList.remove('hidden');
    lucide.createIcons();
}

// --- 8. VIEW RENDERERS (PATIENTS) ---
function renderPatientList(container) {
    container.innerHTML = `
        <div class="space-y-4 fade-in pb-24">
            <div class="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div class="relative w-full md:w-96">
                    <i data-lucide="search" class="absolute left-3 top-3 text-slate-400" width="18"></i>
                    <input type="text" id="search-patient" onkeyup="filterPatients()" placeholder="Cari nama / No. RM..." class="pl-10 w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                </div>
                <button onclick="openPatientModal()" class="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 font-bold shadow-lg shadow-blue-200 transition-all btn-press">
                    <i data-lucide="user-plus" width="18"></i> <span class="hidden md:inline">Pasien Baru</span><span class="md:hidden">Tambah Pasien</span>
                </button>
            </div>
            <div class="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-sm text-left text-slate-600">
                        <thead class="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200 tracking-wider">
                            <tr>
                                <th class="px-6 py-4">No. RM</th>
                                <th class="px-6 py-4">Identitas Pasien</th>
                                <th class="px-6 py-4">Gender / Usia</th>
                                <th class="px-6 py-4">Diagnosa Medis</th>
                                <th class="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="patient-table-body"></tbody>
                    </table>
                </div>
            </div>
            <div id="patient-mobile-list" class="md:hidden space-y-3"></div>
        </div>`;
    filterPatients();
}

function filterPatients() {
    const searchVal = document.getElementById('search-patient')?.value.toLowerCase() || '';
    const tbody = document.getElementById('patient-table-body');
    const mobileList = document.getElementById('patient-mobile-list');
    const filtered = state.patients.filter(p => p.name.toLowerCase().includes(searchVal) || p.id.toLowerCase().includes(searchVal));

    if (filtered.length === 0) {
        const emptyMsg = `<div class="p-8 text-center flex flex-col items-center justify-center text-slate-400"><i data-lucide="search-x" width="32" class="mb-2 opacity-50"></i><p class="text-sm">Pasien tidak ditemukan.</p></div>`;
        if (tbody) tbody.innerHTML = `<tr><td colspan="6">${emptyMsg}</td></tr>`;
        if (mobileList) mobileList.innerHTML = emptyMsg;
        renderIcons();
        return;
    }

    if (tbody) {
        tbody.innerHTML = filtered.map(p => {
            const cat = p.category || 'Klinik';
            const badgeClass = cat === 'Home Visit' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200';
            const catIcon = cat === 'Home Visit' ? 'home' : 'building-2';
            let quotaBadge = p.quota > 0 ? `<span class="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 border border-purple-200" title="Sisa Paket"><i data-lucide="package" width="8"></i> ${p.quota}</span>` : '';

            return `<tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4 font-mono text-xs text-slate-500 font-bold">${p.id}</td>
                <td class="px-6 py-4">
                    <div class="font-bold text-slate-800 text-sm md:text-base flex items-center">${p.name} ${quotaBadge}</div>
                    <div class="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${badgeClass}"><i data-lucide="${catIcon}" width="10"></i> ${cat}</div>
                </td>
                <td class="px-6 py-4 text-xs text-slate-600">
                    <div class="font-bold">${p.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</div>
                    <div class="text-slate-400">${calculateAge(p.dob)} Th</div>
                </td>
                <td class="px-6 py-4 text-xs text-slate-600 max-w-[200px] truncate">${p.diagnosis || '-'}</td>
                <td class="px-6 py-4 text-center">
                    <div class="flex justify-center gap-2">
                        <button onclick="viewPatientHistory('${p.id}')" title="Riwayat" class="p-2 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 rounded-lg transition-all shadow-sm"><i data-lucide="history" width="16"></i></button>
                        <button onclick="startAssessment('${p.id}')" title="Assessment Baru" class="p-2 bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-300 rounded-lg transition-all shadow-sm"><i data-lucide="clipboard-plus" width="16"></i></button>
                        <button onclick="openPatientModal('${p.id}')" title="Edit Data" class="p-2 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 rounded-lg transition-all shadow-sm"><i data-lucide="edit-3" width="16"></i></button>
                        <button onclick="deletePatient('${p.id}')" title="Hapus" class="p-2 bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-300 rounded-lg transition-all shadow-sm"><i data-lucide="trash-2" width="16"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    if (mobileList) {
        mobileList.innerHTML = filtered.map(p => {
            const cat = p.category || 'Klinik'; const isVisit = cat === 'Home Visit';
            const borderLeftClass = isVisit ? 'border-l-4 border-l-orange-500' : 'border-l-4 border-l-blue-500';
            let quotaDisplay = p.quota > 0 ? `<div class="absolute top-3 right-3 bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[9px] font-bold border border-purple-200 flex items-center gap-1"><i data-lucide="package" width="10"></i> ${p.quota}</div>` : '';

            return `<div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 ${borderLeftClass} relative">
                ${quotaDisplay}
                <div class="flex items-start gap-3 mb-3">
                    <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-black text-slate-400 shrink-0">${p.name.charAt(0)}</div>
                    <div class="pr-12"><h4 class="font-bold text-slate-800 text-sm leading-tight mb-0.5">${p.name}</h4><p class="text-[10px] text-slate-400 font-mono">${p.id}</p></div>
                </div>
                <div class="grid grid-cols-2 gap-2 mb-3">
                    <div class="bg-slate-50 p-2 rounded-lg border border-slate-100"><p class="text-[9px] text-slate-400 uppercase font-bold">Usia / Gender</p><p class="text-xs font-bold text-slate-600">${calculateAge(p.dob)} Th • ${p.gender}</p></div>
                    <div class="bg-slate-50 p-2 rounded-lg border border-slate-100"><p class="text-[9px] text-slate-400 uppercase font-bold">Diagnosa</p><p class="text-xs font-bold text-slate-600 truncate">${p.diagnosis || '-'}</p></div>
                </div>
                <div class="grid grid-cols-4 gap-2 border-t border-slate-100 pt-3">
                    <button onclick="viewPatientHistory('${p.id}')" class="flex flex-col items-center justify-center gap-1 py-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"><div class="bg-indigo-50 text-indigo-600 p-1.5 rounded-md"><i data-lucide="history" width="16"></i></div><span class="text-[10px] font-bold">Riwayat</span></button>
                    <button onclick="startAssessment('${p.id}')" class="flex flex-col items-center justify-center gap-1 py-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"><div class="bg-emerald-50 text-emerald-600 p-1.5 rounded-md"><i data-lucide="clipboard-plus" width="16"></i></div><span class="text-[10px] font-bold">Assess</span></button>
                    <button onclick="openPatientModal('${p.id}')" class="flex flex-col items-center justify-center gap-1 py-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"><div class="bg-blue-50 text-blue-600 p-1.5 rounded-md"><i data-lucide="edit-3" width="16"></i></div><span class="text-[10px] font-bold">Edit</span></button>
                    <button onclick="deletePatient('${p.id}')" class="flex flex-col items-center justify-center gap-1 py-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"><div class="bg-red-50 text-red-600 p-1.5 rounded-md"><i data-lucide="trash-2" width="16"></i></div><span class="text-[10px] font-bold">Hapus</span></button>
                </div>
            </div>`;
        }).join('');
    }
    renderIcons();
}

function viewPatientHistory(id) {
    state.filterPatientId = id;
    navigate('assessments');
}

function startAssessment(pid) {
    state.selectedPatient = state.patients.find(p => p.id === pid);
    state.currentAssessment = null;
    navigate('assessment_form');
}

function deletePatient(id) {
    if (confirm('Yakin ingin menghapus pasien ini? Data assessment terkait juga akan hilang.')) {
        state.patients = state.patients.filter(p => p.id !== id);
        state.assessments = state.assessments.filter(a => a.patientId !== id);
        saveData();
        filterPatients();
    }
}

// --- 9. VIEW RENDERERS (ASSESSMENT LIST) ---
function renderAssessmentList(container) {
    state.printSelection = [];
    let filteredAssessments = state.assessments;
    let headerText = "Riwayat Semua Pasien";

    if (state.filterPatientId) {
        filteredAssessments = state.assessments.filter(a => a.patientId === state.filterPatientId);
        const p = state.patients.find(pt => pt.id === state.filterPatientId);
        headerText = `Riwayat: ${p ? p.name : 'Unknown'}`;
    }
    filteredAssessments.sort((a, b) => new Date(b.date) - new Date(a.date));

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) return dateStr;
        return dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    container.innerHTML = `
        <div class="space-y-4 fade-in pb-24"> <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between md:items-center gap-3">
            <div><h3 class="font-bold text-lg text-slate-800 leading-tight">${headerText}</h3><p class="text-xs text-slate-500">Total: ${filteredAssessments.length} data</p></div>
            <div class="flex gap-2">
                ${state.filterPatientId ? `<button onclick="state.filterPatientId=null; renderAssessmentList(document.getElementById('main-content'))" class="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 flex items-center gap-2"><i data-lucide="x" width="14"></i> Reset Filter</button>` : ''}
                <button id="btn-print-multi" onclick="printSelected()" class="hidden bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg hover:bg-slate-700 animate-bounce-short"><i data-lucide="printer" width="14"></i> Cetak (<span id="sel-count">0</span>)</button>
            </div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="hidden md:block overflow-x-auto">
                <table class="w-full text-sm text-left">
                    <thead class="bg-slate-50 border-b text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <tr><th class="p-4 w-10 text-center"><input type="checkbox" onchange="toggleAllSelect(this)" class="accent-blue-600 cursor-pointer"></th><th class="p-4">Tanggal</th><th class="p-4">Pasien</th><th class="p-4">Diagnosa</th><th class="p-4 text-center">Aksi</th></tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${filteredAssessments.length === 0 ? '<tr><td colspan="5" class="p-8 text-center text-slate-400 italic">Belum ada data.</td></tr>' : filteredAssessments.map(a => {
        const p = state.patients.find(pt => pt.id === a.patientId);
        return `<tr class="hover:bg-blue-50 transition-colors">
                                <td class="p-4 text-center"><input type="checkbox" class="sel-check accent-blue-600 cursor-pointer" value="${a.id}" onchange="updatePrintSelection()"></td>
                                <td class="p-4 font-mono text-xs text-slate-500">${formatDate(a.date)}</td>
                                <td class="p-4 font-bold text-slate-800">${p ? p.name : '?'}</td>
                                <td class="p-4"><span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs border border-blue-200 font-medium">${a.diagnosis}</span></td>
                                <td class="p-4 flex justify-center gap-2">
                                    <button onclick="viewSinglePrint('${a.id}')" class="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded shadow-sm" title="Lihat"><i data-lucide="eye" width="16"></i></button>
                                    <button onclick="editAssessment('${a.id}')" class="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-emerald-600 rounded shadow-sm" title="Edit"><i data-lucide="edit-2" width="16"></i></button>
                                    <button onclick="deleteAssessment('${a.id}')" class="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-red-600 rounded shadow-sm" title="Hapus"><i data-lucide="trash-2" width="16"></i></button>
                                </td>
                            </tr>`;
    }).join('')}
                    </tbody>
                </table>
            </div>
            <div class="md:hidden divide-y divide-slate-100">
                ${filteredAssessments.length === 0 ? '<div class="p-8 text-center text-slate-400 italic">Belum ada data.</div>' : filteredAssessments.map(a => {
        const p = state.patients.find(pt => pt.id === a.patientId);
        return `<div class="p-4 flex gap-3 hover:bg-slate-50 transition-colors">
                        <div class="pt-1"><input type="checkbox" class="sel-check w-5 h-5 accent-blue-600 rounded border-slate-300 cursor-pointer" value="${a.id}" onchange="updatePrintSelection()"></div>
                        <div class="flex-1">
                            <div class="flex justify-between items-start mb-1"><h4 class="font-bold text-slate-800 text-sm line-clamp-1">${p ? p.name : '?'}</h4><span class="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">${formatDate(a.date)}</span></div>
                            <div class="mb-3"><span class="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] border border-blue-100 font-bold mb-1">${a.diagnosis}</span></div>
                            <div class="flex gap-2">
                                <button onclick="viewSinglePrint('${a.id}')" class="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 flex justify-center items-center gap-1"><i data-lucide="eye" width="14"></i> Lihat</button>
                                <button onclick="editAssessment('${a.id}')" class="flex-1 py-2 rounded-lg border border-emerald-200 text-emerald-600 bg-emerald-50 text-xs font-bold hover:bg-emerald-100 flex justify-center items-center gap-1"><i data-lucide="edit-2" width="14"></i> Edit</button>
                                <button onclick="deleteAssessment('${a.id}')" class="w-10 flex items-center justify-center rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100"><i data-lucide="trash-2" width="14"></i></button>
                            </div>
                        </div>
                    </div>`;
    }).join('')}
            </div>
        </div>
    </div>`;
    renderIcons();
}

function toggleAllSelect(el) {
    document.querySelectorAll('.sel-check').forEach(cb => cb.checked = el.checked);
    updatePrintSelection();
}

function updatePrintSelection() {
    const checks = document.querySelectorAll('.sel-check:checked');
    state.printSelection = Array.from(checks).map(cb => cb.value);
    const btn = document.getElementById('btn-print-multi');
    const counter = document.getElementById('sel-count');
    if (state.printSelection.length > 0) {
        btn.classList.remove('hidden');
        counter.innerText = state.printSelection.length;
    } else {
        btn.classList.add('hidden');
    }
}

function deleteAssessment(id) {
    if (confirm('Hapus data assessment ini?')) {
        state.assessments = state.assessments.filter(a => a.id !== id);
        saveData();
        renderAssessmentList(document.getElementById('main-content'));
    }
}

function viewSinglePrint(id) {
    state.printSelection = [id];
    navigate('print');
}

function printSelected() {
    if (state.printSelection.length === 0) return;
    navigate('print');
}

function editAssessment(aid) {
    state.currentAssessment = state.assessments.find(a => a.id === aid);
    state.selectedPatient = state.patients.find(p => p.id === state.currentAssessment.patientId);
    navigate('assessment_form');
}
// --- 10. ASSESSMENT FORM LOGIC ---
function renderAssessmentForm(container, useTempData = false) {
    let data;
    if (useTempData && window.tempFormData) {
        data = window.tempFormData;
    } else {
        const defFee = state.selectedPatient.defaultFee || 0;
        data = state.currentAssessment || {
            id: `A${Date.now()}`,
            patientId: state.selectedPatient.id,
            date: new Date().toISOString().slice(0, 10),
            diagnosis: '', icd: '', icf_codes: '', custom_assessment: '',
            fee: defFee, vas: 0, pain_points: [],
            b: [], s: [], d_act: [], d_part: [], intervention: [], eval: [],
            obj: { rom: 'Normal', mmt: '5', balance: 'Baik' },
            plan: 'Lanjut 2x/minggu'
        };
        if (!Array.isArray(data.pain_points)) data.pain_points = [];
        window.tempFormData = JSON.parse(JSON.stringify(data));
    }

    if (!state.selectedPatient) { navigate('patients'); return; }
    const isNewEntry = !state.currentAssessment && !data.diagnosis;

    container.innerHTML = `
        <div class="h-full overflow-y-auto bg-slate-50 relative flex flex-col">
            <div id="step-1" class="${isNewEntry ? 'block' : 'hidden'} h-full overflow-y-auto p-8 fade-in">
                <div class="max-w-5xl mx-auto">
                    <div class="mb-8 text-center">
                        <h2 class="text-3xl font-black text-slate-800 mb-2">Mulai Assessment Baru</h2>
                        <p class="text-slate-500">Pilih template kasus atau alat bantu di bawah ini untuk memulai pengisian data pasien <span class="font-bold text-blue-600">${state.selectedPatient.name}</span>.</p>
                    </div>
                    <div class="mb-8">
                        <h3 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Clinical Tools</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <button onclick="openOutcomeModal()" class="bg-white p-6 rounded-2xl shadow-sm border-2 border-emerald-100 hover:border-emerald-500 hover:shadow-md transition-all text-left group">
                                <div class="flex items-center gap-4 mb-3">
                                    <div class="bg-emerald-100 p-3 rounded-xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors"><i data-lucide="calculator" width="24"></i></div>
                                    <div><h4 class="font-bold text-slate-800 text-lg">Kalkulator Klinis</h4><p class="text-xs text-slate-500">Outcome Measure (ODI, SPADI, dll)</p></div>
                                </div>
                            </button>
                            <button onclick="goToFormManual()" class="bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-200 hover:border-slate-400 hover:shadow-md transition-all text-left group">
                                <div class="flex items-center gap-4 mb-3">
                                    <div class="bg-slate-100 p-3 rounded-xl text-slate-600 group-hover:bg-slate-800 group-hover:text-white transition-colors"><i data-lucide="edit-3" width="24"></i></div>
                                    <div><h4 class="font-bold text-slate-800 text-lg">Isi Manual</h4><p class="text-xs text-slate-500">Formulir kosong tanpa template</p></div>
                                </div>
                            </button>
                        </div>
                    </div>
                    <div>
                        <div class="flex flex-col md:flex-row justify-between items-end mb-4 border-b border-slate-200 pb-2">
                            <h3 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 md:mb-0">Pilih Template Kasus (ICF)</h3>
                            <div class="flex flex-wrap gap-2">
                                ${['Semua', 'Muskulo', 'Neuro', 'Pediatri', 'Geriatri', 'Sport', 'Kardio'].map(cat => `
                                    <button onclick="setTemplateCategory('${cat}')" class="text-[10px] uppercase px-3 py-1.5 rounded-full font-bold transition-all border ${currentTemplateCategory === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}">${cat}</button>
                                `).join('')}
                            </div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[200px]">
                            ${Object.keys(ICF_TEMPLATES).filter(t => currentTemplateCategory === 'Semua' || ICF_TEMPLATES[t].category === currentTemplateCategory).map(t => `
                                <button onclick="selectTemplateAndGo('${t}')" class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-400 hover:-translate-y-1 transition-all text-left group h-full relative overflow-hidden">
                                    <div class="flex items-start justify-between relative z-10"><span class="font-bold text-slate-700 group-hover:text-blue-600 transition-colors line-clamp-2 text-sm">${t}</span><i data-lucide="arrow-right" class="text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all shrink-0" width="16"></i></div>
                                    <div class="mt-3 flex flex-wrap gap-1 relative z-10"><span class="text-[9px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">ICD: ${ICF_TEMPLATES[t].icd || '-'}</span>${ICF_TEMPLATES[t].category ? `<span class="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-bold uppercase">${ICF_TEMPLATES[t].category}</span>` : ''}</div>
                                </button>
                            `).join('')}
                            ${Object.keys(ICF_TEMPLATES).filter(t => currentTemplateCategory === 'Semua' || ICF_TEMPLATES[t].category === currentTemplateCategory).length === 0 ? `<div class="col-span-full text-center py-10 text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-300">Belum ada template untuk kategori <strong>${currentTemplateCategory}</strong></div>` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <div id="step-2" class="${isNewEntry ? 'hidden' : 'flex'} flex-col h-full bg-slate-100 fade-in">
                <div class="bg-white px-8 py-4 border-b border-slate-200 shadow-sm flex justify-between items-center shrink-0 z-20">
                    <div class="flex items-center gap-4">
                        <button onclick="showStep1()" class="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors" title="Kembali ke Template"><i data-lucide="arrow-left" width="24"></i></button>
                        <div><h2 class="text-xl font-black text-slate-800">Formulir Assessment</h2><div class="flex items-center gap-2 text-sm text-slate-500">Pasien: <span class="font-bold text-blue-600">${state.selectedPatient.name}</span></div></div>
                    </div>
                    <div class="flex items-center gap-3">
                        <button type="button" onclick="openOutcomeModal()" class="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold border border-emerald-200 hover:bg-emerald-100 transition-colors"><i data-lucide="calculator" width="16"></i> Kalkulator</button>
                        <div class="h-8 w-px bg-slate-300 mx-1 hidden md:block"></div>
                        <p class="text-sm font-bold text-slate-500 mr-2 hidden md:block">${data.date}</p>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth" id="main-form-scroll">
                    <div class="max-w-5xl mx-auto space-y-8 pb-10">
                        <div class="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <div class="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4"><div class="bg-blue-600 text-white p-2 rounded-lg shadow-blue-200 shadow-md"><h3 class="font-black text-lg">01</h3></div><div><h3 class="font-bold text-lg text-slate-800">Diagnosa & Anamnesis</h3><p class="text-xs text-slate-400">Identitas medis</p></div></div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div><label class="text-xs font-bold text-slate-500 uppercase mb-2 block">Diagnosa Fisioterapi</label><input type="text" id="form-diagnosis" value="${data.diagnosis}" onchange="updateForm('diagnosis', this.value)" class="w-full border-2 border-slate-200 p-4 rounded-xl focus:border-blue-500 outline-none text-base font-bold text-slate-700 bg-slate-50/50" placeholder="Pilih template di halaman depan..."></div>
                                <div><label class="text-xs font-bold text-slate-500 uppercase mb-2 block">Kode ICD-10</label><input type="text" id="form-icd" value="${data.icd || ''}" onchange="updateForm('icd', this.value)" class="w-full border-2 border-slate-200 p-4 rounded-xl focus:border-blue-500 outline-none text-base font-mono text-slate-600 bg-slate-50/50"></div>
                            </div>
                            <div class="mb-6"><label class="text-xs font-bold text-slate-500 uppercase mb-2 block">List Kode ICF</label><input type="text" id="form-icf-codes" value="${data.icf_codes || ''}" onchange="updateForm('icf_codes', this.value)" class="w-full border border-blue-100 bg-blue-50 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono text-blue-700"></div>
                            <div><label class="text-xs font-bold text-slate-500 uppercase mb-2 block">Anamnesis</label><textarea id="form-custom-assessment" onchange="updateForm('custom_assessment', this.value)" class="w-full border-2 border-slate-200 p-4 rounded-xl h-40 focus:border-blue-500 outline-none resize-none text-base leading-relaxed text-slate-700">${data.custom_assessment}</textarea></div>
                        </div>
                        
                        <div class="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm mt-2">
                            <div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                                <div class="flex items-center gap-3">
                                    <div class="bg-red-500 text-white p-2 rounded-lg shadow-red-200 shadow-md"><i data-lucide="target" width="20"></i></div>
                                    <div><h3 class="font-bold text-lg text-slate-800">Body Chart (Peta Nyeri)</h3><p class="text-xs text-slate-400">Klik pada gambar untuk menandai lokasi nyeri</p></div>
                                </div>
                                <button type="button" onclick="clearPainPoints()" class="text-xs text-red-600 font-bold hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-red-100"><i data-lucide="trash-2" width="12" class="inline mb-0.5"></i> Reset</button>
                            </div>
                            <div class="flex justify-center bg-slate-50 py-4 rounded-xl border border-slate-200">
                                <div class="relative w-[300px] h-[400px] shadow-inner overflow-hidden group cursor-crosshair bg-white">
                                    <img src="${window.IMG_ASSETS.body_chart}" class="absolute inset-0 w-full h-full object-fill select-none pointer-events-none" alt="Body Chart">
                                    <div id="pain-map-overlay" onclick="addPainPoint(event)" class="absolute inset-0 w-full h-full z-10">
                                        ${(data.pain_points || []).map((p, idx) => `<div onclick="removePainPoint(${idx}, event)" class="absolute w-6 h-6 -ml-3 -mt-3 bg-red-600/90 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[10px] text-white font-bold hover:scale-125 transition-transform cursor-pointer animate-bounce-short" style="left: ${p.x}%; top: ${p.y}%;" title="Hapus titik ini">${idx + 1}</div>`).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <div class="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4"><div class="bg-indigo-600 text-white p-2 rounded-lg shadow-indigo-200 shadow-md"><h3 class="font-black text-lg">02</h3></div><div><h3 class="font-bold text-lg text-slate-800">Impairment</h3><p class="text-xs text-slate-400">Body Function & Structure</p></div></div>
                            <div class="grid grid-cols-1 gap-6">
                                ${renderSectionBox('Body Function (b)', 'activity', `<div class="bg-slate-100 p-4 rounded-xl mb-4"><label class="flex justify-between text-sm font-bold mb-3 text-slate-700"><span>VAS Nyeri</span> <span class="bg-slate-800 text-white px-3 py-0.5 rounded-full text-xs" id="vas-display">${data.vas} / 10</span></label><input type="range" min="0" max="10" value="${data.vas}" oninput="updateForm('vas', this.value); document.getElementById('vas-display').innerText=this.value;" class="w-full h-2 bg-slate-300 rounded-lg cursor-pointer accent-slate-800 appearance-none"></div>${renderTextAreaWithMenu('b', data.b, 'Body Function')}`, 'b', true)}
                                ${renderSectionBox('Body Structure (s)', 'box', renderTextAreaWithMenu('s', data.s, 'Body Structure'), 's', true)}
                            </div>
                        </div>

                        <div class="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <div class="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4"><div class="bg-violet-600 text-white p-2 rounded-lg shadow-violet-200 shadow-md"><h3 class="font-black text-lg">03</h3></div><div><h3 class="font-bold text-lg text-slate-800">Limitation</h3><p class="text-xs text-slate-400">Activity & Participation</p></div></div>
                            <div class="grid grid-cols-1 gap-6">
                                ${renderSectionBox('Activity Limitation (d)', 'alert-circle', renderTextAreaWithMenu('d_act', data.d_act, 'Activity'), 'd_act', true)}
                                ${renderSectionBox('Participation Restriction (d)', 'users', renderTextAreaWithMenu('d_part', data.d_part, 'Participation'), 'd_part', true)}
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <div class="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2"><h3 class="font-bold text-slate-800 uppercase text-sm">Objektif Data</h3></div>
                                <div class="space-y-6">
                                    ${renderSelect('ROM (Lingkup Gerak Sendi)', 'rom', data.obj.rom, ['Normal', 'Terbatas Ringan', 'Terbatas Sedang', 'Terbatas Berat'])}
                                    ${renderSelect('MMT (Kekuatan Otot)', 'mmt', data.obj.mmt, ['0', '1', '2', '3', '4', '5'])}
                                    ${renderSelect('Balance (Keseimbangan)', 'balance', data.obj.balance, ['Baik', 'Cukup', 'Buruk', 'Risiko Jatuh'])}
                                </div>
                            </div>
                            <div class="md:col-span-2">
                                <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col">
                                    <div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-2"><h3 class="font-bold text-slate-800 uppercase text-sm">Intervensi Fisioterapi</h3><button onclick="openHEPModal()" class="text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 px-3 py-1.5 rounded-lg font-bold border border-purple-200 flex items-center gap-1 transition-colors"><i data-lucide="dumbbell" width="14"></i> Buat PR Latihan</button></div>
                                    <div class="flex-1">${renderCheckboxGroup('intervention', data.intervention)}</div>
                                    <div class="mt-4 pt-3 border-t border-slate-100 flex gap-2"><input type="text" id="custom-intervention" placeholder="+ Tambah intervensi manual..." class="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:border-blue-500 outline-none" onkeydown="if(event.key === 'Enter') addCustomItem('intervention')"><button type="button" onclick="addCustomItem('intervention')" class="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 rounded-lg text-sm font-bold transition-colors">Add</button></div>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <div class="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4"><div class="bg-emerald-600 text-white p-2 rounded-lg shadow-emerald-200 shadow-md"><h3 class="font-black text-lg">END</h3></div><div><h3 class="font-bold text-lg text-slate-800">Evaluasi & Rencana</h3></div></div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h4 class="text-xs font-bold mb-3 text-slate-500 uppercase">Hasil Evaluasi</h4>
                                    <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[160px]" id="group-eval">
                                        ${data.eval.length > 0 ? data.eval.map(item => `<div class="flex items-center gap-2 p-3 rounded-lg bg-white border border-slate-200 text-sm text-slate-700 shadow-sm mb-2"><i data-lucide="check-circle" width="16" class="text-emerald-500"></i> <span class="flex-1">${item}</span><button type="button" onclick="toggleFormItem('eval', '${item}')" class="text-slate-300 hover:text-red-500 transition-colors"><i data-lucide="x" width="16"></i></button></div>`).join('') : '<div class="h-full flex items-center justify-center text-sm text-slate-400 italic">Belum ada catatan evaluasi</div>'}
                                    </div>
                                    <div class="flex gap-2 mt-3">
                                        <input type="text" id="custom-eval" placeholder="Ketik hasil evaluasi..." class="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2.5 focus:border-blue-500 outline-none" onkeydown="if(event.key === 'Enter') addCustomItem('eval')">
                                        <button type="button" onclick="addCustomItem('eval')" class="bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-lg text-sm font-bold transition-colors shadow-sm">Add</button>
                                    </div>
                                </div>
                                <div>
                                    <h4 class="text-xs font-bold mb-3 text-slate-500 uppercase">Rencana Selanjutnya</h4>
                                    <div class="relative">
                                        <select onchange="updateForm('plan', this.value)" class="w-full border-2 border-slate-200 p-5 rounded-xl bg-white outline-none text-base focus:border-blue-500 appearance-none font-bold text-slate-700 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
                                            <option ${data.plan === 'Lanjut 2x/minggu' ? 'selected' : ''}>Lanjut 2x/minggu</option>
                                            <option ${data.plan === 'Lanjut 3x/minggu' ? 'selected' : ''}>Lanjut 3x/minggu</option>
                                            <option ${data.plan === 'Lanjut 1x/minggu' ? 'selected' : ''}>Lanjut 1x/minggu</option>
                                            <option ${data.plan === 'Evaluasi Ulang' ? 'selected' : ''}>Evaluasi Ulang</option>
                                            <option ${data.plan === 'Selesai / Discharge' ? 'selected' : ''}>Selesai / Discharge</option>
                                        </select>
                                        <div class="absolute right-5 top-5 pointer-events-none text-slate-500"><i data-lucide="chevron-down" width="20"></i></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white p-6 md:p-8 rounded-2xl border-2 border-orange-100 shadow-sm mt-8">
                            <div class="flex items-center gap-3 mb-4"><div class="bg-orange-500 text-white p-2 rounded-lg"><i data-lucide="banknote" width="20"></i></div><div><h3 class="font-bold text-lg text-slate-800">Kasir / Billing</h3><p class="text-xs text-slate-400">Input nominal (otomatis x1000)</p></div></div>
                            <div class="bg-orange-50 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center">
                                <div class="flex-1 w-full">
                                    <label class="text-xs font-bold text-orange-800 uppercase block mb-1">Nominal (Dalam Ribuan)</label>
                                    <div class="relative">
                                        <input type="text" inputmode="numeric" value="${data.fee ? data.fee / 1000 : ''}" placeholder="Contoh: 75" class="w-full border-2 border-orange-200 p-3 rounded-xl focus:border-orange-500 outline-none text-xl font-bold text-slate-700 pr-16" oninput="this.value = this.value.replace(/[^0-9]/g, ''); const val = (parseInt(this.value) || 0) * 1000; updateForm('fee', val); document.getElementById('fee-display').innerText = 'Rp ' + val.toLocaleString('id-ID');">
                                        <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl pointer-events-none select-none">.000</span>
                                    </div>
                                </div>
                                <div class="w-full md:w-auto text-right md:text-left"><p class="text-xs text-slate-500 mb-1">Total Biaya:</p><h2 id="fee-display" class="text-3xl font-black text-orange-600">Rp ${(data.fee || 0).toLocaleString('id-ID')}</h2></div>
                            </div>
                        </div>
                        </div>
                        
                        <div class="p-4 bg-white border-t border-slate-200 flex flex-col-reverse md:flex-row justify-between items-center gap-3 shadow-sm rounded-2xl border border-slate-200">
                            <button type="button" onclick="navigate('assessments')" class="w-full md:w-auto px-6 py-3 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-colors text-sm border border-slate-200 md:border-transparent">Batal</button>
                            <div class="flex gap-3 w-full md:w-auto">
                                <button type="button" onclick="showStep1()" class="flex-1 md:flex-none px-4 md:px-6 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors text-sm border border-slate-200 text-center"><span class="md:hidden">&lt; Back</span> <span class="hidden md:inline">&lt; Kembali</span></button>
                                <button type="button" onclick="saveAssessment()" class="flex-[2] md:flex-none px-4 md:px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all flex items-center justify-center gap-2 btn-press text-sm"><i data-lucide="save" width="18"></i> <span>Simpan</span> <span class="hidden md:inline">Data</span></button>
                            </div>
                        </div>
                    </div>
                </div>


            </div>
        </div>
    `;
    lucide.createIcons();
}

function renderSectionBox(title, icon, content, key, hideCustomInput = false) {
    return `<div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
        <div class="flex items-center gap-2 mb-4 text-blue-700 border-b border-blue-50 pb-2 shrink-0"><div class="p-1.5 bg-blue-100 rounded-lg"><i data-lucide="${icon}" width="18"></i></div><h3 class="font-bold text-sm uppercase tracking-wide">${title}</h3></div>
        <div class="flex-1">${content}</div>
        ${!hideCustomInput ? `<div class="mt-4 pt-3 border-t border-slate-100 flex gap-2 shrink-0"><input type="text" id="custom-${key}" placeholder="+ Tambah item..." class="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:border-blue-500 outline-none" onkeydown="if(event.key === 'Enter') addCustomItem('${key}')"><button type="button" onclick="addCustomItem('${key}')" class="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 rounded-lg text-xs font-bold transition-colors">Add</button></div>` : ''}
    </div>`;
}

function renderTextAreaWithMenu(key, currentValue, title) {
    const valStr = Array.isArray(currentValue) ? currentValue.join('\n') : (currentValue || '');
    return `<div class="flex flex-col w-full h-full"> 
        <div class="flex justify-between items-center mb-2"><p class="text-xs text-slate-400 italic">Ketik manual atau gunakan tombol pilih</p><button type="button" onclick="openItemPicker('${key}', '${title}')" class="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 font-bold flex items-center gap-1 transition-colors"><i data-lucide="list-plus" width="14"></i> Pilih Item</button></div>
        <textarea id="form-${key}" onchange="updateForm('${key}', this.value)" class="w-full h-48 border-2 border-slate-200 rounded-xl p-4 focus:border-blue-500 outline-none text-base leading-relaxed resize-none bg-slate-50 focus:bg-white transition-all text-slate-700 font-medium" placeholder="Deskripsi ${title}...">${valStr}</textarea>
    </div>`;
}

function renderCheckboxGroup(key, currentItems) {
    if (!currentItems || currentItems.length === 0) return '<p class="text-xs text-slate-400 italic">Belum ada item dipilih</p>';
    return `<div class="grid grid-cols-1 gap-2" id="group-${key}">${currentItems.map(item => `<label class="flex items-center gap-2 p-2.5 rounded-lg cursor-pointer text-sm border select-none bg-blue-50 text-blue-700 border-blue-100 transition-colors hover:bg-blue-100"><input type="checkbox" checked onchange="toggleFormItem('${key}', '${item}')" class="accent-blue-600 w-4 h-4 rounded"><span class="leading-none">${item}</span></label>`).join('')}</div>`;
}

function renderSelect(label, objKey, val, options) {
    return `<div class="flex flex-col gap-1"><span class="text-xs text-slate-500 font-bold uppercase">${label}</span><select onchange="updateFormObj('${objKey}', this.value)" class="border border-slate-300 rounded-lg p-2 text-slate-800 bg-white w-full outline-none text-sm focus:ring-1 focus:ring-blue-500">${options.map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
}

function updateForm(key, val) { window.tempFormData[key] = val; }
function updateFormObj(key, val) { window.tempFormData.obj[key] = val; }

function toggleFormItem(category, item) {
    const list = window.tempFormData[category];
    const index = list.indexOf(item);
    if (index > -1) list.splice(index, 1);
    else list.push(item);
}

function addCustomItem(category) {
    const input = document.getElementById(`custom-${category}`);
    const val = input.value.trim();
    if (val) {
        window.tempFormData[category].push(val);
        renderAssessmentForm(document.getElementById('main-content'), true);
    }
}

// --- 11. TEMPLATE & SAVING LOGIC ---
function applyTemplate(tName) {
    const t = ICF_TEMPLATES[tName];
    if (!t) return;
    window.tempFormData.diagnosis = tName;
    window.tempFormData.icd = t.icd || '';
    window.tempFormData.icf_codes = t.codes || '';
    window.tempFormData.b = [];
    window.tempFormData.s = [];
    window.tempFormData.d_act = [];
    window.tempFormData.d_part = [];
    window.tempFormData.intervention = t.intervention ? [...t.intervention] : [];
    window.tempFormData.eval = t.eval ? [...t.eval] : [];
    renderAssessmentForm(document.getElementById('main-content'), true);
}

function saveAssessment() {
    const data = window.tempFormData;
    if (!data.diagnosis) { alert("Mohon isi diagnosa medis."); return; }

    const existingIdx = state.assessments.findIndex(a => a.id === data.id);
    if (existingIdx === -1) {
        state.assessments.push(data);
        const pIdx = state.patients.findIndex(p => p.id === data.patientId);
        if (pIdx > -1) {
            let patient = state.patients[pIdx];
            if (patient.quota && patient.quota > 0) {
                patient.quota = patient.quota - 1;
                state.patients[pIdx] = patient;
                alert(`Data Tersimpan! Sisa paket pasien: ${patient.quota} sesi.`);
                if (patient.quota === 0) setTimeout(() => alert("PERINGATAN: Paket pasien ini SUDAH HABIS hari ini. Silakan tawarkan perpanjangan paket."), 500);
            } else {
                alert('Data Assessment Berhasil Disimpan!');
            }
        }
    } else {
        state.assessments[existingIdx] = data;
        alert('Perubahan Data Assessment Berhasil Disimpan!');
    }

    // TIMESTAMP UPDATE
    data.updatedAt = new Date().toISOString();

    saveData();
    if (state.scriptUrl) pushDataToSheet();

    if (data.plan && data.plan.includes('Lanjut')) {
        let freq = 'once';
        if (data.plan.includes('1x')) freq = '1x';
        else if (data.plan.includes('2x')) freq = '2x';
        else if (data.plan.includes('3x')) freq = '3x';

        if (confirm(`Rencana terapi: ${data.plan}. \nApakah Anda ingin membuat jadwal otomatis sekarang?`)) {
            openAppointmentModal(new Date().toISOString().slice(0, 10), null, { patientId: data.patientId, freq: freq });
            return;
        }
    }
    navigate('assessments');
}

function selectTemplateAndGo(tName) { applyTemplate(tName); showStep2(); }
function goToFormManual() { window.tempFormData.diagnosis = ''; showStep2(); }
function showStep1() { document.getElementById('step-1').classList.remove('hidden'); document.getElementById('step-2').classList.add('hidden'); }
function showStep2() { document.getElementById('step-1').classList.add('hidden'); document.getElementById('step-2').classList.remove('hidden'); const scrollArea = document.getElementById('main-form-scroll'); if (scrollArea) scrollArea.scrollTop = 0; renderIcons(); }
function setTemplateCategory(cat) { currentTemplateCategory = cat; renderAssessmentForm(document.getElementById('main-content'), true); showStep1(); }

// --- 12. PAIN MAP LOGIC ---
function addPainPoint(event) {
    const rect = event.target.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    if (!window.tempFormData.pain_points) window.tempFormData.pain_points = [];
    if (window.tempFormData.pain_points.length >= 10) { alert("Maksimal 10 titik nyeri."); return; }
    window.tempFormData.pain_points.push({ x: x.toFixed(2), y: y.toFixed(2) });
    refreshPainDots();
}

function removePainPoint(index, event) {
    event.stopPropagation();
    if (confirm('Hapus titik ini?')) {
        window.tempFormData.pain_points.splice(index, 1);
        refreshPainDots();
    }
}

function clearPainPoints() {
    if (confirm('Hapus semua titik nyeri?')) {
        window.tempFormData.pain_points = [];
        refreshPainDots();
    }
}

function refreshPainDots() {
    const overlay = document.getElementById('pain-map-overlay');
    if (!overlay) return;
    const points = window.tempFormData.pain_points || [];
    overlay.innerHTML = points.map((p, idx) => `<div onclick="removePainPoint(${idx}, event)" class="pain-point-marker absolute w-6 h-6 -ml-3 -mt-3 bg-red-500/80 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[10px] text-white font-bold hover:scale-125 transition-transform cursor-pointer animate-bounce-short" style="left: ${p.x}%; top: ${p.y}%;" title="Hapus titik ini">${idx + 1}</div>`).join('');
}
// --- 13. APPOINTMENT LOGIC ---
function openAppointmentModal(dateStr, apptId = null, prefillData = null) {
    let appt = { id: '', patientId: '', therapistId: state.user.username, date: dateStr, time: '09:00', notes: '', groupId: null, fee: 0 };
    let defaultFreq = 'once';
    let defaultCount = 6;
    let currentPatientName = '';

    if (apptId) {
        appt = state.appointments.find(a => a.id === apptId);
        const p = state.patients.find(pt => pt.id === appt.patientId);
        if (p) currentPatientName = `${p.name} (${p.id})`;
    } else if (prefillData) {
        appt.patientId = prefillData.patientId;
        if (prefillData.freq) defaultFreq = prefillData.freq;
        const p = state.patients.find(pt => pt.id === prefillData.patientId);
        if (p) {
            appt.fee = p.defaultFee;
            currentPatientName = `${p.name} (${p.id})`;
        }
    }

    const modalHtml = `
        <div class="bg-white px-6 py-4 border-b flex justify-between items-center sticky top-0 z-20">
            <h3 class="text-xl font-bold text-slate-800">${apptId ? 'Edit Jadwal' : 'Booking Jadwal'}</h3>
            <button onclick="closeModal()" class="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200"><i data-lucide="x" width="20"></i></button>
        </div>
        <div class="px-6 py-6 space-y-5 overflow-y-auto modal-scroll flex-1 h-[70vh]">
            <form id="appt-form" autocomplete="off"> <input type="hidden" name="id" value="${appt.id}">
                <input type="hidden" name="groupId" value="${appt.groupId || ''}">
                <div class="space-y-4">
                    <div class="relative">
                        <label class="text-xs font-bold text-slate-500 uppercase block mb-1">Cari Pasien</label>
                        <div class="relative">
                            <i data-lucide="search" class="absolute left-3 top-3 text-slate-400" width="18"></i>
                            <input type="text" id="patient-search-display" value="${currentPatientName}" placeholder="Ketik Nama atau No. RM..." class="w-full border p-2.5 pl-10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-bold text-slate-700">
                            <div id="clear-search" class="absolute right-3 top-3 cursor-pointer text-slate-400 hover:text-red-500 hidden"><i data-lucide="x-circle" width="18"></i></div>
                        </div>
                        <input type="hidden" name="patientId" id="patient-id-value" value="${appt.patientId}" required>
                        <div id="patient-search-results" class="hidden absolute top-full left-0 w-full bg-white border border-slate-200 shadow-xl rounded-lg mt-1 max-h-60 overflow-y-auto z-50 divide-y divide-slate-100"></div>
                    </div>
                    <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                        <label class="text-xs font-bold text-slate-500 uppercase block mb-2">Tipe Layanan Pasien</label>
                        <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <label class="flex-1 flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border cursor-pointer transition-all ${appt.patientType === 'Klinik' ? 'bg-blue-100 border-blue-400 text-blue-800 ring-1 ring-blue-400' : 'bg-white border-slate-300 hover:bg-slate-50'}">
                                <input type="radio" name="patientType" value="Klinik" class="accent-blue-600 w-4 h-4 shrink-0" ${appt.patientType === 'Klinik' ? 'checked' : ''}>
                                <div class="flex-1"><span class="block font-bold text-xs sm:text-sm"><i data-lucide="building-2" width="14" class="inline mr-1 mb-0.5"></i> Pasien Klinik</span><span class="text-[9px] sm:text-[10px] opacity-70">Datang ke Klinik</span></div>
                            </label>
                            <label class="flex-1 flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border cursor-pointer transition-all ${appt.patientType === 'Home Visit' ? 'bg-green-100 border-green-400 text-green-800 ring-1 ring-green-400' : 'bg-white border-slate-300 hover:bg-slate-50'}">
                                <input type="radio" name="patientType" value="Home Visit" class="accent-green-600 w-4 h-4 shrink-0" ${appt.patientType === 'Home Visit' ? 'checked' : ''}>
                                <div class="flex-1"><span class="block font-bold text-xs sm:text-sm"><i data-lucide="home" width="14" class="inline mr-1 mb-0.5"></i> Pasien Visit</span><span class="text-[9px] sm:text-[10px] opacity-70">Kunjungan Rumah</span></div>
                            </label>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Tanggal Mulai</label><input type="date" name="date" value="${appt.date}" required class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></div>
                        <div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Jam</label><input type="time" name="time" value="${appt.time}" required class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Terapis</label><select name="therapistId" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">${state.users.map(u => `<option value="${u.username}" ${u.username === appt.therapistId ? 'selected' : ''}>${u.name}</option>`).join('')}</select></div>
                        <div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Tarif (Rp)</label><input type="number" name="fee" id="appt-fee" value="${appt.fee || 0}" step="5000" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 bg-orange-50 border-orange-200"></div>
                    </div>
                    <div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Catatan</label><textarea name="notes" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-20" placeholder="Contoh: Bawa bola, Cek tensi...">${appt.notes || ''}</textarea></div>
                    ${!apptId ? `<div class="bg-blue-50 p-4 rounded-xl border border-blue-200"><label class="text-xs font-bold text-blue-800 uppercase block mb-2">Opsi Paket Terapi</label><div class="grid grid-cols-2 gap-3 mb-3"><div><label class="text-[10px] text-blue-600 block mb-1">Frekuensi</label><select name="frequency" class="w-full text-sm border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white" onchange="togglePacketCount(this.value)"><option value="once" ${defaultFreq === 'once' ? 'selected' : ''}>Sekali Datang</option><option value="1x" ${defaultFreq === '1x' ? 'selected' : ''}>1x Seminggu (+7 hari)</option><option value="2x" ${defaultFreq === '2x' ? 'selected' : ''}>2x Seminggu (+3/4 hari)</option><option value="3x" ${defaultFreq === '3x' ? 'selected' : ''}>3x Seminggu (+2 hari)</option></select></div><div id="packet-count-box" class="${defaultFreq === 'once' ? 'hidden' : ''}"><label class="text-[10px] text-blue-600 block mb-1">Total Sesi</label><input type="number" name="packetCount" value="${defaultCount}" min="2" max="24" class="w-full text-sm border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"></div></div><p class="text-[10px] text-blue-500 italic">*Jadwal otomatis dibuat sesuai pola frekuensi.</p></div>` : ''}
                    ${apptId && appt.groupId ? `<div class="bg-yellow-50 p-3 rounded-lg border border-yellow-200 flex items-start gap-2"><i data-lucide="layers" width="16" class="text-yellow-600 mt-0.5"></i><div><p class="text-xs font-bold text-yellow-800">Bagian dari Paket Terapi</p><p class="text-[10px] text-yellow-700">Jadwal ini terhubung dengan sesi lainnya.</p></div></div>` : ''}
                </div>
            </form>
        </div>
        <div class="bg-slate-50 px-6 py-4 border-t flex justify-between sticky bottom-0 z-20">
            ${apptId ? `<button onclick="deleteAppointment('${appt.id}')" class="px-4 py-2.5 bg-red-100 text-red-600 rounded-lg font-bold hover:bg-red-200 transition-colors text-sm">Hapus</button>` : '<div></div>'}
            <div class="flex gap-2">
                <button onclick="closeModal()" class="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm">Batal</button>
                ${appt.status === 'PENDING' ? `
                <button onclick="confirmAppointment('${appt.id}')" class="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md transition-all btn-press text-sm flex items-center gap-2 font-bold"><i data-lucide="check" width="16"></i> Terima Booking</button>
                ` : `
                <button onclick="saveAppointment()" class="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-all btn-press text-sm flex items-center gap-2 font-bold"><i data-lucide="save" width="16"></i> Simpan</button>
                `}
            </div>
        </div>`;

    document.getElementById('modal-content').innerHTML = modalHtml;
    document.getElementById('modal-container').classList.remove('hidden');
    lucide.createIcons();

    // SEARCH LOGIC
    const searchInput = document.getElementById('patient-search-display');
    const resultBox = document.getElementById('patient-search-results');
    const hiddenInput = document.getElementById('patient-id-value');
    const feeInput = document.getElementById('appt-fee');
    const clearBtn = document.getElementById('clear-search');

    if (searchInput.value) clearBtn.classList.remove('hidden');

    searchInput.addEventListener('input', function () {
        const query = this.value.toLowerCase();
        if (query.length > 0) clearBtn.classList.remove('hidden'); else clearBtn.classList.add('hidden');
        hiddenInput.value = '';
        if (query.length === 0) { resultBox.classList.add('hidden'); return; }
        const matches = state.patients.filter(p => p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query));
        if (matches.length > 0) {
            resultBox.innerHTML = matches.map(p => `
                <div class="p-3 hover:bg-blue-50 cursor-pointer transition-colors flex justify-between items-center group" onclick="selectPatientSearch('${p.id}', '${p.name}', ${p.defaultFee || 0})">
                    <div><div class="font-bold text-slate-700 text-sm group-hover:text-blue-700">${p.name}</div><div class="text-[10px] text-slate-400 font-mono">${p.id} • ${p.diagnosis || '-'}</div></div>
                    <div class="text-xs font-bold text-slate-400 group-hover:text-blue-600">Pilih</div>
                </div>`).join('');
            resultBox.classList.remove('hidden');
        } else {
            resultBox.innerHTML = `<div class="p-4 text-center text-xs text-slate-400 italic">Pasien tidak ditemukan.</div>`;
            resultBox.classList.remove('hidden');
        }
    });

    clearBtn.addEventListener('click', function () {
        searchInput.value = ''; hiddenInput.value = ''; feeInput.value = 0;
        resultBox.classList.add('hidden'); this.classList.add('hidden'); searchInput.focus();
    });

    document.addEventListener('click', function (e) {
        if (!searchInput.contains(e.target) && !resultBox.contains(e.target)) resultBox.classList.add('hidden');
    });
}

window.selectPatientSearch = function (id, name, fee) {
    document.getElementById('patient-search-display').value = `${name} (${id})`;
    document.getElementById('patient-id-value').value = id;
    document.getElementById('appt-fee').value = fee;
    document.getElementById('patient-search-results').classList.add('hidden');
    document.getElementById('clear-search').classList.remove('hidden');
};

function togglePacketCount(val) {
    const box = document.getElementById('packet-count-box');
    if (val === 'once') box.classList.add('hidden'); else box.classList.remove('hidden');
}

function saveAppointment() {
    const form = document.getElementById('appt-form');
    const id = form.querySelector('[name="id"]').value;
    const patientId = form.querySelector('[name="patientId"]').value;
    const date = form.querySelector('[name="date"]').value;
    const time = form.querySelector('[name="time"]').value;
    const therapistId = form.querySelector('[name="therapistId"]').value;
    const notes = form.querySelector('[name="notes"]').value;
    const fee = parseInt(form.querySelector('[name="fee"]').value) || 0;
    const patientType = form.querySelector('[name="patientType"]:checked')?.value || 'Klinik';

    // New Params
    const frequency = form.querySelector('[name="frequency"]')?.value || 'once';
    const packetCount = parseInt(form.querySelector('[name="packetCount"]')?.value || '1');

    if (!patientId || !date || !time) { alert("Data wajib diisi!"); return; }
    const updates = { patientId, time, therapistId, notes, fee, patientType, updatedAt: new Date().toISOString() };

    if (id) {
        const originalAppt = state.appointments.find(a => a.id === id);
        if (originalAppt && originalAppt.groupId) {
            showSeriesOptions("Edit Jadwal Berulang", "Apakah Anda ingin mengubah jadwal ini saja atau seluruh paket?",
                () => { // Single
                    const idx = state.appointments.findIndex(a => a.id === id);
                    if (idx > -1) { state.appointments[idx] = { ...state.appointments[idx], ...updates, date, groupId: null }; finalizeSave(); }
                },
                () => { // All
                    state.appointments.forEach(a => {
                        if (a.groupId === originalAppt.groupId) {
                            a.time = time; a.therapistId = therapistId; a.notes = notes; a.fee = fee;
                            a.updatedAt = new Date().toISOString();
                        }
                    });
                    const idx = state.appointments.findIndex(a => a.id === id);
                    if (idx > -1) state.appointments[idx].date = date;
                    finalizeSave();
                }
            );
            return;
        } else {
            const idx = state.appointments.findIndex(a => a.id === id);
            if (idx > -1) { state.appointments[idx] = { ...state.appointments[idx], ...updates, date }; finalizeSave(); }
        }
    } else {
        const newAppointments = [];
        let currentDate = new Date(date);
        let totalSessions = (frequency === 'once') ? 1 : packetCount;
        const newGroupId = (totalSessions > 1) ? 'GRP' + Date.now() : null;

        for (let i = 0; i < totalSessions; i++) {
            newAppointments.push({ id: `APT${Date.now()}-${i}`, date: currentDate.toISOString().slice(0, 10), ...updates, groupId: newGroupId, patientType });
            if (frequency === '1x') currentDate.setDate(currentDate.getDate() + 7);
            else if (frequency === '2x') currentDate.setDate(currentDate.getDate() + (i % 2 === 0 ? 3 : 4));
            else if (frequency === '3x') { const mod = i % 3; currentDate.setDate(currentDate.getDate() + (mod === 2 ? 3 : 2)); }
        }
        state.appointments.push(...newAppointments);
        alert(`${newAppointments.length} jadwal berhasil dibuat!`);
        finalizeSave();
    }
}

function confirmAppointment(id) {
    const idx = state.appointments.findIndex(a => a.id === id);
    if (idx > -1) {
        state.appointments[idx].status = 'CONFIRMED';
        state.appointments[idx].updatedAt = new Date().toISOString();
        saveData();
        if (state.scriptUrl) pushDataToSheet();
        alert("Booking Diterima!");
        closeModal();
        renderScheduleView(document.getElementById('main-content'));
    }
}

function deleteAppointment(id) {
    const appt = state.appointments.find(a => a.id === id);
    if (appt && appt.groupId) {
        showSeriesOptions("Hapus Jadwal Berulang", "Apakah Anda ingin menghapus jadwal ini saja atau seluruh paket?",
            () => { state.appointments = state.appointments.filter(a => a.id !== id); finalizeDelete(); },
            () => { state.appointments = state.appointments.filter(a => a.groupId !== appt.groupId); finalizeDelete(); }
        );
    } else {
        if (confirm('Hapus jadwal ini?')) { state.appointments = state.appointments.filter(a => a.id !== id); finalizeDelete(); }
    }
}

function finalizeSave() {
    saveData();
    if (state.scriptUrl) pushDataToSheet();
    closeModal();
    document.getElementById('choice-modal').classList.add('hidden');
    if (state.currentView === 'schedule') renderScheduleView(document.getElementById('main-content'));
    else navigate('schedule');
}

function finalizeDelete() {
    saveData();
    closeModal();
    document.getElementById('choice-modal').classList.add('hidden');
    renderScheduleView(document.getElementById('main-content'));
}

function showSeriesOptions(title, message, onSingle, onSeries) {
    const modal = document.getElementById('choice-modal');
    document.getElementById('choice-title').innerText = title;
    document.getElementById('choice-desc').innerText = message;
    const btnOne = document.getElementById('btn-choice-one');
    const btnAll = document.getElementById('btn-choice-all');
    const newBtnOne = btnOne.cloneNode(true);
    const newBtnAll = btnAll.cloneNode(true);
    btnOne.parentNode.replaceChild(newBtnOne, btnOne);
    btnAll.parentNode.replaceChild(newBtnAll, btnAll);
    newBtnOne.onclick = onSingle;
    newBtnAll.onclick = onSeries;
    modal.classList.remove('hidden');
}

// --- 14. PATIENT MODAL ---
function openPatientModal(id = null) {
    const p = id ? state.patients.find(pat => pat.id === id) : { id: '', name: '', gender: 'L', dob: '', phone: '', job: '', address: '', diagnosis: '', category: 'Klinik', quota: 0 };
    if (!p.category) p.category = 'Klinik';

    const modalHtml = `
        <div class="bg-white px-6 py-4 border-b flex justify-between items-center sticky top-0 z-20">
            <h3 class="text-xl font-bold text-slate-800">${id ? 'Edit Pasien' : 'Pasien Baru'}</h3>
            <button onclick="closeModal()" class="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"><i data-lucide="x" width="20"></i></button>
        </div>
        <div class="px-6 py-6 space-y-5 overflow-y-auto modal-scroll flex-1">
            <form id="patient-form">
                <input type="hidden" name="id" value="${p.id}">
                <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <label class="text-xs font-bold text-slate-500 uppercase block mb-2">Kategori Layanan</label>
                    <div class="flex gap-3">
                        <label class="flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${p.category === 'Klinik' ? 'bg-blue-100 border-blue-400 text-blue-800 ring-1 ring-blue-400' : 'bg-white border-slate-300 hover:bg-slate-50'}">
                            <input type="radio" name="category" value="Klinik" class="accent-blue-600 w-4 h-4" ${p.category === 'Klinik' ? 'checked' : ''}>
                            <div><span class="block font-bold text-sm">Datang ke Klinik</span><span class="text-[10px] opacity-70">Rawat Jalan</span></div>
                        </label>
                        <label class="flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${p.category === 'Home Visit' ? 'bg-orange-100 border-orange-400 text-orange-800 ring-1 ring-orange-400' : 'bg-white border-slate-300 hover:bg-slate-50'}">
                            <input type="radio" name="category" value="Home Visit" class="accent-orange-600 w-4 h-4" ${p.category === 'Home Visit' ? 'checked' : ''}>
                            <div><span class="block font-bold text-sm">Home Visit</span><span class="text-[10px] opacity-70">Kunjungan Rumah</span></div>
                        </label>
                    </div>
                </div>
                <div class="bg-purple-50 p-3 rounded-lg border border-purple-200">
                    <div class="flex justify-between items-center mb-2"><label class="text-xs font-bold text-purple-800 uppercase flex items-center gap-1"><i data-lucide="package" width="14"></i> Paket & Tarif</label><span class="text-[10px] text-purple-600 bg-white px-2 py-0.5 rounded border border-purple-100">Opsional</span></div>
                    <div class="grid grid-cols-2 gap-4">
                        <div><label class="text-[10px] text-purple-700 block mb-1">Sisa Sesi (Kuota)</label><input type="number" name="quota" value="${p.quota || 0}" min="0" class="w-full border p-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-center font-bold text-slate-700"></div>
                        <div><label class="text-[10px] text-purple-700 block mb-1">Tarif Per Datang (Rp)</label><input type="number" name="defaultFee" value="${p.defaultFee || 0}" step="5000" class="w-full border p-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-center font-bold text-slate-700"></div>
                    </div>
                </div>
                <div class="space-y-4">
                    <div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Nama Lengkap</label><input type="text" name="name" value="${p.name}" required class="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"></div>
                    <div class="bg-white p-3 rounded-lg border border-slate-200">
                        <div class="flex justify-between items-center mb-2"><label class="text-xs font-bold text-slate-500 uppercase">Kelahiran</label><div class="flex bg-slate-100 rounded-md p-0.5"><button type="button" id="btn-mode-date" onclick="toggleDobMode('date')" class="px-3 py-1 text-[10px] font-bold rounded bg-white text-blue-600 shadow-sm transition-all">Tanggal</button><button type="button" id="btn-mode-age" onclick="toggleDobMode('age')" class="px-3 py-1 text-[10px] font-bold rounded text-slate-500 hover:text-slate-700 transition-all">Usia</button></div></div>
                        <div id="input-box-date"><input type="date" id="inp-dob-date" value="${p.dob}" class="w-full border border-slate-300 bg-white p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"></div>
                        <div id="input-box-age" class="hidden"><div class="flex items-center gap-2"><input type="number" id="inp-dob-age" placeholder="Contoh: 45" class="w-full border border-slate-300 bg-white p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"><span class="text-sm font-bold text-slate-500">Tahun</span></div></div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Jenis Kelamin</label><div class="flex gap-2 mt-1"><label class="flex-1 flex items-center justify-center gap-2 cursor-pointer text-xs p-2.5 rounded border ${p.gender === 'L' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200'}"><input type="radio" name="gender" value="L" ${p.gender === 'L' ? 'checked' : ''} class="accent-blue-600"> Laki</label><label class="flex-1 flex items-center justify-center gap-2 cursor-pointer text-xs p-2.5 rounded border ${p.gender === 'P' ? 'bg-pink-50 border-pink-200 text-pink-700' : 'border-slate-200'}"><input type="radio" name="gender" value="P" ${p.gender === 'P' ? 'checked' : ''} class="accent-pink-600"> Pr</label></div></div>
                        <div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">No HP</label><input type="text" name="phone" value="${p.phone}" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"></div>
                    </div>
                    <div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Pekerjaan</label><input type="text" name="job" value="${p.job}" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"></div>
                    <div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Alamat Domisili</label><textarea name="address" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm h-20 resize-none placeholder-slate-300" placeholder="Jalan, RT/RW, Kelurahan...">${p.address || ''}</textarea></div>
                    <div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Diagnosa Medis</label><input type="text" name="diagnosis" value="${p.diagnosis}" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"></div>
                </div>
            </form>
        </div>
        <div class="bg-slate-50 px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 z-20">
            <button onclick="closeModal()" class="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm">Batal</button>
            <button onclick="submitPatientForm()" class="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-all btn-press text-sm flex items-center gap-2 font-bold"><i data-lucide="save" width="16"></i> Simpan Data</button>
        </div>
    `;
    document.getElementById('modal-content').innerHTML = modalHtml;
    document.getElementById('modal-container').classList.remove('hidden');
    lucide.createIcons();
}

function submitPatientForm() {
    const form = document.getElementById('patient-form');
    let finalDob = '';
    const boxDateVisible = !document.getElementById('input-box-date').classList.contains('hidden');
    if (boxDateVisible) {
        finalDob = document.getElementById('inp-dob-date').value;
    } else {
        const ageVal = document.getElementById('inp-dob-age').value;
        if (ageVal) {
            const currentYear = new Date().getFullYear();
            finalDob = `${currentYear - parseInt(ageVal)}-01-01`;
        }
    }

    const newP = {
        id: form.querySelector('[name="id"]').value || generateNextRM(),
        name: form.querySelector('[name="name"]').value,
        category: form.querySelector('[name="category"]:checked')?.value || 'Klinik',
        gender: form.querySelector('[name="gender"]:checked')?.value || 'L',
        dob: finalDob,
        phone: form.querySelector('[name="phone"]').value,
        job: form.querySelector('[name="job"]').value,
        address: form.querySelector('[name="address"]').value,
        diagnosis: form.querySelector('[name="diagnosis"]').value,
        quota: parseInt(form.querySelector('[name="quota"]').value) || 0,
        defaultFee: parseInt(form.querySelector('[name="defaultFee"]').value) || 0,
        updatedAt: new Date().toISOString()
    };

    if (!newP.name) { alert('Nama wajib diisi!'); return; }

    const idx = state.patients.findIndex(p => p.id === newP.id);
    if (idx > -1) state.patients[idx] = newP;
    else state.patients.push(newP);

    saveData();
    if (state.scriptUrl) pushDataToSheet();
    closeModal();
    renderPatientList(document.getElementById('main-content'));
}

function toggleDobMode(mode) {
    const btnDate = document.getElementById('btn-mode-date');
    const btnAge = document.getElementById('btn-mode-age');
    const boxDate = document.getElementById('input-box-date');
    const boxAge = document.getElementById('input-box-age');

    if (mode === 'date') {
        btnDate.className = "px-3 py-1 text-[10px] font-bold rounded bg-blue-100 text-blue-700 transition-all";
        btnAge.className = "px-3 py-1 text-[10px] font-bold rounded text-slate-500 hover:bg-slate-50 transition-all";
        boxDate.classList.remove('hidden'); boxAge.classList.add('hidden');
    } else {
        btnAge.className = "px-3 py-1 text-[10px] font-bold rounded bg-blue-100 text-blue-700 transition-all";
        btnDate.className = "px-3 py-1 text-[10px] font-bold rounded text-slate-500 hover:bg-slate-50 transition-all";
        boxAge.classList.remove('hidden'); boxDate.classList.add('hidden');
    }
}

// --- 15. CONFIG & USER MGMT ---
function renderConfigView(container) {
    const conf = state.pdfConfig || {};
    container.innerHTML = `
    <div class="fade-in pb-20">
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div class="p-6 border-b border-slate-100"><h2 class="text-2xl font-black text-slate-800">Konfigurasi Sistem</h2><p class="text-slate-500 text-sm">Atur identitas klinik dan tampilan hasil cetak.</p></div>
            <div class="flex bg-slate-50 overflow-x-auto">
                <button onclick="switchConfigTab('identity')" id="tab-btn-identity" class="px-6 py-3 text-sm font-bold text-blue-600 border-b-2 border-blue-600 bg-white transition-colors flex items-center gap-2"><i data-lucide="building-2" width="16"></i> Identitas Klinik</button>
                <button onclick="switchConfigTab('print')" id="tab-btn-print" class="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"><i data-lucide="printer" width="16"></i> Layout Cetak (PDF)</button>
                <button onclick="switchConfigTab('notif')" id="tab-btn-notif" class="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"><i data-lucide="bell" width="16"></i> Notifikasi</button>
                <button onclick="switchConfigTab('system')" id="tab-btn-system" class="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"><i data-lucide="database" width="16"></i> Data & User</button>
                <button onclick="switchConfigTab('license')" id="tab-btn-license" class="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"><i data-lucide="crown" width="16"></i> Status Langganan</button>
                <button onclick="switchConfigTab('booking')" id="tab-btn-booking" class="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"><i data-lucide="calendar-check" width="16"></i> Booking Online</button>
            </div>
        </div>

        <div id="tab-content-license" class="config-tab-content hidden">
            <div class="bg-white p-8 rounded-xl shadow border border-slate-200 text-center max-w-2xl mx-auto">
                <div class="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i data-lucide="crown" width="40"></i>
                </div>
                <h3 class="text-2xl font-black text-slate-800 mb-2">Status Berlangganan</h3>
                <p class="text-slate-500 mb-8">Informasi masa aktif lisensi aplikasi Anda.</p>
                
                <div class="grid grid-cols-2 gap-4 text-left max-w-md mx-auto mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100 text-sm">
                    <div class="text-slate-500 font-bold">Paket Saat Ini</div>
                    <div class="font-bold text-slate-800 text-right" id="conf-lic-plan">-</div>
                    
                    <div class="text-slate-500 font-bold">Status</div>
                    <div class="font-bold text-green-600 text-right uppercase" id="conf-lic-status">-</div>
                    
                    <div class="text-slate-500 font-bold">Berlaku Sampai</div>
                    <div class="font-bold text-slate-800 text-right" id="conf-lic-expiry">-</div>
                </div>

                <div class="mb-8">
                    <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">SISA WAKTU</div>
                    <div class="text-5xl font-black text-blue-600 font-mono tracking-tight" id="conf-lic-countdown">-- : -- : --</div>
                </div>

                <button onclick="refreshLicenseStatus()" class="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 mx-auto">
                    <i data-lucide="refresh-cw" width="16"></i> Perbarui Status Lisensi
                </button>
            </div>
        </div>
        </div>

        <div id="tab-content-booking" class="config-tab-content hidden">
            <div class="bg-white p-6 rounded-xl shadow border border-slate-200">
                <div class="flex items-center gap-3 mb-6 border-b pb-4">
                    <div class="p-3 bg-emerald-50 rounded-full text-emerald-600"><i data-lucide="calendar-check" width="24"></i></div>
                    <div><h3 class="font-bold text-lg text-slate-800">Pengaturan Booking Online</h3><p class="text-xs text-slate-500">Buat link booking unik untuk dibagikan ke pasien.</p></div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="space-y-5">
                        <div>
                            <label class="text-xs font-bold text-slate-500 uppercase block mb-1.5">Alias Klinik (ID Booking)</label>
                            <div class="flex gap-2">
                                <span class="bg-slate-100 text-slate-500 px-3 py-2.5 rounded-l-lg border border-r-0 text-xs font-mono font-bold border-slate-200">booking/?id=</span>
                                <input type="text" id="conf-booking-alias" placeholder="nama-klinik-anda"
                                    oninput="updateBookingLinkPreview()"
                                    value="${localStorage.getItem('erm_booking_alias') || ''}"
                                    class="flex-1 border border-slate-200 p-2.5 rounded-r-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono">
                            </div>
                            <p class="text-[11px] text-slate-400 mt-1">Huruf kecil, tanpa spasi, gunakan tanda hubung (-). Contoh: <i>klinik-sehat-blitar</i></p>
                        </div>

                        <div>
                            <label class="text-xs font-bold text-slate-500 uppercase block mb-2">Jam Tersedia</label>
                            <div class="grid grid-cols-3 gap-2">
                                ${['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map(h => {
        const saved = localStorage.getItem('erm_booking_hours') || '08:00,09:00,10:00,11:00,13:00,14:00,15:00,16:00';
        const checked = saved.split(',').includes(h) ? 'checked' : '';
        return `<label class="flex items-center gap-1.5 text-sm cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg">
                                        <input type="checkbox" value="${h}" ${checked} onchange="updateBookingLinkPreview()" class="booking-hour-check w-4 h-4 accent-emerald-500">
                                        <span class="font-medium text-slate-700">${h}</span>
                                    </label>`;
    }).join('')}
                            </div>
                        </div>

                        <button onclick="saveBookingConfig()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg btn-press flex items-center gap-2">
                            <i data-lucide="save" width="16"></i> Simpan & Generate Link
                        </button>
                    </div>

                    <div class="space-y-4">
                        <div class="bg-slate-50 p-5 rounded-xl border border-slate-200">
                            <h4 class="font-bold text-slate-700 mb-3 flex items-center gap-2"><i data-lucide="link" width="16"></i> Link Booking Anda</h4>
                            <div id="booking-link-display" class="bg-white p-3 rounded-lg border border-slate-200 text-xs font-mono text-slate-500 break-all min-h-[48px] flex items-center">
                                <span class="italic">Isi Alias dan klik Simpan...</span>
                            </div>
                            <button onclick="copyBookingLink()" id="btn-copy-link" class="mt-3 w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2">
                                <i data-lucide="copy" width="14"></i> Salin Link
                            </button>
                        </div>
                        <div class="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-700">
                            <p class="font-bold mb-1">📋 Cara Pakai:</p>
                            <ol class="list-decimal list-inside space-y-1 text-xs">
                                <li>Isi Alias unik klinik Anda di kiri.</li>
                                <li>Centang jam-jam yang tersedia.</li>
                                <li>Klik <b>Simpan & Generate Link</b>.</li>
                                <li>Salin link dan bagikan ke pasien (WA, IG, dll).</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div id="tab-content-identity" class="config-tab-content block">
            <div class="bg-white p-6 rounded-xl shadow border border-slate-200">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-4">
                        <div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Nama Klinik (Judul)</label><input type="text" id="conf-name" value="${state.clinicInfo.name}" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"></div>
                        <div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Sub-Judul / Tagline</label><input type="text" id="conf-sub" value="${state.clinicInfo.subname}" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"></div>
                        <div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Nama Fisioterapis (Ttd)</label><input type="text" id="conf-therapist" value="${state.clinicInfo.therapist}" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"></div>
                    </div>
                    <div class="space-y-4">
                        <div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Nomor Izin / SIPF</label><input type="text" id="conf-sipf" value="${state.clinicInfo.sipf}" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"></div>
                        <div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Alamat (Kop Surat)</label><textarea id="conf-address" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm h-24">${state.clinicInfo.address}</textarea></div>
                        <div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">📞 No. Telepon / WA Klinik</label><input type="text" id="conf-phone" value="${state.clinicInfo.phone || ''}" placeholder="0812-3456-7890" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"></div>
                        <div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">🏷️ NPWP Klinik / Pribadi</label><input type="text" id="conf-npwp" value="${state.clinicInfo.npwp || ''}" placeholder="00.000.000.0-000.000" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"></div>
                        <div class="col-span-full mt-4 bg-purple-50 p-5 rounded-2xl border-2 border-purple-100">
                            <h4 class="font-bold text-purple-800 flex items-center gap-2 mb-3"><i data-lucide="qr-code" width="18"></i> Pengaturan QRIS Statis</h4>
                            <div class="flex flex-col md:flex-row gap-6">
                                <div class="shrink-0">
                                    <div id="qris-preview-container" class="w-40 h-40 bg-white rounded-xl border-2 border-dashed border-purple-200 flex items-center justify-center overflow-hidden">
                                        ${state.clinicInfo.qrisImage
            ? `<img src="${state.clinicInfo.qrisImage}" class="w-full h-full object-contain">`
            : `<div class="text-center text-slate-300"><i data-lucide="image" width="32" class="mx-auto mb-1"></i><p class="text-[10px]">Belum ada QR</p></div>`}
                                    </div>
                                </div>
                                <div class="flex-1 space-y-3">
                                    <p class="text-xs text-slate-600">Upload gambar QRIS statis klinik Anda (format JPG/PNG). Gambar ini akan muncul di modal pembayaran saat metode QRIS dipilih.</p>
                                    <input type="file" id="conf-qris-file" accept="image/*" onchange="handleQrisUpload(this)" class="hidden">
                                    <div class="flex gap-2">
                                        <button onclick="document.getElementById('conf-qris-file').click()" class="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-sm">
                                            <i data-lucide="upload" width="16"></i> Pilih Gambar
                                        </button>
                                        ${state.clinicInfo.qrisImage ? `<button onclick="removeQrisImage()" class="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors">Hapus</button>` : ''}
                                    </div>
                                    <input type="hidden" id="conf-qris-base64" value="${state.clinicInfo.qrisImage || ''}">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="mt-6 pt-4 border-t border-slate-100 text-right"><button onclick="saveClinicConfig()" id="btn-save-clinic" class="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-lg btn-press flex items-center gap-2 ml-auto"><i data-lucide="save" width="16"></i> Simpan & Sinkron Cloud</button></div>
            </div>
        </div>

        <div id="tab-content-print" class="config-tab-content hidden">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white p-6 rounded-xl shadow border border-slate-200 h-fit space-y-6">
                    <div><h3 class="font-bold text-slate-800 mb-3 border-b pb-1 text-sm uppercase">Layout</h3><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Kepadatan Teks</label><select onchange="updatePdfConfig('layoutMode', this.value)" class="w-full border p-2 rounded-lg text-sm bg-slate-50"><option value="compact" ${conf.layoutMode === 'compact' ? 'selected' : ''}>Padat (Hemat Kertas)</option><option value="normal" ${conf.layoutMode === 'normal' ? 'selected' : ''}>Normal (Standar)</option><option value="relaxed" ${conf.layoutMode === 'relaxed' ? 'selected' : ''}>Longgar (Luas)</option></select></div>
                    <div><h3 class="font-bold text-slate-800 mb-3 border-b pb-1 text-sm uppercase">Tipografi</h3>
                        <div class="mb-3"><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Jenis Font</label><select onchange="updatePdfConfig('fontFamily', this.value)" class="w-full border p-2 rounded-lg text-sm bg-slate-50"><option value="sans" ${conf.fontFamily === 'sans' ? 'selected' : ''}>Modern (Sans-Serif)</option><option value="serif" ${conf.fontFamily === 'serif' ? 'selected' : ''}>Formal (Serif/Times)</option><option value="mono" ${conf.fontFamily === 'mono' ? 'selected' : ''}>Teknis (Monospace)</option></select></div>
                        <div class="mb-3"><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Ukuran Font Dasar</label><select onchange="updatePdfConfig('fontSize', this.value)" class="w-full border p-2 rounded-lg text-sm bg-slate-50"><option value="9pt" ${conf.fontSize === '9pt' ? 'selected' : ''}>Kecil (9pt)</option><option value="10pt" ${(conf.fontSize === '10pt' || !conf.fontSize) ? 'selected' : ''}>Normal (10pt)</option><option value="11pt" ${conf.fontSize === '11pt' ? 'selected' : ''}>Sedang (11pt)</option><option value="12pt" ${conf.fontSize === '12pt' ? 'selected' : ''}>Besar (12pt)</option></select></div>
                    </div>
                    <div><label class="text-xs font-bold text-slate-500 uppercase block mb-2">Warna Aksen</label>
                        <div class="flex flex-wrap gap-2 mb-2">
                            ${['#2563eb', '#4f46e5', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#d97706', '#16a34a', '#0d9488', '#0891b2', '#1e293b'].map(c => `
                                <button onclick="updatePdfConfig('accentColor', '${c}')" class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${conf.accentColor === c ? 'border-slate-800 ring-2 ring-slate-200 scale-110' : 'border-transparent'}" style="background-color: ${c};"></button>
                            `).join('')}
                        </div>
                        <div class="flex items-center gap-2">
                            <input type="color" value="${conf.accentColor.startsWith('#') ? conf.accentColor : '#2563eb'}" onchange="updatePdfConfig('accentColor', this.value)" class="w-8 h-8 p-0 border-0 rounded cursor-pointer">
                            <span class="text-xs text-slate-500 font-bold">Custom Color</span>
                        </div>
                    </div>
                </div>
                <div class="md:col-span-2 bg-white p-6 rounded-xl shadow border border-slate-200">
                    <h3 class="font-bold text-slate-800 mb-4 border-b pb-2">Pilih Bagian yang Ditampilkan</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                        ${renderPdfToggle('showKop', 'Kop Surat (Header)', conf.showKop)}
                        ${renderPdfToggle('showPatientInfo', 'Identitas Pasien', conf.showPatientInfo)}
                        ${renderPdfToggle('showDiagnosis', 'Diagnosa & ICD-10', conf.showDiagnosis)}
                        ${renderPdfToggle('showAnamnesis', 'Anamnesis (Keluhan)', conf.showAnamnesis)}
                        ${renderPdfToggle('showBodyChart', 'Peta Nyeri (Body Chart)', conf.showBodyChart)}
                        ${renderPdfToggle('showObjective', 'Data Objektif (VAS/ROM/MMT)', conf.showObjective)}
                        ${renderPdfToggle('showImpairment', 'Impairment (Body Func/Struct)', conf.showImpairment)}
                        ${renderPdfToggle('showLimitation', 'Limitation (Act & Part)', conf.showLimitation)}
                        ${renderPdfToggle('showIntervention', 'Intervensi & Terapi', conf.showIntervention)}
                        ${renderPdfToggle('showEvalPlan', 'Evaluasi & Rencana', conf.showEvalPlan)}
                        ${renderPdfToggle('showSignature', 'Kolom Tanda Tangan', conf.showSignature)}
                    </div>
                </div>
            </div>
        </div>

        <div id="tab-content-notif" class="config-tab-content hidden">
            <div class="bg-white p-6 rounded-xl shadow border border-slate-200">
                <div class="flex items-center gap-3 mb-6 border-b pb-4">
                    <div class="p-3 bg-blue-50 rounded-full text-blue-600"><i data-lucide="bell-ring" width="24"></i></div>
                    <div><h3 class="font-bold text-lg text-slate-800">Notifikasi Reminder</h3><p class="text-xs text-slate-500">Atur pengiriman jadwal otomatis via Telegram & Email.</p></div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="space-y-4">
                        <div class="bg-sky-50 p-4 rounded-xl border border-sky-100">
                            <h4 class="font-bold text-sky-800 flex items-center gap-2 mb-3"><i data-lucide="send" width="16"></i> Setup Telegram</h4>
                            <div class="mb-3">
                                <p class="text-[11px] text-slate-600 mb-2">1. Pastikan Bot Aktif (Pilih A atau B):<br>
                                A. <strong>Japri (DM)</strong> Bot & klik START.<br>
                                B. <strong>Undang</strong> Bot ke Grup Klinik Anda.<br>
                                <span class="bg-sky-100 text-sky-700 font-mono px-1 rounded select-all text-[10px]">@asistenfisiobot</span> (Contoh)</p>
                                <p class="text-[11px] text-slate-600">2. Masukkan Chat ID (User ID / Group ID):</p>
                            </div>
                            <div class="space-y-3">
                                <div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Chat ID (Wajib)</label><input type="text" id="notif-tg-chatid" value="${state.notificationConfig.telegramChatId || ''}" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none text-sm font-mono" placeholder="-100xxxxxxx"></div>
                                <div><label class="text-xs font-bold text-slate-400 uppercase block mb-1">Bot Token (Opsional)</label><input type="text" id="notif-tg-token" value="${state.notificationConfig.telegramToken || ''}" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none text-xs font-mono text-slate-400" placeholder="Kosongkan jika pakai Bot Pusat"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="bg-amber-50 p-4 rounded-xl border border-amber-100">
                            <h4 class="font-bold text-amber-800 flex items-center gap-2 mb-3"><i data-lucide="mail" width="16"></i> Setup Email</h4>
                            <div class="space-y-3">
                                <div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Email Tujuan (Penerima)</label><input type="email" id="notif-email-target" value="${state.notificationConfig.targetEmail || ''}" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm" placeholder="anda@gmail.com"></div>
                                <div>
                                    <label class="text-xs font-bold text-slate-500 uppercase block mb-1 flex justify-between"><span>Email Pengirim (Opsional)</span><span class="text-[10px] text-amber-600">*Harus Alias Terverifikasi</span></label>
                                    <input type="email" id="notif-email-sender" value="${state.notificationConfig.senderEmail || ''}" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm" placeholder="admin@klinik.com">
                                    <p class="text-[10px] text-slate-400 mt-1 italic">Kosongkan jika ingin menggunakan email akun utama Google.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-8 pt-4 border-t border-slate-100 text-right">
                    <button onclick="saveNotificationConfig()" class="bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-900 shadow-lg btn-press flex items-center gap-2 ml-auto"><i data-lucide="save" width="16"></i> Simpan Konfigurasi</button>
                </div>
            </div>
        </div>

        <div id="tab-content-system" class="config-tab-content hidden">
             <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-white p-6 rounded-xl shadow border border-slate-200">
                    <div class="flex justify-between items-center mb-4"><h3 class="font-bold text-lg text-slate-800">Manajemen User</h3><button onclick="openUserModal()" class="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-700 flex gap-1 items-center"><i data-lucide="plus" width="14"></i> Baru</button></div>
                    <div class="max-h-48 overflow-y-auto">
                        <table class="w-full text-sm text-left"><tbody class="divide-y divide-slate-100">${state.users.map(u => `<tr><td class="py-2"><span class="font-bold text-slate-700">${u.name}</span><br><span class="text-xs text-slate-400">@${u.username}</span></td><td class="text-right"><button onclick="openUserModal('${u.id}')" class="text-blue-600 p-1"><i data-lucide="edit-3" width="14"></i></button>${u.username !== 'admin' ? `<button onclick="deleteUser('${u.id}')" class="text-red-600 p-1"><i data-lucide="trash-2" width="14"></i></button>` : ''}</td></tr>`).join('')}</tbody></table>
                    </div>
                </div>
                <div class="space-y-6">
                    <div class="bg-white p-6 rounded-xl shadow border border-slate-200">
                        <h3 class="font-bold text-lg text-slate-800 mb-2">Integrasi Cloud Storage</h3>
                        <p class="text-xs text-slate-500 mb-2">Masukkan URL Spreadsheet Google milik Klinik.</p>
                        <input type="text" id="script-url" value="${state.scriptUrl}" placeholder="https://docs.google.com/spreadsheets/d/..." class="w-full border p-2 rounded text-xs font-mono bg-slate-50 mb-1">
                        <p class="text-[10px] text-slate-400 mb-3 italic">*Pastikan Sheet di-SHARE (Editor) ke Email Script Server:<br><strong class="text-blue-600">contactlazuardy@gmail.com</strong></p>
                        <button onclick="saveConfig()" class="bg-slate-800 text-white w-full py-2 rounded text-sm font-bold mb-4">Simpan & Koneksikan</button>
                        <div class="flex gap-2">
                            <button onclick="pullDataFromSheet()" class="flex-1 border p-2 rounded text-xs font-bold hover:bg-slate-50">Tarik Data</button>
                            <button onclick="pushDataToSheet()" class="flex-1 border p-2 rounded text-xs font-bold hover:bg-slate-50">Kirim Data</button>
                        </div>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow border border-slate-200">
                        <h3 class="font-bold text-lg text-slate-800 mb-2">Backup & Restore</h3><p class="text-xs text-slate-500 mb-4">Simpan data ke file JSON atau pulihkan data dari file.</p>
                        <div class="flex gap-3">
                            <button onclick="downloadBackup()" class="flex-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-100 flex items-center justify-center gap-2"><i data-lucide="download" width="16"></i> Backup</button>
                            <label class="flex-1 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-100 cursor-pointer flex items-center justify-center gap-2"><i data-lucide="upload" width="16"></i> Restore<input type="file" class="hidden" accept=".json" onchange="restoreBackup(this)"></label>
                        </div>
                        <div class="mt-4 pt-4 border-t border-slate-100"><button onclick="resetUserToDefault()" class="w-full text-red-600 text-xs font-bold hover:text-red-800 flex items-center justify-center gap-1"><i data-lucide="alert-triangle" width="12"></i> Reset User ke Default</button></div>
                    </div>
                </div>
             </div>
        </div>
    </div>`;
    lucide.createIcons();
}

async function saveClinicConfig() {
    state.clinicInfo = {
        name: document.getElementById('conf-name').value,
        subname: document.getElementById('conf-sub').value,
        therapist: document.getElementById('conf-therapist').value,
        sipf: document.getElementById('conf-sipf').value,
        address: document.getElementById('conf-address').value,
        phone: document.getElementById('conf-phone').value,
        mapsUrl: document.getElementById('conf-maps')?.value || '',
        npwp: document.getElementById('conf-npwp')?.value || '',
        qrisImage: document.getElementById('conf-qris-base64')?.value || ''
    };

    localStorage.setItem('erm_clinic_config', JSON.stringify(state.clinicInfo));
    applyBranding();

    const btn = document.getElementById('btn-save-clinic');
    const originalText = btn.innerHTML;

    // Sync to GAS
    if (state.scriptUrl) {
        try {
            btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin" width="16"></i> Menyinkronkan...`;
            lucide.createIcons();

            const sheetId = getSheetIdFromUrl(state.scriptUrl);
            const configItems = [
                { key: 'CLINIC_NAME', value: state.clinicInfo.name },
                { key: 'CLINIC_SUBNAME', value: state.clinicInfo.subname },
                { key: 'CLINIC_THERAPIST', value: state.clinicInfo.therapist },
                { key: 'CLINIC_SIPF', value: state.clinicInfo.sipf },
                { key: 'CLINIC_ADDRESS', value: state.clinicInfo.address },
                { key: 'CLINIC_NPWP', value: state.clinicInfo.npwp },
                { key: 'CLINIC_PHONE', value: state.clinicInfo.phone },
                { key: 'CLINIC_QRIS', value: state.clinicInfo.qrisImage }
            ];

            await fetch(LICENSE_API_URL, {
                method: 'POST', mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'sync_incremental',
                    sheet_id: sheetId,
                    config: configItems
                })
            });
            alert('Identitas Klinik Berhasil Disimpan & Disinkronkan ke Cloud!');
        } catch (e) {
            console.warn("Sync failed, saved locally:", e);
            alert('Tersimpan secara lokal (Sinkronisasi Gagal).');
        } finally {
            btn.innerHTML = originalText;
            lucide.createIcons();
        }
    } else {
        alert('Identitas Klinik Berhasil Disimpan (Lokal)!');
    }
}

function handleQrisUpload(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { alert("Ukuran file terlalu besar! Maksimal 1MB."); return; }

    const reader = new FileReader();
    reader.onload = (e) => {
        const base64 = e.target.result;
        document.getElementById('conf-qris-base64').value = base64;
        const preview = document.getElementById('qris-preview-container');
        preview.innerHTML = `<img src="${base64}" class="w-full h-full object-contain">`;
        lucide.createIcons();
    };
    reader.readAsDataURL(file);
}

function removeQrisImage() {
    if (!confirm("Hapus gambar QRIS?")) return;
    document.getElementById('conf-qris-base64').value = '';
    document.getElementById('qris-preview-container').innerHTML = `<div class="text-center text-slate-300"><i data-lucide="image" width="32" class="mx-auto mb-1"></i><p class="text-[10px]">Belum ada QR</p></div>`;
    lucide.createIcons();
}

function updatePdfConfig(key, value) {
    state.pdfConfig[key] = value;
    localStorage.setItem('erm_pdf_config', JSON.stringify(state.pdfConfig));



    // Apply layout mode class & page margins
    if (key === 'layoutMode') {
        document.body.classList.remove('print-compact', 'print-normal', 'print-relaxed');
        if (value === 'compact') document.body.classList.add('print-compact');
        else if (value === 'relaxed') document.body.classList.add('print-relaxed');
        else document.body.classList.add('print-normal');

        applyPageMargins(value);
    }

    if (key === 'accentColor') {
        applyBranding();
    }

    renderConfigView(document.getElementById('main-content'));
}

function applyPageMargins(mode) {
    let margin = '15mm'; // Normal default
    if (mode === 'compact') margin = '10mm';
    if (mode === 'relaxed') margin = '25mm';

    let styleEl = document.getElementById('dynamic-print-margins');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-print-margins';
        document.head.appendChild(styleEl);
    }
    // Set @page margin for printing
    styleEl.innerHTML = `@media print { @page { size: auto; margin: ${margin} !important; } }`;
}



// --- Booking Config Functions ---
const _bookingBase = (typeof BOOKING_BASE_URL !== 'undefined' && BOOKING_BASE_URL)
    ? BOOKING_BASE_URL
    : (window.location.origin + '/Booking');

function updateBookingLinkPreview() {
    const alias = (document.getElementById('conf-booking-alias') || {}).value || '';
    const display = document.getElementById('booking-link-display');
    if (!display) return;
    if (alias.trim()) {
        const link = `${_bookingBase}/?id=${alias.trim()}`;
        display.innerHTML = `<a href="${link}" target="_blank" class="text-blue-600 hover:underline break-all">${link}</a>`;
    } else {
        display.innerHTML = '<span class="italic">Isi Alias dan klik Simpan...</span>';
    }
}

function copyBookingLink() {
    const alias = localStorage.getItem('erm_booking_alias');
    if (!alias) { alert('Simpan config booking dulu!'); return; }
    const link = `${_bookingBase}/?id=${alias}`;
    navigator.clipboard.writeText(link).then(() => {
        const btn = document.getElementById('btn-copy-link');
        if (btn) { btn.innerHTML = '<i data-lucide="check" width="14"></i> Tersalin!'; lucide.createIcons(); setTimeout(() => { btn.innerHTML = '<i data-lucide="copy" width="14"></i> Salin Link'; lucide.createIcons(); }, 2000); }
    }).catch(() => { alert('Gagal menyalin. Salin manual:\n' + link); });
}

async function saveBookingConfig() {
    const alias = (document.getElementById('conf-booking-alias') || {}).value.trim().toLowerCase().replace(/\s+/g, '-');
    if (!alias) { alert('Isi Alias Klinik terlebih dahulu!'); return; }

    const hours = [...document.querySelectorAll('.booking-hour-check:checked')].map(el => el.value);
    if (hours.length === 0) { alert('Pilih minimal 1 jam tersedia!'); return; }

    // Save locally
    localStorage.setItem('erm_booking_alias', alias);
    localStorage.setItem('erm_booking_hours', hours.join(','));

    // Update alias display
    const aliasInput = document.getElementById('conf-booking-alias');
    if (aliasInput) aliasInput.value = alias;
    updateBookingLinkPreview();

    // Push to GAS so it syncs to the Licenses sheet
    const sheetId = getSheetIdFromUrl(state.scriptUrl);
    if (sheetId && state.scriptUrl) {
        try {
            await fetch(LICENSE_API_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_booking_config',
                    sheet_id: sheetId,
                    alias: alias,
                    available_hours: hours.join(',')
                })
            });
        } catch (e) { console.warn('Could not save booking config to server:', e); }
    }

    alert(`✅ Konfigurasi Booking Disimpan!\n\nAlias: ${alias}\nJam: ${hours.join(', ')}\n\nLink booking sudah siap disalin.`);
    renderIcons();
}

async function saveNotificationConfig() {

    state.notificationConfig.telegramToken = document.getElementById('notif-tg-token').value.trim();
    state.notificationConfig.telegramChatId = document.getElementById('notif-tg-chatid').value.trim();
    state.notificationConfig.targetEmail = document.getElementById('notif-email-target').value.trim();
    state.notificationConfig.senderEmail = document.getElementById('notif-email-sender').value.trim();

    localStorage.setItem('erm_notif_config', JSON.stringify(state.notificationConfig));

    // Sync to Cloud if Connected
    if (state.scriptUrl) {
        const btn = document.querySelector('button[onclick="saveNotificationConfig()"]');
        const originalText = btn ? btn.innerHTML : 'Simpan';
        if (btn) {
            btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin" width="16"></i> Menyimpan ke Cloud...';
            btn.disabled = true;
            lucide.createIcons();
            try {
                // Extract Sheet ID for Backend Targeting (Required for Bridge)
                let sheetId = "";
                const rawUrl = state.scriptUrl || localStorage.getItem('erm_config_url');
                if (rawUrl) {
                    const match = rawUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
                    if (match && match[1]) sheetId = match[1];
                }

                const configPayload = [
                    { key: 'TELEGRAM_TOKEN', value: state.notificationConfig.telegramToken },
                    { key: 'TELEGRAM_CHAT_ID', value: state.notificationConfig.telegramChatId },
                    { key: 'EMAIL_RECEIVER', value: state.notificationConfig.targetEmail },
                    { key: 'EMAIL_SENDER', value: state.notificationConfig.senderEmail }
                ];

                // CRITICAL FIX: Use LICENSE_API_URL (The App Script), NOT state.scriptUrl (The Sheet)
                await fetch(LICENSE_API_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'save_config', sheet_id: sheetId, config: configPayload })
                });
                alert('Permintaan Simpan Dikirim ke Cloud!\nSilahkan cek Sheet Klien dalam beberapa saat.');
            } catch (e) {
                console.error(e);
                alert('Gagal mengirim permintaan. Cek koneksi internet.');
            } finally {
                if (btn) {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    lucide.createIcons();
                }
            }
        } else {
            alert('Konfigurasi Disimpan Lokal (Cloud Skip: URL Sheet belum diset)!');
        }
    } else {
        alert('Konfigurasi Disimpan (Hanya Lokal - Script URL belum diset)!');
    }
}

function switchConfigTab(tabName) {
    document.querySelectorAll('.config-tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-content-${tabName}`).classList.remove('hidden');
    ['identity', 'print', 'notif', 'system'].forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        if (t === tabName) btn.className = "px-6 py-3 text-sm font-bold text-blue-600 border-b-2 border-blue-600 bg-white transition-colors flex items-center gap-2";
        else btn.className = "px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2";
    });
}

function saveConfig() {
    state.scriptUrl = document.getElementById('script-url').value.trim();
    localStorage.setItem('erm_script_url', state.scriptUrl);
    alert('Tersimpan!');
    checkOnlineStatus();
}

function renderPdfToggle(key, label, isChecked) {
    return `<label class="flex items-center justify-between cursor-pointer p-3 rounded-lg border border-transparent hover:bg-slate-50 transition-colors"><span class="text-sm font-medium text-slate-700">${label}</span><div class="relative inline-flex items-center cursor-pointer"><input type="checkbox" class="sr-only peer" ${isChecked ? 'checked' : ''} onchange="updatePdfConfig('${key}', this.checked)"><div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div></div></label>`;
}

function openUserModal(id = null) {
    const u = id ? state.users.find(x => x.id === id) : { id: '', name: '', username: '', password: '', role: 'FISIO' };
    const modalHtml = `
        <div class="bg-white px-6 py-4 border-b flex justify-between items-center sticky top-0 z-20"><h3 class="text-xl font-bold text-slate-800">${id ? 'Edit User' : 'Tambah User Baru'}</h3><button onclick="closeModal()" class="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200"><i data-lucide="x" width="20"></i></button></div>
        <div class="p-6 space-y-4"><form id="user-form"><input type="hidden" name="id" value="${u.id}"><div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Nama Tampilan</label><input type="text" name="name" value="${u.name}" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Contoh: Fisio Rehan"></div><div class="grid grid-cols-2 gap-4"><div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Username</label><input type="text" name="username" value="${u.username}" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"></div><div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Password</label><input type="text" name="password" value="${u.password}" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"></div></div><div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Role</label><select name="role" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"><option value="FISIO" ${u.role === 'FISIO' ? 'selected' : ''}>Fisioterapis</option><option value="ADMIN" ${u.role === 'ADMIN' ? 'selected' : ''}>Administrator</option></select></div></form></div>
        <div class="bg-slate-50 px-6 py-4 border-t flex justify-end gap-2"><button onclick="saveUser()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg btn-press text-sm">Simpan User</button></div>`;
    document.getElementById('modal-content').innerHTML = modalHtml;
    document.getElementById('modal-container').classList.remove('hidden');
    lucide.createIcons();
}

function saveUser() {
    const form = document.getElementById('user-form');
    const id = form.querySelector('[name="id"]').value;
    const name = form.querySelector('[name="name"]').value;
    const username = form.querySelector('[name="username"]').value;
    const password = form.querySelector('[name="password"]').value;
    const role = form.querySelector('[name="role"]').value;

    if (!name || !username || !password) { alert('Semua kolom wajib diisi!'); return; }
    if (state.users.some(u => u.username === username && u.id !== id)) { alert('Username sudah dipakai!'); return; }

    if (id) {
        const idx = state.users.findIndex(x => x.id === id);
        if (idx > -1) {
            state.users[idx] = { id, name, username, password, role };
            if (state.user && state.user.id === id) {
                state.user = state.users[idx];
                document.getElementById('user-name').innerText = name;
                document.getElementById('user-role').innerText = role === 'ADMIN' ? 'Administrator' : 'Fisioterapis';
            }
        }
    } else {
        state.users.push({ id: 'usr' + Date.now(), name, username, password, role });
    }
    localStorage.setItem('erm_users', JSON.stringify(state.users));
    closeModal();
    renderConfigView(document.getElementById('main-content'));
}

function deleteUser(id) {
    const targetUser = state.users.find(u => u.id === id);
    if (targetUser && targetUser.role === 'ADMIN' && state.users.filter(u => u.role === 'ADMIN').length <= 1) { alert("Tidak bisa menghapus Administrator terakhir!"); return; }
    if (state.user && state.user.id === id) { alert("Tidak bisa menghapus akun sendiri!"); return; }
    if (confirm(`Hapus user "${targetUser.name}"?`)) {
        state.users = state.users.filter(x => x.id !== id);
        localStorage.setItem('erm_users', JSON.stringify(state.users));
        renderConfigView(document.getElementById('main-content'));
    }
}

// --- 16. OUTCOME & HEP MODALS ---
function openOutcomeModal() {
    const currentDiagnosis = (window.tempFormData.diagnosis || '').toLowerCase();
    const currentICD = (window.tempFormData.icd || '').toLowerCase();
    const combinedDx = currentDiagnosis + ' ' + currentICD;
    let suggestedOM = '';
    for (const [key, data] of Object.entries(OUTCOME_MEASURES)) {
        if (data.keywords && data.keywords.some(kw => combinedDx.includes(kw))) { suggestedOM = key; break; }
    }
    const modalHtml = `
        <div class="bg-white px-6 py-4 border-b flex justify-between items-center sticky top-0 z-20"><h3 class="text-xl font-bold text-slate-800 flex items-center gap-2"><i data-lucide="calculator" class="text-emerald-600"></i> Kalkulator Klinis</h3><button onclick="closeModal()" class="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200"><i data-lucide="x" width="20"></i></button></div>
        <div class="px-6 py-6 overflow-y-auto modal-scroll flex-1">
            ${suggestedOM ? `<div class="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4 flex items-start gap-3 fade-in"><i data-lucide="lightbulb" class="text-blue-600 mt-0.5" width="20"></i><div><p class="text-xs font-bold text-blue-800 uppercase">Saran Sistem</p><p class="text-sm text-blue-700">Sesuai diagnosa: <strong>${suggestedOM}</strong></p></div></div>` : ''}
            <div class="mb-6"><label class="block text-sm font-bold text-slate-700 mb-2">Pilih Instrumen Ukur</label><select id="om-select" onchange="renderQuestionnaire(this.value)" class="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm font-medium text-slate-700"><option value="">-- Pilih Kuesioner --</option>${Object.keys(OUTCOME_MEASURES).map(k => `<option value="${k}" ${k === suggestedOM ? 'selected' : ''}>${k}</option>`).join('')}</select><p id="om-desc" class="text-xs text-slate-500 mt-2 italic"></p></div>
            <div id="om-questions" class="space-y-4"></div>
            <div id="om-result-area" class="hidden mt-6 bg-emerald-50 p-6 rounded-xl border border-emerald-200 text-center shadow-inner"><p class="text-sm text-emerald-800 font-bold uppercase tracking-wider">Hasil Perhitungan</p><h2 id="om-final-score" class="text-3xl font-black text-emerald-600 my-3">0%</h2><button onclick="saveOutcomeToNote()" class="bg-emerald-600 text-white px-4 py-3 rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all w-full flex justify-center items-center gap-2 btn-press"><i data-lucide="save" width="18"></i> Simpan ke Catatan</button></div>
        </div>`;
    document.getElementById('modal-content').innerHTML = modalHtml;
    document.getElementById('modal-container').classList.remove('hidden');
    lucide.createIcons();
    if (suggestedOM) renderQuestionnaire(suggestedOM);
}

function renderQuestionnaire(key) {
    const container = document.getElementById('om-questions');
    const desc = document.getElementById('om-desc');
    const resArea = document.getElementById('om-result-area');
    if (!key || !OUTCOME_MEASURES[key]) { container.innerHTML = ''; desc.innerText = ''; resArea.classList.add('hidden'); return; }

    const data = OUTCOME_MEASURES[key];
    desc.innerText = data.desc;
    resArea.classList.add('hidden');
    container.innerHTML = data.questions.map((q, idx) => `<div class="bg-slate-50 p-4 rounded-lg border border-slate-200"><p class="text-sm font-bold text-slate-800 mb-3">${idx + 1}. ${q.q}</p><div class="grid grid-cols-1 gap-2">${q.opts.map((opt, optIdx) => `<label class="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-2 rounded transition-colors border border-transparent hover:border-slate-100"><input type="radio" name="q-${idx}" value="${optIdx}" onchange="calculateOutcome('${key}')" class="accent-emerald-600 w-4 h-4"><span class="text-slate-600">${opt}</span></label>`).join('')}</div></div>`).join('');
}

function calculateOutcome(key) {
    const data = OUTCOME_MEASURES[key];
    const totalQ = data.questions.length;
    let scores = []; let allFilled = true;
    for (let i = 0; i < totalQ; i++) {
        const checked = document.querySelector(`#om-questions input[name="q-${i}"]:checked`);
        if (checked) scores.push(parseInt(checked.value)); else allFilled = false;
    }
    if (allFilled) {
        const resultText = data.calc(scores);
        const resArea = document.getElementById('om-result-area');
        document.getElementById('om-final-score').innerText = resultText;
        resArea.classList.remove('hidden');
        resArea.dataset.result = resultText;
        resArea.scrollIntoView({ behavior: 'smooth' });
    }
}

function saveOutcomeToNote() {
    const resArea = document.getElementById('om-result-area');
    const result = resArea.dataset.result;
    if (result) {
        const currentNote = window.tempFormData.custom_assessment || '';
        const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const newText = `${currentNote ? currentNote + '\n\n' : ''}[${time}] Evaluasi Objektif:\n${result}`;
        window.tempFormData.custom_assessment = newText;
        const textArea = document.getElementById('form-custom-assessment');
        if (textArea) textArea.value = newText;
        closeModal();
    }
}

function openHEPModal() {
    selectedExercises = [];
    const categories = Object.keys(EXERCISE_DB);
    const modalHtml = `
        <div class="bg-white h-[90vh] flex flex-col rounded-2xl overflow-hidden fade-in">
            <div class="px-6 py-4 border-b flex justify-between items-center bg-slate-50"><div><h3 class="text-xl font-bold text-slate-800 flex items-center gap-2"><i data-lucide="dumbbell" class="text-purple-600"></i> Program Latihan (HEP)</h3></div><button onclick="closeModal()" class="bg-slate-200 p-2 rounded-full text-slate-500 hover:bg-slate-300"><i data-lucide="x" width="20"></i></button></div>
            <div class="flex-1 overflow-hidden flex flex-col md:flex-row">
                <div class="w-full md:w-48 bg-slate-50 border-r border-slate-200 overflow-y-auto p-2">${categories.map((cat, idx) => `<button onclick="document.getElementById('cat-${idx}').scrollIntoView({behavior: 'smooth'})" class="w-full text-left text-xs font-bold px-3 py-3 rounded-lg text-slate-600 hover:bg-purple-100 hover:text-purple-700 mb-1 transition-colors">${cat}</button>`).join('')}</div>
                <div class="flex-1 overflow-y-auto p-6 bg-white scroll-smooth" id="hep-list-area">${categories.map((cat, idx) => `<div id="cat-${idx}" class="mb-8"><h4 class="text-sm font-black text-purple-700 uppercase mb-3 sticky top-0 bg-white py-2 z-10 border-b border-purple-100">${cat}</h4><div class="grid grid-cols-1 md:grid-cols-2 gap-3">${EXERCISE_DB[cat].map((ex, exIdx) => `<div onclick="toggleHEP(this, '${cat}', ${exIdx})" class="hep-item border border-slate-200 rounded-xl p-3 cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all group select-none relative"><div class="flex justify-between items-start"><h5 class="font-bold text-slate-700 text-sm group-hover:text-purple-800 pr-6">${ex.name}</h5><div class="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center hep-check transition-all bg-white absolute top-3 right-3"><i data-lucide="check" width="14" class="text-white opacity-0 transition-opacity"></i></div></div><p class="text-xs text-slate-500 mt-2 leading-relaxed">${ex.desc}</p></div>`).join('')}</div></div>`).join('')}</div>
            </div>
            <div class="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center"><p class="text-sm font-bold text-slate-600">Terpilih: <span id="hep-count" class="text-purple-600 font-black text-lg">0</span> item</p><div class="flex gap-2"><button onclick="copyHEP()" class="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-600 flex items-center gap-2 btn-press"><i data-lucide="copy" width="16"></i> Salin</button><button onclick="sendHEP('wa')" class="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-600 flex items-center gap-2 btn-press"><i data-lucide="message-circle" width="16"></i> WA</button></div></div>
        </div>`;
    document.getElementById('modal-content').innerHTML = modalHtml;
    document.getElementById('modal-container').classList.remove('hidden');
    lucide.createIcons();
}

function toggleHEP(el, cat, idx) {
    const exercise = EXERCISE_DB[cat][idx];
    const checkIcon = el.querySelector('.hep-check i');
    const checkBox = el.querySelector('.hep-check');
    const existsIdx = selectedExercises.findIndex(e => e.name === exercise.name);

    if (existsIdx > -1) {
        selectedExercises.splice(existsIdx, 1);
        el.classList.remove('ring-2', 'ring-purple-500', 'bg-purple-50');
        checkBox.classList.remove('bg-purple-600', 'border-purple-600');
        checkIcon.classList.add('opacity-0');
    } else {
        selectedExercises.push(exercise);
        el.classList.add('ring-2', 'ring-purple-500', 'bg-purple-50');
        checkBox.classList.add('bg-purple-600', 'border-purple-600');
        checkIcon.classList.remove('opacity-0');
    }
    document.getElementById('hep-count').innerText = selectedExercises.length;
}

function generateHEPMessage() {
    const pName = state.selectedPatient.name;
    const therapist = state.user.name;
    const dateNow = new Date().toLocaleDateString('id-ID');
    let msg = `*PROGRAM LATIHAN (HEP)*\r\n------------------\r\nTgl: ${dateNow}\r\nPasien: ${pName}\r\nTerapis: ${therapist}\r\n------------------\r\n\r\n`;
    selectedExercises.forEach((ex, i) => { msg += `*${i + 1}. ${ex.name.toUpperCase()}*\r\n> _${ex.desc}_\r\n\r\n`; });
    msg += `------------------\r\n*CATATAN:*\r\n1. Lakukan rutin sesuai anjuran.\r\n2. Stop jika nyeri tajam.\r\n\r\n_Semoga lekas membaik!_`;
    return msg;
}

function sendHEP(platform) {
    if (selectedExercises.length === 0) { alert('Pilih minimal satu latihan dulu!'); return; }
    const msg = generateHEPMessage();
    const encodedMsg = encodeURIComponent(msg);
    if (platform === 'wa') {
        let phone = state.selectedPatient.phone;
        if (phone) {
            phone = phone.replace(/\D/g, '');
            if (phone.startsWith('0')) phone = '62' + phone.substring(1);
            window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');
        } else { window.open(`https://wa.me/?text=${encodedMsg}`, '_blank'); }
    }
    saveHEPLog();
    closeModal();
}

function copyHEP() {
    if (selectedExercises.length === 0) { alert('Pilih minimal satu latihan dulu!'); return; }
    navigator.clipboard.writeText(generateHEPMessage()).then(() => {
        alert('Teks berhasil disalin!');
        saveHEPLog();
        closeModal();
    });
}

function saveHEPLog() {
    const hepNote = `HEP Dikirim (${selectedExercises.length} latihan)`;
    if (!window.tempFormData.intervention.includes(hepNote)) {
        window.tempFormData.intervention.push(hepNote);
        renderAssessmentForm(document.getElementById('main-content'), true);
        setTimeout(showStep2, 50);
    }
}

function downloadBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "backup_fisiota_" + new Date().toISOString().slice(0, 10) + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function restoreBackup(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            state = JSON.parse(e.target.result);
            saveData();
            alert("Data berhasil dipulihkan!");
            location.reload();
        } catch (err) { alert("File backup tidak valid!"); }
    };
    reader.readAsText(file);
}

function resetUserToDefault() {
    if (confirm("PERINGATAN: Semua data user akan dihapus. Lanjutkan?")) {
        localStorage.removeItem('erm_users');
        location.reload();
    }
}

// --- 17. PRINT LOGIC ---
function renderPrintView(container) {
    enablePrintPageMargins(); // ACTIVATE MARGINS FOR PRINT PAGE

    let targets = [];
    if (state.printSelection.length > 0) targets = state.assessments.filter(a => state.printSelection.includes(a.id));
    else if (state.currentAssessment) targets = [state.currentAssessment];

    if (targets.length === 0) { container.innerHTML = '<div class="p-10 text-center text-white">Tidak ada data untuk dicetak. <button onclick="closePrintView()" class="underline">Kembali</button></div>'; return; }

    const pagesHtml = targets.map(a => {
        const p = state.patients.find(pt => pt.id === a.patientId);
        return generateSingleAssessmentHTML(a, p);
    }).join('');

    container.innerHTML = `
        <div id="preview-layer" class="min-h-screen bg-slate-700 pb-20">
            <div id="preview-controls" class="sticky top-0 z-50 bg-slate-800 text-white p-4 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4 no-print">
                <div><h2 class="text-lg font-bold">Print Preview</h2><p class="text-xs text-slate-400">Total: ${targets.length} Dokumen</p></div>
                <div class="flex gap-3">
                    <button onclick="closePrintView()" class="px-6 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-sm transition-colors border border-slate-600">Tutup</button>
                    <button onclick="handlePrintWithTip()" class="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold text-sm transition-colors shadow-lg flex items-center gap-2"><i data-lucide="printer" width="16"></i> Cetak Sekarang</button>
                </div>
            </div>
            <div class="flex flex-col items-center justify-center p-4 md:p-8 gap-8">${pagesHtml}</div>
        </div>`;
    lucide.createIcons();
}

function handlePrintWithTip() {
    if (confirm("⚠️ TIPS PENTING:\n\n1. Cari menu 'Setelan Lain' (More Settings).\n2. Ubah SKALA menjadi 'Sesuaikan' (Fit).\n\nLanjut membuka printer?")) {
        window.print();
    }
}

function closePrintView() { navigate('assessments'); }

function generateSingleAssessmentHTML(a, p) {
    const conf = state.pdfConfig || {};
    const fontMap = { 'sans': 'ui-sans-serif, system-ui, sans-serif', 'serif': 'Georgia, "Times New Roman", serif', 'mono': 'ui-monospace, monospace' };
    const activeFont = fontMap[conf.fontFamily || 'sans'];
    const renderList = (text) => {
        if (!text) return '<div class="text-slate-300 italic pl-2">-</div>';
        const items = Array.isArray(text) ? text : String(text).split('\n');
        const cleanItems = items.filter(i => i && i.trim() !== '');
        if (cleanItems.length === 0) return '<div class="text-slate-300 italic pl-2">-</div>';
        return cleanItems.map(i => `<div class="flex items-start gap-1.5 mb-1 pl-1"><span class="w-1.5 h-1.5 bg-slate-400 rounded-full mt-[0.5em] shrink-0"></span><span class="leading-snug">${i}</span></div>`).join('');
    };

    let painPointsHTML = '';
    if (a.pain_points && Array.isArray(a.pain_points)) {
        painPointsHTML = a.pain_points.map((pt, idx) => `<div class="pain-point-marker absolute w-4 h-4 -ml-2 -mt-2 bg-red-600 rounded-full border border-white flex items-center justify-center text-[8px] text-white font-bold" style="left: ${pt.x}%; top: ${pt.y}%;">${idx + 1}</div>`).join('');
    }

    return `
    <div class="print-page-wrapper page-break relative text-slate-800" style="font-family: ${activeFont}; font-size: ${conf.fontSize || '10pt'};">
        ${conf.showKop ? `<div class="flex justify-between items-end border-b-[3px] double border-slate-800 pb-4 mb-5"><div><h1 class="text-3xl font-black text-slate-900 tracking-tighter leading-none uppercase">${state.clinicInfo.name || 'FISIOTA'}</h1><p class="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">${state.clinicInfo.subname || ''}</p></div><div class="text-right text-[10px] text-slate-500 leading-relaxed"><p class="font-bold text-slate-800">Praktek Mandiri Fisioterapi</p><p class="whitespace-pre-line">${state.clinicInfo.address || '-'}</p><p>${state.clinicInfo.phone || '-'}</p></div></div>` : ''}
        ${conf.showPatientInfo ? `<div class="bg-slate-50 border-y border-slate-200 p-3 mb-6"><div class="grid grid-cols-4 gap-4 items-center text-[0.9em]"><div class="col-span-2"><span class="text-slate-400 font-bold uppercase mr-2">Nama:</span><span class="font-black text-slate-900 uppercase">${p ? p.name : '-'}</span></div><div><span class="text-slate-400 font-bold uppercase mr-2">No. RM:</span><span class="font-mono font-bold text-slate-700">${p ? p.id : '-'}</span></div><div class="text-right"><span class="text-slate-400 font-bold uppercase mr-2">Tgl:</span><span class="font-bold text-slate-900">${new Date(a.date).toLocaleDateString('id-ID')}</span></div></div></div>` : ''}
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            ${conf.showDiagnosis ? `<div class="border-l-4 border-blue-600 pl-3 py-1"><h3 class="font-black text-slate-800 uppercase mb-1 text-[0.85em]">A. Diagnosa Medis</h3><div class="font-bold text-slate-800 bg-slate-50 p-2 rounded border border-slate-100"><span class="block mb-1">${a.diagnosis || '-'}</span><span class="font-normal text-slate-500 text-[0.85em]">ICD-10: ${a.icd || '-'}</span></div></div>` : ''}
            ${conf.showAnamnesis ? `<div><h3 class="font-bold text-slate-500 uppercase mb-1 border-b border-slate-200 pb-1 text-[0.85em]">Keluhan Utama (Anamnesis)</h3><p class="text-slate-700 leading-relaxed whitespace-pre-line text-justify text-[0.9em]">${a.custom_assessment || '-'}</p></div>` : ''}
        </div>

        ${(conf.showBodyChart || conf.showObjective) ? `<div class="grid grid-cols-2 gap-6 mb-6 items-start break-inside-avoid">
            ${conf.showBodyChart ? `<div class="border border-slate-200 rounded p-2 bg-white flex flex-col items-center"><p class="text-center font-bold text-slate-400 uppercase mb-2 text-[0.7em] tracking-widest">Peta Nyeri</p><div class="relative w-[180px]"><img src="${window.IMG_ASSETS.body_chart}" class="w-full h-auto object-contain mix-blend-multiply opacity-80" />${painPointsHTML}</div></div>` : ''}
            ${conf.showObjective ? `<div class="flex flex-col gap-3"><h3 class="font-bold text-slate-500 uppercase border-b border-slate-200 pb-1 text-[0.85em]">Pemeriksaan Objektif</h3><div class="bg-slate-50 border border-slate-200 rounded p-3"><div class="flex justify-between items-center mb-2 border-b border-slate-200 pb-2"><span class="font-bold text-slate-500 text-[0.85em]">VAS Nyeri</span><span class="font-black text-xl text-blue-600">${a.vas || 0}/10</span></div><div class="space-y-1 text-[0.9em]"><div class="flex justify-between"><span class="text-slate-500">ROM:</span> <span class="font-bold">${a.obj?.rom || '-'}</span></div><div class="flex justify-between"><span class="text-slate-500">MMT:</span> <span class="font-bold">${a.obj?.mmt || '-'}</span></div><div class="flex justify-between"><span class="text-slate-500">Balance:</span> <span class="font-bold">${a.obj?.balance || '-'}</span></div></div></div></div>` : ''}
        </div>` : ''}

        ${(conf.showImpairment || conf.showLimitation) ? `<div class="mb-6 break-inside-avoid"><h3 class="font-bold text-slate-500 uppercase mb-2 border-b border-slate-200 pb-1 text-[0.85em]">Problem ICF</h3><div class="grid grid-cols-2 border border-slate-200 rounded overflow-hidden"><div class="border-r border-slate-200 p-3"><h4 class="font-black text-slate-800 text-[0.85em] mb-2 uppercase">B. Impairment</h4><div class="mb-2"><p class="text-[0.75em] font-bold text-blue-600">Body Function (b)</p>${renderList(a.b)}</div><div><p class="text-[0.75em] font-bold text-blue-600">Body Structure (s)</p>${renderList(a.s)}</div></div><div class="p-3"><h4 class="font-black text-slate-800 text-[0.85em] mb-2 uppercase">C. Activity & Participation</h4><div class="mb-2"><p class="text-[0.75em] font-bold text-blue-600">Activity (d)</p>${renderList(a.d_act)}</div><div><p class="text-[0.75em] font-bold text-blue-600">Participation (d)</p>${renderList(a.d_part)}</div></div></div></div>` : ''}

        <div class="break-inside-avoid">
            <h3 class="font-black text-slate-800 uppercase mb-2 border-b border-slate-200 pb-1 text-[0.85em]">D. Intervensi & Program</h3>
            ${conf.showIntervention ? `<div class="mb-3"><div class="flex flex-wrap gap-2 text-slate-700 text-[0.9em]">${(a.intervention && a.intervention.length > 0) ? a.intervention.map(i => `<span class="inline-block border border-slate-300 px-2 py-0.5 rounded bg-white">◻ ${i}</span>`).join('') : '-'}</div></div>` : ''}
            ${conf.showEvalPlan ? `<div class="bg-slate-50 border border-slate-200 rounded p-3 grid grid-cols-3 gap-4 text-[0.9em]"><div class="col-span-2"><span class="font-bold text-slate-500 uppercase block mb-1 text-[0.8em]">Evaluasi Sesi Ini:</span>${renderList(a.eval)}</div><div class="border-l border-slate-200 pl-4"><span class="font-bold text-slate-500 uppercase block mb-1 text-[0.8em]">Planning:</span><span class="font-black text-blue-600 block text-lg leading-tight">${a.plan || '-'}</span></div></div>` : ''}
        </div>

        ${conf.showSignature ? `<div class="mt-8 flex justify-end break-inside-avoid"><div class="w-48 text-center"><p class="text-slate-500 mb-12 text-[0.8em]">Blitar, ${new Date(a.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p><p class="font-bold text-slate-900 border-b border-slate-400 inline-block pb-0.5">${state.clinicInfo.therapist}</p><p class="text-slate-500 mt-1 text-[0.7em]">SIPF: ${state.clinicInfo.sipf}</p></div></div>` : ''}
    </div>`;
}

// --- 18. RESET PASSWORD LOGIC ---
let tempResetCode = null;
async function requestResetCode(e) {
    if (!LICENSE_API_URL) { alert("GAGAL: LICENSE_API_URL belum terkonfigurasi di config.js."); return; }
    const otp = Math.floor(100000 + Math.random() * 900000);
    tempResetCode = otp.toString();
    const btn = e.target;
    const originalText = btn.innerText;
    btn.innerText = "Mengirim..."; btn.disabled = true;

    // Get current sheet_id from URL or state
    const currentSheetId = getSheetIdFromUrl(window.location.href) || state.scriptUrl.split('id=')[1] || '';

    try {
        await fetch(LICENSE_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'log_reset',
                code: tempResetCode,
                sheet_id: currentSheetId,
                deviceInfo: navigator.userAgent,
                timestamp: new Date().toLocaleString()
            })
        });
        showOtpInputModal();
        alert("KODE RAHASIA dikirim ke Google Sheet! Silakan hubungi Admin Pusat.");
    } catch (error) {
        console.error("Reset request error:", error);
        alert("Gagal koneksi ke server pusat.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

function showOtpInputModal() {
    const modalHtml = `<div class="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center border-t-4 border-red-500"><div class="mb-4"><div class="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2"><i data-lucide="shield-alert" width="24"></i></div><h3 class="text-lg font-black text-slate-800">Verifikasi Reset</h3><p class="text-xs text-slate-500">Masukkan 6 digit kode dari Google Sheet.</p></div><input type="text" id="otp-input" maxlength="6" class="w-full text-center text-2xl font-mono font-bold tracking-widest border-2 border-slate-200 rounded-xl p-3 focus:border-red-500 outline-none mb-4" placeholder="000000"><div class="flex gap-2"><button type="button" onclick="closeModal()" class="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200">Batal</button><button type="button" onclick="verifyResetCode()" class="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 shadow-lg shadow-red-200 btn-press">Reset Sekarang</button></div></div>`;
    document.getElementById('modal-content').innerHTML = modalHtml;
    document.getElementById('modal-container').classList.remove('hidden');
    lucide.createIcons();
}

async function verifyResetCode() {
    const inputCode = document.getElementById('otp-input').value;
    if (inputCode === tempResetCode) {
        if (confirm("Kode Benar! Hapus semua user custom?")) {
            if (state.scriptUrl) { try { await fetch(state.scriptUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'confirm_reset', code: inputCode }) }); await new Promise(r => setTimeout(r, 2000)); } catch (e) { } }
            localStorage.removeItem('erm_users');
            alert("✅ RESET BERHASIL! User dikembalikan ke default.");
            location.reload();
        }
    } else { alert("❌ KODE SALAH!"); }
}

// --- 19. INITIALIZATION ---



// --- 12. GENERIC MODAL & PICKER LOGIC ---
function closeModal() {
    document.getElementById('modal-container').classList.add('hidden');
}

function openItemPicker(key, title) {
    const currentDx = window.tempFormData ? window.tempFormData.diagnosis : '';
    const templateItems = (currentDx && ICF_TEMPLATES[currentDx] && ICF_TEMPLATES[currentDx][key])
        ? new Set(ICF_TEMPLATES[currentDx][key])
        : new Set();

    const allItems = new Set();
    Object.values(ICF_TEMPLATES).forEach(t => {
        if (t[key]) {
            if (Array.isArray(t[key])) {
                t[key].forEach(item => allItems.add(item));
            }
        }
    });

    // Sorting: Template items first, then others
    const sortedItems = Array.from(allItems).sort((a, b) => {
        const aInTemp = templateItems.has(a);
        const bInTemp = templateItems.has(b);
        if (aInTemp && !bInTemp) return -1;
        if (!aInTemp && bInTemp) return 1;
        return a.localeCompare(b);
    });

    const content = `
        <div class="bg-white flex flex-col h-full max-h-[85vh]">
            <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div>
                    <h3 class="text-lg font-bold text-slate-800">Pilih ${title}</h3>
                    <p class="text-xs text-slate-500">Pilih satu atau lebih item dari database</p>
                </div>
                <button onclick="closeModal()" class="p-2 hover:bg-slate-100 rounded-full transition-colors"><i data-lucide="x" width="20"></i></button>
            </div>
            
            <div class="p-4 bg-slate-50 shrink-0">
                <div class="relative">
                    <i data-lucide="search" width="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input type="text" id="picker-search" onkeyup="filterPickerItems(this.value)" placeholder="Cari item..." class="w-full border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:border-blue-500 outline-none bg-white">
                </div>
            </div>

            <div class="flex-1 overflow-y-auto p-4 space-y-2" id="picker-list">
                ${sortedItems.map(item => {
        // Check if item is in template defaults OR currently in form
        const isSelected = templateItems.has(item) || (window.tempFormData && window.tempFormData[key] && window.tempFormData[key].includes(item));
        return `
                    <label class="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-blue-50 cursor-pointer transition-all hover:border-blue-200 group bg-white ${isSelected ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100' : ''}">
                        <input type="checkbox" value="${item}" ${isSelected ? 'checked' : ''} class="picker-checkbox accent-blue-600 w-4 h-4 mt-0.5 shrink-0">
                        <span class="text-sm text-slate-600 group-hover:text-blue-700 leading-snug select-none">${item}</span>
                    </label>
                `}).join('')}
                ${sortedItems.length === 0 ? '<div class="text-center py-10"><p class="text-slate-400 text-sm">Tidak ada item ditemukan di database.</p></div>' : ''}
            </div>

            <div class="p-4 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-white rounded-b-2xl">
                <button onclick="closeModal()" class="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors text-sm">Batal</button>
                <button onclick="confirmItemPicker('${key}')" class="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all text-sm flex items-center gap-2">
                    <i data-lucide="check" width="16"></i> Pilih Item
                </button>
            </div>
        </div>
    `;

    const modalContent = document.getElementById('modal-content');
    modalContent.innerHTML = content;
    document.getElementById('modal-container').classList.remove('hidden');
    lucide.createIcons();

    // Auto focus search
    setTimeout(() => document.getElementById('picker-search').focus(), 100);
}

function filterPickerItems(query) {
    const term = query.toLowerCase();
    const labels = document.querySelectorAll('#picker-list label');
    labels.forEach(lbl => {
        const text = lbl.querySelector('span').textContent.toLowerCase();
        lbl.style.display = text.includes(term) ? 'flex' : 'none';
    });
}

function confirmItemPicker(key) {
    const checked = Array.from(document.querySelectorAll('.picker-checkbox:checked')).map(cb => cb.value);

    if (checked.length > 0) {
        const input = document.getElementById(`form-${key}`);
        const currentVal = input.value;
        const newVal = currentVal ? (currentVal.trim() + '\n' + checked.join('\n')) : checked.join('\n');

        updateForm(key, newVal);
        input.value = newVal;

        // Visual feedback
        input.classList.add('ring-2', 'ring-green-400');
        setTimeout(() => input.classList.remove('ring-2', 'ring-green-400'), 500);
    }
    closeModal();
}

// Start of original app.js content
// --- 20. LICENSE & LOCK SCREEN LOGIC ---



async function checkLicense() {
    const savedKey = localStorage.getItem('erm_license_key');
    const savedExpiry = localStorage.getItem('erm_license_expiry');
    const savedStatus = localStorage.getItem('erm_license_status');

    if (!savedKey) {
        renderLockScreen();
        return;
    }

    // 2. Cek Expiry Lokal (Supaya bisa offline sementara)
    if (savedStatus === 'ACTIVE' && savedExpiry) {
        // Parse "dd MMM yyyy HH:mm" manually
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
            } else {
                expDate.setHours(23, 59, 59);
            }
        } else {
            expDate = new Date(savedExpiry);
        }

        const now = new Date();
        if (now > expDate) {
            renderLockScreen("Masa aktif lisensi Anda telah habis.");
            return;
        }
    }

    // 3. Background Validation (Ke Server Lisensi PUSAT)
    renderApp();

    if (navigator.onLine) {
        try {
            // Add Timestamp to bust cache
            const response = await fetch(`${LICENSE_API_URL}?action=check_license&key=${savedKey}&t=${Date.now()}`);

            if (!response.ok) throw new Error("Server Error: " + response.status);

            const result = await response.json();

            if (result.valid) {
                localStorage.setItem('erm_license_expiry', result.expires);
                if (result.expires_iso) localStorage.setItem('erm_license_expiry_iso', result.expires_iso);
                localStorage.setItem('erm_license_plan', result.plan);
                localStorage.setItem('erm_license_status', 'ACTIVE');
                updateLicenseCountdown();
            } else {
                localStorage.setItem('erm_license_status', 'EXPIRED');
                renderLockScreen(result.message);
            }
        } catch (e) {
            console.log("License Server Unreachable. Using Cached Status.");
        }
    }
}

function renderLockScreen(msg = "") {
    document.getElementById('app-layout').classList.add('hidden');
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('print-container').classList.add('hidden');

    if (document.getElementById('lock-screen-overlay')) return;

    const lockScreen = document.createElement('div');
    lockScreen.id = 'lock-screen-overlay';
    lockScreen.className = "fixed inset-0 bg-slate-900 z-[100000] flex flex-col items-center justify-center p-6 text-white";
    lockScreen.innerHTML = `
        <div class="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-2xl border-4 border-slate-700 animate-pulse">
            <i data-lucide="lock" width="40" class="text-red-500"></i>
        </div>
        <h1 class="text-3xl font-black mb-2 tracking-tight">Aplikasi Terkunci</h1>
        <p class="text-slate-400 mb-8 text-center max-w-md">Silakan masukkan Kode Lisensi Aktif untuk mengakses sistem FISIOTA.</p>
        
        ${msg ? `<div class="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6 text-sm font-bold flex items-center gap-2"><i data-lucide="alert-triangle" width="16"></i> ${msg}</div>` : ''}

        <div class="w-full max-w-sm space-y-4">
            <div>
                <label class="text-xs font-bold text-slate-500 uppercase block mb-1">Kode Lisensi</label>
                <input type="text" id="license-input" class="w-full bg-slate-800 border-2 border-slate-700 p-4 rounded-xl text-center font-mono text-xl font-bold tracking-widest focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-white placeholder-slate-600" placeholder="FISIO-XXXX-XXXX">
            </div>
            <button onclick="activateLicense()" id="btn-activate" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/50 transition-all flex items-center justify-center gap-2 text-lg">
                <i data-lucide="key" width="20"></i> Aktivasi Sekarang
            </button>
            
            <div class="mt-8 pt-8 border-t border-slate-800 text-center">
                <p class="text-xs text-slate-500 mb-2">Belum punya kode?</p>
                <div class="text-sm font-bold text-slate-400">Hubungi Admin FISIOTA</div>
                <div class="text-xs text-slate-600 mt-1">Status: Terhubung ke Pusat</div>
            </div>
        </div>
    `;

    document.body.appendChild(lockScreen);
    lucide.createIcons();
}

async function activateLicense() {
    const key = document.getElementById('license-input').value.trim();
    const btn = document.getElementById('btn-activate');
    const url = LICENSE_API_URL; // USE CENTRAL URL

    if (!key) { alert("Masukkan kode dulu!"); return; }

    btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin" width="20"></i> Memeriksa...`;
    btn.disabled = true;
    lucide.createIcons();

    try {
        const fetchUrl = `${url}?action=check_license&key=${key}`;
        const resp = await fetch(fetchUrl);
        const result = await resp.json();

        if (result.valid) {
            alert(`✅ AKTIVASI BERHASIL!\n\nPaket: ${result.plan}\nKlien: ${result.client}\nExpired: ${result.expires}`);
            localStorage.setItem('erm_license_key', key);
            localStorage.setItem('erm_license_expiry', result.expires);
            if (result.expires_iso) localStorage.setItem('erm_license_expiry_iso', result.expires_iso);
            if (result.expiry_iso) localStorage.setItem('erm_license_expiry_iso', result.expiry_iso);

            localStorage.setItem('erm_license_status', 'ACTIVE');
            localStorage.setItem('erm_license_plan', result.plan);

            // NOTE: We do NOT overwrite 'erm_script_url' here. That is for User Data.

            location.reload();
        } else {
            alert(`❌ GAGAL: ${result.message}`);
            btn.innerHTML = `<i data-lucide="key" width="20"></i> Aktivasi Sekarang`;
            btn.disabled = false;
            lucide.createIcons();
        }

    } catch (e) {
        console.error(e);
        alert("Gagal menghubungi Server Pusat.\n\nError: " + e.message);
        btn.innerHTML = `<i data-lucide="key" width="20"></i> Aktivasi Sekarang`;
        btn.disabled = false;
        lucide.createIcons();
    }
}

function saveSetupUrl() {
    // Legacy function support if needed elsewhere, 
    // or keep for the Config Menu inside App.
    const url = document.getElementById('config-script-url')?.value.trim();
    if (url) {
        localStorage.setItem('erm_script_url', url);
        state.scriptUrl = url;
        alert("URL Data User Disimpan.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkLicense(); // CEK LISENSI DULUAN
    // Load data only if license passed (handled inside checkLicense -> renderApp)
    // Tapi karena checkLicense async, kita perlu modifikasi flow sedikit.
    // checkLicense akan panggil renderApp() jika sukses.

    // Legacy load (tetap jalan di background, tapi UI ditutup Lock Screen jika invalid)
    loadData();
    // Start interval etc
    setTimeout(renderIcons, 100);
    setInterval(updateDate, 1000);
    setTimeout(showSyncToast, 2000);
    updateDate();
    checkOnlineStatus();
});

// --- 21. LICENSE UPDATE LOGIC ---
// --- 21. LICENSE UPDATE LOGIC ---
let licenseInterval;

// --- 21. LICENSE UPDATE LOGIC ---
function updateLicenseCountdown() {
    const status = localStorage.getItem('erm_license_status');
    const expiryStr = localStorage.getItem('erm_license_expiry');
    const expiryIso = localStorage.getItem('erm_license_expiry_iso'); // NEW: Precision Date

    // Sidebar Widget Check
    const widget = document.getElementById('license-widget');
    if (status !== 'ACTIVE' || (!expiryStr && !expiryIso)) {
        if (widget) widget.classList.add('hidden');
    } else {
        if (widget) widget.classList.remove('hidden');
    }

    // Determine Expiry Date Object
    let expDate = new Date();

    if (expiryIso) {
        expDate = new Date(expiryIso);
    } else if (expiryStr) {
        const parts = expiryStr.split(' ');
        const monthMap = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
        if (parts.length >= 3) {
            const d = parseInt(parts[0]);
            const m = monthMap[parts[1]] !== undefined ? monthMap[parts[1]] : 0;
            const y = parseInt(parts[2]);
            expDate.setFullYear(y, m, d);
            if (parts[3]) {
                const timeParts = parts[3].split(':');
                expDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0);
            } else {
                expDate.setHours(23, 59, 59);
            }
        } else {
            expDate = new Date(expiryStr);
        }
    } else {
        return;
    }

    const now = new Date();
    const diff = expDate - now;

    // UPDATE UI (Sidebar & Config)
    const planName = localStorage.getItem('erm_license_plan') || 'Active License';

    // Config Elements
    const confPlan = document.getElementById('conf-lic-plan');
    const confStatus = document.getElementById('conf-lic-status');
    const confExpiry = document.getElementById('conf-lic-expiry');
    const confCount = document.getElementById('conf-lic-countdown');

    if (confPlan) confPlan.innerText = planName;
    if (confStatus) confStatus.innerText = status;
    if (confExpiry) confExpiry.innerText = expiryStr || expiryIso;

    // Sidebar Elements
    const sidePlan = document.getElementById('lic-plan');
    if (sidePlan) sidePlan.innerText = planName;
    const sideCount = document.getElementById('lic-countdown');

    if (diff <= 0) {
        const expiredText = "EXPIRED";
        if (confCount) confCount.innerText = expiredText;
        if (sideCount) sideCount.innerText = expiredText;

        // STOP LOOPING
        if (licenseInterval) clearInterval(licenseInterval);

        checkLicense();
    } else {
        const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
        const diffHrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const diffSecs = Math.floor((diff % (1000 * 60)) / 1000);

        let shortText = "";
        let longText = "";

        if (diffDays > 0) {
            shortText = `${diffDays} Hari`;
            longText = `${diffDays} Hari ${diffHrs} Jam`;
        } else {
            shortText = `${diffHrs}j ${diffMins}m ${diffSecs}s`;
            longText = `${diffHrs}j ${diffMins}m ${diffSecs}s`;
        }

        if (sideCount) {
            sideCount.innerText = shortText;
            sideCount.className = diffDays < 3 ? "text-orange-400 font-mono font-bold" : "text-blue-400 font-mono font-bold";
        }

        if (confCount) {
            confCount.innerText = longText;
            confCount.className = diffDays < 3 ? "text-5xl font-black text-orange-500 font-mono tracking-tight animate-pulse" : "text-5xl font-black text-blue-600 font-mono tracking-tight";
        }
    }
}

async function refreshLicenseStatus() {
    const btn = document.querySelector('#tab-content-license button');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin" width="16"></i> Memeriksa...`;
    btn.disabled = true;
    lucide.createIcons();

    const savedKey = localStorage.getItem('erm_license_key');
    if (!savedKey) { // Removed state.scriptUrl check
        alert("Data lisensi lokal tidak lengkap.");
        btn.innerHTML = oldHtml; btn.disabled = false;
        return;
    }

    try {
        // GUNAKAN GET METHOD ke URL PUSAT (Hardcoded)
        const fetchUrl = `${LICENSE_API_URL}?action=check_license&key=${savedKey}&t=${Date.now()}`;
        const resp = await fetch(fetchUrl);
        const result = await resp.json();

        if (result.valid) {
            localStorage.setItem('erm_license_expiry', result.expires);
            if (result.expires_iso) localStorage.setItem('erm_license_expiry_iso', result.expires_iso);

            localStorage.setItem('erm_license_plan', result.plan);
            localStorage.setItem('erm_license_status', 'ACTIVE');

            alert(`Status Diperbarui!\n\nPaket: ${result.plan}\nExpired Terbaru: ${result.expires}`);
            updateLicenseCountdown();
        } else {
            alert(`Lisensi Tidak Valid / Expired: ${result.message}`);
            localStorage.setItem('erm_license_status', 'EXPIRED');
            checkLicense();
        }

    } catch (e) {
        console.error(e);
        alert("Gagal koneksi ke server Lisensi Pusat. Coba lagi.");
    } finally {
        btn.innerHTML = oldHtml;
        btn.disabled = false;
        lucide.createIcons();
    }
}


// Start Countdown Interval
licenseInterval = setInterval(() => {
    updateLicenseCountdown();
}, 1000);
// Initial Call
setTimeout(updateLicenseCountdown, 2000);

// =============================================================
// --- MODUL KASIR & PEMBAYARAN ---
// =============================================================

function renderKasirView(container) {
    const tab = state.kasirTab || 'antrian';
    const formatRp = (n) => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');

    container.innerHTML = `
        <div class="space-y-6 fade-in pb-24">
            <!-- Tab Header -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-1 flex gap-1">
                <button onclick="switchKasirTab('antrian')" id="ktab-antrian"
                    class="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${tab === 'antrian' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}">
                    <i data-lucide="clock" width="14" class="inline mr-1"></i> Antrian Hari Ini
                </button>
                <button onclick="switchKasirTab('laporan')" id="ktab-laporan"
                    class="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${tab === 'laporan' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}">
                    <i data-lucide="bar-chart-2" width="14" class="inline mr-1"></i> Laporan Keuangan
                </button>
                <button onclick="switchKasirTab('pajak')" id="ktab-pajak"
                    class="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${tab === 'pajak' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}">
                    <i data-lucide="file-text" width="14" class="inline mr-1"></i> Laporan Pajak
                </button>
            </div>

            <!-- Tab Content -->
            <div id="kasir-tab-content">
                ${tab === 'antrian' ? renderKasirAntrian(formatRp) : (tab === 'pajak' ? renderKasirPajak(formatRp) : renderKasirLaporan(formatRp))}
            </div>
        </div>`;
    renderIcons();
}

function switchKasirTab(tab) {
    state.kasirTab = tab;
    renderKasirView(document.getElementById('main-content'));
}

// --- UTILS KASIR ---
function parseRp(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const clean = val.toString().replace(/Rp/g, '').replace(/\./g, '').replace(/,/g, '').replace(/\s/g, '');
    return Number(clean) || 0;
}

function renderKasirAntrian(formatRp) {
    const today = new Date().toISOString().slice(0, 10);
    const antrian = (state.appointments || []).filter(a => {
        const isPaid = (a.paymentStatus || '').toUpperCase() === 'PAID';
        const isLegacyPaid = !a.paymentStatus && parseRp(a.fee) > 0;
        return a.date === today && (a.status === 'CONFIRMED' || !a.status) && !isPaid && !isLegacyPaid;
    }).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    const lunas = (state.appointments || []).filter(a => {
        const isPaid = (a.paymentStatus || '').toUpperCase() === 'PAID';
        const isLegacyPaid = !a.paymentStatus && parseRp(a.fee) > 0;
        return a.date === today && (isPaid || isLegacyPaid);
    }).sort((a, b) => (b.paidAt || b.date || '').localeCompare(a.paidAt || a.date || ''));

    const totalLunasHariIni = lunas.reduce((s, a) => s + (parseRp(a.finalAmount) || parseRp(a.fee) || 0), 0);

    return `
        <!-- Summary strip -->
        <div class="grid grid-cols-3 gap-4">
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p class="text-2xl font-black text-amber-700">${antrian.length}</p>
                <p class="text-xs font-bold text-amber-600 mt-0.5">Menunggu Bayar</p>
            </div>
            <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p class="text-2xl font-black text-emerald-700">${lunas.length}</p>
                <p class="text-xs font-bold text-emerald-600 mt-0.5">Sudah Lunas</p>
            </div>
            <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <p class="text-lg font-black text-blue-700 truncate">${formatRp(totalLunasHariIni)}</p>
                <p class="text-xs font-bold text-blue-600 mt-0.5">Pemasukan Hari Ini</p>
            </div>
        </div>

        <!-- Antrian Belum Bayar -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div class="px-6 py-4 border-b border-slate-100">
                <h3 class="font-bold text-slate-800 flex items-center gap-2">
                    <i data-lucide="clock" width="18" class="text-amber-500"></i>
                    Antrian Belum Bayar
                </h3>
            </div>
            <div class="divide-y divide-slate-100">
                ${antrian.length === 0
            ? `<div class="p-8 text-center text-slate-400">
                            <i data-lucide="check-circle" width="40" class="mx-auto mb-2 text-emerald-400"></i>
                            <p class="font-medium">Semua pasien hari ini sudah lunas!</p>
                       </div>`
            : antrian.map(a => {
                const p = (state.patients || []).find(pt => pt.id === a.patientId);
                const nama = p ? p.name : (a.visitor_name || a.name || 'Pasien Baru');
                const terapis = (state.users || []).find(u => u.id === a.therapistId);
                return `
                        <div class="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                            <div class="text-center min-w-[52px]">
                                <span class="text-lg font-black text-slate-700">${a.time || '-'}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="font-bold text-slate-800 truncate">${nama}</p>
                                <p class="text-xs text-slate-400">${terapis ? terapis.name : (a.therapistId || '-')} &bull; ${a.patientType || 'Klinik'}</p>
                            </div>
                            <div class="text-right shrink-0">
                                <p class="font-bold text-slate-700 text-sm">${formatRp(a.fee)}</p>
                                <button onclick="openPaymentModal('${a.id}')"
                                    class="mt-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                                    Proses Bayar
                                </button>
                            </div>
                        </div>`;
            }).join('')}
            </div>
        </div>

        <!-- Sudah Lunas Hari Ini -->
        ${lunas.length > 0 ? `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div class="px-6 py-4 border-b border-slate-100">
                <h3 class="font-bold text-slate-800 flex items-center gap-2">
                    <i data-lucide="check-circle" width="18" class="text-emerald-500"></i>
                    Sudah Lunas Hari Ini
                </h3>
            </div>
            <div class="divide-y divide-slate-100">
                ${lunas.map(a => {
                const p = (state.patients || []).find(pt => pt.id === a.patientId);
                const nama = p ? p.name : (a.visitor_name || a.name || 'Pasien');
                const methodIcons = { 'Tunai': '💵', 'Transfer': '🏦', 'QRIS': '📱', 'BPJS': '🏥' };
                return `
                    <div class="flex items-center gap-4 px-6 py-3 bg-emerald-50/30">
                        <div class="flex-1 min-w-0">
                            <p class="font-semibold text-slate-700 truncate">${nama}</p>
                            <p class="text-xs text-slate-400">${a.time || '-'} &bull; ${methodIcons[a.paymentMethod] || ''} ${a.paymentMethod || '-'}</p>
                        </div>
                        <div class="text-right shrink-0">
                            <p class="font-bold text-emerald-700">${formatRp(a.finalAmount || a.fee)}</p>
                            <span class="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">LUNAS</span>
                        </div>
                    </div>`;
            }).join('')}
            </div>
        </div>` : ''}
    `;
}

function renderKasirLaporan(formatRp) {
    // Default range: bulan ini
    const now = new Date();
    const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const defaultTo = now.toISOString().slice(0, 10);
    const savedFrom = state.laporanFrom || defaultFrom;
    const savedTo = state.laporanTo || defaultTo;

    const filtered = (state.appointments || []).filter(a => {
        const isPaid = (a.paymentStatus || '').toUpperCase() === 'PAID';
        const isLegacyPaid = !a.paymentStatus && parseRp(a.fee) > 0;
        const apptDate = (a.paidAt || a.date || '');
        const dateMatch = apptDate && apptDate.slice(0, 10) >= savedFrom && apptDate.slice(0, 10) <= savedTo;
        return (isPaid || isLegacyPaid) && dateMatch;
    }).sort((a, b) => (b.paidAt || b.date || '').localeCompare(a.paidAt || a.date || ''));

    const total = filtered.reduce((s, a) => s + (parseRp(a.finalAmount) || parseRp(a.fee) || 0), 0);
    const byMethod = { Tunai: 0, Transfer: 0, QRIS: 0, BPJS: 0 };
    filtered.forEach(a => {
        const m = a.paymentMethod || 'Tunai';
        byMethod[m] = (byMethod[m] || 0) + (parseRp(a.finalAmount) || parseRp(a.fee) || 0);
    });

    // Group by date for per-hari view
    const byDate = {};
    filtered.forEach(a => {
        const d = a.paidAt ? a.paidAt.slice(0, 10) : a.date;
        if (!byDate[d]) byDate[d] = { count: 0, total: 0 };
        byDate[d].count++;
        byDate[d].total += parseRp(a.finalAmount) || parseRp(a.fee) || 0;
    });

    return `
        <!-- Filter -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div class="flex flex-wrap items-end gap-4">
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Dari Tanggal</label>
                    <input type="date" id="laporan-from" value="${savedFrom}"
                        class="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-blue-500 outline-none">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Sampai Tanggal</label>
                    <input type="date" id="laporan-to" value="${savedTo}"
                        class="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-blue-500 outline-none">
                </div>
                <button onclick="applyLaporanFilter()"
                    class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors shadow-md">
                    Tampilkan
                </button>
                <button onclick="printJournalReport()"
                    class="bg-slate-800 hover:bg-black text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors shadow-md flex items-center gap-2">
                    <i data-lucide="printer" width="16"></i> Cetak Jurnal
                </button>
                <button onclick="printAppointmentReport()"
                    class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors shadow-md flex items-center gap-2">
                    <i data-lucide="list" width="16"></i> Rekap Kunjungan (Excel-Style)
                </button>
            </div>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div class="md:col-span-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
                <p class="text-blue-200 text-xs font-bold uppercase">Total Pemasukan</p>
                <p class="text-2xl font-black mt-1 truncate">${formatRp(total)}</p>
                <p class="text-blue-200 text-xs mt-1">${filtered.length} transaksi</p>
            </div>
            <div class="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
                <p class="text-lg font-black text-slate-700">💵</p>
                <p class="text-sm font-bold text-slate-700 mt-1">${formatRp(byMethod.Tunai)}</p>
                <p class="text-xs text-slate-400">Tunai</p>
            </div>
            <div class="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
                <p class="text-lg font-black text-slate-700">🏦</p>
                <p class="text-sm font-bold text-slate-700 mt-1">${formatRp(byMethod.Transfer)}</p>
                <p class="text-xs text-slate-400">Transfer</p>
            </div>
            <div class="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
                <p class="text-lg font-black text-slate-700">📱</p>
                <p class="text-sm font-bold text-slate-700 mt-1">${formatRp(byMethod.QRIS)}</p>
                <p class="text-xs text-slate-400">QRIS</p>
            </div>
        </div>

        <!-- Per Hari -->
        ${Object.keys(byDate).length > 0 ? `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 class="font-bold text-slate-800">Ringkasan Per Hari</h3>
            </div>
            <div class="divide-y divide-slate-100">
                ${Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a)).map(([date, info]) => {
        const d = new Date(date + 'T00:00:00');
        const label = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        return `
                    <div class="flex items-center justify-between px-6 py-3 hover:bg-slate-50">
                        <div>
                            <p class="font-semibold text-slate-700 text-sm">${label}</p>
                            <p class="text-xs text-slate-400">${info.count} transaksi</p>
                        </div>
                        <p class="font-bold text-slate-800">${formatRp(info.total)}</p>
                    </div>`;
    }).join('')}
            </div>
        </div>` : ''}

        <!-- Tabel Detail -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div class="px-6 py-4 border-b border-slate-100">
                <h3 class="font-bold text-slate-800">Detail Transaksi</h3>
            </div>
            ${filtered.length === 0
            ? `<div class="p-12 text-center text-slate-400 bg-slate-50 border-2 border-dashed border-slate-100 rounded-2xl mx-6 mb-6">
                        <i data-lucide="info" width="48" class="mx-auto mb-4 text-slate-300"></i>
                        <h4 class="text-slate-600 font-bold text-lg mb-1">Belum Ada Transaksi</h4>
                        <p class="text-sm max-w-sm mx-auto mb-6">Hanya janji temu yang sudah <b>dikonfirmasi</b> dan <b>dibayar</b> (status LUNAS) yang muncul di laporan ini.</p>
                        <div class="flex justify-center gap-3">
                            <button onclick="switchKasirTab('antrian')" class="bg-white border border-slate-200 px-4 py-2 rounded-lg text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition-all">Cek Antrian Hari Ini</button>
                            <button onclick="pullDataFromSheet()" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-blue-700 transition-all flex items-center gap-1"><i data-lucide="refresh-cw" width="12"></i> Tarik Data Terbaru</button>
                        </div>
                   </div>`
            : `<div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th class="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Tgl Bayar</th>
                                <th class="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Pasien</th>
                                <th class="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase hidden md:table-cell">Terapis</th>
                                <th class="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Metode</th>
                                <th class="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase">Total</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${filtered.map(a => {
                const p = (state.patients || []).find(pt => pt.id === a.patientId);
                const nama = p ? p.name : (a.visitor_name || a.name || 'Pasien');
                const terapis = (state.users || []).find(u => u.id === a.therapistId);
                const paidDate = a.paidAt ? new Date(a.paidAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
                const methodColors = { 'Tunai': 'bg-green-100 text-green-700', 'Transfer': 'bg-blue-100 text-blue-700', 'QRIS': 'bg-purple-100 text-purple-700', 'BPJS': 'bg-teal-100 text-teal-700' };
                const mc = methodColors[a.paymentMethod] || 'bg-slate-100 text-slate-600';
                return `
                                <tr class="hover:bg-slate-50 transition-colors">
                                    <td class="px-4 py-3 text-slate-500 text-xs">${paidDate}</td>
                                    <td class="px-4 py-3 font-medium text-slate-800">${nama}</td>
                                    <td class="px-4 py-3 text-slate-500 hidden md:table-cell">${terapis ? terapis.name : '-'}</td>
                                    <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full text-xs font-bold ${mc}">${a.paymentMethod || '-'}</span></td>
                                    <td class="px-4 py-3 text-right font-bold text-slate-800">${formatRp(a.finalAmount || a.fee)}</td>
                                </tr>`;
            }).join('')}
                        </tbody>
                    </table>
                   </div>`}
        </div>
    `;
}

function applyLaporanFilter() {
    const from = document.getElementById('laporan-from')?.value;
    const to = document.getElementById('laporan-to')?.value;
    if (from) state.laporanFrom = from;
    if (to) state.laporanTo = to;
    renderKasirView(document.getElementById('main-content'));
}

// --- Modal Pembayaran ---
function openPaymentModal(apptId) {
    const a = (state.appointments || []).find(x => x.id === apptId);
    if (!a) return;
    const p = (state.patients || []).find(pt => pt.id === a.patientId);
    const nama = p ? p.name : (a.visitor_name || a.name || 'Pasien Baru');

    // Ambil fee dari appointment, jika kosong ambil defaultFee dari pasien
    const feeBase = Number(a.fee) || (p ? Number(p.defaultFee) : 0) || 0;
    const qrisImg = state.clinicInfo.qrisImage || '';
    const formatRp = (n) => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');

    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');

    content.innerHTML = `
        <div class="bg-white px-6 py-4 border-b flex justify-between items-center sticky top-0 z-20">
            <div>
                <h3 class="text-xl font-bold text-slate-800">Proses Pembayaran</h3>
                <p class="text-sm text-slate-500">${nama} &bull; ${a.time || ''} &bull; ${a.date}</p>
            </div>
            <button onclick="closeModal()" class="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                <i data-lucide="x" width="20"></i>
            </button>
        </div>
        <div class="px-6 py-5 space-y-5 overflow-y-auto flex-1">
            <!-- Rincian -->
            <div class="bg-slate-50 rounded-xl p-4 space-y-2">
                <div class="flex justify-between text-sm"><span class="text-slate-500">Biaya Sesi</span><span class="font-bold">${formatRp(feeBase)}</span></div>
                <div class="flex justify-between text-sm items-center">
                    <span class="text-slate-500">Diskon (Rp)</span>
                    <input type="number" id="pm-discount" value="0" min="0" max="${feeBase}"
                        oninput="updatePaymentTotal(${feeBase})"
                        class="w-32 text-right border-2 border-slate-200 rounded-lg px-2 py-1 text-sm focus:border-blue-500 outline-none">
                </div>
                <div class="border-t border-slate-200 pt-2 flex justify-between font-bold text-base">
                    <span>TOTAL BAYAR</span>
                    <span id="pm-total" class="text-blue-600">${formatRp(feeBase)}</span>
                </div>
            </div>

            <!-- Pilih Metode -->
            <div>
                <p class="text-xs font-bold text-slate-500 uppercase mb-2">Metode Pembayaran</p>
                <div class="grid grid-cols-4 gap-2" id="pm-method-group">
                    ${['Tunai', 'Transfer', 'QRIS', 'BPJS'].map(m => `
                    <button type="button" onclick="selectPaymentMethod('${m}')" id="pm-${m}"
                        class="py-2 px-1 rounded-xl border-2 text-sm font-bold transition-all border-slate-200 text-slate-600 hover:border-blue-400">
                        ${m === 'Tunai' ? '💵' : m === 'Transfer' ? '🏦' : m === 'QRIS' ? '📱' : '🏥'}<br>${m}
                    </button>`).join('')}
                </div>
            </div>

            <!-- QRIS Panel (hidden by default) -->
            <div id="pm-qris-panel" class="hidden bg-purple-50 border-2 border-purple-200 rounded-2xl p-5 text-center">
                ${qrisImg
            ? `<img src="${qrisImg}" alt="QR Code Klinik" class="w-48 h-48 object-contain mx-auto rounded-xl border border-slate-200 bg-white p-2">`
            : `<div class="w-48 h-48 mx-auto bg-white rounded-xl border-2 border-dashed border-purple-300 flex items-center justify-center text-slate-400 text-sm">
                            <div class="text-center"><i data-lucide="qr-code" width="48" class="mx-auto mb-2 text-purple-300"></i><p>QR belum diupload</p><p class="text-xs">Upload di menu Konfigurasi</p></div>
                       </div>`}
                <p class="text-purple-700 font-bold mt-3 text-sm">Scan QR, lalu transfer nominal:</p>
                <p class="text-2xl font-black text-purple-800" id="pm-qris-nominal">${formatRp(feeBase)}</p>
                <p class="text-xs text-purple-500 mt-1">Konfirmasi setelah pasien transfer</p>
            </div>
        </div>
        <div class="px-6 py-4 border-t bg-slate-50 sticky bottom-0">
            <button onclick="confirmPayment('${apptId}')"
                id="pm-confirm-btn"
                class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-base transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled>
                <i data-lucide="check-circle" width="20" class="inline mr-2"></i> Konfirmasi Lunas
            </button>
            <p class="text-xs text-slate-400 text-center mt-2">Pilih metode pembayaran terlebih dahulu</p>
        </div>`;

    renderIcons();
}

function selectPaymentMethod(method) {
    state._selectedPaymentMethod = method;
    // Update button styles
    ['Tunai', 'Transfer', 'QRIS', 'BPJS'].forEach(m => {
        const btn = document.getElementById(`pm-${m}`);
        if (!btn) return;
        btn.className = m === method
            ? 'py-2 px-1 rounded-xl border-2 text-sm font-bold transition-all border-blue-600 bg-blue-50 text-blue-700'
            : 'py-2 px-1 rounded-xl border-2 text-sm font-bold transition-all border-slate-200 text-slate-600 hover:border-blue-400';
    });
    // Show/hide QRIS panel
    const qrisPanel = document.getElementById('pm-qris-panel');
    if (qrisPanel) qrisPanel.classList.toggle('hidden', method !== 'QRIS');
    // Enable confirm button
    const btn = document.getElementById('pm-confirm-btn');
    if (btn) {
        btn.disabled = false;
        const next = btn.nextElementSibling;
        if (next) next.textContent = `Bayar via ${method}`;
    }
}

function updatePaymentTotal(feeBase) {
    const disc = Number(document.getElementById('pm-discount')?.value) || 0;
    const total = Math.max(0, feeBase - disc);
    const formatRp = (n) => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');
    const totalEl = document.getElementById('pm-total');
    const qrisNominal = document.getElementById('pm-qris-nominal');
    if (totalEl) totalEl.textContent = formatRp(total);
    if (qrisNominal) qrisNominal.textContent = formatRp(total);
}

async function confirmPayment(apptId) {
    const a = (state.appointments || []).find(x => x.id === apptId);
    if (!a) return;

    const discount = Number(document.getElementById('pm-discount')?.value) || 0;
    const feeBase = parseRp(a.fee);
    const finalAmount = Math.max(0, feeBase - discount);
    const method = state._selectedPaymentMethod;

    if (!method) { alert('Pilih metode pembayaran!'); return; }

    // Update state
    a.paymentStatus = 'PAID';
    a.paymentMethod = method;
    a.discount = discount;
    a.finalAmount = finalAmount;
    a.paidAt = new Date().toISOString();
    a.updatedAt = new Date().toISOString();

    saveData();
    closeModal();
    renderKasirView(document.getElementById('main-content'));

    // Try to sync instantly
    autoSyncPayment(a);
}

function renderKasirPajak(formatRp) {
    const now = new Date();
    const currentMonth = state.taxMonth || (now.getMonth() + 1);
    const currentYear = state.taxYear || now.getFullYear();

    // Filter data berdasarkan bulan/tahun
    const monthStr = String(currentMonth).padStart(2, '0');
    const periodStart = `${currentYear}-${monthStr}-01`;
    const periodEnd = `${currentYear}-${monthStr}-31`; // Simple approximation

    const filtered = (state.appointments || []).filter(a => {
        const isPaid = (a.paymentStatus || '').toUpperCase() === 'PAID';
        const isLegacyPaid = !a.paymentStatus && parseRp(a.fee) > 0;
        const d = (a.paidAt || a.date || '').slice(0, 10);
        return (isPaid || isLegacyPaid) && d >= periodStart && d <= periodEnd;
    });

    // Hitung Auto
    const autoBruto = filtered.reduce((s, a) => s + (parseRp(a.finalAmount) || parseRp(a.fee) || 0), 0);
    const autoPajak = autoBruto * 0.005; // PPh Final 0.5% UMKM

    // State Override (Jika user pernah edit)
    const saved = state.taxOverride || {};
    const displayBruto = saved.bruto !== undefined ? saved.bruto : autoBruto;
    const notes = saved.notes || '';

    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    return `
        <div class="space-y-6 fade-in shadow-inner-lg p-1">
            <!-- Filter & Action Card -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div class="flex flex-col md:flex-row gap-6 items-end justify-between">
                    <div class="flex gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Bulan</label>
                            <select onchange="updateTaxPeriod('month', this.value)" class="bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold focus:border-blue-500 outline-none">
                                ${months.map((m, i) => `<option value="${i + 1}" ${currentMonth == i + 1 ? 'selected' : ''}>${m}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Tahun</label>
                            <select onchange="updateTaxPeriod('year', this.value)" class="bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold focus:border-blue-500 outline-none">
                                <option value="2025" ${currentYear == 2025 ? 'selected' : ''}>2025</option>
                                <option value="2026" ${currentYear == 2026 ? 'selected' : ''}>2026</option>
                            </select>
                        </div>
                    </div>
                    <button onclick="printTaxReport()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md flex items-center gap-2">
                        <i data-lucide="printer" width="18"></i> Cetak Laporan PDF
                    </button>
                </div>
            </div>

            <!-- Customization Panel -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <h3 class="font-bold text-slate-800 flex items-center gap-2">
                            <i data-lucide="edit-3" width="18" class="text-blue-500"></i>
                            Review & Kustomisasi Manual
                        </h3>
                    </div>
                    <div class="p-6 space-y-4">
                        <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                            <i data-lucide="info" width="20" class="text-blue-500 shrink-0 mt-0.5"></i>
                            <p class="text-xs text-blue-700 leading-relaxed">
                                Angka di bawah ini ditarik otomatis dari sistem. Jika ada ketidaksesuaian data manual, silakan edit nilai <b>Omzet Bruto</b> di kotak input untuk menyesuaikan hasil akhir laporan PDF.
                            </p>
                        </div>
                        
                        <div class="grid grid-cols-1 gap-6 pt-2">
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-2">Total Omzet Bruto (Rp)</label>
                                <div class="relative">
                                    <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                                    <input type="number" value="${displayBruto}" 
                                        oninput="updateTaxOverride('bruto', this.value)"
                                        class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 py-3 text-lg font-black text-slate-800 focus:border-blue-500 focus:bg-white transition-all outline-none">
                                </div>
                                <p class="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                                    <i data-lucide="calculator" width="10"></i> 
                                    Hitungan sistem otomatis: ${formatRp(autoBruto)}
                                </p>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-2">Catatan Tambahan (Muncul di PDF)</label>
                                <textarea oninput="updateTaxOverride('notes', this.value)"
                                    placeholder="Contoh: Termasuk penyesuaian kas manual atau piutang BPJS..."
                                    class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:bg-white transition-all outline-none min-h-[100px]">${notes}</textarea>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Final summary card -->
                <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col justify-between">
                    <div>
                        <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Estimasi Pajak (0.5%)</p>
                        <h4 class="text-4xl font-black mb-1" id="tax-final-amount">${formatRp(displayBruto * 0.005)}</h4>
                        <p class="text-slate-500 text-[10px]">Berdasarkan Omzet Bruto: ${formatRp(displayBruto)}</p>
                    </div>
                    
                    <div class="mt-8 pt-6 border-t border-white/10">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-xs text-slate-400 font-medium">Metode Pelaporan</span>
                            <span class="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">UMKM PP-23</span>
                        </div>
                        <p class="text-[10px] text-slate-500 leading-tight italic">
                            *Laporan ini bersifat internal untuk membantu administrasi pajak. Pastikan data sudah sesuai sebelum dilaporkan melalui DJP Online.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function updateTaxPeriod(type, val) {
    if (type === 'month') state.taxMonth = Number(val);
    if (type === 'year') state.taxYear = Number(val);
    renderKasirView(document.getElementById('main-content'));
}

function updateTaxOverride(key, val) {
    if (!state.taxOverride) state.taxOverride = {};
    if (key === 'bruto') {
        state.taxOverride.bruto = Number(val);
        // Update total pajak di UI secara instant agar responsif
        const amount = Number(val) * 0.005;
        const el = document.getElementById('tax-final-amount');
        if (el) el.textContent = 'Rp ' + amount.toLocaleString('id-ID');
    }
    if (key === 'notes') state.taxOverride.notes = val;
    // Debounce saves to local storage implicitly via state modification if needed, 
    // but here we just keep it in state while session is active.
}

// --- FUNGSI CETAK JURNAL & PAJAK ESTETIK ---

function printTaxReport() {
    printJournalReport('TAX');
}

function printJournalReport(mode = 'GENERAL') {
    const now = new Date();
    const clinic = state.clinicInfo || { name: 'FISIOTA' };
    let filtered = [];
    let title = "";
    let periodText = "";

    if (mode === 'TAX') {
        const currentMonth = state.taxMonth || (now.getMonth() + 1);
        const currentYear = state.taxYear || now.getFullYear();
        const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const monthName = months[currentMonth - 1];

        title = "REKAPITULASI PAJAK FINAL (UMKM PP-23)";
        periodText = `PERIODE BULAN ${monthName.toUpperCase()} ${currentYear}`;

        const monthStr = String(currentMonth).padStart(2, '0');
        const pStart = `${currentYear}-${monthStr}-01`;
        const pEnd = `${currentYear}-${monthStr}-31`;

        filtered = (state.appointments || []).filter(a => {
            const isPaid = (a.paymentStatus || '').toUpperCase() === 'PAID';
            const isLegacyPaid = !a.paymentStatus && parseRp(a.fee) > 0;
            const d = (a.paidAt || a.date || '').slice(0, 10);
            return (isPaid || isLegacyPaid) && d >= pStart && d <= pEnd;
        });
    } else {
        const from = state.laporanFrom || today();
        const to = state.laporanTo || today();
        title = "JURNAL PENERIMAAN KAS KLINIK";
        periodText = `PERIODE: ${from} s/d ${to}`;

        filtered = (state.appointments || []).filter(a => {
            const isPaid = (a.paymentStatus || '').toUpperCase() === 'PAID';
            const isLegacyPaid = !a.paymentStatus && parseRp(a.fee) > 0;
            const apptDate = (a.paidAt || a.date || '');
            const dateMatch = apptDate && apptDate.slice(0, 10) >= from && apptDate.slice(0, 10) <= to;
            return (isPaid || isLegacyPaid) && dateMatch;
        });
    }

    // Sort by Date
    filtered.sort((a, b) => (a.paidAt || a.date || "").localeCompare(b.paidAt || b.date || ""));

    // Calculation
    let totalDpp = 0;
    let totalTax = 0;
    let totalGrand = 0;

    const rowsHtml = filtered.map((a, idx) => {
        const patient = state.patients.find(p => p.id === a.patientId) || { name: a.visitor_name || a.name || 'Pasien' };
        const grandTotal = parseRp(a.finalAmount) || parseRp(a.fee) || 0;
        const dpp = grandTotal;
        const tax = grandTotal * 0.005;

        totalDpp += dpp;
        totalTax += tax;
        totalGrand += grandTotal;

        const dateDisplay = a.paidAt
            ? new Date(a.paidAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date(a.paidAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            : formatDateForDisplay(a.date);

        return `
            <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td>${dateDisplay}</td>
                <td style="font-family: monospace; font-size: 10px;">${a.id}</td>
                <td>${patient.name}</td>
                <td style="text-align: right;">${grandTotal.toLocaleString('id-ID')}</td>
                <td style="text-align: right;">${dpp.toLocaleString('id-ID')}</td>
                <td style="text-align: right;">${tax.toLocaleString('id-ID')}</td>
                <td style="font-size: 10px;">${a.paymentMethod || '-'}</td>
            </tr>
        `;
    }).join('');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>${title} - ${clinic.name}</title>
            <style>
                @page { size: A4 portrait; margin: 15mm; }
                body { font-family: 'Inter', -apple-system, system-ui, sans-serif; padding: 0; color: #1e293b; line-height: 1.4; font-size: 10px; }
                
                .header-wrapper { display: flex; align-items: flex-start; border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 20px; }
                .logo-box { width: 60px; height: 60px; background: #f1f5f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 15px; border: 1px solid #cbd5e1; }
                .clinic-info { flex: 1; }
                .clinic-info h1 { margin: 0; font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: -0.5px; }
                .clinic-info p { margin: 1px 0; color: #64748b; font-size: 9px; }
                .clinic-info .bold { color: #0f172a; font-weight: 700; }

                .report-header { text-align: center; margin-bottom: 20px; }
                .report-header h2 { margin: 0; font-size: 14px; font-weight: 800; border-bottom: 1px solid #1e293b; display: inline-block; padding-bottom: 2px; }
                .report-header p { margin: 4px 0 0; font-size: 11px; font-weight: 700; color: #334155; }

                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { background: #f8fafc; color: #1e293b; font-weight: 800; text-transform: uppercase; font-size: 9px; border-top: 1px solid #1e293b; border-bottom: 1px solid #1e293b; padding: 8px 4px; }
                td { padding: 6px 4px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
                .text-right { text-align: right; }
                
                .summary-table { margin-left: auto; width: 280px; margin-top: 10px; }
                .summary-table td { border: none; padding: 2px 4px; font-size: 11px; }
                .summary-table .label { text-align: right; color: #64748b; font-weight: 600; padding-right: 15px; }
                .summary-table .value { text-align: right; font-weight: 900; border-bottom: 1px double #1e293b; color: #0f172a; }
                .summary-table .highlight { color: #dc2626; }

                .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
                .print-meta { font-size: 8px; color: #94a3b8; font-style: italic; }
                .signature-box { text-align: center; width: 200px; }
                .signature-box p { margin: 2px 0; }
                .signature-space { height: 60px; }

                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="header-wrapper">
                <div class="logo-box">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                </div>
                <div class="clinic-info">
                    <h1>${clinic.name}</h1>
                    <p class="bold">Izin Operasional: ${clinic.sipf || '-'}</p>
                    <p>${clinic.address || '-'}</p>
                    <p>Telp: ${clinic.phone || '-'} &bull; NPWP: ${clinic.npwp || '-'}</p>
                </div>
            </div>

            <div class="report-header">
                <h2>${title}</h2>
                <p>${periodText}</p>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 25px;">No</th>
                        <th style="width: 100px;">Tanggal & Jam</th>
                        <th style="width: 70px;">ID Faktur</th>
                        <th>Nama Pasien</th>
                        <th style="width: 80px;" class="text-right">Grand Total</th>
                        <th style="width: 80px;" class="text-right">DPP</th>
                        <th style="width: 80px;" class="text-right">Pajak (0.5%)</th>
                        <th style="width: 80px;">Metode</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <table class="summary-table">
                <tr>
                    <td class="label">Total DPP :</td>
                    <td class="value">Rp ${totalDpp.toLocaleString('id-ID')}</td>
                </tr>
                <tr>
                    <td class="label">Total Pajak :</td>
                    <td class="value highlight">Rp ${totalTax.toLocaleString('id-ID')}</td>
                </tr>
                <tr>
                    <td class="label">Total Penerimaan :</td>
                    <td class="value">Rp ${totalGrand.toLocaleString('id-ID')}</td>
                </tr>
            </table>

            <div style="margin-top: 20px; font-size: 9px; color: #475569; border: 1px dashed #cbd5e1; padding: 8px; border-radius: 6px;">
                <strong>Keterangan:</strong> ${state.taxOverride?.notes || '-'}
            </div>

            <div class="footer">
                <div class="print-meta">
                    Sistem Digital ERM FISIOTA<br>
                    Dicetak: ${now.toLocaleString('id-ID')}
                </div>
                <div class="signature-box">
                    <p>${clinic.location || 'Kota'}, ${now.toLocaleDateString('id-ID')}</p>
                    <p>Pimpinan Klinik,</p>
                    <div class="signature-space"></div>
                    <p><strong>( ______________________ )</strong></p>
                    <p style="font-size: 8px; color: #94a3b8; margin-top: 4px;">Ttd & Stempel</p>
                </div>
            </div>

            <script>
                window.onload = function() {
                    window.print();
                    // window.close();
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function printAppointmentReport() {
    const now = new Date();
    const clinic = state.clinicInfo || { name: 'FISIOTA' };
    const from = state.laporanFrom || today();
    const to = state.laporanTo || today();

    // FILTER SEMUA (Tanpa filter PAID) sesuai tab Appointments
    const filtered = (state.appointments || []).filter(a => {
        const apptDate = (a.date || '').slice(0, 10);
        return apptDate >= from && apptDate <= to;
    }).sort((a, b) => (a.date + ' ' + a.time).localeCompare(b.date + ' ' + b.time));

    const rowsHtml = filtered.map((a, idx) => {
        const p = (state.patients || []).find(pt => pt.id === a.patientId);
        const name = p ? p.name : (a.visitor_name || a.name || '-');
        const therapist = (state.users || []).find(u => u.id === a.therapistId);
        const fee = parseRp(a.fee);

        return `
            <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td>${a.date}</td>
                <td style="text-align: center;">${a.time || '-'}</td>
                <td><strong>${name}</strong></td>
                <td>${therapist ? therapist.name : (a.therapistId || '-')}</td>
                <td style="text-align: center;"><span style="font-size: 8px; padding: 2px 5px; border-radius: 4px; background: ${a.paymentStatus === 'PAID' ? '#dcfce7' : '#f1f5f9'}; color: ${a.paymentStatus === 'PAID' ? '#166534' : '#475569'}; font-weight: bold;">${a.paymentStatus || (a.status || 'SCHEDULED')}</span></td>
                <td style="text-align: right;">${fee.toLocaleString('id-ID')}</td>
                <td style="font-size: 9px; color: #64748b;">${a.notes || '-'}</td>
            </tr>
        `;
    }).join('');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Rekapitulasi Kunjungan - ${clinic.name}</title>
            <style>
                @page { size: A4 landscape; margin: 10mm; }
                body { font-family: 'Inter', system-ui, sans-serif; padding: 0; color: #1e293b; font-size: 9px; line-height: 1.3; }
                
                .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 15px; }
                .header-left h1 { margin: 0; font-size: 18px; font-weight: 900; color: #0f172a; }
                .header-left p { margin: 2px 0; color: #64748b; font-size: 9px; }
                .header-right { text-align: right; }
                .header-right h2 { margin: 0; font-size: 14px; font-weight: 800; color: #2563eb; }

                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 4px; font-weight: 800; text-transform: uppercase; font-size: 8px; text-align: left; }
                td { border: 1px solid #e2e8f0; padding: 5px 4px; vertical-align: middle; }
                
                .footer { margin-top: 20px; display: flex; justify-content: space-between; font-size: 8px; color: #94a3b8; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="header-left">
                    <h1>${clinic.name}</h1>
                    <p>${clinic.address || '-'}</p>
                </div>
                <div class="header-right">
                    <h2>REKAPITULASI KUNJUNGAN PASIEN</h2>
                    <p>Periode: <strong>${from} s/d ${to}</strong></p>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 25px; text-align: center;">No</th>
                        <th style="width: 70px;">Tanggal</th>
                        <th style="width: 45px; text-align: center;">Jam</th>
                        <th style="width: 180px;">Nama Pasien</th>
                        <th style="width: 100px;">Terapis</th>
                        <th style="width: 70px; text-align: center;">Status</th>
                        <th style="width: 80px; text-align: right;">Biaya (Fee)</th>
                        <th>Catatan/Notes</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <div class="footer">
                <div>Dicetak otomatis oleh Sistem ERM FISIOTA pada ${now.toLocaleString('id-ID')}</div>
                <div>Halaman 1 / 1</div>
            </div>

            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `);
    printWindow.document.close();
}


async function autoSyncPayment(appt) {
    const sheetId = getSheetIdFromUrl(state.scriptUrl);
    if (!sheetId) return;
    try {
        await fetch(LICENSE_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'sync_incremental',
                sheet_id: sheetId,
                appointments: [appt]
            })
        });
        console.log('Payment synced to Google Sheet:', appt.id);
    } catch (e) {
        console.warn('Auto-sync payment failed (will sync on next manual push):', e);
    }
}
