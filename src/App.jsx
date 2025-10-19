import React from "react";

/* ===== Helpers de matrícula (ES) ===== */
function onlyAlnumUpper(s=""){ s = s.toUpperCase(); return s.replace(/[^A-Z0-9]/g,""); }
function normalizeMatricula(s=""){ return onlyAlnumUpper(s); }
function formatMatriculaLive(input=""){
  const s = onlyAlnumUpper(input);
  if (!s) return "";
  const startsWithDigit = /^[0-9]/.test(s);
  if (startsWithDigit) {
    // 1234 ABC
    let nums = "", letters = "";
    for (let ch of s) {
      if (/[0-9]/.test(ch) && nums.length < 4) nums += ch;
      else if (/[A-Z]/.test(ch) && letters.length < 3) letters += ch;
    }
    return letters ? `${nums} ${letters}` : nums;
  } else {
    // TF 1234 AB
    let pre="", num="", suf="";
    for (let ch of s) {
      if (/[A-Z]/.test(ch) && num.length===0 && pre.length<2) pre += ch;
      else if (/[0-9]/.test(ch) && num.length<4) num += ch;
      else if (/[A-Z]/.test(ch) && num.length===4 && suf.length<2) suf += ch;
    }
    return [pre, num, suf].filter(Boolean).join(" ");
  }
}
function isMatriculaValida(display=""){
  const s = normalizeMatricula(display);
  return /^[0-9]{4}[A-Z]{3}$/.test(s) || /^[A-Z]{1,2}[0-9]{4}[A-Z]{0,2}$/.test(s);
}

/* ===== Storage ===== */
const LS_KEY = "tallertrack_lite_v1";
function loadData(){
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || { clientes:[], tecnicos:[], vehiculos:[] };
  } catch { return { clientes:[], tecnicos:[], vehiculos:[] }; }
}
function saveData(data){ localStorage.setItem(LS_KEY, JSON.stringify(data)); }

/* ===== Modelos ===== */
const uuid = () => (crypto?.randomUUID?.() || String(Math.random()).slice(2) + Date.now());
const newClient = () => ({ id: uuid(), nombre:"", telefono:"", email:"" });
const newTech   = () => ({ id: uuid(), nombre:"", usuario:"", password:"" });
const newDiag   = (autor="") => ({ id: uuid(), fecha:new Date().toISOString(), autor, descripcion:"", acciones:"", presupuesto:"" });
const newVehicle = (clientId="") => ({
  id: uuid(),
  clienteId: clientId,
  tecnicoId: "",
  matricula: "",
  marca: "",
  modelo: "",
  anio: "",
  estado: "en_diagnostico",
  entrada: new Date().toISOString().slice(0,10),
  diagnosticos: [],
  tokenPublico: uuid().slice(0,8)
});

/* ===== UI mínima ===== */
const Box = ({children, style}) => <div style={{border:"1px solid #22314d", borderRadius:12, padding:12, background:"#111a2b", ...style}}>{children}</div>;
const Label = ({children}) => <div style={{fontSize:12, color:"#9bb0d3"}}>{children}</div>;
const Row = ({children, cols=2, gap=12}) => <div style={{display:"grid", gridTemplateColumns:`repeat(${cols}, 1fr)`, gap}}>{children}</div>;
const Button = ({children, ...p}) => <button {...p} style={{padding:"8px 12px", borderRadius:8, border:"1px solid #2b3a5a", background:"#0f172a", color:"#e8eefc", cursor:"pointer"}}>{children}</button>;
const Input = (p) => <input {...p} style={{padding:"8px 10px", borderRadius:8, border:"1px solid #2b3a5a", background:"#0f172a", color:"#e8eefc", width:"100%"}}/>;
const Textarea = (p) => <textarea {...p} style={{padding:"8px 10px", borderRadius:8, border:"1px solid #2b3a5a", background:"#0f172a", color:"#e8eefc", width:"100%", minHeight:80}}/>;

export default function App(){
  // ¿Vista pública?
  const params = new URLSearchParams(typeof window!=="undefined" ? window.location.search : "");
  const publicToken = params.get("view");

  const [data, setData] = React.useState(loadData());
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState(null);

  React.useEffect(()=> saveData(data), [data]);

  const vehiculoSel = data.vehiculos.find(v=>v.id===selectedId) || null;

  // -------- Vista Pública (solo lectura) --------
  if (publicToken) {
    const v = data.vehiculos.find(x=>x.tokenPublico===publicToken);
    const c = v ? data.clientes.find(y=>y.id===v.clienteId) : null;
    return (
      <div style={{minHeight:"100vh", background:"#0b1220", color:"#e8eefc", fontFamily:"system-ui"}}>
        <div style={{maxWidth:900, margin:"24px auto", padding:16}}>
          <h1 style={{marginBottom:12}}>Estado de tu vehículo</h1>
          {!v && <Box>No existe un vehículo asociado a este enlace.</Box>}
          {v && (
            <Box style={{display:"grid", gap:12}}>
              <Row cols={2}>
                <div><Label>Matrícula</Label><div style={{fontWeight:600}}>{v.matricula||"—"}</div></div>
                <div><Label>Modelo</Label><div style={{fontWeight:600}}>{v.marca} {v.modelo}</div></div>
                <div><Label>Entrada</Label><div style={{fontWeight:600}}>{v.entrada}</div></div>
                <div><Label>Estado</Label><div style={{fontWeight:600, border:"1px solid #2b3a5a", display:"inline-block", padding:"2px 8px", borderRadius:999}}>{mapEstado(v.estado)}</div></div>
              </Row>
              <div>
                <h3>Actualizaciones</h3>
                {v.diagnosticos.length===0 && <div style={{fontSize:14, color:"#9bb0d3"}}>Aún no hay entradas.</div>}
                {v.diagnosticos.slice().reverse().map(d=>(
                  <Box key={d.id} style={{marginTop:8}}>
                    <div style={{display:"flex", justifyContent:"space-between"}}>
                      <div style={{fontWeight:600}}>{new Date(d.fecha).toLocaleString()}</div>
                      <div style={{border:"1px solid #2b3a5a", padding:"2px 8px", borderRadius:999, fontSize:12}}>{d.autor||"Técnico"}</div>
                    </div>
                    {d.descripcion && <div style={{marginTop:8, whiteSpace:"pre-wrap"}}>{d.descripcion}</div>}
                    {d.acciones && <div style={{marginTop:8}}><b>Acciones:</b> <span style={{whiteSpace:"pre-wrap"}}>{d.acciones}</span></div>}
                    {d.presupuesto && <div style={{marginTop:8}}><b>Presupuesto:</b> {d.presupuesto}</div>}
                  </Box>
                ))}
              </div>
              <div>
                <h3>Contacto del taller</h3>
                {c ? (
                  <Row cols={2}>
                    <div><Label>Nombre</Label><div style={{fontWeight:600}}>{c.nombre||"—"}</div></div>
                    <div><Label>Teléfono</Label><div style={{fontWeight:600}}>{c.telefono||"—"}</div></div>
                    <div style={{gridColumn:"1 / -1"}}><Label>Email</Label><div style={{fontWeight:600}}>{c.email||"—"}</div></div>
                  </Row>
                ): <div style={{fontSize:14, color:"#9bb0d3"}}>Sin datos de contacto.</div>}
              </div>
            </Box>
          )}
        </div>
      </div>
    );
  }

  // -------- Vista Taller --------
  const list = data.vehiculos.filter(v=>{
    if (v.estado==="entregado") return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [v.matricula, v.marca, v.modelo].some(x=> (x||"").toLowerCase().includes(q));
  });

  function upsertVehicle(v){
    setData(prev=>{
      const exists = prev.vehiculos.some(x=>x.id===v.id);
      const vehiculos = exists ? prev.vehiculos.map(x=> x.id===v.id ? v : x) : [v, ...prev.vehiculos];
      return {...prev, vehiculos};
    });
  }
  function upsertClient(c){
    setData(prev=>{
      const exists = prev.clientes.some(x=>x.id===c.id);
      const clientes = exists ? prev.clientes.map(x=> x.id===c.id ? c : x) : [c, ...prev.clientes];
      return {...prev, clientes};
    });
  }
  function deleteVehicle(id){
    setData(prev=> ({...prev, vehiculos: prev.vehiculos.filter(v=>v.id!==id)}));
    if (selectedId===id) setSelectedId(null);
  }
  function addDiagnosis(vehicleId){
    const autor = "Técnico";
    setData(prev=> ({
      ...prev,
      vehiculos: prev.vehiculos.map(v=> v.id===vehicleId ? {...v, diagnosticos:[...v.diagnosticos, newDiag(autor)]} : v)
    }));
  }
  function updateDiag(vehicleId, diagId, patch){
    setData(prev=> ({
      ...prev,
      vehiculos: prev.vehiculos.map(v=> v.id===vehicleId ? {
        ...v, diagnosticos: v.diagnosticos.map(d=> d.id===diagId ? {...d, ...patch} : d)
      } : v)
    }));
  }

  // Seed demo si está vacío
  React.useEffect(()=>{
    if (data.clientes.length===0 && data.vehiculos.length===0){
      const c = {...newClient(), nombre:"María Pérez", telefono:"600123123", email:"maria@example.com"};
      const v = {...newVehicle(c.id), matricula:"1234 ABC", marca:"Hyundai", modelo:"i20 1.0 T-GDI", anio:"2024"};
      v.diagnosticos.push({...newDiag("Aaron (demo)"), descripcion:"Revisión 30.000 km. Ruidos en eje trasero.", acciones:"Inspección y apriete.", presupuesto:"150€ aprox"});
      setData({clientes:[c], vehiculos:[v], tecnicos:[{...newTech(), nombre:"Aaron (demo)", usuario:"aaron", password:"demo"}]});
    }
    // eslint-disable-next-line
  },[]);

  function copyPublicLink(v){
    const url = `${location.origin}${location.pathname}?view=${v.tokenPublico}`;
    navigator.clipboard.writeText(url);
    alert("Enlace copiado");
  }

  return (
    <div style={{minHeight:"100vh", background:"#0b1220", color:"#e8eefc", fontFamily:"system-ui"}}>
      <div style={{maxWidth:1100, margin:"24px auto", padding:16}}>
        <h1 style={{marginBottom:12}}>TallerTrack (lite)</h1>

        <Row cols={3} gap={8}>
          <Input placeholder="Buscar matrícula / modelo" value={search} onChange={e=>setSearch(e.target.value)} />
          <Button onClick={()=>{ const v = newVehicle(); upsertVehicle(v); setSelectedId(v.id); }}>Nuevo vehículo</Button>
          <Button onClick={()=>{ const c = newClient(); upsertClient(c); alert("Cliente creado (rellena en la ficha)"); }}>Nuevo cliente</Button>
        </Row>

        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginTop:12}}>
          {list.map(v=>(
            <Box key={v.id} style={{cursor:"pointer"}} onClick={()=>setSelectedId(v.id)}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <div style={{fontWeight:700}}>{v.matricula || "Sin matrícula"}</div>
                <div style={{border:"1px solid #2b3a5a", padding:"2px 8px", borderRadius:999, fontSize:12}}>{mapEstado(v.estado)}</div>
              </div>
              <div style={{color:"#9bb0d3", fontSize:14, marginTop:4}}>{v.marca} {v.modelo} • {v.anio||"—"}</div>
              <div style={{marginTop:8, display:"flex", gap:8}}>
                <Button onClick={(e)=>{e.stopPropagation(); copyPublicLink(v);}}>Enlace cliente</Button>
                <Button onClick={(e)=>{e.stopPropagation(); deleteVehicle(v.id);}}>Borrar</Button>
              </div>
            </Box>
          ))}
        </div>

        {vehiculoSel && (
          <Box style={{marginTop:16}}>
            <h3>Ficha de vehículo</h3>
            <Row cols={4} gap={8}>
              <div style={{gridColumn:"span 2"}}>
                <Label>Matrícula</Label>
                <Input
                  placeholder="1234 ABC o TF 1234 AB"
                  value={vehiculoSel.matricula}
                  onChange={e=>{
                    const formatted = formatMatriculaLive(e.target.value);
                    let v = {...vehiculoSel, matricula: formatted};
                    // autocompletar si existe
                    const ex = data.vehiculos.find(x=> normalizeMatricula(x.matricula)===normalizeMatricula(formatted));
                    if (ex && ex.id!==vehiculoSel.id){
                      if (!v.clienteId) v.clienteId = ex.clienteId;
                      if (!v.marca) v.marca = ex.marca;
                      if (!v.modelo) v.modelo = ex.modelo;
                      if (!v.anio) v.anio = ex.anio;
                    }
                    upsertVehicle(v);
                  }}
                />
                {vehiculoSel.matricula && !isMatriculaValida(vehiculoSel.matricula) && (
                  <div style={{color:"#ff9b9b", fontSize:12, marginTop:4}}>Formato no válido</div>
                )}
              </div>
              <div>
                <Label>Marca</Label>
                <Input value={vehiculoSel.marca} onChange={e=>upsertVehicle({...vehiculoSel, marca:e.target.value})}/>
              </div>
              <div>
                <Label>Modelo</Label>
                <Input value={vehiculoSel.modelo} onChange={e=>upsertVehicle({...vehiculoSel, modelo:e.target.value})}/>
              </div>
              <div>
                <Label>Año</Label>
                <Input value={vehiculoSel.anio} onChange={e=>upsertVehicle({...vehiculoSel, anio:e.target.value})}/>
              </div>
              <div>
                <Label>Estado</Label>
                <select
                  value={vehiculoSel.estado}
                  onChange={e=>upsertVehicle({...vehiculoSel, estado: e.target.value})}
                  style={{padding:"8px 10px", borderRadius:8, border:"1px solid #2b3a5a", background:"#0f172a", color:"#e8eefc", width:"100%"}}
                >
                  <option value="en_diagnostico">En diagnóstico</option>
                  <option value="en_progreso">En progreso</option>
                  <option value="esperando_piezas">Esperando piezas</option>
                  <option value="listo">Listo para entregar</option>
                  <option value="entregado">Entregado (archivado)</option>
                </select>
              </div>
              <div>
                <Label>Fecha de entrada</Label>
                <Input value={vehiculoSel.entrada} onChange={e=>upsertVehicle({...vehiculoSel, entrada:e.target.value})}/>
              </div>
            </Row>

            <Row cols={2} gap={12} style={{marginTop:12}}>
              <Box>
                <h4>Cliente</h4>
                <select
                  value={vehiculoSel.clienteId || ""}
                  onChange={e=>upsertVehicle({...vehiculoSel, clienteId: e.target.value})}
                  style={{padding:"8px 10px", borderRadius:8, border:"1px solid #2b3a5a", background:"#0f172a", color:"#e8eefc", width:"100%"}}
                >
                  <option value="">Sin asignar</option>
                  {data.clientes.map(c=> <option key={c.id} value={c.id}>{c.nombre} — {c.telefono}</option>)}
                </select>
                {!vehiculoSel.clienteId && (
                  <div style={{marginTop:8}}>
                    <h5>Crear cliente rápido</h5>
                    <QuickClient onCreate={(c)=>{ upsertClient(c); upsertVehicle({...vehiculoSel, clienteId:c.id}); }}/>
                  </div>
                )}
              </Box>

              <Box>
                <h4>Enlace público</h4>
                <Input readOnly value={`${location.origin}${location.pathname}?view=${vehiculoSel.tokenPublico}`} />
                <div style={{marginTop:8}}>
                  <Button onClick={()=>copyPublicLink(vehiculoSel)}>Copiar enlace</Button>
                </div>
              </Box>
            </Row>

            <div style={{marginTop:12}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <h4>Diagnósticos</h4>
                <Button onClick={()=>addDiagnosis(vehiculoSel.id)}>Añadir entrada</Button>
              </div>
              {vehiculoSel.diagnosticos.length===0 && <div style={{fontSize:14, color:"#9bb0d3"}}>Sin entradas aún.</div>}
              <div style={{display:"grid", gap:8, marginTop:8}}>
                {vehiculoSel.diagnosticos.map(d=>(
                  <Box key={d.id}>
                    <Row cols={4} gap={8}>
                      <Input readOnly value={new Date(d.fecha).toLocaleString()} />
                      <Input value={d.autor} onChange={e=>updateDiag(vehiculoSel.id, d.id, {autor:e.target.value})} placeholder="Autor"/>
                      <Input value={d.presupuesto} onChange={e=>updateDiag(vehiculoSel.id, d.id, {presupuesto:e.target.value})} placeholder="Presupuesto" />
                      <div style={{display:"flex", justifyContent:"flex-end"}}>
                        <Button onClick={()=>{
                          setData(prev=> ({
                            ...prev,
                            vehiculos: prev.vehiculos.map(v=> v.id===vehiculoSel.id ? {...v, diagnosticos: v.diagnosticos.filter(x=>x.id!==d.id)} : v)
                          }));
                        }}>Eliminar</Button>
                      </div>
                    </Row>
                    <Textarea value={d.descripcion} onChange={e=>updateDiag(vehiculoSel.id, d.id, {descripcion:e.target.value})} placeholder="Descripción / hallazgos"/>
                    <Textarea value={d.acciones} onChange={e=>updateDiag(vehiculoSel.id, d.id, {acciones:e.target.value})} placeholder="Acciones realizadas / pendientes"/>
                  </Box>
                ))}
              </div>
            </div>
          </Box>
        )}
      </div>
    </div>
  );
}

function QuickClient({ onCreate }){
  const [c, setC] = React.useState(newClient());
  return (
    <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr auto", gap:8}}>
      <Input placeholder="Nombre" value={c.nombre} onChange={e=>setC({...c, nombre:e.target.value})}/>
      <Input placeholder="Teléfono" value={c.telefono} onChange={e=>setC({...c, telefono:e.target.value})}/>
      <Input placeholder="Email" value={c.email} onChange={e=>setC({...c, email:e.target.value})}/>
      <Button onClick={()=>{ if(!c.nombre){alert("Pon al menos el nombre");return;} onCreate(c); setC(newClient()); }}>Crear</Button>
    </div>
  );
}

function mapEstado(s){
  return ({
    en_diagnostico:"En diagnóstico",
    en_progreso:"En progreso",
    esperando_piezas:"Esperando piezas",
    listo:"Listo para entregar",
    entregado:"Entregado"
  }[s] || s);
}

function newClient(){ return { id:(crypto?.randomUUID?.()||Date.now()+""), nombre:"", telefono:"", email:"" }; }
function newTech(){ return { id:(crypto?.randomUUID?.()||Date.now()+""), nombre:"", usuario:"", password:"" }; }
