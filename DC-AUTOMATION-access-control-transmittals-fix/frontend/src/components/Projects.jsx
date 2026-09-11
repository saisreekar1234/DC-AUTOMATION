import { useEffect, useMemo, useState } from "react";
import api from "../api";
import ProjectCoverPageSettings from "./ProjectCoverPageSettings";
import ProjectTransmittals from "./ProjectTransmittals";
import DocumentExcelImportModal from "./DocumentExcelImportModal";
import "./technical-department.css";
import "./project.css";

export default function Projects() {
  const [projects,setProjects]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [search,setSearch]=useState("");
  const [selected,setSelected]=useState(null);
  const [createOpen,setCreateOpen]=useState(false);
  const [page,setPage]=useState(1);
  const [creating,setCreating]=useState(false);
  const [form,setForm]=useState({project_code:"",project_name:"",client_name:"",description:""});

  async function loadProjects(){
    try{setLoading(true);setError("");const r=await api.get("/projects");const d=r.data;setProjects(Array.isArray(d)?d:d?.projects||d?.data||d?.rows||[])}
    catch(e){console.error(e);setError(e.response?.data?.message||"Unable to load projects.")}finally{setLoading(false)}
  }
  useEffect(()=>{loadProjects()},[]);

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    if(!q)return projects;
    return projects.filter(p=>[p.project_code,p.project_name,p.client_name,p.description].filter(Boolean).some(v=>String(v).toLowerCase().includes(q)));
  },[projects,search]);

  useEffect(()=>{setPage(1)},[search]);

  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleProjects = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function createProject(e){
    e.preventDefault();
    if(!form.project_code.trim()||!form.project_name.trim()){setError("Project code and project name are required.");return}
    try{setCreating(true);setError("");const r=await api.post("/projects",{...form,project_code:form.project_code.trim(),project_name:form.project_name.trim(),client_name:form.client_name.trim(),description:form.description.trim()});setCreateOpen(false);setForm({project_code:"",project_name:"",client_name:"",description:""});await loadProjects();setSelected(r.data)}
    catch(e){setError(e.response?.data?.message||"Unable to create project.")}finally{setCreating(false)}
  }

  if(selected) return <ProjectWorkspace project={selected} onBack={()=>setSelected(null)}/>;

  return <section className="projects-v3">
    <div className="projects-hero">
      <div>
        <div className="section-kicker">PROJECT CONTROL CENTRE</div>
        <h1>Projects</h1>
        <p>One workspace for every project. Select a project to work with its controlled documents, revisions and cover-page configuration.</p>
      </div>
      <button className="primary-btn" onClick={()=>setCreateOpen(true)}>＋ New project</button>
    </div>

    {error&&<div className="project-error"><span>{error}</span><button onClick={()=>setError("")}>×</button></div>}

    <div className="project-overview">
      <div className="project-stat"><span>VISIBLE PROJECTS</span><strong>{projects.length}</strong></div>
      <div className="project-stat"><span>CLIENTS</span><strong>{new Set(projects.map(p=>p.client_name).filter(Boolean)).size}</strong></div>
      <div className="project-stat"><span>SEARCH RESULTS</span><strong>{filtered.length}</strong></div>
      <div className="project-stat"><span>PAGE</span><strong>{page} / {totalPages}</strong></div>
    </div>

    <div className="project-toolbar">
      <label className="project-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5"/></svg>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search project name, code, client or description..."/>
      </label>
      <div className="project-toolbar-actions"><button className="ghost-btn" onClick={()=>{setSearch("");setPage(1)}} disabled={!search}>Clear</button><button className="ghost-btn" onClick={loadProjects} disabled={loading}>↻ Refresh</button></div>
    </div>

    <div className="project-board">
      <div className="project-board-head">
        <div className="project-board-title"><h2>Project directory</h2><span>15 per page</span></div>
        <div className="project-board-note">Select any project to open its workspace</div>
      </div>
      {loading ? <div className="project-empty"><div className="loader"/><strong>Loading projects</strong><span>Getting your authorised project list...</span></div> :
       visibleProjects.length===0 ? <div className="project-empty"><strong>No projects found</strong><span>Try a different search or create a new project.</span></div> :
       <div className="project-register-wrap">
        <table className="project-register">
          <thead><tr><th className="project-col-code">CODE</th><th>PROJECT</th><th>CLIENT</th><th>STATUS</th><th>CREATED</th><th className="project-col-action">ACTION</th></tr></thead>
          <tbody>
            {visibleProjects.map((p,index)=>(
              <tr key={p.id} onDoubleClick={()=>setSelected(p)} onClick={()=>setSelected(p)} className="project-register-row">
                <td><span className="register-code">{p.project_code||`PRJ-${p.id}`}</span></td>
                <td><div className="register-project"><span className="project-avatar">{String(p.project_code||p.project_name||"P").slice(0,2).toUpperCase()}</span><div><strong title={p.project_name}>{p.project_name||"Unnamed project"}</strong><small>Project {index+1+(page-1)*pageSize}</small></div></div></td>
                <td><span className="register-client">{p.client_name||"—"}</span></td>
                <td><span className={`status-pill ${p.is_active===false?"inactive":"active"}`}>{p.is_active===false?"Inactive":"Active"}</span></td>
                <td><span className="register-date">{formatDate(p.created_at)}</span></td>
                <td><button className="project-open" onClick={e=>{e.stopPropagation();setSelected(p)}}>Open <span>→</span></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}

      {!loading && filtered.length>0 && <div className="project-pagination">
        <span className="page-info">Showing <strong>{(page-1)*pageSize+1}–{Math.min(page*pageSize,filtered.length)}</strong> of <strong>{filtered.length}</strong> projects</span>
        <div className="page-buttons"><button className="pager-btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>Previous</button>{Array.from({length:totalPages},(_,i)=>i+1).map(n=><button key={n} className={page===n?"page-number active":"page-number"} onClick={()=>setPage(n)}>{n}</button>)}<button className="pager-btn" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Next</button></div>
      </div>}
    </div>

    {createOpen&&<div className="modal-backdrop"><form className="create-modal" onSubmit={createProject}><div className="modal-head"><div><span>PROJECT SETUP</span><h2>Create project</h2></div><button type="button" onClick={()=>setCreateOpen(false)}>×</button></div><div className="modal-grid"><Field label="Project code" name="project_code" value={form.project_code} setForm={setForm}/><Field label="Project name" name="project_name" value={form.project_name} setForm={setForm}/><Field label="Client" name="client_name" value={form.client_name} setForm={setForm}/><div className="field-full"><label>Description</label><textarea value={form.description} onChange={e=>setForm(x=>({...x,description:e.target.value}))}/></div></div><div className="modal-foot"><button type="button" onClick={()=>setCreateOpen(false)}>Cancel</button><button className="primary-btn" disabled={creating}>{creating?"Creating...":"Create project"}</button></div></form></div>}
  </section>
}

function Field({label,name,value,setForm}){return <label className="field"><span>{label}</span><input value={value} onChange={e=>setForm(x=>({...x,[name]:e.target.value}))}/></label>}
function formatDate(v){if(!v)return"—";const d=new Date(v);return Number.isNaN(d.getTime())?"—":d.toLocaleDateString(undefined,{day:"2-digit",month:"short",year:"numeric"})}

function ProjectWorkspace({project,onBack}){
  const [tab,setTab]=useState("documents");
  const [docs,setDocs]=useState([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [search,setSearch]=useState("");
  const [selectedDoc,setSelectedDoc]=useState(null);
  const [showExcelImport,setShowExcelImport]=useState(false);

  async function loadDocs(){
    try{setLoading(true);setError("");const r=await api.get("/documents",{params:{project_id:project.id}});const d=r.data;setDocs(Array.isArray(d)?d:d?.documents||d?.data||d?.rows||[])}
    catch(e){setError(e.response?.data?.message||"Unable to load project documents.")}finally{setLoading(false)}
  }
  useEffect(()=>{if(tab==="documents")loadDocs()},[tab,project.id]);
  const filtered=docs.filter(d=>[d.document_number,d.title,d.customer_document_number,d.vendor_document_number].filter(Boolean).some(v=>String(v).toLowerCase().includes(search.toLowerCase())));

  return <section className="workspace-v3">
    <div className="workspace-head">
      <div><button className="back-btn" onClick={onBack}>← Projects</button><div className="workspace-kicker">PROJECT WORKSPACE</div><div className="workspace-title"><span className="workspace-avatar">{String(project.project_code||project.project_name||"P").slice(0,2).toUpperCase()}</span><div><h1>{project.project_name||"Project"}</h1><p>{project.project_code||`PRJ-${project.id}`} <i/> {project.client_name||"No client"}</p></div></div></div>
    </div>
    <nav className="workspace-tabs">
      <button className={tab==="documents"?"active":""} onClick={()=>setTab("documents")}>Documents <b>{docs.length}</b></button>
      <button className={tab==="cover"?"active":""} onClick={()=>setTab("cover")}>Cover Page</button>
      <button className={tab==="technical"?"active":""} onClick={()=>setTab("technical")}>Technical Department</button>
      <button className={tab==="transmittals"?"active":""} onClick={()=>setTab("transmittals")}>Transmittals</button>
      <button className={tab==="overview"?"active":""} onClick={()=>setTab("overview")}>Project Info</button>
    </nav>
    {error&&<div className="project-error">{error}<button onClick={()=>setError("")}>×</button></div>}
    {tab==="documents"&&<div className="workspace-panel">
      <div className="workspace-panel-head">
        <div>
          <span>DOCUMENT REGISTER</span>
          <h2>Controlled documents</h2>
          <p>Documents belonging only to <b>{project.project_code||project.project_name}</b>.</p>
        </div>
        <div className="workspace-panel-actions">
          <button className="primary-btn" type="button" onClick={()=>setShowExcelImport(true)}>
            ＋ Import MDR / Excel
          </button>
          <button className="ghost-btn" type="button" onClick={loadDocs} disabled={loading}>
            ↻ Refresh
          </button>
        </div>
      </div>
      <label className="doc-search">⌕<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search document number, title or customer number..."/></label>
      {loading?<div className="project-empty"><div className="loader"/><strong>Loading documents</strong></div>:filtered.length===0?<div className="project-empty"><strong>No documents in this project</strong><span>Documents assigned to this project will appear here.</span></div>:
      <div className="doc-table-wrap"><table className="doc-table"><thead><tr><th>DOCUMENT NUMBER</th><th>TITLE</th><th>CUSTOMER DOCUMENT</th><th>REVISION</th><th>STAGE</th><th>STATUS</th><th></th></tr></thead><tbody>{filtered.map(d=><tr key={d.id}><td><button onClick={()=>setSelectedDoc(d)} className="doc-number">{d.document_number||"—"}</button></td><td><strong>{d.title||"Untitled"}</strong></td><td>{d.customer_document_number||"—"}</td><td><b className="rev-badge">{d.current_revision_code||d.revision_code||"—"}</b></td><td>{d.current_revision_stage||d.revision_stage||"—"}</td><td><span className="doc-status">{d.current_revision_status||d.status||"—"}</span></td><td><button className="row-action" onClick={()=>setSelectedDoc(d)}>Open →</button></td></tr>)}</tbody></table></div>}
    </div>}
    {tab==="cover"&&<div className="workspace-panel"><ProjectCoverPageSettings project={project}/></div>}
    {tab==="technical"&&<TechnicalDepartment project={project}/>}
    {tab==="transmittals"&&<div className="workspace-panel"><ProjectTransmittals project={project}/></div>}
    {tab==="overview"&&<div className="workspace-panel"><div className="workspace-panel-head"><div><span>PROJECT INFORMATION</span><h2>{project.project_name}</h2></div></div><div className="info-grid"><Info label="Project code" value={project.project_code}/><Info label="Client" value={project.client_name}/><Info label="Project ID" value={project.id}/><Info label="Created" value={formatDate(project.created_at)}/><div className="info-full"><span>Description</span><p>{project.description||"No project description has been provided."}</p></div></div></div>}
    {selectedDoc&&<DocumentDrawer document={selectedDoc} onClose={()=>setSelectedDoc(null)}/>}
    {showExcelImport&&
      <DocumentExcelImportModal
        projectId={project.id}
        onClose={()=>setShowExcelImport(false)}
        onImported={loadDocs}
      />
    }
  </section>
}

function Info({label,value}){return <div className="info-item"><span>{label}</span><strong>{value||"—"}</strong></div>}

function TechnicalDepartment({project}){
  const departments = [
    {code:"ENG", name:"Engineering", desc:"Technical document preparation, checking and engineering coordination."},
    {code:"PRC", name:"Process", desc:"Process documents, calculations, diagrams and technical reviews."},
    {code:"MEC", name:"Mechanical", desc:"Mechanical equipment, datasheets, drawings and vendor documentation."},
    {code:"ELE", name:"Electrical", desc:"Electrical drawings, calculations, schedules and technical submissions."},
    {code:"INS", name:"Instrumentation", desc:"Instrument documents, datasheets, loops and control documentation."},
    {code:"PIP", name:"Piping", desc:"Piping drawings, isometrics, layouts and technical deliverables."},
    {code:"CIV", name:"Civil / Structural", desc:"Civil, structural and construction-related technical documentation."},
    {code:"QA", name:"QA / QC", desc:"Quality records, inspections, approvals and controlled technical records."},
  ];

  return <div className="workspace-panel technical-department-panel">
    <div className="technical-hero">
      <div>
        <span>TECHNICAL DOCUMENT CONTROL</span>
        <h2>Technical Department</h2>
        <p>Organise technical disciplines and route project documents to the appropriate department. This is the frontend foundation; department assignment and workflow persistence can be connected to the backend next.</p>
      </div>
      <div className="technical-project-chip">
        <small>PROJECT</small>
        <strong>{project.project_code||`PRJ-${project.id}`}</strong>
      </div>
    </div>

    <div className="technical-toolbar">
      <div>
        <strong>Technical disciplines</strong>
        <span>{departments.length} departments available</span>
      </div>
      <button type="button" className="ghost-btn" onClick={()=>alert("Technical Department configuration will be connected to the project workflow in the next step.")}>Configure workflow</button>
    </div>

    <div className="technical-grid">
      {departments.map(department=>
        <article className="technical-card" key={department.code}>
          <div className="technical-card-top">
            <span className="technical-code">{department.code}</span>
            <span className="technical-dot" aria-hidden="true"></span>
          </div>
          <h3>{department.name}</h3>
          <p>{department.desc}</p>
          <div className="technical-card-footer">
            <span>Document queue</span>
            <button type="button" onClick={()=>alert(`${department.name} department workspace will be opened here.`)}>Open →</button>
          </div>
        </article>
      )}
    </div>
  </div>
}

function DocumentDrawer({document,onClose}){
  const [generating,setGenerating]=useState(false);
  async function cover(){
    const w=window.open("","_blank");
    try{setGenerating(true);const r=await api.get(`/documents/${document.id}/cover-page`,{responseType:"blob"});const url=URL.createObjectURL(new Blob([r.data],{type:"application/pdf"}));if(w)w.location.href=url;else window.open(url,"_blank");setTimeout(()=>URL.revokeObjectURL(url),60000)}
    catch(e){if(w&&!w.closed)w.close();let msg=e.response?.data?.message||"Unable to generate the cover page.";if(e.response?.data instanceof Blob){try{msg=(JSON.parse(await e.response.data.text()))?.message||msg}catch{}}alert(msg)}
    finally{setGenerating(false)}
  }
  return <div className="drawer-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><aside className="doc-drawer"><div className="drawer-head"><div><span>DOCUMENT</span><h2>{document.document_number||"Document"}</h2><p>{document.title||"Untitled document"}</p></div><button onClick={onClose}>×</button></div><div className="drawer-body"><div className="drawer-status-row"><span className="doc-status">CONTROLLED</span><b>Rev {document.current_revision_code||"—"}</b></div><div className="drawer-grid"><Info label="Customer document" value={document.customer_document_number}/><Info label="Revision stage" value={document.current_revision_stage}/><Info label="Status" value={document.current_revision_status}/><Info label="Project" value={document.project_code||document.project_id}/></div><div className="drawer-actions"><button className="primary-btn" onClick={cover} disabled={generating}>{generating?"Generating...":"Generate Cover Page PDF →"}</button></div>
      <div className="drawer-note"><strong>Live document data</strong><span>The cover page is generated from the project template and the document's current revision. If generation fails, the backend will return the exact configuration error.</span></div></div></aside></div>
}
