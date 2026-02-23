// ===================================
//  SAAS MASTER BACKEND (FILE UTUH)
// ===================================

function doGet(e) {
  var params = e.parameter;
  var action = params.action;

  if (action === 'getConfig') {
    return handleBookingConfig(params.id);
  } 
  else if (action === 'checkLicense') {
    return handleLicenseCheck(params.key);
  }
  
  return sendJSON({
    status: 'Running',
    message: 'SaaS Master Server is Online',
    available_actions: ['getConfig', 'checkLicense']
  });
}

// --- BOOKING LOGIC ---

function handleBookingConfig(clinicSlug) {
  if (!clinicSlug) return sendError('ID Klinik tidak boleh kosong.');

  try {
    var db = getSheetData('Clinics'); 
    var clinic = null;
    for (var i = 0; i < db.length; i++) {
        if (db[i][0] == clinicSlug) {
            clinic = db[i];
            break;
        }
    }
    
    if (clinic) {
      return sendJSON({
        status: 'success',
        config: {
          id: clinic[0],
          name: clinic[1],
          sheetId: clinic[2],
          apiUrl: clinic[3]
        }
      });
    } else {
      return sendError('Klinik dengan ID "' + clinicSlug + '" tidak ditemukan.');
    }
  } catch (err) {
    return sendError('Database Error: ' + err.message);
  }
}

// --- LICENSE LOGIC (DIPERBAIKI) ---

function handleLicenseCheck(licenseKey) {
  if (!licenseKey) return sendError('License Key tidak boleh kosong.');

  try {
    var db = getSheetData('Licenses');
    // Struktur di Google Sheet Anda (Tab Licenses):
    // Col A [0] : Key
    // Col B [1] : Plan Name
    // Col C [2] : Client Name
    // Col D [3] : Created At
    // Col E [4] : Expires At
    // Col F [5] : Status

    var license = null;
    for (var i = 0; i < db.length; i++) {
        // [0] key
        if (db[i][0] == licenseKey) {
            license = db[i];
            break;
        }
    }
    
    if (license) {
      var status = license[5]; // AMBIL DARI KOLOM F (Index 5)
      
      if (status === 'ACTIVE') {
        return sendJSON({
          status: 'valid',
          client: license[2],  // Nama Client (Kolom C / Index 2)
          expired: license[4]  // Expired (Kolom E / Index 4)
        });
      } else {
        return sendJSON({
          status: 'expired',
          message: 'Masa berlaku lisensi habis.'
        });
      }
    } else {
      return sendJSON({
        status: 'invalid',
        message: 'Kunci lisensi tidak valid.'
      });
    }
  } catch (err) {
    return sendError('Database Error (License): ' + err.message);
  }
}

function getSheetData(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Tab Sheet '" + sheetName + "' tidak ditemukan.");
  
  var data = sheet.getDataRange().getValues();
  data.shift(); 
  return data;
}

function sendJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function sendError(message) {
  return sendJSON({
    status: 'error',
    message: message
  });
}
