const parts=[];
for(let i=1;i<=91;i++){const u='./part-'+String(i).padStart(3,'0')+'.txt';const r=await fetch(u);if(!r.ok)throw new Error(u);parts.push(await r.text());}
import(URL.createObjectURL(new Blob([parts.join('')],{type:'text/javascript'})));
