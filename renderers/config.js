/**
 * Configuration Renderer
 * Handles the configuration view, settings, user management, and backup/restore.
 */

function renderConfigView(container) {
    const tab = state.configTab || 'general';

    container.innerHTML = `
        <div class="space-y-6 fade-in pb-20">
            <!-- Header -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 class="text-2xl font-black text-slate-800 tracking-tight">Pengaturan Sistem</h2>
                    <p class="text-slate-500 text-sm">Sesuaikan identitas klinik dan preferensi aplikasi Anda.</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="downloadBackup()" class="bg-white border-2 border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
                        <i data-lucide="download" width="14"></i> Backup Data
                    </button>
                    <label class="cursor-pointer bg-white border-2 border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
                        <i data-lucide="upload" width="14"></i> Restore
                        <input type="file" class="hidden" onchange="restoreBackup(this)" accept=".json">
                    </label>
                </div>
            </div>

            <!-- Tab Navigation -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-1 flex gap-1 overflow-x-auto no-scrollbar">
                ${[
            { id: 'general', icon: 'settings', label: 'Klinik' },
            { id: 'print', icon: 'printer', label: 'PDF & Cetak' },
            { id: 'packages', icon: 'package', label: 'Layanan & Paket' },
            { id: 'booking', icon: 'calendar', label: 'Booking Online' },
            { id: 'notifications', icon: 'bell', label: 'Notifikasi' },
            { id: 'users', icon: 'users', label: 'Akses User' },
            { id: 'license', icon: 'key', label: 'Lisensi' }
        ].map(t => `
                    <button onclick="switchConfigTab('${t.id}')" 
                        class="flex-1 min-w-fit whitespace-nowrap py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${tab === t.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}">
                        <i data-lucide="${t.icon}" width="14" class="inline mr-1.5"></i> ${t.label}
                    </button>
                `).join('')}
            </div>

            <!-- Tab Content Area -->
            <div id="config-tab-content" class="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 min-h-[400px]">
                ${renderConfigTabContent(tab)}
            </div>
        </div>
    `;
    lucide.createIcons();
}

function renderConfigTabContent(tab) {
    if (tab === 'general') return renderGeneralConfig();
    if (tab === 'print') return renderPrintConfig();
    if (tab === 'packages') return renderPackagesConfig();
    if (tab === 'booking') return renderBookingConfig();
    if (tab === 'notifications') return renderNotificationsConfig();
    if (tab === 'users') return renderUsersConfig();
    if (tab === 'license') return renderLicenseConfig();
    return '';
}

function switchConfigTab(tab) {
    state.configTab = tab;
    renderConfigView(document.getElementById('main-content'));
}

// --- TAB RENDERS ---

function renderGeneralConfig() {
    const info = state.clinicInfo || {};
    return `
        <div class="max-w-2xl space-y-8">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="md:col-span-2">
                    <label class="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Nama Klinik / Praktek</label>
                    <input type="text" id="conf-clinic-name" value="${info.name || ''}" class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-xl font-black text-slate-800 outline-none focus:border-indigo-500 transition-all" placeholder="Contoh: PHYSIO CENTER">
                </div>
                <div>
                    <label class="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Slogan / Sub-Nama</label>
                    <input type="text" id="conf-clinic-subname" value="${info.subname || ''}" class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" placeholder="Contoh: Fisioterapi & Rehabilitasi">
                </div>
                <div>
                    <label class="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">No. SIPF / Izin</label>
                    <input type="text" id="conf-clinic-sipf" value="${info.sipf || ''}" class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" placeholder="Contoh: 503/001/SIPF/2024">
                </div>
                <div class="md:col-span-2">
                    <label class="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Alamat Lengkap</label>
                    <textarea id="conf-clinic-address" class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-medium text-slate-700 outline-none focus:border-indigo-500 transition-all min-h-[80px]">${info.address || ''}</textarea>
                </div>
                <div>
                    <label class="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Kota / Lokasi</label>
                    <input type="text" id="conf-clinic-location" value="${info.location || ''}" class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" placeholder="Contoh: Blitar">
                </div>
                <div>
                    <label class="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">No. WhatsApp Klinik</label>
                    <input type="text" id="conf-clinic-phone" value="${info.phone || ''}" class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" placeholder="628xxx">
                </div>
                <div>
                    <label class="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Pimpinan / Penanggung Jawab</label>
                    <input type="text" id="conf-clinic-therapist" value="${info.therapist || ''}" class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all">
                </div>
                <div>
                    <label class="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">NPWP (Opsional)</label>
                    <input type="text" id="conf-clinic-npwp" value="${info.npwp || ''}" class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all">
                </div>
            </div>
            <div class="pt-4 border-t border-slate-100">
                <button onclick="saveClinicConfig()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-10 py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2">
                    <i data-lucide="save" width="20"></i> Simpan Perubahan
                </button>
            </div>
            
            <div class="mt-12 p-6 bg-slate-50 rounded-2xl border-2 border-slate-100 space-y-4">
               <h4 class="font-black text-slate-800 flex items-center gap-2"><i data-lucide="cloud" class="text-blue-500"></i> Koneksi Database Pusat</h4>
               <p class="text-xs text-slate-500 leading-relaxed">Masukkan URL Google Apps Script Anda untuk mensinkronkan data antar perangkat secara otomatis.</p>
               <div class="space-y-3">
                    <input type="text" id="config-script-url" value="${state.scriptUrl || ''}" placeholder="https://script.google.com/macros/s/..." 
                        class="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-mono outline-none focus:border-blue-500">
                    <div class="flex gap-2">
                        <button onclick="saveConfig()" class="bg-blue-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-blue-700 transition-all">Hubungkan Sekarang</button>
                        <button onclick="pullDataFromSheet()" class="bg-white border border-blue-200 text-blue-600 font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-blue-50 transition-all">Tarik Data Manual</button>
                    </div>
               </div>
            </div>
        </div>`;
}

function renderPrintConfig() {
    const conf = state.pdfConfig || {};
    return `
        <div class="max-w-2xl">
            <h3 class="font-bold text-slate-800 mb-6 flex items-center gap-2"><i data-lucide="layout" class="text-indigo-500"></i> Layout Laporan PDF (A4)</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                ${renderPdfToggle('showKop', 'Tampilkan Kop Klinik', conf.showKop !== false)}
                ${renderPdfToggle('showPatientInfo', 'Data Pasien & RM', conf.showPatientInfo !== false)}
                ${renderPdfToggle('showDiagnosis', 'Diagnosa Medis & ICD-10', conf.showDiagnosis !== false)}
                ${renderPdfToggle('showAnamnesis', 'Keluhan Pasien (Anamnesis)', conf.showAnamnesis !== false)}
                ${renderPdfToggle('showBodyChart', 'Peta Nyeri (Body Chart)', conf.showBodyChart !== false)}
                ${renderPdfToggle('showObjective', 'Pemeriksaan Objektif (VAS/ROM)', conf.showObjective !== false)}
                ${renderPdfToggle('showImpairment', 'Problem ICF (Body Function)', conf.showImpairment !== false)}
                ${renderPdfToggle('showLimitation', 'Problem ICF (Activity)', conf.showLimitation !== false)}
                ${renderPdfToggle('showIntervention', 'Tindakan & Intervensi', conf.showIntervention !== false)}
                ${renderPdfToggle('showEvalPlan', 'Evaluasi & Planning', conf.showEvalPlan !== false)}
                ${renderPdfToggle('showInformedConsent', 'Persetujuan (Consent)', conf.showInformedConsent !== false)}
                ${renderPdfToggle('showSignature', 'Tanda Tangan Fisioterapis', conf.showSignature !== false)}
            </div>

            <div class="space-y-6 pt-6 border-t border-slate-100">
                <div>
                    <label class="text-xs font-bold text-slate-400 uppercase block mb-3">Teks Informed Consent (Persetujuan Tindakan)</label>
                    <textarea onchange="updatePdfConfig('informedConsentText', this.value)" class="w-full border-2 border-slate-100 rounded-xl p-4 text-xs italic leading-relaxed text-slate-600 focus:border-indigo-500 outline-none min-h-[100px]">${conf.informedConsentText || 'Saya menyatakan setuju untuk dilakukan tindakan fisioterapi setelah mendapatkan penjelasan mengenai risiko dan manfaat tindakan tersebut.'}</textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-xs font-bold text-slate-400 uppercase block mb-2">Ukuran Font</label>
                        <select onchange="updatePdfConfig('fontSize', this.value)" class="w-full border-2 border-slate-200 rounded-xl p-3 font-bold outline-none bg-white">
                            <option value="9pt" ${conf.fontSize === '9pt' ? 'selected' : ''}>Kecil (9pt)</option>
                            <option value="10pt" ${conf.fontSize === '10pt' || !conf.fontSize ? 'selected' : ''}>Normal (10pt)</option>
                            <option value="11pt" ${conf.fontSize === '11pt' ? 'selected' : ''}>Besar (11pt)</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>`;
}

function renderPdfToggle(key, label, isChecked) {
    return `
        <label class="flex items-center justify-between cursor-pointer p-3 rounded-lg border border-transparent hover:bg-slate-50 transition-colors">
            <span class="text-sm font-medium text-slate-700">${label}</span>
            <div class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="sr-only peer" ${isChecked ? 'checked' : ''} onchange="updatePdfConfig('${key}', this.checked)">
                <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </div>
        </label>
    `;
}

function renderPackagesConfig() {
    return `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h3 class="font-bold text-slate-800 flex items-center gap-2"><i data-lucide="package" class="text-orange-500"></i> Daftar Paket Layanan</h3>
                <button onclick="openPackageModal()" class="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-orange-100 transition-all">
                    <i data-lucide="plus-circle" width="16"></i> Tambah Paket
                </button>
            </div>
            <div id="package-list-container">
                ${renderPackageTable()}
            </div>
        </div>`;
}

function renderBookingConfig() {
    const conf = state.bookingConfig || {};
    const currentPath = window.location.pathname.replace(/\/[^/]*$/, '/');
    const defaultBase = window.location.origin + currentPath;
    const baseUrl = BOOKING_BASE_URL || defaultBase;
    const bookingFullUrl = baseUrl + 'Booking/' + (state.sheetId ? '?id=' + state.sheetId : '');

    return `
        <div class="max-w-2xl space-y-8">
            <div class="bg-blue-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div class="relative z-10">
                    <h4 class="font-black text-lg mb-2 flex items-center gap-2 truncate"><i data-lucide="globe"></i> Link Portal Pasien</h4>
                    <p class="text-xs text-blue-100 mb-4 opacity-80 leading-relaxed">Berikan link ini kepada pasien agar mereka bisa melakukan booking jadwal secara mandiri tanpa harus chat manual.</p>
                    <div class="flex flex-col gap-3">
                        <div class="bg-blue-700/50 p-3 rounded-xl border border-white/10 font-mono text-[10px] break-all select-all">${bookingFullUrl}</div>
                        <div class="flex gap-2">
                             <button onclick="navigator.clipboard.writeText('${bookingFullUrl}'); showToast('Link disalin!')" class="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm hover:bg-blue-50"><i data-lucide="copy" width="14"></i> Salin Link</button>
                             <button onclick="window.open('${bookingFullUrl}', '_blank')" class="bg-blue-500 text-white border border-white/20 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-blue-400"><i data-lucide="external-link" width="14"></i> Coba Buka</button>
                        </div>
                    </div>
                </div>
                <i data-lucide="smartphone" class="absolute -right-8 -bottom-8 w-40 h-40 text-white/5 -rotate-12"></i>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="md:col-span-2">
                    <label class="text-xs font-bold text-slate-500 uppercase block mb-2">Alias / Nama Booking (Kustom Link)</label>
                    <input type="text" id="conf-booking-alias" value="${conf.alias || ''}" class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all font-mono" placeholder="Contoh: kliniksukses">
                    <p class="text-[10px] text-slate-400 mt-1">Menggunakan alias memudahkan pasien mengingat link booking Anda.</p>
                </div>
                <div>
                    <label class="text-xs font-bold text-slate-500 uppercase block mb-2">Jam Mulai Praktek</label>
                    <input type="time" id="conf-booking-start" value="${conf.start || '08:00'}" class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all">
                </div>
                <div>
                    <label class="text-xs font-bold text-slate-500 uppercase block mb-2">Jam Selesai Praktek</label>
                    <input type="time" id="conf-booking-end" value="${conf.end || '21:00'}" class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all">
                </div>
                <div>
                     <label class="text-xs font-bold text-slate-500 uppercase block mb-2">Slot Interval (Menit)</label>
                     <select id="conf-booking-interval" class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all">
                        <option value="30" ${conf.interval == 30 ? 'selected' : ''}>30 Menit</option>
                        <option value="45" ${conf.interval == 45 ? 'selected' : ''}>45 Menit</option>
                        <option value="60" ${conf.interval == 60 || !conf.interval ? 'selected' : ''}>60 Menit (1 Jam)</option>
                        <option value="90" ${conf.interval == 90 ? 'selected' : ''}>90 Menit</option>
                     </select>
                </div>
            </div>

            <div class="pt-4">
                <button onclick="saveBookingConfig()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2">
                    <i data-lucide="save" width="18"></i> Simpan Pengaturan Booking
                </button>
            </div>
        </div>`;
}

function renderNotificationsConfig() {
    const conf = state.notificationConfig || {};
    return `
        <div class="max-w-2xl space-y-8">
            <div class="p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 space-y-5">
                <h4 class="font-black text-slate-800 flex items-center gap-2"><i data-lucide="message-square" class="text-sky-500"></i> Notifikasi Telegram (Admin)</h4>
                <p class="text-xs text-slate-500 leading-relaxed">Aktifkan agar setiap ada booking masuk dari pasien, Anda mendapatkan notifikasi langsung ke Telegram.</p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Bot Token API</label>
                        <input type="password" id="conf-notif-token" value="${conf.botToken || ''}" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-mono outline-none focus:border-sky-500">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Telegram Chat ID</label>
                        <input type="text" id="conf-notif-chatid" value="${conf.chatId || ''}" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-mono outline-none focus:border-sky-500">
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="saveNotificationConfig()" class="bg-sky-600 text-white font-bold px-6 py-2 rounded-xl text-xs hover:bg-sky-700 transition-all flex items-center gap-2">
                        <i data-lucide="save" width="14"></i> Simpan Bot
                    </button>
                    <button onclick="testTelegramConnection()" class="bg-white border border-sky-200 text-sky-600 font-bold px-6 py-2 rounded-xl text-xs hover:bg-sky-50 transition-all">Test Koneksi</button>
                </div>
            </div>

            <div class="space-y-6">
                 <div class="flex items-center justify-between mb-2">
                    <h4 class="font-black text-slate-800 flex items-center gap-2"><i data-lucide="mail" class="text-emerald-500"></i> Template Chat Pasien (WhatsApp)</h4>
                 </div>
                 
                 ${['confirm', 'reject', 'reminder'].map(type => `
                    <div class="bg-white border-2 border-slate-100 rounded-2xl p-5 group hover:border-emerald-100 transition-all">
                        <div class="flex justify-between items-center mb-3">
                            <span class="text-[10px] font-black uppercase tracking-tighter text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">${type === 'confirm' ? 'Konfirmasi Jadwal' : (type === 'reject' ? 'Penolakan / Reschedule' : 'Reminder H-1')}</span>
                            <button onclick="resetNotifTemplate('${type}')" class="text-[10px] font-bold text-slate-400 hover:text-rose-500 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all"><i data-lucide="refresh-cw" width="10"></i> Reset Default</button>
                        </div>
                        <textarea id="notif-msg-${type}" class="w-full border border-slate-200 rounded-xl p-4 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-emerald-50/10 transition-all min-h-[120px] leading-relaxed">${conf[type + 'Msg'] || getDefaultNotif(type)}</textarea>
                        <div class="mt-2 flex flex-wrap gap-1">
                            ${['{{name}}', '{{date}}', '{{time}}', '{{clinic_name}}'].map(tag => `<span class="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-mono">${tag}</span>`).join('')}
                        </div>
                    </div>
                 `).join('')}
                 
                 <div class="bg-emerald-600 p-6 rounded-2xl text-white shadow-lg flex justify-between items-center group cursor-pointer hover:bg-emerald-700 transition-all" onclick="saveNotificationConfig()">
                    <div>
                        <p class="font-black uppercase tracking-widest text-[10px] opacity-70 mb-1">Simpan Semua Perubahan</p>
                        <p class="text-sm font-bold">Update Template Notifikasi</p>
                    </div>
                    <div class="bg-white/20 p-3 rounded-full group-hover:rotate-12 transition-all">
                        <i data-lucide="save" width="24"></i>
                    </div>
                 </div>
            </div>
        </div>`;
}

function renderUsersConfig() {
    return `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h3 class="font-bold text-slate-800 flex items-center gap-2"><i data-lucide="users" class="text-blue-500"></i> Manajemen Akses User</h3>
                <button onclick="openUserModal()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-100 transition-all">
                    <i data-lucide="user-plus" width="16"></i> Tambah User Baru
                </button>
            </div>
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table class="w-full text-sm">
                    <thead class="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th class="text-left px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">Nama User</th>
                            <th class="text-left px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">Username</th>
                            <th class="text-left px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">Role</th>
                            <th class="text-center px-6 py-3" style="width: 100px;">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${state.users.map(u => `
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="px-6 py-4 font-bold text-slate-800">${u.name}</td>
                                <td class="px-6 py-4 font-mono text-slate-500 text-xs">${u.username}</td>
                                <td class="px-6 py-4">
                                    <span class="px-2 py-0.5 rounded-full ${u.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'} text-[10px] font-bold uppercase">${u.role}</span>
                                </td>
                                <td class="px-6 py-4 text-center">
                                    <div class="flex items-center justify-center gap-2">
                                        <button onclick="openUserModal('${u.id}')" class="text-slate-300 hover:text-indigo-600 transition-colors"><i data-lucide="edit-3" width="16"></i></button>
                                        <button onclick="deleteUser('${u.id}')" class="text-slate-300 hover:text-rose-500 transition-colors"><i data-lucide="trash-2" width="16"></i></button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="pt-8 mt-8 border-t border-slate-100">
                <h4 class="text-sm font-black text-rose-600 uppercase mb-4 flex items-center gap-2"><i data-lucide="shield-alert" width="16"></i> Zona Berbahaya</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-between gap-4">
                        <div>
                            <p class="font-bold text-rose-800 text-sm">Lupa Password / Reset Akses</p>
                            <p class="text-[10px] text-rose-600 leading-tight">Gunakan fitur ini jika Admin utama tidak bisa login.</p>
                        </div>
                        <button onclick="requestResetCode(event)" class="bg-rose-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-rose-700 transition-all font-mono">FORCE RESET</button>
                    </div>
                    <div class="p-4 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
                         <div>
                            <p class="font-bold text-slate-800 text-sm">Reset Seluruh Database Local</p>
                            <p class="text-[10px] text-slate-500 leading-tight">Menghapus seluruh data offline di browser ini.</p>
                        </div>
                        <button onclick="resetUserToDefault()" class="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-black transition-all">FACTORY RESET</button>
                    </div>
                </div>
            </div>
        </div>`;
}

function renderLicenseConfig() {
    const status = localStorage.getItem('erm_license_status') || 'INACTIVE';
    const plan = localStorage.getItem('erm_license_plan') || '-';
    const expiry = localStorage.getItem('erm_license_expiry') || localStorage.getItem('erm_license_expiry_iso') || '-';

    return `
        <div class="max-w-xl mx-auto py-4 space-y-8">
            <div class="text-center">
                <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm animate-pulse-slow">
                    <i data-lucide="shield-check" width="32"></i>
                </div>
                <h3 class="text-xl font-black text-slate-800 tracking-tight">Status Lisensi FISIOTA</h3>
                <p class="text-slate-500 text-xs mt-1">Sistem Digital ERM Fisioterapi</p>
            </div>

            <div class="bg-white rounded-3xl border-2 border-slate-100 overflow-hidden shadow-sm">
                <div class="grid grid-cols-1 divide-y divide-slate-100">
                    <div class="p-5 flex justify-between items-center">
                        <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Paket Layanan</span>
                        <span id="conf-lic-plan" class="font-black text-slate-800">${plan}</span>
                    </div>
                    <div class="p-5 flex justify-between items-center">
                        <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Status Aktivasi</span>
                        <span id="conf-lic-status" class="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">${status}</span>
                    </div>
                    <div class="p-5 flex justify-between items-center">
                        <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Berlaku Hingga</span>
                        <span id="conf-lic-expiry" class="font-bold text-slate-700">${expiry}</span>
                    </div>
                </div>
            </div>

            <div class="p-8 bg-slate-900 rounded-[2.5rem] text-center shadow-2xl relative overflow-hidden ring-8 ring-slate-100">
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Sisa Masa Aktif</p>
                <h2 id="conf-lic-countdown" class="text-5xl font-black text-blue-500 font-mono tracking-tighter">00 Hari</h2>
                <div class="mt-8">
                    <button onclick="refreshLicenseStatus()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 group">
                        <i data-lucide="refresh-cw" width="20" class="group-hover:rotate-180 transition-transform duration-700"></i>
                        Cek Pembaruan Lisensi
                    </button>
                    <p class="text-[10px] text-slate-500 mt-4 leading-relaxed font-bold uppercase tracking-widest">Punya Kode Baru? <br> <span class="text-blue-400 underline cursor-pointer" onclick="localStorage.removeItem('erm_license_key'); location.reload();">Klik ganti lisensi</span></p>
                </div>
                <div class="absolute -right-10 -bottom-10 opacity-5">
                    <i data-lucide="verified" width="160" height="160"></i>
                </div>
            </div>
            
            <div class="flex items-center gap-2 justify-center text-slate-300">
                <i data-lucide="lock" width="12"></i>
                <span class="text-[10px] font-bold uppercase tracking-widest">Secure Activation v2.5</span>
            </div>
        </div>`;
}

// --- CONFIG ACTION FUNCTIONS ---

function saveClinicConfig() {
    const info = {
        name: document.getElementById('conf-clinic-name').value.trim(),
        subname: document.getElementById('conf-clinic-subname').value.trim(),
        sipf: document.getElementById('conf-clinic-sipf').value.trim(),
        address: document.getElementById('conf-clinic-address').value.trim(),
        location: document.getElementById('conf-clinic-location').value.trim(),
        phone: document.getElementById('conf-clinic-phone').value.trim(),
        therapist: document.getElementById('conf-clinic-therapist').value.trim(),
        npwp: document.getElementById('conf-clinic-npwp').value.trim()
    };

    state.clinicInfo = info;
    saveData();
    if (state.scriptUrl) syncDelta();
    showToast("Profil Klinik diupdate!");
}

function updatePdfConfig(key, val) {
    if (!state.pdfConfig) state.pdfConfig = {};
    state.pdfConfig[key] = val;
    saveData();
    showToast("Pengaturan PDF disimpan!");
}

function saveBookingConfig() {
    const conf = {
        alias: document.getElementById('conf-booking-alias').value.trim(),
        start: document.getElementById('conf-booking-start').value,
        end: document.getElementById('conf-booking-end').value,
        interval: parseInt(document.getElementById('conf-booking-interval').value)
    };
    state.bookingConfig = conf;
    saveData();
    if (state.scriptUrl) syncDelta();
    showToast("Pengaturan Booking disimpan!");
}

function saveNotificationConfig() {
    const conf = state.notificationConfig || {};
    conf.botToken = document.getElementById('conf-notif-token').value;
    conf.chatId = document.getElementById('conf-notif-chatid').value;
    conf.confirmMsg = document.getElementById('notif-msg-confirm').value;
    conf.rejectMsg = document.getElementById('notif-msg-reject').value;
    conf.reminderMsg = document.getElementById('notif-msg-reminder').value;

    state.notificationConfig = conf;
    saveData();
    if (state.scriptUrl) syncDelta();
    showToast("Notifikasi & Template disimpan!");
}

async function testTelegramConnection() {
    const token = document.getElementById('conf-notif-token').value;
    const cid = document.getElementById('conf-notif-chatid').value;
    if (!token || !cid) { alert("Token & Chat ID wajib diisi!"); return; }

    showToast("Mengirim test...");
    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${cid}&text=Test Koneksi Bot Fisiota Berhasil! 🚀&parse_mode=HTML`;
        const res = await fetch(url);
        if (res.ok) alert("✅ TEST BERHASIL! Cek pesan Telegram Anda.");
        else alert("❌ GAGAL: Periksa Token/Chat ID!");
    } catch (e) { alert("ERROR: " + e.message); }
}

function saveConfig() {
    const url = document.getElementById('config-script-url').value.trim();
    if (!url) { alert("URL tidak boleh kosong."); return; }

    localStorage.setItem('erm_script_url', url);
    state.scriptUrl = url;

    const sid = getSheetIdFromUrl(url);
    if (sid) {
        localStorage.setItem('erm_sheet_id', sid);
        state.sheetId = sid;
    }

    showToast("Database Terhubung!");
    pullDataFromSheet();
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
            const imported = JSON.parse(e.target.result);
            Object.assign(state, imported);
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

function openUserModal(id = null) {
    const u = id ? state.users.find(x => x.id === id) : { id: '', name: '', username: '', password: '', role: 'FISIO' };
    const modalHtml = `
        <div class="bg-white px-6 py-4 border-b flex justify-between items-center sticky top-0 z-20">
            <h3 class="text-xl font-bold text-slate-800">${id ? 'Edit User' : 'Tambah User Baru'}</h3>
            <button onclick="closeModal()" class="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200"><i data-lucide="x" width="20"></i></button>
        </div>
        <div class="p-6 space-y-4">
            <form id="user-form">
                <input type="hidden" name="id" value="${u.id}">
                <div>
                    <label class="text-xs font-bold text-slate-500 uppercase block mb-1">Nama Tampilan</label>
                    <input type="text" name="name" value="${u.name}" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Contoh: Fisio Rehan">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-xs font-bold text-slate-500 uppercase block mb-1">Username</label>
                        <input type="text" name="username" value="${u.username}" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-500 uppercase block mb-1">Password</label>
                        <input type="text" name="password" value="${u.password}" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                    </div>
                </div>
                <div>
                    <label class="text-xs font-bold text-slate-500 uppercase block mb-1">Role</label>
                    <select name="role" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white">
                        <option value="FISIO" ${u.role === 'FISIO' ? 'selected' : ''}>Fisioterapis</option>
                        <option value="ADMIN" ${u.role === 'ADMIN' ? 'selected' : ''}>Administrator</option>
                    </select>
                </div>
            </form>
        </div>
        <div class="bg-slate-50 px-6 py-4 border-t flex justify-end gap-2">
            <button onclick="saveUser()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg btn-press text-sm">Simpan User</button>
        </div>`;

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
                const userNameEl = document.getElementById('user-name');
                const userRoleEl = document.getElementById('user-role');
                if (userNameEl) userNameEl.innerText = name;
                if (userRoleEl) userRoleEl.innerText = role === 'ADMIN' ? 'Administrator' : 'Fisioterapis';
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

let tempResetCode = null;
async function requestResetCode(e) {
    if (!LICENSE_API_URL) { alert("GAGAL: LICENSE_API_URL belum terkonfigurasi."); return; }
    const otp = Math.floor(100000 + Math.random() * 900000);
    tempResetCode = otp.toString();
    const btn = e.target;
    const originalText = btn.innerText;
    btn.innerText = "Mengirim..."; btn.disabled = true;

    const currentSheetId = state.sheetId || '';

    try {
        await fetch(LICENSE_API_URL, {
            method: 'POST',
            mode: 'cors',
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
    const modalHtml = `
        <div class="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center border-t-4 border-red-500">
            <div class="mb-4">
                <div class="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2"><i data-lucide="shield-alert" width="24"></i></div>
                <h3 class="text-lg font-black text-slate-800">Verifikasi Reset</h3>
                <p class="text-xs text-slate-500">Masukkan 6 digit kode dari Google Sheet.</p>
            </div>
            <input type="text" id="otp-input" maxlength="6" class="w-full text-center text-2xl font-mono font-bold tracking-widest border-2 border-slate-200 rounded-xl p-3 focus:border-red-500 outline-none mb-4" placeholder="000000">
            <div class="flex gap-2">
                <button type="button" onclick="closeModal()" class="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200">Batal</button>
                <button type="button" onclick="verifyResetCode()" class="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 shadow-lg shadow-red-200 btn-press">Reset Sekarang</button>
            </div>
        </div>`;
    document.getElementById('modal-content').innerHTML = modalHtml;
    document.getElementById('modal-container').classList.remove('hidden');
    lucide.createIcons();
}

async function verifyResetCode() {
    const inputCode = document.getElementById('otp-input').value;
    if (inputCode === tempResetCode) {
        if (confirm("Kode Benar! Hapus semua user custom?")) {
            if (state.scriptUrl) { try { await fetch(state.scriptUrl, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'confirm_reset', code: inputCode }) }); await new Promise(r => setTimeout(r, 2000)); } catch (e) { } }
            localStorage.removeItem('erm_users');
            alert("✅ RESET BERHASIL! User dikembalikan ke default.");
            location.reload();
        }
    } else { alert("❌ KODE SALAH!"); }
}

function resetNotifTemplate(type) {
    const defaults = {
        confirm: `Assalamualaikum Wr. Wb. 🌟\n\nHalo, Kak {{name}}! 😊\n\nKami dari *{{clinic_name}}* dengan senang hati menginformasikan bahwa jadwal Fisioterapi Kakak telah berhasil kami *konfirmasi* ✅\n\n🗓️ *Detail Jadwal:*\n┌─────────────────────\n│ 📅 Tanggal : {{date}}\n│ ⏰ Jam        : {{time}} WIB\n│ 📝 Keluhan : {{complaint}}\n└─────────────────────\n\n📌 *Mohon diperhatikan:*\n• Hadir 5-10 menit sebelum jadwal\n• Gunakan pakaian yang nyaman\n• Jika ada perubahan, mohon hubungi kami sebelumnya\n\nKami tunggu kedatangan Kakak 🙏\nSemoga segera pulih dan sehat selalu! 💪\n\nWassalamualaikum Wr. Wb.\n~ *Admin {{clinic_name}}*`,
        reject: `Assalamualaikum Wr. Wb. 🌟\n\nHalo, Kak {{name}}! 😊\n\nTerima kasih telah mempercayakan kesehatan Kakak kepada *{{clinic_name}}* 🙏\n\nDengan hormat, kami informasikan bahwa slot waktu yang Kakak pilih:\n📅 *{{date}}* pukul *{{time}} WIB*\nsaat ini *belum dapat kami terima* dikarenakan jadwal yang sudah penuh. 🙏\n\n*Kami sangat menyarankan* Kakak untuk memilih jadwal alternatif lain yang masih tersedia. Silakan booking ulang melalui link berikut:\n🔗 {{booking_url}}\n\nKami mohon maaf atas ketidaknyamanan ini dan berharap dapat segera melayani Kakak di waktu yang lebih sesuai 🌷\n\nWassalamualaikum Wr. Wb.\n~ *Admin {{clinic_name}}*`,
        reminder: `Assalamualaikum 👋\n\nMengingatkan kembali untuk jadwal Fisioterapi hari ini ya: 👇\n\n📅 Tanggal: {{date}}\n⏰ Jam: {{time}} WIB\n📍 Lokasi: {{category}}\n🏥 Alamat: {{address}}\n📞 Kontak: {{phone}}\n🗺️ Maps: {{maps_url}}\n📝 Catatan: {{notes}}\n\nMohon konfirmasinya. Terima kasih! 🙏\n~ Admin {{clinic_name}}`
    };

    if (confirm("Reset template ini ke pengaturan bawaan?")) {
        const el = document.getElementById(`notif-msg-${type}`);
        if (el) el.value = defaults[type];
    }
}

function getDefaultNotif(type) {
    const defaults = {
        confirm: `Assalamualaikum Wr. Wb. 🌟\n\nHalo, Kak {{name}}! 😊\n\nKami dari *{{clinic_name}}* dengan senang hati menginformasikan bahwa jadwal Fisioterapi Kakak telah berhasil kami *konfirmasi* ✅\n\n🗓️ *Detail Jadwal:*\n┌─────────────────────\n│ 📅 Tanggal : {{date}}\n│ ⏰ Jam        : {{time}} WIB\n│ 📝 Keluhan : {{complaint}}\n└─────────────────────\n\n📌 *Mohon diperhatikan:*\n• Hadir 5-10 menit sebelum jadwal\n• Gunakan pakaian yang nyaman\n• Jika ada perubahan, mohon hubungi kami sebelumnya\n\nKami tunggu kedatangan Kakak 🙏\nSemoga segera pulih dan sehat selalu! 💪\n\nWassalamualaikum Wr. Wb.\n~ *Admin {{clinic_name}}*`,
        reject: `Assalamualaikum Wr. Wb. 🌟\n\nHalo, Kak {{name}}! 😊\n\nTerima kasih telah mempercayakan kesehatan Kakak kepada *{{clinic_name}}* 🙏\n\nDengan hormat, kami informasikan bahwa slot waktu yang Kakak pilih:\n📅 *{{date}}* pukul *{{time}} WIB*\nsaat ini *belum dapat kami terima* dikarenakan jadwal yang sudah penuh. 🙏\n\n*Kami sangat menyarankan* Kakak untuk memilih jadwal alternatif lain yang masih tersedia. Silakan booking ulang melalui link berikut:\n🔗 {{booking_url}}\n\nKami mohon maaf atas ketidaknyamanan ini dan berharap dapat segera melayani Kakak di waktu yang lebih sesuai 🌷\n\nWassalamualaikum Wr. Wb.\n~ *Admin {{clinic_name}}*`,
        reminder: `Assalamualaikum 👋\n\nMengingatkan kembali untuk jadwal Fisioterapi hari ini ya: 👇\n\n📅 Tanggal: {{date}}\n⏰ Jam: {{time}} WIB\n📍 Lokasi: {{category}}\n🏥 Alamat: {{address}}\n📞 Kontak: {{phone}}\n🗺️ Maps: {{maps_url}}\n📝 Catatan: {{notes}}\n\nMohon konfirmasinya. Terima kasih! 🙏\n~ Admin {{clinic_name}}`
    };
    return defaults[type] || '';
}
