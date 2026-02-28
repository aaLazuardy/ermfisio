// --- 3. DATA & INIT & SYNC ---

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
            if (!list) return;
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

async function pushDataToSheet() {
    if (!state.scriptUrl) { alert("URL Google Sheet belum dikonfigurasi!"); return; }
    const sheetId = state.sheetId || getSheetIdFromUrl(state.scriptUrl);
    if (!sheetId) { alert("Sheet ID tidak valid!"); return; }

    if (!confirm("PERHATIAN: Mode SYNC TOTAL aktif.\nData di Google Sheet akan disamakan PERSIS dengan Aplikasi ini.\nLanjutkan?")) return;

    const btn = document.getElementById('btn-sync');
    const oriText = btn ? btn.innerHTML : 'Kirim Data';
    if (btn) btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin" width="16"></i> Mengirim...';

    const now = new Date().toISOString();
    const ensureTs = (list) => (list || []).map(item => ({ ...item, updatedAt: item.updatedAt || now }));

    try {
        const response = await fetch(LICENSE_API_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'push',
                sheet_id: sheetId,
                patients: ensureTs(state.patients),
                assessments: ensureTs(state.assessments),
                appointments: ensureTs(state.appointments),
                expenses: ensureTs(state.expenses || []),
                packages: ensureTs(state.packages || []),
                config: state.clinicInfo ? [{ key: 'clinic_info', value: JSON.stringify(state.clinicInfo) }] : []
            })
        });

        const result = await response.json();
        if (result.status === 'success') {
            localStorage.setItem('erm_last_sync', new Date().toISOString());
            alert(`✅ Sinkronisasi Total Berhasil!`);
        } else {
            throw new Error(result.message || "Gagal sinkronisasi.");
        }
    } catch (error) {
        console.error('Gagal mengirim.', error);
        alert('❌ Gagal mengirim data.');
    } finally {
        if (btn) btn.innerHTML = oriText;
        if (typeof renderIcons === 'function') renderIcons();
    }
}

async function syncDelta() {
    if (!state.scriptUrl || state._syncing) return;
    const sheetId = getSheetIdFromUrl(state.scriptUrl);
    if (!sheetId) return;

    state._syncing = true;
    const lastSyncStr = localStorage.getItem('erm_last_sync');
    const lastSync = lastSyncStr ? new Date(lastSyncStr) : new Date(0);

    const filterDelta = (list) => (list || []).filter(item => {
        const up = item.updatedAt ? new Date(item.updatedAt) : new Date();
        return up > lastSync;
    });

    const deltaPatients = filterDelta(state.patients);
    const deltaAssessments = filterDelta(state.assessments);
    const deltaAppointments = filterDelta(state.appointments);
    const deltaExpenses = filterDelta(state.expenses || []);
    const deltaPackages = filterDelta(state.packages || []);

    if (deltaPatients.length === 0 && deltaAssessments.length === 0 && deltaAppointments.length === 0 &&
        deltaExpenses.length === 0 && deltaPackages.length === 0 &&
        state.deletedIds.patients.length === 0 && state.deletedIds.assessments.length === 0 &&
        state.deletedIds.appointments.length === 0 && state.deletedIds.expenses.length === 0 && state.deletedIds.packages.length === 0) {
        state._syncing = false;
        return;
    }

    try {
        await fetch(LICENSE_API_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delta_push',
                sheet_id: sheetId,
                patients: deltaPatients,
                assessments: deltaAssessments,
                appointments: deltaAppointments,
                expenses: deltaExpenses,
                packages: deltaPackages,
                deletedIds: state.deletedIds
            })
        });

        state.deletedIds = { patients: [], assessments: [], appointments: [], expenses: [], packages: [] };
        localStorage.setItem('erm_last_sync', new Date().toISOString());
        if (typeof saveData === 'function') await saveData();
        updateSyncStatusUI(false);
    } catch (e) {
        console.error("Delta sync failed", e);
    } finally {
        state._syncing = false;
    }
}

async function pullDataFromSheet() {
    if (!state.scriptUrl) { alert('URL belum dikonfigurasi.'); return; }
    const sheetId = state.sheetId || getSheetIdFromUrl(state.scriptUrl);
    if (!sheetId) { alert("ID tidak valid!"); return; }

    if (!confirm('PERHATIAN: Data lokal akan DITIMPA.\nLanjutkan?')) return;

    const btn = document.getElementById('btn-pull');
    const oriText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin" width="18"></i> Mengambil...';
        btn.disabled = true;
    }
    try {
        const response = await fetch(`${LICENSE_API_URL}?action=pull&sheet_id=${sheetId}&t=${Date.now()}`);
        const data = await response.json();

        if (data.status === 'error') throw new Error(data.message || "Gagal.");

        if (data.patients && data.assessments) {
            state.patients = data.patients;
            state.assessments = sanitizeAssessments(data.assessments);
            if (data.appointments) state.appointments = data.appointments;
            if (data.expenses) state.expenses = data.expenses;
            if (data.packages) state.packages = data.packages;

            if (data.config && Array.isArray(data.config)) {
                data.config.forEach(c => {
                    if (c.key === 'CLINIC_NAME') state.clinicInfo.name = c.value;
                    if (c.key === 'CLINIC_SUBNAME') state.clinicInfo.subname = c.value;
                    if (c.key === 'CLINIC_THERAPIST') state.clinicInfo.therapist = c.value;
                    if (c.key === 'CLINIC_SIPF') state.clinicInfo.sipf = c.value;
                    if (c.key === 'CLINIC_ADDRESS') state.clinicInfo.address = c.value;
                    if (c.key === 'CLINIC_NPWP') state.clinicInfo.npwp = c.value;
                    if (c.key === 'CLINIC_PHONE') state.clinicInfo.phone = c.value;
                    if (c.key === 'CLINIC_MAPS') state.clinicInfo.mapsUrl = c.value;
                    if (c.key === 'TELEGRAM_TOKEN') state.notificationConfig.telegramToken = c.value;
                    if (c.key === 'TELEGRAM_CHAT_ID') state.notificationConfig.telegramChatId = c.value;
                    if (c.key === 'EMAIL_RECEIVER') state.notificationConfig.targetEmail = c.value;
                    if (c.key === 'EMAIL_SENDER') state.notificationConfig.senderEmail = c.value;
                    if (c.key === 'MSG_CONFIRM_TEMPLATE') state.notificationConfig.msgConfirm = c.value;
                    if (c.key === 'MSG_REJECT_TEMPLATE') state.notificationConfig.msgReject = c.value;
                    if (c.key === 'MSG_REMINDER_TEMPLATE') state.notificationConfig.msgReminder = c.value;
                });
                localStorage.setItem('erm_clinic_config', JSON.stringify(state.clinicInfo));
                localStorage.setItem('erm_notif_config', JSON.stringify(state.notificationConfig));
            }

            await saveData();
            alert('✅ Berhasil ditarik!');
            if (typeof renderApp === 'function') renderApp();
            applyBranding();
        }
    } catch (error) {
        console.error(error);
        alert('❌ Gagal menarik data.');
    } finally {
        if (btn) {
            btn.innerHTML = oriText;
            btn.disabled = false;
        }
    }
}
