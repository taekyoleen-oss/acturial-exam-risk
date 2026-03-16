const pdfParse = require('pdf-parse/lib/pdf-parse.js');
const fs = require('fs');

async function main() {
  for (const f of [
    '2018년_41회_2차시험_계리리스크관리.pdf',
    '2019년_42회_2차시험_계리리스크관리.pdf',
    '2020년_43회_2차시험_계리리스크관리.pdf',
  ]) {
    const buf = fs.readFileSync(`input-pdf/${f}`);
    const data = await pdfParse(buf);
    console.log(`\n=== ${f} ===`);
    console.log('페이지:', data.numpages, '/ 텍스트 길이:', data.text.length);
    console.log('앞 500자:', data.text.slice(0, 500));
  }
}
main().catch(console.error);
