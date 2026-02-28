// --- 9. VIEW RENDERERS (ASSESSMENTS) ---
function renderAssessmentList(container) {
    const list = state.assessments || [];
    const filtered = state.filterPatientId ? list.filter(a => a.patientId === state.filterPatientId) : list;
    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

    const patient = state.filterPatientId ? (state.patients.find(p => p.id === state.filterPatientId) || { name: state.filterPatientId }) : null;

    container.innerHTML = `
        <div class="space-y-4 fade-in pb-24">
            <div class="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div class="flex items-center gap-3">
                    <div class="bg-indigo-50 text-indigo-600 p-2.5 rounded-lg"><i data-lucide="clipboard-list" width="20"></i></div>
                    <div>
                        <h2 class="text-xl font-bold text-slate-800">${patient ? 'Riwayat: ' + patient.name : 'Semua Assessment'}</h2>
                        <p class="text-xs text-slate-500">${sorted.length} Rekam Medis ditemukan</p>
                    </div>
                </div>
                <div class="flex gap-2 w-full md:w-auto">
                    ${state.filterPatientId ? `<button onclick="navigate('patients')" class="flex-1 md:flex-none px-4 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"><i data-lucide="arrow-left" width="16"></i> Kembali</button>` : ''}
                    <button onclick="navigate('patients')" class="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 font-bold shadow-lg shadow-blue-200 transition-all btn-press">
                        <i data-lucide="plus" width="18"></i> Assessment Baru
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 gap-4">
                ${sorted.length > 0 ? sorted.map(a => {
        const p = state.patients.find(pt => pt.id === a.patientId);
        return `
                    <div class="bg-white rounded-xl shadow-sm border border-slate-200 hover:border-blue-300 transition-all group overflow-hidden">
                        <div class="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div class="flex items-start gap-4 flex-1">
                                <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center shrink-0 min-w-[80px]">
                                    <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">${new Date(a.date).toLocaleDateString('id-ID', { month: 'short' })}</span>
                                    <span class="block text-2xl font-black text-slate-700">${new Date(a.date).getDate()}</span>
                                    <span class="block text-[10px] font-bold text-slate-500">${new Date(a.date).getFullYear()}</span>
                                </div>
                                <div>
                                    <div class="flex items-center gap-2 mb-1">
                                        <h4 class="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">${p ? p.name : a.patientId}</h4>
                                        <span class="text-[10px] font-mono text-slate-400">(${a.patientId})</span>
                                    </div>
                                    <p class="text-sm font-bold text-slate-600 mb-2">${a.diagnosis || 'Tanpa Diagnosis'}</p>
                                    <div class="flex flex-wrap gap-2">
                                        <span class="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100 flex items-center gap-1"><i data-lucide="user" width="10"></i> ${a.therapistId}</span>
                                        ${a.sessionNum ? `<span class="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">Sesi #${a.sessionNum}</span>` : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="flex gap-2 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0">
                                <button onclick="editAssessment('${a.id}')" class="flex-1 md:flex-none p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-bold shadow-sm"><i data-lucide="edit-3" width="16"></i> Edit</button>
                                <button onclick="printAssessment('${a.id}')" class="flex-1 md:flex-none p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-bold shadow-sm"><i data-lucide="printer" width="16"></i> Cetak</button>
                                <button onclick="deleteAssessment('${a.id}')" class="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-300 rounded-lg transition-all flex items-center justify-center shadow-sm"><i data-lucide="trash-2" width="16"></i></button>
                            </div>
                        </div>
                    </div>`;
    }).join('') : `
                <div class="bg-white p-20 rounded-2xl shadow-sm border border-dashed border-slate-300 text-center flex flex-col items-center justify-center gap-4">
                    <div class="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center"><i data-lucide="clipboard-x" width="40"></i></div>
                    <div>
                        <h3 class="text-xl font-bold text-slate-800">Belum Ada Data</h3>
                        <p class="text-slate-400 text-sm">Silahkan lakukan assessment baru pada menu Pasien.</p>
                    </div>
                </div>`}
            </div>
        </div>`;
    renderIcons();
}

function editAssessment(id) {
    const ass = state.assessments.find(a => a.id === id);
    if (ass) {
        state.selectedPatient = state.patients.find(p => p.id === ass.patientId);
        state.currentAssessment = ass;
        templateSearchQuery = '';
        navigate('assessment_form');
    }
}

function deleteAssessment(id) {
    if (confirm('Yakin ingin menghapus data assessment ini?')) {
        state.deletedIds.assessments.push(id);
        state.assessments = state.assessments.filter(a => a.id !== id);
        saveData();
        if (state.scriptUrl) syncDelta();
        renderAssessmentList(document.getElementById('main-content'));
    }
}
