document.addEventListener('DOMContentLoaded', () => {
  // 0. Datos iniciales
  const defaultRecords = [];

  // 1. Límites
  const limites = { ambiente:{min:15,max:30}, refrigeracion:{min:2,max:8}, humedad:{min:40,max:80} };
  const STORAGE_KEY = 'registrosTempHum_SENA';
  const registros = [];

  // 2. DOM refs
  const tbodyMap = { ambiente:document.getElementById('tbodyAmbiente'), refrigeracion:document.getElementById('tbodyRefrigeracion'), humedad:document.getElementById('tbodyHumedad') };
  const form=document.getElementById('registroForm'), fechaInput=document.getElementById('fechaReg'), horaInput=document.getElementById('horaReg');
  const bulkInput=document.getElementById('bulkFileInput'), bulkBtn=document.getElementById('bulkUploadBtn'), clearBtn=document.getElementById('clearDataBtn'), monthSelect=document.getElementById('monthSelect');

  // 3. Utils
  const generateId = () => Date.now()+'_'+Math.random().toString(36).substr(2,9);
  const saveStorage = () => localStorage.setItem(STORAGE_KEY,JSON.stringify(registros));
  const loadStorage = ()=>{try{const d=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); if(Array.isArray(d)) registros.push(...d);}catch{} };

  // 4. Charts
  function creaChart(ctx){return new Chart(ctx,{type:'line',data:{labels:[],datasets:[{label:'Actual',borderColor:'#0c702f',borderWidth:2,tension:.2,data:[],pointRadius:4,pointBackgroundColor:[],pointBorderColor:[]},{label:'Mín.',borderColor:'#d00',borderWidth:1,borderDash:[4,4],data:[],fill:false,tension:.2},{label:'Máx.',borderColor:'#0066ff',borderWidth:1,borderDash:[4,4],data:[],fill:'-1',backgroundColor:'rgba(200,200,200,.2)',tension:.2}]} ,options:{responsive:true,scales:{y:{beginAtZero:false}}}});}
  const chartMap={ambiente:creaChart(document.getElementById('chartAmbiente').getContext('2d')),refrigeracion:creaChart(document.getElementById('chartRefrigeracion').getContext('2d')),humedad:creaChart(document.getElementById('chartHumedad').getContext('2d'))};

  // 5. Fila HTML
  function filaHTML(r){const lim=limites[r.sensor],val=parseFloat(r.valor),minVal=r.min!=null?parseFloat(r.min):null,maxVal=r.max!=null?parseFloat(r.max):null,fuera=v=>(v<lim.min||v>lim.max);const tr=document.createElement('tr');if(fuera(val)||(minVal!=null&&fuera(minVal))||(maxVal!=null&&fuera(maxVal)))tr.classList.add('alert');let html=`<td>${r.fecha}</td><td>${r.hora}</td><td>${r.zona}</td>`;if(r.sensor==='humedad'){html+=`<td class="${fuera(val)?'outVal':''}">${r.valor}%</td><td>${r.resp}</td><td>${r.obs}</td>`;}else{html+=`<td class="${fuera(val)?'outVal':''}">${r.valor}</td><td class="${minVal!=null&&fuera(minVal)?'outVal':''}">${r.min??''}</td><td class="${maxVal!=null&&fuera(maxVal)?'outVal':''}">${r.max??''}</td><td>${r.resp}</td><td>${r.obs}</td>`;}html+=`<td><button class="btn-edit" data-id="${r.id}">Editar</button></td>`;tr.innerHTML=html;tr.querySelector('.btn-edit').addEventListener('click',()=>{const key=prompt('Ingrese clave para editar:');if(key!=='SENA')return alert('Clave incorrecta.');const newVal=prompt('Nuevo valor actual:',r.valor);if(newVal!==null&&!isNaN(parseFloat(newVal)))r.valor=parseFloat(newVal);if(r.sensor!=='humedad'){const newMin=prompt('Nuevo valor mínimo:',r.min??'');if(newMin!==null&&!isNaN(parseFloat(newMin)))r.min=parseFloat(newMin);const newMax=prompt('Nuevo valor máximo:',r.max??'');if(newMax!==null&&!isNaN(parseFloat(newMax)))r.max=parseFloat(newMax);}saveStorage();['ambiente','refrigeracion','humedad'].forEach(refreshSensor);});return tr;}

  // 6. Refresh
  function refreshSensor(sensor){const tableData=registros.filter(r=>r.sensor===sensor).sort((a,b)=>new Date(b.fecha+'T'+b.hora)-new Date(a.fecha+'T'+a.hora));const tbody=tbodyMap[sensor];tbody.innerHTML='';tableData.forEach(r=>tbody.appendChild(filaHTML(r)));const sel=monthSelect.value;const chartData=registros.filter(r=>r.sensor===sensor).filter(r=>sel==='all'||r.fecha.startsWith(sel)).sort((a,b)=>new Date(a.fecha+'T'+a.hora)-new Date(b.fecha+'T'+b.hora));const chart=chartMap[sensor];chart.data.labels=chartData.map(r=>`${r.fecha} ${r.hora}`);chart.data.datasets[0].data=chartData.map(r=>r.valor);chart.data.datasets[1].data=chartData.map(r=>r.min);chart.data.datasets[2].data=chartData.map(r=>r.max);const lim=limites[sensor];chart.data.datasets[0].pointBackgroundColor=chart.data.datasets[0].pointBorderColor=chartData.map(r=>(r.valor<lim.min||r.valor>lim.max)?'red':'#0c702f');chart.update();}

  // 7. Añadir
  function addRegistro(r){registros.push(r);saveStorage();['ambiente','refrigeracion','humedad'].forEach(refreshSensor);}

  // 8. Inicial
  loadStorage();if(registros.length===0&&defaultRecords.length>0){registros.push(...defaultRecords);saveStorage();}['ambiente','refrigeracion','humedad'].forEach(refreshSensor);

  // 9. Fecha/hora
  const setFechaHora=()=>{const now=new Date();fechaInput.value=now.toISOString().split('T')[0];horaInput.value=now.toTimeString().slice(0,5);};setFechaHora();

  // 10. Submit
  form.addEventListener('submit',e=>{e.preventDefault();const now=new Date();addRegistro({id:generateId(),fecha:now.toISOString().split('T')[0],hora:now.toTimeString().slice(0,5),zona:'Farmacia',sensor:form.sensor.value,valor:parseFloat(form.valor.value),min:form.valorMin.value?parseFloat(form.valorMin.value):null,max:form.valorMax.value?parseFloat(form.valorMax.value):null,resp:form.responsable.value.trim(),obs:form.obs.value.trim()});form.reset();setFechaHora();});

  // 11. Borrar
  clearBtn.addEventListener('click',()=>{const k=prompt('Clave para borrar todo:');if(k==='SENA'&&confirm('¿Borrar TODOS los registros?')){registros.length=0;localStorage.removeItem(STORAGE_KEY);['ambiente','refrigeracion','humedad'].forEach(refreshSensor);}else if(k!=='SENA'){alert('Clave incorrecta.');}});

  // 12. Bulk CSV
  bulkBtn.addEventListener('click',()=>{const k=prompt('Clave para carga masiva:');if(k!=='SENA')return alert('Clave incorrecta.');const file=bulkInput.files[0];if(!file)return alert('Selecciona un archivo CSV.');const reader=new FileReader();reader.onload=e=>{const text=e.target.result.replace(/\r\n/g,'\n');const lines=text.split('\n').filter(l=>l.trim());let start=(/fecha.*hora/i.test(lines[0]))?1:0;const sep=lines[0].includes(';')?';':',';for(let i=start;i<lines.length;i++){const cols=lines[i].split(sep).map(c=>c.trim());if(cols.length<8)continue;const [fecha,hora,zona,sensor,valor,min,max,resp,obs='']=cols;addRegistro({id:generateId(),fecha,hora,zona,sensor,valor:parseFloat(valor),min:min?parseFloat(min):null,max:max?parseFloat(max):null,resp,obs});}alert('Carga masiva completada.');};reader.readAsText(file);});

  // 13. Filtrar mes
  monthSelect.addEventListener('change',()=>{['ambiente','refrigeracion','humedad'].forEach(refreshSensor);});
});