/**
 * Modals & Shared UI Components
 * Handles generic modal interactions and the ICF item picker.
 */

function closeModal() {
    const modal = document.getElementById('modal-container');
    if (modal) modal.classList.add('hidden');
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
    if (modalContent) {
        modalContent.innerHTML = content;
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) modalContainer.classList.remove('hidden');
        lucide.createIcons();
        // Auto focus search
        setTimeout(() => {
            const searchInput = document.getElementById('picker-search');
            if (searchInput) searchInput.focus();
        }, 100);
    }
}

function filterPickerItems(query) {
    const term = query.toLowerCase();
    const labels = document.querySelectorAll('#picker-list label');
    labels.forEach(lbl => {
        const span = lbl.querySelector('span');
        if (span) {
            const text = span.textContent.toLowerCase();
            lbl.style.display = text.includes(term) ? 'flex' : 'none';
        }
    });
}

function confirmItemPicker(key) {
    const checked = Array.from(document.querySelectorAll('.picker-checkbox:checked')).map(cb => cb.value);

    if (checked.length > 0) {
        const input = document.getElementById(`form-${key}`);
        if (input) {
            const currentVal = input.value;
            const newVal = currentVal ? (currentVal.trim() + '\n' + checked.join('\n')) : checked.join('\n');

            if (typeof updateForm === 'function') {
                updateForm(key, newVal);
            }
            input.value = newVal;

            // Visual feedback
            input.classList.add('ring-2', 'ring-green-400');
            setTimeout(() => input.classList.remove('ring-2', 'ring-green-400'), 500);
        }
    }
    closeModal();
}
