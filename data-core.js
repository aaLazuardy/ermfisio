// --- 3. DATA & INIT ---
async function loadData() {
    try {
        state.scriptUrl = localStorage.getItem('erm_script_url') || '';
        state.sheetId = localStorage.getItem('erm_sheet_id') || getSheetIdFromUrl(state.scriptUrl) || '';

        let [patients, assessments, appointments, expenses, users, configs, packages] = await Promise.all([
            window.fisiotaDB.getAll('patients'),
            window.fisiotaDB.getAll('assessments'),
            window.fisiotaDB.getAll('appointments'),
            window.fisiotaDB.getAll('expenses'),
            window.fisiotaDB.getAll('users'),
            window.fisiotaDB.getAll('config'),
            window.fisiotaDB.getAll('packages')
        ]);

        if (patients.length === 0 && localStorage.getItem('erm_patients')) {
            console.log("MIGRATION: Moving data from LocalStorage to IndexedDB...");
            state.patients = JSON.parse(localStorage.getItem('erm_patients')) || [];
            state.assessments = JSON.parse(localStorage.getItem('erm_assessments')) || [];
            state.appointments = JSON.parse(localStorage.getItem('erm_appointments')) || [];
            state.expenses = JSON.parse(localStorage.getItem('erm_expenses')) || [];
            state.users = JSON.parse(localStorage.getItem('erm_users')) || [];
            state.packages = JSON.parse(localStorage.getItem('erm_packages')) || [];
            await saveData();
        } else {
            state.patients = patients;
            state.assessments = assessments;
            state.appointments = appointments;
            state.expenses = expenses;
            state.users = users;
            state.packages = packages;

            const globalCfg = configs.find(c => c.id === 'global');
            if (globalCfg) {
                state.clinicInfo = globalCfg.info || state.clinicInfo;
                state.pdfConfig = { ...state.pdfConfig, ...(globalCfg.pdf || {}) };
                state.notificationConfig = { ...state.notificationConfig, ...(globalCfg.notif || {}) };
                state.bookingConfig = { ...state.bookingConfig, ...(globalCfg.booking || {}) };
            }

            const deleteLog = configs.find(c => c.id === 'deleted_logs');
            if (deleteLog) state.deletedIds = { ...state.deletedIds, ...deleteLog.ids };
        }

        if (state.users.length === 0) {
            state.users = [
                { id: 'usr1', username: 'admin', password: '123', role: 'ADMIN', name: 'Administrator' },
                { id: 'usr2', username: 'fisio', password: '123', role: 'FISIO', name: 'Fisio' }
            ];
            await window.fisiotaDB.save('users', state.users);
        }

        let mig = false;
        const ensureTs = (list) => {
            list.forEach(i => { if (!i.updatedAt) { i.updatedAt = new Date().toISOString(); mig = true; } });
        };
        ensureTs(state.patients);
        ensureTs(state.assessments);
        ensureTs(state.appointments);
        ensureTs(state.expenses);
        ensureTs(state.packages);

        const sanitized = sanitizeAssessments(state.assessments);
        if (JSON.stringify(sanitized) !== JSON.stringify(state.assessments)) {
            state.assessments = sanitized;
            mig = true;
        }

        if (mig) {
            console.log("Data migrated with timestamps/sanitization.");
            await saveData();
        }

        try {
            if (typeof DEFAULT_SCRIPT_URL !== 'undefined' && DEFAULT_SCRIPT_URL) {
                state.scriptUrl = DEFAULT_SCRIPT_URL;
            } else {
                state.scriptUrl = localStorage.getItem('erm_script_url') || '';
            }
        } catch (e) { state.scriptUrl = ''; }

        if (!state.bookingConfig.alias) {
            state.bookingConfig.alias = localStorage.getItem('erm_booking_alias') || '';
            state.bookingConfig.availableHours = localStorage.getItem('erm_booking_hours') || '';
        }

        const savedConfig = JSON.parse(localStorage.getItem('erm_clinic_config'));
        if (savedConfig && !configs.find(c => c.id === 'global')) state.clinicInfo = savedConfig;

        if (state.pdfConfig) {
            document.body.classList.remove('print-compact', 'print-normal', 'print-relaxed');
            if (state.pdfConfig.layoutMode === 'compact') document.body.classList.add('print-compact');
            else if (state.pdfConfig.layoutMode === 'relaxed') document.body.classList.add('print-relaxed');
            else document.body.classList.add('print-normal');
            if (typeof applyPageMargins === 'function') applyPageMargins(state.pdfConfig.layoutMode);
        }

        if (state.patients.length === 0) {
            state.patients = [{ id: 'PX-0001', name: 'Contoh Pasien', gender: 'L', dob: '1980-05-12', phone: '08123456789', job: 'Guru', address: 'Jl. Merdeka No. 45, Blitar', diagnosis: 'Cervical Syndrome (M53.1)', quota: 0, defaultFee: 0 }];
            await window.fisiotaDB.save('patients', state.patients);
        }

    } catch (e) {
        console.error("Critical Error loading data:", e);
        alert("Gagal memuat data dari IndexedDB. Mencoba fallback...");
    }

    updateSyncStatusUI(checkDataDirty());
    setInterval(syncDelta, 5 * 60 * 1000);
    applyBranding();
}

async function saveData() {
    try {
        await Promise.all([
            window.fisiotaDB.save('patients', state.patients),
            window.fisiotaDB.save('assessments', state.assessments),
            window.fisiotaDB.save('appointments', state.appointments),
            window.fisiotaDB.save('expenses', state.expenses || []),
            window.fisiotaDB.save('packages', state.packages || []),
            window.fisiotaDB.save('users', state.users),
            window.fisiotaDB.save('config', [
                { id: 'global', info: state.clinicInfo, pdf: state.pdfConfig, notif: state.notificationConfig, booking: state.bookingConfig },
                { id: 'deleted_logs', ids: state.deletedIds }
            ])
        ]);

        localStorage.setItem('erm_script_url', state.scriptUrl || '');
        localStorage.setItem('erm_clinic_config', JSON.stringify(state.clinicInfo));

        updateSyncStatusUI(checkDataDirty());
    } catch (e) {
        console.error("Database Save Error:", e);
    }
}

function sanitizeAssessments(assessments) {
    const ARRAY_FIELDS = ['pain_points', 'b', 's', 'd_act', 'd_part', 'intervention', 'eval'];
    return (assessments || []).map(a => {
        const fixed = { ...a };
        ARRAY_FIELDS.forEach(field => {
            if (!Array.isArray(fixed[field])) {
                if (typeof fixed[field] === 'string' && fixed[field].trim().startsWith('[')) {
                    try { fixed[field] = JSON.parse(fixed[field]); } catch (e) { fixed[field] = []; }
                } else if (typeof fixed[field] === 'string' && fixed[field].trim() !== '') {
                    fixed[field] = [fixed[field]];
                } else {
                    fixed[field] = [];
                }
            }
        });
        return fixed;
    });
}

function checkDataDirty() {
    const lastSyncStr = localStorage.getItem('erm_last_sync');
    if (!lastSyncStr) return true;
    const lastSync = new Date(lastSyncStr);

    const hasDirty = (list) => list.some(item => {
        const up = item.updatedAt ? new Date(item.updatedAt) : new Date();
        return up > lastSync;
    });

    const hasDeletes = state.deletedIds.patients.length > 0 || state.deletedIds.assessments.length > 0 ||
        state.deletedIds.appointments.length > 0 || state.deletedIds.expenses.length > 0;

    return hasDirty(state.patients) || hasDirty(state.assessments) ||
        hasDirty(state.appointments) || hasDirty(state.expenses || []) || hasDirty(state.packages || []) || hasDeletes;
}

function updateSyncStatusUI(isDirty) {
    const indicator = document.getElementById('sync-indicator');
    if (!indicator) return;

    if (isDirty) {
        indicator.innerHTML = `<span class="flex items-center gap-1 text-orange-500 animate-pulse"><i data-lucide="cloud-off" width="14"></i> <span class="text-[10px] font-bold uppercase">Pending</span></span>`;
    } else {
        indicator.innerHTML = `<span class="flex items-center gap-1 text-emerald-500"><i data-lucide="cloud-check" width="14"></i> <span class="text-[10px] font-bold uppercase">Synced</span></span>`;
    }
    renderIcons();
}
