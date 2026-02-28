/**
 * Print & Document Renderer
 * Handles the generation of HTML for assessments and receipts for printing.
 */

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

        ${conf.showInformedConsent ? `
        <div class="mt-10 mb-6 p-4 border border-slate-200 rounded-xl bg-slate-50/50 break-inside-avoid relative overflow-hidden">
            ${a.is_consented ? `
            <div class="absolute -right-6 top-4 rotate-12 bg-blue-600 text-white px-10 py-1 text-[8px] font-black uppercase tracking-widest shadow-sm">
                Verified Digital
            </div>` : ''}
            <h4 class="font-bold text-[0.8em] text-slate-500 uppercase mb-2">Persetujuan Pasien (Informed Consent)</h4>
            <p class="text-[0.85em] leading-relaxed text-justify text-slate-700 italic">
                "${conf.informedConsentText || '-'}"
            </p>
            <div class="mt-4 flex justify-between items-end">
                <div class="text-[0.7em] text-slate-400">
                    ${a.is_consented ? `
                    <div class="flex items-center gap-1.5 text-blue-700 font-bold">
                        <span class="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
                        DISETUJUI SECARA DIGITAL oleh ${p ? p.name : 'Pasien'} pada ${a.consent_timestamp || '-'}
                    </div>` : 'Dokumen ini sah dan disetujui secara digital oleh pasien/wali pasien pada saat pemeriksaan.'}
                </div>
                <div class="w-32 border-b border-slate-300 h-8 flex items-center justify-center">
                    ${a.is_consented ? `<span class="text-[10px] font-black text-blue-600 font-mono tracking-tighter opacity-30 select-none uppercase">Digital Signed</span>` : ''}
                </div>
            </div>
            <div class="flex justify-end pr-4 mt-1">
                <span class="text-[0.65em] text-slate-400 font-bold uppercase">${a.is_consented ? 'Konfirmasi Digital Sah' : 'Tanda Tangan/Paraf Pasien'}</span>
            </div>
        </div>` : ''}

        ${conf.showSignature ? `<div class="mt-8 flex justify-end break-inside-avoid"><div class="w-48 text-center"><p class="text-slate-500 mb-12 text-[0.8em]">Blitar, ${new Date(a.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p><p class="font-bold text-slate-900 border-b border-slate-400 inline-block pb-0.5">${state.clinicInfo.therapist}</p><p class="text-slate-500 mt-1 text-[0.7em]">SIPF: ${state.clinicInfo.sipf}</p></div></div>` : ''}
    </div>`;
}

function generateReceiptHTML(a, type) {
    const p = (state.patients || []).find(pt => pt.id === a.patientId);
    const nama = p ? p.name : (a.visitor_name || a.name || 'Pasien');
    const formattedDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const amount = a.finalAmount || a.fee || 0;

    // Receipt templates can be expanded here. 
    // This is a minimal version based on app.js findings.
    return `
        <div style="font-family: monospace; width: 300px; padding: 20px; border: 1px solid #eee; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h3 style="margin: 0;">${state.clinicInfo.name || 'FISIOTA'}</h3>
                <p style="font-size: 10px; margin: 5px 0;">${state.clinicInfo.address || '-'}</p>
                <div style="border-bottom: 1px dashed #000; margin: 10px 0;"></div>
            </div>
            <table style="width: 100%; font-size: 12px;">
                <tr><td>Tgl:</td><td style="text-align: right;">${formattedDate}</td></tr>
                <tr><td>Pasien:</td><td style="text-align: right;">${nama}</td></tr>
                <tr><td>Metode:</td><td style="text-align: right;">${a.paymentMethod || '-'}</td></tr>
            </table>
            <div style="border-bottom: 1px dashed #000; margin: 10px 0;"></div>
            <div style="display: flex; justify-between; font-weight: bold;">
                <span>TOTAL:</span>
                <span style="flex: 1; text-align: right;">Rp ${amount.toLocaleString('id-ID')}</span>
            </div>
            <div style="border-bottom: 1px dashed #000; margin: 10px 0;"></div>
            <div style="text-align: center; font-size: 10px; margin-top: 20px;">
                <p>Terima kasih atas kunjungan Anda.</p>
                <p>Semoga segera pulih!</p>
            </div>
        </div>
    `;
}

function printReceipt(apptId, type) {
    const a = (state.appointments || []).find(x => x.id === apptId);
    if (!a) return;
    const html = generateReceiptHTML(a, type);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html><head><title>Struk Pembayaran</title></head><body onload="window.print(); window.close();">${html}</body></html>`);
    printWindow.document.close();
}

// Global printing functions called from UI
window.printJournalReport = () => { /* Implement specific logic if needed */ showToast("Mencetak Jurnal..."); window.print(); };
window.printFinancialReport = () => { showToast("Mencetak Laporan Keuangan..."); window.print(); };
window.printAppointmentReport = () => { showToast("Mencetak Daftar Kunjungan..."); window.print(); };

function renderPrintPreview(container) {
    if (!state.printSelection || state.printSelection.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-slate-400">Tidak ada data untuk dicetak.</div>';
        return;
    }

    const assessments = state.printSelection.map(id => state.assessments.find(a => a.id === id)).filter(Boolean);
    const html = assessments.map(a => {
        const p = state.patients.find(pt => pt.id === a.patientId);
        return generateSingleAssessmentHTML(a, p);
    }).join('<div class="page-break"></div>');

    container.innerHTML = `
        <div class="max-w-4xl mx-auto pb-24">
            <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex justify-between items-center sticky top-0 z-20 no-print">
                <div class="flex items-center gap-3">
                    <button onclick="navigate('assessments')" class="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><i data-lucide="arrow-left" width="20"></i></button>
                    <h3 class="font-bold text-slate-800">Print Preview</h3>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.print()" class="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2">
                        <i data-lucide="printer" width="18"></i> Cetak Dokumen
                    </button>
                </div>
            </div>
            
            <div class="bg-white shadow-xl rounded-2xl p-8 md:p-12 overflow-hidden print:shadow-none print:p-0" id="print-area">
                ${html}
            </div>
        </div>
    `;
    renderIcons();
}

