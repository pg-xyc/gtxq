// Helmet findings retain review status; the legal basis is editable and does not imply confirmation.
export function draftHelmetNotice({count,area='',review='待复核'}={}){
 if(!Number.isInteger(count)||count<1)return null;
 const place=String(area).trim().replace(/[\r\n]/g,'').slice(0,8);
 const description=`${place?place+'：':''}发现${count}个${review==='确认问题'?'':'疑似'}未带安全帽目标。`;
 return {description:description.slice(0,42),basis:'《中华人民共和国安全生产法》第四十五条、第五十七条：配备符合标准的劳动防护用品，监督并正确佩戴、使用。',measure:'督促相关作业人员正确佩戴安全帽，现场复核并提交整改后照片。'};
}
