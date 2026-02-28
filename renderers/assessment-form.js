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
            plan: '',
            is_consented: false,
            consent_timestamp: '',
            rontgen_url: ''
        };
        if (!Array.isArray(data.pain_points)) data.pain_points = [];
        window.tempFormData = JSON.parse(JSON.stringify(data));
    }

    if (!state.selectedPatient) { navigate('patients'); return; }
    const isNewEntry = !state.currentAssessment && !data.diagnosis;

    // PRESERVE SCROLL
    const scrollEl = document.getElementById('main-form-scroll');
    const oldScroll = scrollEl ? scrollEl.scrollTop : 0;

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
                    <div class="mb-1">
                        <div class="flex flex-col md:flex-row justify-between items-center mb-4 border-b border-slate-200 pb-4 gap-4">
                            <h3 class="text-sm font-bold text-slate-400 uppercase tracking-widest self-start md:self-center">Pilih Template Kasus (ICF)</h3>
                            
                            <div class="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                                <!-- Box Pencarian Template -->
                                <div class="relative w-full md:w-64">
                                    <i data-lucide="search" class="absolute left-3 top-2.5 text-slate-400" width="16"></i>
                                    <input type="text" id="icf-search" onkeyup="handleTemplateSearch(this.value)" value="${templateSearchQuery}" placeholder="Cari kasus (misal: HNP)..." class="pl-10 w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm">
                                </div>
                            </div>
                        </div>

                        <div id="icf-selection-container">
                            <div class="flex flex-wrap gap-2 justify-center mb-3">
                                ${['Semua', 'Muskulo', 'Neuro', 'Pediatri', 'Geriatri', 'Sport', 'Kardio'].map(cat => `
                                    <button onclick="setTemplateCategory('${cat}')" class="text-[10px] uppercase px-3 py-1.5 rounded-full font-bold transition-all border ${currentTemplateCategory === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}">${cat}</button>
                                `).join('')}
                            </div>

                            <!-- Sub-Filter Regio -->
                            <div class="mb-6 flex flex-wrap gap-2 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                                <span class="text-[10px] font-black text-slate-400 uppercase tracking-tighter mr-2 shrink-0">Filter Regio:</span>
                                ${(() => {
            const regions = ['Semua'];
            Object.keys(ICF_TEMPLATES).forEach(t => {
                const item = ICF_TEMPLATES[t];
                if (currentTemplateCategory === 'Semua' || item.category === currentTemplateCategory) {
                    if (item.region && !regions.includes(item.region)) regions.push(item.region);
                }
            });
            const sortedRegions = ['Semua', ...regions.filter(r => r !== 'Semua').sort()];
            return sortedRegions.map(reg => `
                                        <button onclick="setTemplateRegion('${reg}')" class="text-[9px] font-bold px-3 py-1.5 rounded-lg transition-all border shrink-0 ${currentTemplateRegion === reg ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-400'}">${reg}</button>
                                    `).join('');
        })()}
                            </div>
                            <div id="icf-template-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[200px]">
                                ${renderTemplateGrid()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="step-2" class="${isNewEntry ? 'hidden' : 'flex'} flex-col h-full bg-slate-100 fade-in">
                <div class="bg-white px-4 md:px-8 py-4 border-b border-slate-200 shadow-sm flex justify-between items-center shrink-0 z-20">
                    <div class="flex items-center gap-2 md:gap-4">
                        <button onclick="showStep1()" class="p-1.5 md:p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors" title="Kembali ke Template"><i data-lucide="arrow-left" width="20"></i></button>
                        <div>
                            <h2 class="text-lg md:text-xl font-black text-slate-800 leading-tight">Form Assessment</h2>
                            <div class="flex items-center gap-1 text-[10px] md:text-sm text-slate-500">
                                Pasien: <span class="font-bold text-blue-600 truncate max-w-[120px] md:max-w-none">${state.selectedPatient.name}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 md:gap-3">
                        <button type="button" onclick="openOutcomeModal()" class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] md:text-sm font-bold border border-emerald-200 hover:bg-emerald-100 transition-colors">
                            <i data-lucide="calculator" width="14"></i> <span class="hidden md:inline">Kalkulator</span>
                        </button>
                        <div class="h-6 md:h-8 w-px bg-slate-300 mx-0.5 md:mx-1"></div>
                        <p class="text-[10px] md:text-sm font-bold text-slate-500 mr-1 hidden sm:block">${data.date}</p>
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
                                        ${(data.pain_points || []).map((p, idx) => `<div onclick="removePainPoint(${idx}, event)" class="pain-point-marker absolute w-6 h-6 -ml-3 -mt-3 bg-red-600/90 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[10px] text-white font-bold hover:scale-125 transition-transform cursor-pointer animate-bounce-short" style="left: ${p.x}%; top: ${p.y}%;" title="Hapus titik ini">${idx + 1}</div>`).join('')}
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
                                    <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[160px] space-y-2" id="group-eval">
                                        ${renderListItems('eval')}
                                    </div>
                                    <div class="flex gap-2 mt-3">
                                        <input type="text" id="custom-eval" placeholder="Ketik hasil evaluasi..." class="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2.5 focus:border-blue-500 outline-none" onkeydown="if(event.key === 'Enter') addCustomItem('eval')">
                                        <button type="button" onclick="addCustomItem('eval')" class="bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-lg text-sm font-bold transition-colors shadow-sm">Add</button>
                                    </div>
                                </div>
                                <div>
                                    <h4 class="text-xs font-bold mb-3 text-slate-500 uppercase">Catatan Tambahan</h4>
                                    <textarea id="form-plan" onchange="updateForm('plan', this.value)" class="w-full border-2 border-slate-200 p-4 rounded-xl h-40 focus:border-blue-500 outline-none resize-none text-base text-slate-700 bg-white" placeholder="Catatan atau instruksi tambahan (Opsional)...">${data.plan || ''}</textarea>
                                </div>
                            </div>
                        </div>

                        <!-- Section Rontgen (Penyempurnaan v2.1) -->
                        <div class="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm mt-6">
                            <div class="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                                <div class="bg-amber-600 text-white p-2 rounded-lg shadow-amber-200 shadow-md">
                                    <i data-lucide="image" width="20"></i>
                                </div>
                                <div>
                                    <h3 class="font-bold text-lg text-slate-800">Penunjang Medis (Rontgen/MRI)</h3>
                                    <p class="text-xs text-slate-400">Upload foto atau scan hasil pemeriksaan</p>
                                </div>
                            </div>
                            <div class="flex flex-col md:flex-row gap-6 items-start">
                                <div class="w-full md:w-1/2">
                                    <label class="relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer group">
                                        <div class="flex flex-col items-center justify-center pt-5 pb-6">
                                            <i data-lucide="upload-cloud" class="text-slate-400 group-hover:text-blue-500 mb-2 transition-colors"></i>
                                            <p class="mb-2 text-sm text-slate-500"><span class="font-bold">Klik untuk upload</span></p>
                                            <p class="text-[10px] text-slate-400">PNG, JPG, atau PDF (Max 10MB)</p>
                                        </div>
                                        <input type="file" class="hidden" accept="image/*,.pdf" onchange="handleRontgenUpload(this)">
                                    </label>
                                </div>
                                <div id="rontgen-preview-box" class="w-full md:w-1/2 min-h-[160px] bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center relative overflow-hidden">
                                     ${data.rontgen_url ? `<a href="${data.rontgen_url}" target="_blank" class="flex flex-col items-center gap-2 group"><i data-lucide="file-text" width="48" class="text-blue-500"></i><span class="text-xs font-bold text-blue-600 group-hover:underline">Lihat Dokumen Exist</span></a>` : `<p class="text-xs text-slate-400 italic">Belum ada file diupload</p>`}
                                </div>
                            </div>
                        <!-- Section Informed Consent Digital (v2.4) -->
                        ${state.pdfConfig.showInformedConsent ? `
                        <div class="bg-blue-50 p-6 md:p-8 rounded-2xl border-2 border-blue-100 shadow-sm mt-6 fade-in">
                            <div class="flex items-start gap-4">
                                <div class="shrink-0 mt-1">
                                    <input type="checkbox" id="form-is-consented" ${data.is_consented ? 'checked' : ''} 
                                        onchange="updateForm('is_consented', this.checked); if(this.checked) updateForm('consent_timestamp', new Date().toLocaleString('id-ID'));" 
                                        class="w-6 h-6 accent-blue-600 rounded cursor-pointer">
                                </div>
                                <div class="flex-1">
                                    <label for="form-is-consented" class="font-bold text-slate-800 cursor-pointer select-none">
                                        Persetujuan Tindakan (Informed Consent)
                                    </label>
                                    <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Saya telah menjelaskan prosedur, risiko, dan manfaat tindakan fisioterapi kepada pasien/wali, dan mereka <strong>MENYETUJUI</strong> tindakan tersebut secara sadar.
                                    </p>
                                    ${data.consent_timestamp ? `<p class="text-[10px] text-blue-600 font-bold mt-2 flex items-center gap-1"><i data-lucide="clock" width="10"></i> Disetujui pada: ${data.consent_timestamp}</p>` : ''}
                                </div>
                            </div>
                        </div>` : ''}

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
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // RESTORE SCROLL
    if (scrollEl) {
        const newScrollEl = document.getElementById('main-form-scroll');
        if (newScrollEl) newScrollEl.scrollTop = oldScroll;
    }
}

function renderTemplateGrid() {
    const templates = Object.keys(ICF_TEMPLATES).filter(t => {
        const item = ICF_TEMPLATES[t];
        const matchesCat = currentTemplateCategory === 'Semua' || item.category === currentTemplateCategory;
        const matchesReg = currentTemplateRegion === 'Semua' || item.region === currentTemplateRegion;
        const matchesSearch = t.toLowerCase().includes(templateSearchQuery.toLowerCase());
        return matchesCat && matchesReg && matchesSearch;
    });

    if (templates.length === 0) {
        return `<div class="col-span-full text-center py-10 text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center gap-2">
            <i data-lucide="search-x" width="40" class="opacity-20"></i>
            <span>Tidak menemukan template yang cocok dengan pencarian <strong>"${templateSearchQuery}"</strong> di kategori <strong>${currentTemplateCategory}</strong></span>
        </div>`;
    }

    return templates.map(t => `
        <button onclick="selectTemplateAndGo('${t}')" class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-400 hover:-translate-y-1 transition-all text-left group h-full relative overflow-hidden">
            <div class="flex items-start justify-between relative z-10">
                <span class="font-bold text-slate-700 group-hover:text-blue-600 transition-colors line-clamp-2 text-sm">${t}</span>
                <i data-lucide="arrow-right" class="text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all shrink-0" width="16"></i>
            </div>
            <div class="mt-3 flex flex-wrap gap-1 relative z-10">
                <span class="text-[9px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">ICD: ${ICF_TEMPLATES[t].icd || '-'}</span>
                ${ICF_TEMPLATES[t].region ? `<span class="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-bold">${ICF_TEMPLATES[t].region}</span>` : ''}
                ${ICF_TEMPLATES[t].category ? `<span class="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-bold uppercase">${ICF_TEMPLATES[t].category}</span>` : ''}
            </div>
        </button>
    `).join('');
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
    return `<div class="grid grid-cols-1 gap-2" id="group-${key}">${renderListItems(key)}</div>`;
}

function renderListItems(category) {
    const list = window.tempFormData[category] || [];
    if (list.length === 0) {
        return `<div class="h-full flex items-center justify-center text-sm text-slate-400 italic p-4">Belum ada ${category === 'eval' ? 'catatan evaluasi' : 'item dipilih'}</div>`;
    }

    if (category === 'eval') {
        return list.map(item => `
            <div class="flex items-center gap-2 p-3 rounded-lg bg-white border border-slate-200 text-sm text-slate-700 shadow-sm">
                <i data-lucide="check-circle" width="16" class="text-emerald-500"></i> 
                <span class="flex-1">${item}</span>
                <button type="button" onclick="toggleFormItem('eval', '${item}')" class="text-slate-300 hover:text-red-500 transition-colors">
                    <i data-lucide="x" width="16"></i>
                </button>
            </div>`).join('');
    }

    // Default for checkboxes (Intervention)
    return list.map(item => `
        <label class="flex items-center gap-2 p-2.5 rounded-lg cursor-pointer text-sm border select-none bg-blue-50 text-blue-700 border-blue-100 transition-colors hover:bg-blue-100">
            <input type="checkbox" checked onchange="toggleFormItem('${category}', '${item}')" class="accent-blue-600 w-4 h-4 rounded">
            <span class="leading-none">${item}</span>
        </label>`).join('');
}

function renderSelect(label, objKey, val, options) {
    return `<div class="flex flex-col gap-1"><span class="text-xs text-slate-500 font-bold uppercase">${label}</span><select onchange="updateFormObj('${objKey}', this.value)" class="border border-slate-300 rounded-lg p-2 text-slate-800 bg-white w-full outline-none text-sm focus:ring-1 focus:ring-blue-500">${options.map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
}

function updateForm(key, val) { window.tempFormData[key] = val; }
function updateFormObj(key, val) { window.tempFormData.obj[key] = val; }

function toggleFormItem(category, item) {
    const list = window.tempFormData[category];
    if (!list) return;
    const index = list.indexOf(item);
    if (index > -1) list.splice(index, 1);
    else list.push(item);

    updateGroupUI(category);
}

function updateGroupUI(category) {
    const container = document.getElementById(`group-${category}`);
    if (container) {
        container.innerHTML = renderListItems(category);
        if (typeof renderIcons === 'function') renderIcons();
    } else {
        renderAssessmentForm(document.getElementById('main-content'), true);
    }
}

function addCustomItem(category) {
    const input = document.getElementById(`custom-${category}`);
    const val = input.value.trim();
    if (val) {
        if (!window.tempFormData[category]) window.tempFormData[category] = [];
        window.tempFormData[category].push(val);
        input.value = ''; // Clear input
        updateGroupUI(category);
    }
}

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

function updateUploadBadge() {
    const badge = document.getElementById('nav-assessments-badge');
    if (!badge) return;
    if (state.pendingUploads.length > 0) {
        badge.classList.remove('hidden');
        badge.classList.add('flex');
    } else {
        badge.classList.add('hidden');
        badge.classList.remove('flex');
    }
}

async function processBackgroundUpload(assessmentId, fileData, fileName, patientName) {
    if (!LICENSE_API_URL) return;

    if (!state.pendingUploads.includes(assessmentId)) {
        state.pendingUploads.push(assessmentId);
    }
    updateUploadBadge();

    const payload = {
        action: 'upload_file',
        fileData: fileData,
        fileName: fileName,
        patientName: patientName,
        sheet_id: state.sheetId || getSheetIdFromUrl(state.scriptUrl)
    };

    try {
        const response = await fetch(LICENSE_API_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });

        const res = await response.json();

        if (res.status === 'success') {
            const idx = state.assessments.findIndex(a => a.id === assessmentId);
            if (idx !== -1) {
                state.assessments[idx].rontgen_url = res.fileUrl;
                state.assessments[idx].uploading = false;
                state.assessments[idx].updatedAt = new Date().toISOString();
                if (typeof saveData === 'function') await saveData();
                if (typeof syncDelta === 'function') syncDelta();
            }
        }
    } catch (err) {
        console.error("Background upload error:", err);
    } finally {
        state.pendingUploads = state.pendingUploads.filter(id => id !== assessmentId);
        updateUploadBadge();
    }
}

function saveAssessment() {
    const data = window.tempFormData;
    if (!data.diagnosis) { alert("Mohon isi diagnosa medis."); return; }

    const fileToUpload = data.rontgen_base64;
    const fileName = data.rontgen_filename;
    const patientName = (state.patients.find(p => p.id === data.patientId)?.name || 'Unknown');

    if (fileToUpload) {
        data.uploading = true;
        delete data.rontgen_base64;
        delete data.rontgen_filename;
    }

    finalizeSaveAssessment(data);

    if (fileToUpload) {
        processBackgroundUpload(data.id, fileToUpload, fileName, patientName);
    }
}

function finalizeSaveAssessment(data) {
    const existingIdx = state.assessments.findIndex(a => a.id === data.id);
    if (existingIdx === -1) {
        state.assessments.push(data);
        if (typeof showToast === 'function') showToast('Asesmen baru berhasil disimpan local.', 'success');
    } else {
        state.assessments[existingIdx] = data;
        if (typeof showToast === 'function') showToast('Update asesmen berhasil disimpan local.', 'success');
    }

    data.updatedAt = new Date().toISOString();
    if (typeof saveData === 'function') saveData();
    if (state.scriptUrl && typeof syncDelta === 'function') syncDelta();
    navigate('assessments');
}

window.handleRontgenUpload = async (input) => {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
        alert("File terlalu besar (Maks 10MB)");
        input.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const base64 = e.target.result;
        window.tempFormData.rontgen_base64 = base64;
        window.tempFormData.rontgen_filename = file.name;

        const preview = document.getElementById('rontgen-preview-box');
        if (preview) {
            if (file.type.startsWith('image/')) {
                preview.innerHTML = `<img src="${base64}" class="w-full h-full object-cover">`;
            } else {
                preview.innerHTML = `<div class="flex flex-col items-center gap-2 py-4"><i data-lucide="file-text" width="48" class="text-blue-500"></i><span class="text-[10px] font-bold text-slate-600 text-center px-4">${file.name}</span></div>`;
                if (typeof renderIcons === 'function') renderIcons();
            }
        }
    };
    reader.readAsDataURL(file);
};

function selectTemplateAndGo(tName) { applyTemplate(tName); showStep2(); }
function goToFormManual() { window.tempFormData.diagnosis = ''; showStep2(); }
function showStep1() { document.getElementById('step-1').classList.remove('hidden'); document.getElementById('step-2').classList.add('hidden'); }
function showStep2() { document.getElementById('step-1').classList.add('hidden'); document.getElementById('step-2').classList.remove('hidden'); const scrollArea = document.getElementById('main-form-scroll'); if (scrollArea) scrollArea.scrollTop = 0; if (typeof renderIcons === 'function') renderIcons(); }
function updateICFSelectionUI() {
    const container = document.getElementById('icf-selection-container');
    if (!container) {
        renderAssessmentForm(document.getElementById('main-content'), true);
        return;
    }
    const regions = ['Semua'];
    Object.keys(ICF_TEMPLATES).forEach(t => {
        const item = ICF_TEMPLATES[t];
        if (currentTemplateCategory === 'Semua' || item.category === currentTemplateCategory) {
            if (item.region && !regions.includes(item.region)) regions.push(item.region);
        }
    });
    const sortedRegions = ['Semua', ...regions.filter(r => r !== 'Semua').sort()];

    const catPillsHtml = ['Semua', 'Muskulo', 'Neuro', 'Pediatri', 'Geriatri', 'Sport', 'Kardio'].map(cat =>
        `<button onclick="setTemplateCategory('${cat}')" class="text-[10px] uppercase px-3 py-1.5 rounded-full font-bold transition-all border ${currentTemplateCategory === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}">${cat}</button>`
    ).join('');

    const regionPillsHtml = sortedRegions.map(reg =>
        `<button onclick="setTemplateRegion('${reg}')" class="text-[9px] font-bold px-3 py-1.5 rounded-lg transition-all border shrink-0 ${currentTemplateRegion === reg ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-400'}">${reg}</button>`
    ).join('');

    container.innerHTML = `
        <div class="flex flex-wrap gap-2 justify-center">
            ${catPillsHtml}
        </div>
        <div class="mb-6 flex flex-wrap gap-2 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-tighter mr-2 shrink-0">Filter Regio:</span>
            ${regionPillsHtml}
        </div>
        <div id="icf-template-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[200px]">
            ${renderTemplateGrid()}
        </div>
    `;
    if (typeof renderIcons === 'function') renderIcons();
}

function setTemplateCategory(cat) {
    currentTemplateCategory = cat;
    currentTemplateRegion = 'Semua';
    updateICFSelectionUI();
}
function setTemplateRegion(reg) {
    currentTemplateRegion = reg;
    updateICFSelectionUI();
}
function handleTemplateSearch(query) {
    templateSearchQuery = query;
    const grid = document.getElementById('icf-template-grid');
    if (grid) {
        grid.innerHTML = renderTemplateGrid();
        if (typeof renderIcons === 'function') renderIcons();
    } else {
        renderAssessmentForm(document.getElementById('main-content'), true);
    }
}

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
