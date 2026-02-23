/**
 * ERM FISIOTA BACKEND - V5.0 (MODULAR)
 * FILE: 3_License.gs
 * Deskrpsi: Logika Pembuatan, Validasi, dan Cleanup Lisensi.
 */

// Fungsi generateNewLicense dipanggil dari Sidebar
function generateNewLicense(clientName, durationType) {
    if (!clientName) throw new Error("Nama Klien Kosong");

    // 🔒 LICENSE DATA MUST BE ON ADMIN SHEET (Script Bound), NOT Client Sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrInsertSheet(ss, SHEET_NAMES.LICENSES, HEADERS.LICENSES);

    // Hitung Expired Date
    const now = new Date();
    let expireDate = new Date();
    let planName = "";

    if (durationType === '5mins') {
        expireDate.setMinutes(now.getMinutes() + 5);
        planName = "Trial 5 Menit (Cepat)";
    } else if (durationType === '1hour') {
        expireDate.setHours(now.getHours() + 1);
        planName = "Trial 1 Jam (Test)";
    } else if (durationType === '7days') {
        expireDate.setDate(now.getDate() + 7);
        planName = "Trial 7 Hari";
    } else if (durationType === '30days') {
        expireDate.setMonth(now.getMonth() + 1);
        planName = "Bulanan (30 Hari)";
    } else if (durationType === '3months') {
        expireDate.setMonth(now.getMonth() + 3);
        planName = "Triwulan (3 Bulan)";
    } else if (durationType === '1year') {
        expireDate.setFullYear(now.getFullYear() + 1);
        planName = "Tahunan (1 Tahun)";
    } else if (durationType === 'lifetime') {
        expireDate.setFullYear(now.getFullYear() + 100);
        planName = "Lifetime";
    }

    // Generate Key Unik
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    const key = `FISIO-${code.substring(0, 4)}-${code.substring(4, 8)}`;

    // Simpan ke Sheet
    sheet.appendRow([
        key,
        planName,
        clientName,
        Utilities.formatDate(now, TIMEZONE, "yyyy-MM-dd HH:mm:ss"),
        Utilities.formatDate(expireDate, TIMEZONE, "yyyy-MM-dd HH:mm:ss"),
        "ACTIVE",
        "" // Col 7: sheet_id (Filled upon verification)
    ]);

    return {
        success: true,
        key: key,
        plan: planName,
        expiry: Utilities.formatDate(expireDate, TIMEZONE, "dd MMM yyyy HH:mm"),
        expiry_iso: Utilities.formatDate(expireDate, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss")
    };
}

function verifyLicense(ssIgnored, keyInput, clientSheetId) { 
    Logger.log(`[verifyLicense] Key: ${keyInput} | SheetID Received: ${clientSheetId || 'NULL'}`);
    const ss = SpreadsheetApp.getActiveSpreadsheet(); 
    const sheet = getOrInsertSheet(ss, SHEET_NAMES.LICENSES, HEADERS.LICENSES);
    const data = sheet.getDataRange().getValues();

    let found = null;
    let foundRow = -1;

    // TRIM KEY INPUT AGAR TIDAK SENSITIF SPASI
    const cleanKeyInput = String(keyInput).trim();

    for (let i = 1; i < data.length; i++) {
        // MATCHING STRING DENGAN TRIM
        if (String(data[i][0]).trim() === cleanKeyInput) {
            found = {
                plan: data[i][1],
                client: data[i][2],
                expires: data[i][4],
                status: data[i][5],
                sheetId: data[i][6]
            };
            foundRow = i + 1;
            break;
        }
    }

    if (!found) return { valid: false, message: "Kode Lisensi tidak ditemukan." };
    if (found.status !== 'ACTIVE') return { valid: false, message: "Lisensi ini dinonaktifkan (SUSPENDED)." };

    // Update Sheet ID if provided and different
    if (clientSheetId && found.sheetId !== clientSheetId) {
        sheet.getRange(foundRow, 7).setValue(clientSheetId);
    }

    const now = new Date();
    let expDate = new Date(found.expires);

    if (now > expDate) {
        sheet.getRange(foundRow, 6).setValue("EXPIRED");
        return { valid: false, message: "Masa aktif lisensi telah habis." };
    }

    return {
        valid: true,
        message: "Lisensi Aktif",
        plan: found.plan,
        client: found.client,
        sheet_id: found.sheetId, // Return Sheet ID for Auto-Config
        expires: Utilities.formatDate(expDate, TIMEZONE, "dd MMM yyyy HH:mm"),
        expires_iso: Utilities.formatDate(expDate, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss")
    };
}

// AUTO CLEANUP (Set in Trigger)
function cleanupExpiredLicenses() {
    const ss = SpreadsheetApp.getActiveSpreadsheet(); 
    const sheet = getOrInsertSheet(ss, SHEET_NAMES.LICENSES, HEADERS.LICENSES);
    const data = sheet.getDataRange().getValues();
    const now = new Date();

    for (let i = 1; i < data.length; i++) {
        const status = data[i][5];
        const expiryStr = data[i][4];

        if (status === 'ACTIVE' && expiryStr) {
            const expDate = new Date(expiryStr);
            if (now > expDate) {
                sheet.getRange(i + 1, 6).setValue("EXPIRED");
                Logger.log(`License ${data[i][0]} expired at ${expiryStr}. Status updated.`);
            }
        }
    }
}

// ==========================================
// [BARU] FITUR DIRECTORY / ALIAS (LINK PENDEK)
// ==========================================

function resolveClinicAlias(alias) {
  if (!alias) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Alias kosong' })).setMimeType(ContentService.MimeType.JSON);

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Licenses');
  const data = sheet.getDataRange().getValues();
  
  // Mencari Alias di Kolom G (Index 6)
  const row = data.find(r => r[6] && String(r[6]).toLowerCase() === String(alias).toLowerCase());

  if (row) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'success', 
      sheet_id: row[7] // Mengembalikan ID Sheet dari Kolom H (Index 7)
    })).setMimeType(ContentService.MimeType.JSON);
  } else {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Klinik tidak ditemukan' })).setMimeType(ContentService.MimeType.JSON);
  }
}

function registerClinicAlias(licenseKey, alias, sheetId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Licenses');
  const data = sheet.getDataRange().getValues();
  
  // Cari baris berdasarkan License Key (Kolom A / Index 0)
  const rowIndex = data.findIndex(r => String(r[0]) === String(licenseKey));

  if (rowIndex > -1) {
    // Simpan Alias ke Kolom G (Index 6) & Sheet ID ke Kolom H (Index 7)
    sheet.getRange(rowIndex + 1, 7).setValue(alias);   
    sheet.getRange(rowIndex + 1, 8).setValue(sheetId); 
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Data Klinik Berhasil Disambungkan!' })).setMimeType(ContentService.MimeType.JSON);
  } else {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Lisensi Tidak Valid' })).setMimeType(ContentService.MimeType.JSON);
  }
}
