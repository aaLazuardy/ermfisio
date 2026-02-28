const text = `☀️ JADWAL TERAPI HARI INI ☀️\n🗓️ Sabtu, 28 Februari 2026\n👥 Total: 1 Pasien\n\n1. 🏥 (Umum) BAMBANG  <a href="https://wa.me/628123456789?text=Hello%20A%26B">[Chat WA]</a>\n`;

let escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

escapedText = escapedText
    .replace(/&lt;a\s+href=(.*?)&gt;/gi, (match, p1) => `<a href=${p1}>`)
    .replace(/&lt;\/a&gt;/gi, '</a>')
    .replace(/&lt;b&gt;/gi, '<b>')
    .replace(/&lt;\/b&gt;/gi, '</b>')
    .replace(/&lt;i&gt;/gi, '<i>')
    .replace(/&lt;\/i&gt;/gi, '</i>');

console.log("Original: " + text);
console.log("Escaped:  " + escapedText);
