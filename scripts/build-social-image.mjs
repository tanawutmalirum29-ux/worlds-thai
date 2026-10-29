import sharp from 'sharp';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const src=fileURLToPath(new URL('../public/share-card.svg',import.meta.url));
const dest=fileURLToPath(new URL('../public/share-card.png',import.meta.url));
// SVG keeps the cover editable in Git, while browsers and social crawlers receive PNG.
await sharp(src,{density:96})
  .resize(1200,630)
  .png({palette:true,colours:256,effort:8})
  .toFile(dest);
const info=await sharp(dest).metadata();
if(info.width!==1200 || info.height!==630 || info.format!=='png'){
  throw new Error('Invalid social image dimensions or format');
}
if((await stat(dest)).size<10000){
  throw new Error('Social image unexpectedly small; inspect rasterization');
}
console.log(`Generated 1200×630 social preview: ${dest}`);
