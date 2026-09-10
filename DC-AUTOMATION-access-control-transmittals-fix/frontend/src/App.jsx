import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Projects from "./components/Projects";
import Users from "./components/Users";
import Login from "./pages/Login";
import "./App.css";

export default function App(){
  const {user,loading}=useAuth();
  const [activePage,setActivePage]=useState("projects");
  if(loading)return <div className="auth-loading-screen"><div className="loading-spinner"/><span>Loading Document Control...</span></div>;
  if(!user)return <Login/>;

  function navigate(page){
    if(page==="users" && user.role!=="admin") return;
    setActivePage(page);
  }

  return <Layout activePage={activePage} onNavigate={navigate} role={user.role}>
    {activePage==="projects"&&<Projects/>}
    {activePage==="users"&&user.role==="admin"&&<Users/>}
    {activePage==="settings"&&<SettingsPage onNavigate={navigate}/>}
  </Layout>
}

function SettingsPage({onNavigate}){
  return <section className="settings-v3">
    <div className="settings-header"><span>SYSTEM CONFIGURATION</span><h1>Settings</h1><p>Manage your document control workspace, account preferences and security.</p></div>
    <div className="settings-cards">
      <button onClick={()=>onNavigate("projects")}><b>Projects</b><span>Project records, authorised workspaces and project configuration.</span><i>→</i></button>
      <button onClick={()=>onNavigate("users")}><b>Users</b><span>User accounts and project access are managed by administrators.</span><i>→</i></button>
      <div><b>Cover Page</b><span>Cover page templates and field mappings are configured inside each project.</span><i>PROJECT LEVEL</i></div>
    </div>
  </section>
}
