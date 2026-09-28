// Browser-side XLSX export: patch the owner's template rather than rebuilding its styles.
export const xmlEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function cell(xml,ref,value){const re=new RegExp('<c\\b[^>]*\\br="'+ref+'"[^>]*?(?:/>|>[\\s\\S]*?</c>)');const original=xml.match(re)?.[0];if(!original)throw Error('模板缺少字段 '+ref);const style=original.match(/\bs="(\d+)"/)?.[1];return xml.replace(re,()=>`<c r="${ref}"${style?' s="'+style+'"':''} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`);}
export async function normalizeZipInput(input){
 if(input&&typeof input.arrayBuffer==='function')input=await input.arrayBuffer();
 if(Object.prototype.toString.call(input)==='[object ArrayBuffer]')return new Uint8Array(new Uint8Array(input));
 if(ArrayBuffer.isView(input))return new Uint8Array(new Uint8Array(input.buffer,input.byteOffset,input.byteLength));
 if(typeof input==='string')return input;
 throw Error('模板数据类型不正确，请重新打开网页');
}
function sharedText(xml,index){const item=[...xml.matchAll(/<si(?:\s[^>]*)?>[\s\S]*?<\/si>/g)][index]?.[0];if(!item)throw Error('模板固定文字缺失');return item;}
function richCell(xml,ref,content){const re=new RegExp('<c\\b[^>]*\\br="'+ref+'"[^>]*?(?:/>|>[\\s\\S]*?</c>)');const original=xml.match(re)?.[0];if(!original)throw Error('模板缺少字段 '+ref);const style=original.match(/\bs="(\d+)"/)?.[1];return xml.replace(re,()=>`<c r="${ref}"${style?' s="'+style+'"':''} t="inlineStr"><is>${content.replace(/^<si[^>]*>|<\/si>$/g,'')}</is></c>`);}
async function buildNoticePage(template,values,issues,Zip){
 const slots=issues.length,offset=(slots-2)*2,footer=10+offset;const heights={};
 const zip=await Zip.loadAsync(await normalizeZipInput(template));let sheet=await zip.file('xl/worksheets/sheet1.xml').async('string');

 if(offset){
  const rows=[...sheet.matchAll(/<row\b[^>]*>[\s\S]*?<\/row>/g)].map(m=>m[0]);
  const move=(xml,delta)=>xml.replace(/\br="([A-Z]*)(\d+)"/g,(_,col,r)=>`r="${col}${+r+delta}"`);
  const expanded=rows.slice(0,7);for(let i=1;i<slots;i++)expanded.push(move(rows[7],(i-1)*2),move(rows[8],(i-1)*2));expanded.push(...rows.slice(9).map(r=>move(r,offset)));
  sheet=sheet.replace(/<sheetData>[\s\S]*?<\/sheetData>/,'<sheetData>'+expanded.join('')+'</sheetData>');
  const refs=[...sheet.matchAll(/<mergeCell ref="([^"]+)"\/>/g)].map(m=>m[1]).filter(r=>!/^([AD][6789]):/.test(r)).map(r=>r.replace(/([A-Z]+)(\d+)/g,(_,c,n)=>c+(+n>=10?+n+offset:n)));
  for(let i=0;i<slots;i++){const r=6+i*2;refs.push(`A${r}:C${r+1}`,`D${r}:E${r}`,`D${r+1}:E${r+1}`);}
  sheet=sheet.replace(/<mergeCells[\s\S]*?<\/mergeCells>/,`<mergeCells count="${refs.length}">${refs.map(ref=>'<mergeCell ref="'+ref+'"/>').join('')}</mergeCells>`).replace(/<dimension ref="[^"]+"\/>/,`<dimension ref="A1:E${13+offset}"/>`);
 }
 const shared=await zip.file('xl/sharedStrings.xml').async('string');
 const fields={B3:values.company,B4:values.project,E3:values.area};
 for(const [ref,value] of Object.entries(fields))sheet=cell(sheet,ref,value);
 // Preserve all template text, rich-text runs and spacing outside designated placeholders.
 if(values.number)sheet=richCell(sheet,'A2',sharedText(shared,1).replace(/(?<=\[)[ ]+(?=\])/g,()=>xmlEscape(values.number)));
 if(values.subject)sheet=richCell(sheet,'A5',sharedText(shared,12).replace('xx',()=>xmlEscape(values.subject)));
 if(values.issuer||values.date){let signature=sharedText(shared,9);if(values.issuer)signature=signature.replace('签发人：',()=> '签发人：'+xmlEscape(values.issuer));if(values.date){const date=values.date.split('-');signature=signature.replace(/年[ ]+月[ ]+日/,()=>`${date[0]}年${date[1]}月${date[2]}日`);}sheet=richCell(sheet,'E'+(footer+1),signature);}
 if(values.deadline){const parts=values.deadline.split('-');if(parts.length!==3)throw Error('整改期限无效');let run=0,content=sharedText(shared,5);content=content.replace(/<r>[\s\S]*?<\/r>/g,r=>{const i=run++;if([11,13,15].includes(i))return r.replace(/(<t[^>]*>)[\s\S]*?(<\/t>)/,(_,open,close)=>open+xmlEscape(parts[[11,13,15].indexOf(i)])+close);return r;});sheet=richCell(sheet,'A'+footer,content);}
 for(let i=0;i<slots;i++){const issue=issues[i],r=6+i*2;
  if(issue&&(issue.description.length>42||issue.measure.length>52||(issue.basis||'').length>240))throw Error('问题描述限42字、整改措施限52字、规定依据限240字');
  // Keep original problem-heading punctuation and all image placeholders.
  const heading=`问题${i+1}：\n`+(issue?.company?'责任单位：'+issue.company+'\n':''),problemText=heading+(issue?.description||'')+(issue?.basis?'\n规定依据：'+issue.basis:'');sheet=cell(sheet,'D'+r,problemText);sheet=cell(sheet,'A'+r,'现场图片'+(i+1));heights[r]=Math.max(i===0?86:60,problemText.split('\n').reduce((rows,line)=>rows+Math.max(1,Math.ceil(line.length/20)),0)*15+8);heights[r+1]=i===0?104:73;
  sheet=cell(sheet,'D'+(r+1),'整改措施：\n'+(issue?.measure||''));
 }
 // Expand only the clipped owner-template footer; preserve fonts, columns and fixed text.
 for(const [r,height] of [[3,Math.max(67,Math.ceil(String(values.company||'').length/16)*16+8)],[footer,155],[footer+1,60],[footer+2,60],[footer+3,60],...Object.entries(heights)])sheet=sheet.replace(new RegExp('<row\\b([^>]*\\br="'+r+'"[^>]*)>'),(_,attrs)=>'<row'+attrs.replace(/\s(?:ht|customHeight)="[^"]*"/g,'')+` ht="${height}" customHeight="1">`);
 const drawing=[],rels=[];let id=0;
 for(let i=0;i<issues.length;i++){const picture=issues[i].image;if(!picture)continue;if(!/^data:image\/(png|jpeg);base64,/.test(picture.dataUrl))throw Error('请使用 JPG 或 PNG 照片');
  id++;const ext=picture.dataUrl.startsWith('data:image/png')?'png':'jpeg';zip.file(`xl/media/notice${id}.${ext}`,picture.dataUrl.split(',')[1],{base64:true});
  const height=(heights[6+i*2]+heights[7+i*2])*4/3-12,width=315,ratio=Math.min(width/picture.width,height/picture.height),w=Math.round(picture.width*ratio*9525),h=Math.round(picture.height*ratio*9525);
  if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)throw Error('照片尺寸无效');
  const x=Math.round((6+(width-w/9525)/2)*9525),y=Math.round((6+(height-h/9525)/2)*9525);
  drawing.push(`<xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>${x}</xdr:colOff><xdr:row>${5+i*2}</xdr:row><xdr:rowOff>${y}</xdr:rowOff></xdr:from><xdr:ext cx="${w}" cy="${h}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${id}" name="现场图片${i+1}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${id}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`);
  rels.push(`<Relationship Id="rId${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/notice${id}.${ext}"/>`);
 }
 if(drawing.length){const ns='http://schemas.openxmlformats.org/officeDocument/2006/relationships';sheet=sheet.replace('</worksheet>',`<drawing xmlns:r="${ns}" r:id="rIdNotice"/></worksheet>`);
 zip.file('xl/worksheets/_rels/sheet1.xml.rels',`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdNotice" Type="${ns}/drawing" Target="../drawings/notice.xml"/></Relationships>`);
 zip.file('xl/drawings/notice.xml',`<?xml version="1.0" encoding="UTF-8"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${ns}">${drawing.join('')}</xdr:wsDr>`);
 zip.file('xl/drawings/_rels/notice.xml.rels',`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join('')}</Relationships>`);
 let types=await zip.file('[Content_Types].xml').async('string');for(const [ext,mime] of [['png','image/png'],['jpeg','image/jpeg']])if(!types.includes(`Extension="${ext}"`))types=types.replace('</Types>',`<Default Extension="${ext}" ContentType="${mime}"/></Types>`);types=types.replace('</Types>','<Override PartName="/xl/drawings/notice.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>');zip.file('[Content_Types].xml',types);
 }
 zip.file('xl/worksheets/sheet1.xml',sheet);
 return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
}

export async function buildNotice(template,values,issues,Zip){
 if(!issues.length)throw Error('请添加至少一个问题');if(issues.length>200)throw Error('每次最多200个问题，请分批处理');
 const prepared=issues.map(issue=>({...issue,company:String(issue.company||values.company||'').trim()}));if(prepared.some(i=>!i.company))throw Error('请填写责任单位');
 const companies=[...new Set(prepared.flatMap(i=>i.company.split(/[,，、;；\n]+/).map(x=>x.trim()).filter(Boolean)))];
 return buildNoticePage(template,{...values,company:companies.join('，')},prepared,Zip);
}
