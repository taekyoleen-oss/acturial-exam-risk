const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const buf = fs.readFileSync('input-pdf/2018년_41회_2차시험_계리리스크관리.pdf');
const parser = new PDFParse();
parser.parse(buf).then(data => {
  console.log('페이지 수:', data.numpages);
  console.log('텍스트 앞 1000자:\n', data.text.slice(0, 1000));
}).catch(e => console.error(e.message));
