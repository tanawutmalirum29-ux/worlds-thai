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

import { writeFile } from 'node:fs/promises';

// Browser tabs, iOS home screens and installed apps need real PNG/ICO assets:
// SVG-only favicon support is inconsistent across browsers and icon surfaces.
const iconSource=fileURLToPath(new URL('../public/favicon.svg',import.meta.url));
const iconOutput=(name)=>fileURLToPath(new URL(`../public/${name}`,import.meta.url));
for (const [size,filename] of [
  [16,'favicon-16.png'],
  [32,'favicon-32.png'],
  [180,'apple-touch-icon.png'],
  [192,'icon-192.png'],
  [512,'icon-512.png']
]) {
  await sharp(iconSource).resize(size,size).png({compressionLevel:9}).toFile(iconOutput(filename));
  const {format,width,height}=await sharp(iconOutput(filename)).metadata();
  if(format!=='png'||width!==size||height!==size) throw new Error(`Invalid icon: ${filename}`);
}

// A true Windows ICO file containing PNG 16px, 32px and 48px subimages.
// Do not write an SVG or PNG and merely rename its extension to .ico.
const icoSizes=[16,32,48];
const icoImages=await Promise.all(icoSizes.map(size=>
  sharp(iconSource).resize(size,size).png().toBuffer()));
const directory=Buffer.alloc(6+icoSizes.length*16);
directory.writeUInt16LE(0,0);
directory.writeUInt16LE(1,2);
directory.writeUInt16LE(icoSizes.length,4);
let offset=directory.length;
icoImages.forEach((data,i)=>{
  const at=6+i*16;
  directory.writeUInt8(icoSizes[i],at);
  directory.writeUInt8(icoSizes[i],at+1);
  directory.writeUInt16LE(1,at+4);
  directory.writeUInt16LE(32,at+6);
  directory.writeUInt32LE(data.length,at+8);
  directory.writeUInt32LE(offset,at+12);
  offset+=data.length;
});
await writeFile(iconOutput('favicon.ico'),Buffer.concat([directory,...icoImages]));
console.log('Generated PNG/ICO browser icons, Apple touch icon and installable app icons');
