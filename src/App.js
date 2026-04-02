import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const C = {
  bg:'#0A0A0B',sf:'#111113',sf2:'#16161A',sf3:'#1C1C1F',
  bd:'#1E1E22',bd2:'#2A2A30',
  ac:'#3B82F6',acH:'#2563EB',
  gr:'#22C55E',am:'#F59E0B',re:'#EF4444',gy:'#6B7280',
  tx:'#E5E7EB',mu:'#9CA3AF',dm:'#4B5563',
};

const fmtTime = ts => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}.${String(d.getMilliseconds()).padStart(3,'0')}`;
};
const fmtCost = n => '$'+(n||0).toFixed(2);
const fmtK = n => n>=1000?(n/1000).toFixed(1)+'k':String(n||0);
const ago = ts => { const s=Math.floor((Date.now()-ts)/1000); return s<60?s+'s':s<3600?Math.floor(s/60)+'m':Math.floor(s/3600)+'h'; };
const uid = () => Math.random().toString(36).slice(2,9);

const AGENTS0 = [
  {id:'a1',name:'builder-alpha',role:'Builder',status:'active',caps:['file_read','file_write','bash_exec','git_ops'],costToday:1.24,tokensIn:82000,tokensOut:41000,tasksToday:7,memEnabled:true,maxCostDay:2.0,approvalPolicy:'destructive',systemPrompt:'You are an expert software engineer. Build clean, tested, production-ready code with comprehensive error handling.',createdAt:Date.now()-86400000*30,lastActive:Date.now()-60000},
  {id:'a2',name:'reviewer-beta',role:'Reviewer',status:'idle',caps:['file_read','web_search'],costToday:0.42,tokensIn:31000,tokensOut:12000,tasksToday:3,memEnabled:false,maxCostDay:1.0,approvalPolicy:'everything',systemPrompt:'You are a senior code reviewer. Identify bugs, security vulnerabilities, and style issues.',createdAt:Date.now()-86400000*15,lastActive:Date.now()-300000},
  {id:'a3',name:'tester-gamma',role:'Tester',status:'standby',caps:['file_read','bash_exec'],costToday:0.18,tokensIn:12000,tokensOut:4000,tasksToday:2,memEnabled:false,maxCostDay:1.0,approvalPolicy:'destructive',systemPrompt:'You are a QA engineer. Write and execute comprehensive test suites.',createdAt:Date.now()-86400000*10,lastActive:Date.now()-600000},
  {id:'a4',name:'researcher-delta',role:'Researcher',status:'error',caps:['web_search','api_calls'],costToday:0.09,tokensIn:8000,tokensOut:2000,tasksToday:1,memEnabled:false,maxCostDay:0.5,approvalPolicy:'destructive',systemPrompt:'You are a research analyst. Gather and synthesize information from multiple sources.',createdAt:Date.now()-86400000*5,lastActive:Date.now()-1800000},
];

const TASKS0 = [
  {id:'t1',title:'Build pricing API endpoint',desc:'Implement REST endpoint for dynamic pricing calculations with tiered logic',status:'in_progress',priority:'high',assignedTo:'a1',progress:65,costUsd:0.84,tokensUsed:82000,tags:['api','backend'],createdAt:Date.now()-3600000,updatedAt:Date.now()-300000,output:null,approvalReq:false},
  {id:'t2',title:'Review authentication middleware',desc:'Comprehensive code review for new JWT auth middleware implementation',status:'review',priority:'medium',assignedTo:'a2',progress:90,costUsd:0.31,tokensUsed:31000,tags:['review','security'],createdAt:Date.now()-7200000,updatedAt:Date.now()-900000,output:'3 suggestions, 0 blockers. LGTM with minor changes to token expiry logic.',approvalReq:false},
  {id:'t3',title:'Run regression test suite',desc:'Execute full regression suite on staging branch after recent auth changes',status:'testing',priority:'high',assignedTo:'a3',progress:45,costUsd:0.18,tokensUsed:16000,tags:['testing','qa'],createdAt:Date.now()-1800000,updatedAt:Date.now()-120000,output:null,approvalReq:false},
  {id:'t4',title:'Implement user dashboard',desc:'Build new user analytics dashboard with charts and export capability',status:'assigned',priority:'medium',assignedTo:'a1',progress:0,costUsd:0,tokensUsed:0,tags:['frontend'],createdAt:Date.now()-900000,updatedAt:Date.now()-900000,output:null,approvalReq:true},
  {id:'t5',title:'Research competitor pricing',desc:'Analyze top 5 competitor pricing strategies and produce written report',status:'inbox',priority:'low',assignedTo:null,progress:0,costUsd:0,tokensUsed:0,tags:['research'],createdAt:Date.now()-300000,updatedAt:Date.now()-300000,output:null,approvalReq:false},
  {id:'t6',title:'Deploy staging environment',desc:'Deploy latest main branch build to staging server with smoke tests',status:'done',priority:'critical',assignedTo:'a1',progress:100,costUsd:0.24,tokensUsed:24000,tags:['devops'],createdAt:Date.now()-14400000,updatedAt:Date.now()-3600000,output:'Deployed v2.4.1 successfully. All smoke tests passing. Uptime: 100%',approvalReq:false},
  {id:'t7',title:'Fix memory leak in worker',desc:'Debug and fix critical memory leak in background job processing worker',status:'failed',priority:'critical',assignedTo:'a4',progress:30,costUsd:0.09,tokensUsed:8000,tags:['bug'],createdAt:Date.now()-5400000,updatedAt:Date.now()-2700000,output:'ERROR: Agent hit API rate limit at step 3. Investigation incomplete.',approvalReq:false},
  {id:'t8',title:'Enable TypeScript strict mode',desc:'Enable strict TypeScript checks across all packages and fix resulting errors',status:'inbox',priority:'low',assignedTo:null,progress:0,costUsd:0,tokensUsed:0,tags:['typescript'],createdAt:Date.now()-7200000,updatedAt:Date.now()-7200000,output:null,approvalReq:false},
];

const APPROVALS0 = [
  {id:'ap1',agentId:'a1',agentName:'builder-alpha',action:'DROP TABLE user_sessions CASCADE;',risk:'high',payload:'DROP TABLE user_sessions CASCADE;',context:'Working on task "Clean up old auth"\nFile: /src/db/migrations/009_cleanup.sql\nEstimated rows affected: ~12,400',status:'pending',createdAt:Date.now()-120000,expiresAt:Date.now()+1680000,justification:null},
  {id:'ap2',agentId:'a1',agentName:'builder-alpha',action:'POST https://api.stripe.com/v1/prices',risk:'medium',payload:'{"unit_amount":4999,"currency":"usd","product":"prod_QX8abc123","recurring":{"interval":"month"}}',context:'Creating new pricing tier for task "Build pricing API endpoint"',status:'pending',createdAt:Date.now()-300000,expiresAt:Date.now()+1500000,justification:null},
  {id:'ap3',agentId:'a3',agentName:'tester-gamma',action:'rm -rf ./dist ./node_modules/.cache',risk:'low',payload:'rm -rf ./dist ./node_modules/.cache',context:'Cleaning build artifacts before test run — standard cleanup operation',status:'pending',createdAt:Date.now()-60000,expiresAt:Date.now()+1740000,justification:null},
];

const LOGS0 = [
  {id:'l0',agentId:'a1',agentName:'builder',level:'info',message:'Task assigned → Build pricing API endpoint',ts:Date.now()-320000},
  {id:'l1',agentId:'a1',agentName:'builder',level:'info',message:'Reading file: src/api/pricing.js (1.2 KB)',ts:Date.now()-317000},
  {id:'l2',agentId:'a1',agentName:'builder',level:'info',message:'Analyzing existing pricing logic...',ts:Date.now()-314000},
  {id:'l3',agentId:'a2',agentName:'reviewer',level:'info',message:'Starting code review: auth-middleware.ts',ts:Date.now()-300000},
  {id:'l4',agentId:'a1',agentName:'builder',level:'info',message:'Generated 47 lines of TypeScript for pricing module',ts:Date.now()-290000},
  {id:'l5',agentId:'a1',agentName:'builder',level:'warn',message:'Approval required before DROP TABLE — queued',ts:Date.now()-120000},
  {id:'l6',agentId:'a3',agentName:'tester',level:'info',message:'Running jest — 14 test cases',ts:Date.now()-90000},
  {id:'l7',agentId:'a3',agentName:'tester',level:'ok',message:'12/14 passed — 2 failures',ts:Date.now()-89000},
  {id:'l8',agentId:'a3',agentName:'tester',level:'error',message:'Timeout in auth.test.js:88 — exceeded 5000ms',ts:Date.now()-88000},
  {id:'l9',agentId:'a2',agentName:'reviewer',level:'ok',message:'Review complete: 3 suggestions, 0 blockers',ts:Date.now()-60000},
  {id:'l10',agentId:'a4',agentName:'researcher',level:'error',message:'API rate limit exceeded: competitor-data.com (429)',ts:Date.now()-30000},
];

const HOURLY = Array.from({length:24},(_,i)=>({h:`${String(i).padStart(2,'0')}:00`,v:i<13?0:parseFloat((Math.random()*0.14+0.02).toFixed(3))}));
const DAILY = Array.from({length:30},(_,i)=>({d:new Date(Date.now()-i*86400000).toLocaleDateString('en',{month:'short',day:'numeric'}),v:parseFloat((Math.random()*2.2+0.4).toFixed(2))})).reverse();
const COLS=[{id:'inbox',label:'Inbox',c:C.gy},{id:'assigned',label:'Assigned',c:C.ac},{id:'in_progress',label:'In Progress',c:C.am},{id:'testing',label:'Testing',c:'#8b5cf6'},{id:'review',label:'Review',c:'#ec4899'},{id:'done',label:'Done',c:C.gr},{id:'failed',label:'Failed',c:C.re}];
const PCOLS={low:C.gy,medium:C.ac,high:C.am,critical:C.re};
const PLBL={low:'LOW',medium:'MED',high:'HIGH',critical:'CRIT'};

const css=`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{background:${C.bg};color:${C.tx};font-family:Inter,sans-serif}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.bd2};border-radius:2px}@keyframes blink{0%,100%{opacity:1}50%{opacity:0.4}}@keyframes spin{to{transform:rotate(360deg)}}select option{background:${C.sf2};color:${C.tx}}input[type=checkbox]{accent-color:${C.ac}}`;

const Btn=({children,onClick,variant='default',size='sm',style:sx={},disabled=false})=>{
  const [h,sh]=useState(false);
  const p=size==='xs'?'2px 7px':size==='sm'?'4px 10px':'6px 14px';
  const fs=size==='xs'?11:size==='sm'?12:13;
  const vs={default:{bg:h?C.sf3:C.sf2,bc:h?C.ac:C.bd,c:C.tx},primary:{bg:h?C.acH:C.ac,bc:C.ac,c:'#fff'},danger:{bg:h?'#7f1d1d':'rgba(239,68,68,0.1)',bc:C.re,c:C.re},ghost:{bg:'transparent',bc:'transparent',c:h?C.tx:C.mu},success:{bg:h?'#14532d':'rgba(34,197,94,0.1)',bc:C.gr,c:C.gr},warning:{bg:h?'#78350f':'rgba(245,158,11,0.1)',bc:C.am,c:C.am}}[variant];
  return <button onMouseEnter={()=>sh(true)} onMouseLeave={()=>sh(false)} onClick={onClick} disabled={disabled} style={{display:'inline-flex',alignItems:'center',gap:5,cursor:disabled?'not-allowed':'pointer',border:`1px solid ${vs.bc}`,borderRadius:4,fontFamily:'Inter,sans-serif',fontSize:fs,fontWeight:500,padding:p,background:vs.bg,color:vs.c,opacity:disabled?0.5:1,whiteSpace:'nowrap',transition:'all 0.1s',...sx}}>{children}</button>;
};

const Badge=({children,color='gray'})=>{
  const cs={gray:{bg:'rgba(107,114,128,0.15)',c:C.gy},blue:{bg:'rgba(59,130,246,0.15)',c:C.ac},green:{bg:'rgba(34,197,94,0.15)',c:C.gr},amber:{bg:'rgba(245,158,11,0.15)',c:C.am},red:{bg:'rgba(239,68,68,0.15)',c:C.re},purple:{bg:'rgba(139,92,246,0.15)',c:'#a78bfa'}}[color]||{bg:'rgba(107,114,128,0.15)',c:C.gy};
  return <span style={{display:'inline-block',padding:'1px 6px',borderRadius:3,fontSize:10,fontWeight:600,fontFamily:'JetBrains Mono,monospace',background:cs.bg,color:cs.c,letterSpacing:'0.04em'}}>{children}</span>;
};

const Dot=({status,size=8})=>{
  const cfg={active:{c:C.gr,anim:true},idle:{c:C.am,anim:false},standby:{c:C.gy,hollow:true},error:{c:C.re,anim:true}}[status]||{c:C.gy};
  return <span style={{display:'inline-block',width:size,height:size,borderRadius:'50%',background:cfg.hollow?'transparent':cfg.c,border:cfg.hollow?`2px solid ${cfg.c}`:'none',animation:cfg.anim?'blink 2s infinite':'none',flexShrink:0}}/>;
};

const Inp=({value,onChange,placeholder,style:sx={},type='text',min,max})=>{
  const [f,sf]=useState(false);
  return <input type={type} min={min} max={max} value={value} onChange={onChange} placeholder={placeholder} onFocus={()=>sf(true)} onBlur={()=>sf(false)} style={{background:C.sf2,border:`1px solid ${f?C.ac:C.bd}`,borderRadius:4,padding:'5px 8px',color:C.tx,fontSize:12,fontFamily:'Inter,sans-serif',outline:'none',width:'100%',...sx}}/>;
};

const Txta=({value,onChange,placeholder,rows=3,style:sx={}})=>{
  const [f,sf]=useState(false);
  return <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} onFocus={()=>sf(true)} onBlur={()=>sf(false)} style={{background:C.sf2,border:`1px solid ${f?C.ac:C.bd}`,borderRadius:4,padding:'6px 8px',color:C.tx,fontSize:12,fontFamily:'Inter,sans-serif',outline:'none',width:'100%',resize:'vertical',...sx}}/>;
};

const Sel=({value,onChange,children,style:sx={}})=>(
  <select value={value} onChange={onChange} style={{background:C.sf2,border:`1px solid ${C.bd}`,borderRadius:4,padding:'5px 8px',color:C.tx,fontSize:12,fontFamily:'Inter,sans-serif',outline:'none',width:'100%',cursor:'pointer',...sx}}>{children}</select>
);

const Fld=({label,children,error})=>(
  <div><div style={{fontSize:11,color:C.mu,marginBottom:4}}>{label}</div>{children}{error&&<div style={{fontSize:11,color:C.re,marginTop:2}}>{error}</div>}</div>
);

const Mod=({title,onClose,children,width=480})=>(
  <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
    <div style={{background:C.sf,border:`1px solid ${C.bd2}`,borderRadius:8,width,maxHeight:'88vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:`1px solid ${C.bd}`,flexShrink:0}}>
        <span style={{fontWeight:600,fontSize:14,color:C.tx}}>{title}</span>
        <button onClick={onClose} style={{background:'none',border:'none',color:C.mu,cursor:'pointer',fontSize:20,lineHeight:1}}>&times;</button>
      </div>
      <div style={{padding:16,overflowY:'auto',flex:1}}>{children}</div>
    </div>
  </div>
);

const StatusBar=({conn,attempt,gwUrl,setGwUrl})=>{
  const [edit,setEdit]=useState(false);
  const [tmp,setTmp]=useState(gwUrl);
  const [tick,setTick]=useState(0);
  useEffect(()=>{const iv=setInterval(()=>setTick(t=>t+1),1000);return()=>clearInterval(iv);},[]);
  const now=new Date().toLocaleTimeString('en-US',{hour12:false});
  const cfg={connected:{c:C.gr,label:'CONNECTED'},reconnecting:{c:C.am,label:`RECONNECTING (${attempt})`},disconnected:{c:C.re,label:'DISCONNECTED'}}[conn];
  return(
    <div style={{height:32,background:C.sf,borderBottom:`1px solid ${C.bd}`,display:'flex',alignItems:'center',padding:'0 16px',gap:16,flexShrink:0,fontSize:11,fontFamily:'JetBrains Mono,monospace'}}>
      <span style={{fontWeight:700,color:C.tx,letterSpacing:'0.06em'}}>⬡ MISSION CONTROL</span>
      <div style={{flex:1}}>
        {edit?(
          <span style={{display:'inline-flex',gap:6,alignItems:'center'}}>
            <input value={tmp} onChange={e=>setTmp(e.target.value)} style={{background:C.sf2,border:`1px solid ${C.ac}`,borderRadius:3,padding:'2px 6px',color:C.tx,fontSize:11,fontFamily:'JetBrains Mono,monospace',outline:'none',width:220}}/>
            <Btn size='xs' variant='primary' onClick={()=>{setGwUrl(tmp);setEdit(false);}}>Apply</Btn>
            <Btn size='xs' onClick={()=>setEdit(false)}>✕</Btn>
          </span>
        ):(
          <button onClick={()=>setEdit(true)} style={{background:'none',border:'none',color:C.dm,fontSize:11,fontFamily:'JetBrains Mono,monospace',cursor:'pointer',padding:0}}>{gwUrl}</button>
        )}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:5}}>
        <span style={{width:6,height:6,borderRadius:'50%',background:cfg.c,display:'inline-block',animation:conn==='reconnecting'?'blink 1s infinite':'none'}}/>
        <span style={{color:cfg.c,fontWeight:700}}>{cfg.label}</span>
      </div>
      <span style={{color:C.dm}}>{now}</span>
    </div>
  );
};

const Sidebar=({nav,setNav,agents,pending})=>(
  <div style={{width:200,background:C.sf,borderRight:`1px solid ${C.bd}`,display:'flex',flexDirection:'column',flexShrink:0}}>
    <nav style={{padding:'8px 0',flex:1}}>
      {[{id:'tasks',icon:'◫',label:'Tasks'},{id:'agents',icon:'◉',label:'Agents'},{id:'approvals',icon:'⚠',label:'Approvals'},{id:'logs',icon:'≡',label:'Logs'},{id:'costs',icon:'◈',label:'Costs'},{id:'health',icon:'◆',label:'Health'}].map(item=>{
        const active=nav===item.id;
        return(
          <button key={item.id} onClick={()=>setNav(item.id)} style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'8px 16px',background:active?'rgba(59,130,246,0.1)':'transparent',border:'none',borderLeft:`2px solid ${active?C.ac:'transparent'}`,color:active?C.ac:C.mu,cursor:'pointer',fontSize:13,fontFamily:'Inter,sans-serif',textAlign:'left',transition:'all 0.1s'}}>
            <span style={{fontSize:13}}>{item.icon}</span>
            <span style={{flex:1}}>{item.label}</span>
            {item.id==='approvals'&&pending>0&&<span style={{background:C.re,color:'#fff',borderRadius:10,fontSize:10,fontWeight:700,minWidth:17,height:17,display:'inline-flex',alignItems:'center',justifyContent:'center',padding:'0 4px'}}>{pending}</span>}
          </button>
        );
      })}
    </nav>
    <div style={{padding:'10px 16px',borderTop:`1px solid ${C.bd}`}}>
      <div style={{fontSize:10,color:C.dm,marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Agents</div>
      {agents.map(a=>(
        <div key={a.id} style={{display:'flex',alignItems:'center',gap:6,padding:'2px 0'}}>
          <Dot status={a.status} size={6}/>
          <span style={{fontSize:10,color:a.status==='error'?C.re:C.dm,fontFamily:'JetBrains Mono,monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.name}</span>
        </div>
      ))}
    </div>
  </div>
);

const TaskCard=({task,agents,onClick,onMove})=>{
  const agent=agents.find(a=>a.id===task.assignedTo);
  const [menu,setMenu]=useState(false);
  const [h,sh]=useState(false);
  return(
    <div onClick={onClick} onMouseEnter={()=>sh(true)} onMouseLeave={()=>{sh(false);setMenu(false);}} style={{background:h?C.sf3:C.sf2,border:`1px solid ${C.bd}`,borderLeft:`3px solid ${PCOLS[task.priority]}`,borderRadius:4,padding:'8px 10px',cursor:'pointer',position:'relative',marginBottom:6,transition:'background 0.1s'}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:6,marginBottom:4}}>
        <span style={{fontSize:12,fontWeight:500,color:C.tx,lineHeight:1.4,flex:1}}>{task.title}</span>
        <button onClick={e=>{e.stopPropagation();setMenu(m=>!m);}} style={{background:'none',border:'none',color:C.dm,cursor:'pointer',fontSize:16,padding:0,lineHeight:1,flexShrink:0}}>⋯</button>
        {menu&&<div onClick={e=>e.stopPropagation()} style={{position:'absolute',right:0,top:26,background:C.sf,border:`1px solid ${C.bd2}`,borderRadius:4,zIndex:10,minWidth:148,boxShadow:'0 4px 16px rgba(0,0,0,0.5)'}}>
          {COLS.filter(c=>c.id!==task.status).slice(0,5).map(col=><button key={col.id} onClick={()=>{onMove(task.id,col.id);setMenu(false);}} style={{display:'block',width:'100%',padding:'6px 12px',background:'none',border:'none',color:C.mu,cursor:'pointer',fontSize:12,textAlign:'left',fontFamily:'Inter,sans-serif'}}>→ {col.label}</button>)}
        </div>}
      </div>
      {task.progress>0&&<div style={{height:2,background:C.bd,borderRadius:1,marginBottom:6}}><div style={{height:'100%',width:`${task.progress}%`,background:task.status==='done'?C.gr:C.ac,borderRadius:1,transition:'width 0.5s'}}/></div>}
      <div style={{display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}}>
        <Badge color={task.priority==='critical'?'red':task.priority==='high'?'amber':task.priority==='medium'?'blue':'gray'}>{PLBL[task.priority]}</Badge>
        {agent&&<span style={{display:'inline-flex',alignItems:'center',gap:3}}><Dot status={agent.status} size={5}/><span style={{fontSize:10,color:C.dm,fontFamily:'JetBrains Mono,monospace'}}>{agent.name.split('-')[0]}</span></span>}
        {task.costUsd>0&&<span style={{marginLeft:'auto',fontSize:10,color:C.dm,fontFamily:'JetBrains Mono,monospace'}}>{fmtCost(task.costUsd)}</span>}
      </div>
    </div>
  );
};

const TaskDetail=({task,agents,onClose,onMove,onUpdate})=>{
  const agent=agents.find(a=>a.id===task.assignedTo);
  const col=COLS.find(c=>c.id===task.status);
  return(
    <div style={{position:'fixed',right:0,top:32,bottom:0,width:420,background:C.sf,borderLeft:`1px solid ${C.bd}`,display:'flex',flexDirection:'column',zIndex:50,overflowY:'auto'}}>
      <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.bd}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <span style={{fontWeight:600,fontSize:13,color:C.tx}}>Task Details</span>
        <button onClick={onClose} style={{background:'none',border:'none',color:C.mu,cursor:'pointer',fontSize:20}}>&times;</button>
      </div>
      <div style={{padding:16}}>
        <div style={{fontSize:15,fontWeight:600,color:C.tx,marginBottom:8}}>{task.title}</div>
        <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
          <Badge color={task.priority==='critical'?'red':task.priority==='high'?'amber':task.priority==='medium'?'blue':'gray'}>{PLBL[task.priority]}</Badge>
          <span style={{fontSize:10,color:col?.c,fontFamily:'JetBrains Mono,monospace',fontWeight:600,padding:'1px 6px',background:`${col?.c}20`,borderRadius:3}}>{task.status.replace('_',' ').toUpperCase()}</span>
          {task.tags?.map(t=><Badge key={t}>{t}</Badge>)}
        </div>
        <div style={{fontSize:12,color:C.mu,lineHeight:1.6,marginBottom:14}}>{task.desc}</div>
        {task.progress>0&&<div style={{marginBottom:14}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:11,color:C.dm}}>Progress</span><span style={{fontSize:11,fontFamily:'JetBrains Mono,monospace',color:C.mu}}>{task.progress}%</span></div><div style={{height:4,background:C.bd,borderRadius:2}}><div style={{height:'100%',width:`${task.progress}%`,background:task.status==='done'?C.gr:C.ac,borderRadius:2}}/></div></div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
          {[[`Assigned`,agent?<span style={{display:'inline-flex',alignItems:'center',gap:4}}><Dot status={agent.status} size={5}/><span style={{fontSize:11,fontFamily:'JetBrains Mono,monospace'}}>{agent.name}</span></span>:<span style={{color:C.dm}}>Unassigned</span>],[`Tokens`,<span style={{fontFamily:'JetBrains Mono,monospace'}}>{fmtK(task.tokensUsed)}</span>],[`Cost`,<span style={{fontFamily:'JetBrains Mono,monospace',color:C.gr}}>{fmtCost(task.costUsd)}</span>],[`Created`,<span style={{fontFamily:'JetBrains Mono,monospace'}}>{ago(task.createdAt)} ago</span>]].map(([l,v],i)=>(
            <div key={i} style={{background:C.sf2,border:`1px solid ${C.bd}`,borderRadius:4,padding:'8px 10px'}}>
              <div style={{fontSize:10,color:C.dm,marginBottom:3,textTransform:'uppercase'}}>{l}</div>
              <div style={{fontSize:12,color:C.tx}}>{v}</div>
            </div>
          ))}
        </div>
        {task.output&&<div style={{marginBottom:14}}><div style={{fontSize:11,color:C.dm,marginBottom:5,textTransform:'uppercase'}}>Output</div><div style={{background:C.sf2,border:`1px solid ${C.bd}`,borderRadius:4,padding:10,fontSize:11,fontFamily:'JetBrains Mono,monospace',color:C.gr,lineHeight:1.6,whiteSpace:'pre-wrap'}}>{task.output}</div></div>}
        <div style={{marginBottom:14}}><div style={{fontSize:11,color:C.dm,marginBottom:6,textTransform:'uppercase'}}>Move to column</div><div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{COLS.filter(c=>c.id!==task.status).map(c=><Btn key={c.id} size='xs' onClick={()=>{onMove(task.id,c.id);onClose();}} style={{borderColor:`${c.c}60`,color:c.c}}>{c.label}</Btn>)}</div></div>
        <div style={{borderTop:`1px solid ${C.bd}`,paddingTop:12}}><div style={{fontSize:11,color:C.re,marginBottom:6,textTransform:'uppercase'}}>Danger Zone</div><Btn variant='danger' size='xs' onClick={()=>{if(window.confirm('Delete this task?')){onMove(task.id,'failed');onClose();}}}>Delete Task</Btn></div>
      </div>
    </div>
  );
};

const CreateTaskModal=({agents,onClose,onCreate})=>{
  const [f,sf]=useState({title:'',desc:'',assignedTo:'',priority:'medium',tags:'',approvalReq:false,expectedOutput:''});
  const [errs,se]=useState({});
  const set=(k,v)=>sf(p=>({...p,[k]:v}));
  const submit=()=>{
    const e={};
    if(!f.title.trim()) e.title='Required';
    if(Object.keys(e).length){se(e);return;}
    onCreate({...f,tags:f.tags.split(',').map(t=>t.trim()).filter(Boolean),assignedTo:f.assignedTo||null,status:'inbox',id:'t'+Date.now(),createdAt:Date.now(),updatedAt:Date.now(),progress:0,costUsd:0,tokensUsed:0,output:null});
    onClose();
  };
  return(
    <Mod title='Create Task' onClose={onClose}>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <Fld label='Title *' error={errs.title}><Inp value={f.title} onChange={e=>set('title',e.target.value)} placeholder='What needs to be done?'/></Fld>
        <Fld label='Description'><Txta value={f.desc} onChange={e=>set('desc',e.target.value)} placeholder='Provide context and requirements...' rows={3}/></Fld>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <Fld label='Assign to'><Sel value={f.assignedTo} onChange={e=>set('assignedTo',e.target.value)}><option value=''>Unassigned</option>{agents.filter(a=>a.status!=='error').map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</Sel></Fld>
          <Fld label='Priority'><Sel value={f.priority} onChange={e=>set('priority',e.target.value)}><option value='low'>Low</option><option value='medium'>Medium</option><option value='high'>High</option><option value='critical'>Critical</option></Sel></Fld>
        </div>
        <Fld label='Tags (comma-separated)'><Inp value={f.tags} onChange={e=>set('tags',e.target.value)} placeholder='api, backend, urgent'/></Fld>
        <Fld label='Expected Output'><Txta value={f.expectedOutput} onChange={e=>set('expectedOutput',e.target.value)} placeholder='What does "done" look like?' rows={2}/></Fld>
        <label style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',fontSize:12,color:C.mu}}><input type='checkbox' checked={f.approvalReq} onChange={e=>set('approvalReq',e.target.checked)}/> Require approval before agent starts</label>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',paddingTop:8,borderTop:`1px solid ${C.bd}`}}><Btn onClick={onClose}>Cancel</Btn><Btn variant='primary' onClick={submit}>Create Task</Btn></div>
      </div>
    </Mod>
  );
};

const TasksPage=({tasks,agents,setTasks})=>{
  const [view,sv]=useState('kanban');
  const [sel,ss]=useState(null);
  const [modal,sm]=useState(false);
  const [fp,sfp]=useState('all');
  const [fa,sfa]=useState('all');
  const ft=useMemo(()=>tasks.filter(t=>(fp==='all'||t.priority===fp)&&(fa==='all'||t.assignedTo===fa)),[tasks,fp,fa]);
  const move=(id,s)=>setTasks(p=>p.map(t=>t.id===id?{...t,status:s,updatedAt:Date.now()}:t));
  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'10px 16px',borderBottom:`1px solid ${C.bd}`,display:'flex',alignItems:'center',gap:10,flexShrink:0,flexWrap:'wrap'}}>
        <span style={{fontWeight:600,fontSize:14,color:C.tx}}>Tasks</span>
        <span style={{fontSize:11,color:C.dm}}>{tasks.length} total</span>
        <div style={{flex:1}}/>
        <Sel value={fp} onChange={e=>sfp(e.target.value)} style={{width:120}}><option value='all'>All priorities</option><option value='critical'>Critical</option><option value='high'>High</option><option value='medium'>Medium</option><option value='low'>Low</option></Sel>
        <Sel value={fa} onChange={e=>sfa(e.target.value)} style={{width:148}}><option value='all'>All agents</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</Sel>
        <div style={{display:'flex',gap:3,background:C.sf2,borderRadius:4,padding:2}}>{['kanban','list'].map(v=><button key={v} onClick={()=>sv(v)} style={{padding:'3px 9px',borderRadius:3,border:'none',background:view===v?C.bd2:'transparent',color:view===v?C.tx:C.dm,cursor:'pointer',fontSize:11,fontFamily:'Inter,sans-serif',textTransform:'capitalize'}}>{v}</button>)}</div>
        <Btn variant='primary' onClick={()=>sm(true)}>+ New Task</Btn>
      </div>
      {view==='kanban'?(
        <div style={{display:'flex',flex:1,overflow:'auto',padding:14,gap:10}}>
          {COLS.map(col=>{
            const ct=ft.filter(t=>t.status===col.id);
            return(
              <div key={col.id} style={{width:210,flexShrink:0}}>
                <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:8}}>
                  <span style={{width:7,height:7,borderRadius:'50%',background:col.c,display:'inline-block'}}/>
                  <span style={{fontSize:10,fontWeight:600,color:C.mu,textTransform:'uppercase',letterSpacing:'0.06em'}}>{col.label}</span>
                  <span style={{fontSize:10,color:C.dm}}>{ct.length}</span>
                </div>
                <div style={{background:'rgba(255,255,255,0.015)',borderRadius:4,minHeight:80,padding:4}}>
                  {ct.map(t=><TaskCard key={t.id} task={t} agents={agents} onClick={()=>ss(t)} onMove={move}/>)}
                  {ct.length===0&&<div style={{textAlign:'center',padding:'18px 4px',color:C.dm,fontSize:11}}>empty</div>}
                </div>
              </div>
            );
          })}
        </div>
      ):(
        <div style={{flex:1,overflow:'auto',padding:16}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>{['Title','Agent','Status','Priority','Cost','Created'].map(h=><th key={h} style={{padding:'6px 12px',textAlign:'left',fontSize:10,color:C.dm,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>)}</tr></thead>
            <tbody>{ft.map(t=>{
              const ag=agents.find(a=>a.id===t.assignedTo);
              const col=COLS.find(c=>c.id===t.status);
              return<tr key={t.id} onClick={()=>ss(t)} style={{borderBottom:`1px solid rgba(30,30,34,0.8)`,cursor:'pointer'}}><td style={{padding:'7px 12px',fontSize:12,color:C.tx}}>{t.title}</td><td style={{padding:'7px 12px'}}>{ag?<span style={{display:'inline-flex',alignItems:'center',gap:4}}><Dot status={ag.status} size={5}/><span style={{fontSize:11,color:C.mu,fontFamily:'JetBrains Mono,monospace'}}>{ag.name}</span></span>:<span style={{fontSize:11,color:C.dm}}>—</span>}</td><td style={{padding:'7px 12px'}}><span style={{fontSize:10,color:col?.c,fontFamily:'JetBrains Mono,monospace',fontWeight:600}}>{t.status.replace('_',' ').toUpperCase()}</span></td><td style={{padding:'7px 12px'}}><Badge color={t.priority==='critical'?'red':t.priority==='high'?'amber':t.priority==='medium'?'blue':'gray'}>{PLBL[t.priority]}</Badge></td><td style={{padding:'7px 12px',fontFamily:'JetBrains Mono,monospace',fontSize:11,color:C.mu}}>{fmtCost(t.costUsd)}</td><td style={{padding:'7px 12px',fontFamily:'JetBrains Mono,monospace',fontSize:11,color:C.dm}}>{ago(t.createdAt)} ago</td></tr>;
            })}</tbody>
          </table>
        </div>
      )}
      {sel&&<TaskDetail task={sel} agents={agents} onClose={()=>ss(null)} onMove={move} onUpdate={(id,u)=>setTasks(p=>p.map(t=>t.id===id?{...t,...u}:t))}/>}
      {modal&&<CreateTaskModal agents={agents} onClose={()=>sm(false)} onCreate={t=>setTasks(p=>[...p,t])}/>}
    </div>
  );
};

const CAPS=['file_read','file_write','bash_exec','web_search','api_calls','db_access','git_ops','agent_comms'];

const AgentDetail=({agent,onUpdate,onDelete})=>{
  const [editPrompt,sep]=useState(false);
  const [prompt,sp]=useState(agent.systemPrompt);
  useEffect(()=>sp(agent.systemPrompt),[agent.id]);
  const actions={active:[{l:'Stop Agent',v:'danger',a:()=>onUpdate({status:'standby'})},{l:'Restart',v:'warning',a:()=>onUpdate({status:'active',lastActive:Date.now()})}],idle:[{l:'Stop Agent',v:'danger',a:()=>onUpdate({status:'standby'})}],standby:[{l:'Start Agent',v:'success',a:()=>onUpdate({status:'active',lastActive:Date.now()})}],error:[{l:'Restart',v:'warning',a:()=>onUpdate({status:'active',lastActive:Date.now()})},{l:'Stop',v:'danger',a:()=>onUpdate({status:'standby'})}]}[agent.status]||[];
  return(
    <div style={{padding:22,maxWidth:680,overflowY:'auto',height:'100%'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <Dot status={agent.status} size={12}/>
        <div><div style={{fontSize:17,fontWeight:700,color:C.tx,fontFamily:'JetBrains Mono,monospace'}}>{agent.name}</div><div style={{fontSize:11,color:C.dm,marginTop:2}}>{agent.role} · created {ago(agent.createdAt)} ago</div></div>
        <div style={{marginLeft:'auto',display:'flex',gap:6}}>{actions.map(a=><Btn key={a.l} variant={a.v} onClick={a.a}>{a.l}</Btn>)}</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:16}}>
        {[['Cost Today',fmtCost(agent.costToday),C.gr],['Tokens In',fmtK(agent.tokensIn),C.ac],['Tokens Out',fmtK(agent.tokensOut),C.ac],['Tasks',agent.tasksToday,C.am]].map(([l,v,c])=>(
          <div key={l} style={{background:C.sf2,border:`1px solid ${C.bd}`,borderRadius:4,padding:'9px 11px'}}>
            <div style={{fontSize:10,color:C.dm,marginBottom:3,textTransform:'uppercase'}}>{l}</div>
            <div style={{fontSize:20,fontWeight:700,fontFamily:'JetBrains Mono,monospace',color:c}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:6,padding:12,marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:12,fontWeight:600,color:C.tx}}>System Prompt</span><Btn size='xs' onClick={()=>{if(editPrompt){onUpdate({systemPrompt:prompt});sep(false);}else sep(true);}}>{editPrompt?'Save':'Edit'}</Btn></div>
        {editPrompt?<Txta value={prompt} onChange={e=>sp(e.target.value)} rows={4}/>:<div style={{fontSize:11,color:C.mu,lineHeight:1.6,fontFamily:'JetBrains Mono,monospace',whiteSpace:'pre-wrap'}}>{agent.systemPrompt}</div>}
      </div>
      <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:6,padding:12,marginBottom:10}}>
        <div style={{fontSize:12,fontWeight:600,color:C.tx,marginBottom:8}}>Capabilities</div>
        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
          {CAPS.map(cap=><span key={cap} style={{padding:'3px 8px',borderRadius:3,fontSize:11,fontFamily:'JetBrains Mono,monospace',background:agent.caps?.includes(cap)?'rgba(59,130,246,0.12)':'rgba(255,255,255,0.04)',color:agent.caps?.includes(cap)?C.ac:C.dm,border:`1px solid ${agent.caps?.includes(cap)?C.ac+'40':C.bd}`}}>{cap}</span>)}
        </div>
      </div>
      <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:6,padding:12,marginBottom:16}}>
        <div style={{display:'flex',gap:20,fontSize:12}}><div><span style={{color:C.dm}}>Approval Policy: </span><span style={{color:C.tx,fontFamily:'JetBrains Mono,monospace'}}>{agent.approvalPolicy}</span></div><div><span style={{color:C.dm}}>Memory: </span><span style={{color:agent.memEnabled?C.gr:C.dm}}>{agent.memEnabled?'Enabled':'Disabled'}</span></div><div><span style={{color:C.dm}}>Daily Cap: </span><span style={{color:C.am,fontFamily:'JetBrains Mono,monospace'}}>{fmtCost(agent.maxCostDay)}</span></div></div>
      </div>
      <div style={{borderTop:`1px solid ${C.bd}`,paddingTop:14}}><div style={{fontSize:11,color:C.re,marginBottom:7,textTransform:'uppercase'}}>Danger Zone</div><Btn variant='danger' onClick={()=>{if(window.confirm(`Delete ${agent.name}?`))onDelete();}}>Delete Agent</Btn></div>
    </div>
  );
};

const CreateAgentModal=({onClose,onCreate})=>{
  const [f,sf]=useState({name:'',role:'Builder',systemPrompt:'',caps:[],approvalPolicy:'destructive',memEnabled:false,maxCostDay:'2.00'});
  const [errs,se]=useState({});
  const set=(k,v)=>sf(p=>({...p,[k]:v}));
  const toggleCap=cap=>set('caps',f.caps.includes(cap)?f.caps.filter(c=>c!==cap):[...f.caps,cap]);
  const submit=()=>{
    const e={};
    if(!f.name.trim()||f.name.length<3)e.name='Minimum 3 characters';
    else if(!/^[a-zA-Z0-9-]+$/.test(f.name))e.name='Alphanumeric and hyphens only';
    if(f.systemPrompt.length<50)e.systemPrompt='Minimum 50 characters';
    if(Object.keys(e).length){se(e);return;}
    onCreate({...f,maxCostDay:parseFloat(f.maxCostDay)||2,id:'a'+Date.now(),status:'standby',costToday:0,tokensIn:0,tokensOut:0,tasksToday:0,createdAt:Date.now(),lastActive:null});
    onClose();
  };
  return(
    <Mod title='Deploy Agent' onClose={onClose} width={510}>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <Fld label='Agent Name *' error={errs.name}><Inp value={f.name} onChange={e=>set('name',e.target.value)} placeholder='my-agent-name'/></Fld>
          <Fld label='Role'><Sel value={f.role} onChange={e=>set('role',e.target.value)}>{['Builder','Reviewer','Tester','Researcher','Custom'].map(r=><option key={r}>{r}</option>)}</Sel></Fld>
        </div>
        <Fld label='System Prompt * (min 50 chars)' error={errs.systemPrompt}><Txta value={f.systemPrompt} onChange={e=>set('systemPrompt',e.target.value)} placeholder='You are an expert...' rows={4}/></Fld>
        <div><div style={{fontSize:11,color:C.mu,marginBottom:6}}>Capabilities</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>{CAPS.map(cap=><label key={cap} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',padding:'2px 0'}}><input type='checkbox' checked={f.caps.includes(cap)} onChange={()=>toggleCap(cap)}/><span style={{fontSize:12,color:C.mu,fontFamily:'JetBrains Mono,monospace'}}>{cap}</span></label>)}</div></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
          <Fld label='Approval Policy'><Sel value={f.approvalPolicy} onChange={e=>set('approvalPolicy',e.target.value)}><option value='nothing'>Nothing</option><option value='destructive'>Destructive</option><option value='everything'>Everything</option></Sel></Fld>
          <Fld label='Max Cost/Day (USD)'><Inp type='number' value={f.maxCostDay} onChange={e=>set('maxCostDay',e.target.value)} min='0' max='100'/></Fld>
          <Fld label=' '><label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',paddingTop:6}}><input type='checkbox' checked={f.memEnabled} onChange={e=>set('memEnabled',e.target.checked)}/><span style={{fontSize:12,color:C.mu}}>Persistent Memory</span></label></Fld>
        </div>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',paddingTop:8,borderTop:`1px solid ${C.bd}`}}><Btn onClick={onClose}>Cancel</Btn><Btn variant='primary' onClick={submit}>Deploy Agent</Btn></div>
      </div>
    </Mod>
  );
};

const AgentsPage=({agents,setAgents})=>{
  const [sel,ss]=useState(null);
  const [modal,sm]=useState(false);
  const selAgent=agents.find(a=>a.id===sel?.id);
  return(
    <div style={{display:'flex',height:'100%'}}>
      <div style={{width:270,borderRight:`1px solid ${C.bd}`,display:'flex',flexDirection:'column'}}>
        <div style={{padding:'10px 16px',borderBottom:`1px solid ${C.bd}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontWeight:600,fontSize:14,color:C.tx}}>Agents</span>
          <Btn size='xs' variant='primary' onClick={()=>sm(true)}>+ Deploy</Btn>
        </div>
        <div style={{flex:1,overflowY:'auto'}}>
          {agents.map(agent=>(
            <button key={agent.id} onClick={()=>ss(agent)} style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'10px 16px',background:sel?.id===agent.id?'rgba(59,130,246,0.07)':'transparent',border:'none',borderLeft:`2px solid ${sel?.id===agent.id?C.ac:'transparent'}`,cursor:'pointer',textAlign:'left'}}>
              <Dot status={agent.status}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,color:C.tx,fontFamily:'JetBrains Mono,monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{agent.name}</div>
                <div style={{fontSize:10,color:C.dm,marginTop:1}}>{agent.role} · {fmtCost(agent.costToday)} today</div>
              </div>
              <span style={{fontSize:10,color:agent.status==='active'?C.gr:agent.status==='error'?C.re:agent.status==='idle'?C.am:C.dm,fontFamily:'JetBrains Mono,monospace'}}>{agent.status}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{flex:1,overflow:'auto'}}>
        {selAgent?<AgentDetail agent={selAgent} onUpdate={u=>setAgents(p=>p.map(a=>a.id===selAgent.id?{...a,...u}:a))} onDelete={()=>{setAgents(p=>p.filter(a=>a.id!==selAgent.id));ss(null);}}/>:<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:C.dm,fontSize:13}}>Select an agent to view details</div>}
      </div>
      {modal&&<CreateAgentModal onClose={()=>sm(false)} onCreate={a=>setAgents(p=>[...p,a])}/>}
    </div>
  );
};

const RCOL={low:{c:C.gr,l:'LOW RISK',bg:'rgba(34,197,94,0.1)'},medium:{c:C.am,l:'MEDIUM RISK',bg:'rgba(245,158,11,0.1)'},high:{c:C.re,l:'HIGH RISK',bg:'rgba(239,68,68,0.1)'}};

const ApprovalsPage=({approvals,setApprovals})=>{
  const [hist,sh]=useState(false);
  const [editing,se]=useState(null);
  const [ep,sep]=useState('');
  const [asking,sa]=useState(null);
  const pending=approvals.filter(a=>a.status==='pending');
  const past=approvals.filter(a=>a.status!=='pending');
  const decide=(id,status,mod=null)=>{setApprovals(p=>p.map(a=>a.id===id?{...a,status,modifiedPayload:mod,decisionAt:Date.now()}:a));se(null);};
  const askWhy=id=>{
    sa(id);
    setTimeout(()=>{setApprovals(p=>p.map(a=>a.id===id?{...a,justification:'I need to execute this to complete my assigned task. The operation was explicitly included in the task requirements and is required to proceed with subsequent steps. I assessed it as the least-disruptive approach.'}:a));sa(null);},1800);
  };
  const timeLeft=exp=>{const s=Math.floor((exp-Date.now())/1000);if(s<=0)return'EXPIRED';const m=Math.floor(s/60);return`${m}m ${s%60}s`;};
  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'10px 16px',borderBottom:`1px solid ${C.bd}`,display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <span style={{fontWeight:600,fontSize:14,color:C.tx}}>Approval Queue</span>
        {pending.length>0&&<span style={{background:C.re,color:'#fff',borderRadius:10,fontSize:10,fontWeight:700,padding:'1px 8px'}}>{pending.length} pending</span>}
        <div style={{flex:1}}/>
        <div style={{display:'flex',gap:3,background:C.sf2,borderRadius:4,padding:2}}>{[['queue',`Queue (${pending.length})`],['history',`History (${past.length})`]].map(([v,l])=><button key={v} onClick={()=>sh(v==='history')} style={{padding:'3px 9px',borderRadius:3,border:'none',background:(hist?v==='history':v==='queue')?C.bd2:'transparent',color:(hist?v==='history':v==='queue')?C.tx:C.dm,cursor:'pointer',fontSize:11,fontFamily:'Inter,sans-serif'}}>{l}</button>)}</div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:14}}>
        {!hist?(
          pending.length===0?(
            <div style={{textAlign:'center',padding:50,color:C.dm}}><div style={{fontSize:32,marginBottom:10,color:C.gr}}>✓</div><div style={{fontSize:14,color:C.mu,fontWeight:500}}>All Clear</div><div style={{fontSize:12,marginTop:4}}>No pending approvals</div></div>
          ):pending.map(ap=>{
            const r=RCOL[ap.risk];
            return(
              <div key={ap.id} style={{background:C.sf,border:`1px solid ${C.bd}`,borderLeft:`3px solid ${r.c}`,borderRadius:6,padding:14,marginBottom:12}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:10,fontWeight:700,color:r.c,background:r.bg,padding:'2px 8px',borderRadius:3,fontFamily:'JetBrains Mono,monospace'}}>⚠ {r.l}</span>
                    <span style={{fontSize:12,color:C.mu,fontFamily:'JetBrains Mono,monospace'}}>{ap.agentName}</span>
                    <span style={{fontSize:11,color:C.dm}}>· {ago(ap.createdAt)} ago</span>
                  </div>
                  <span style={{fontSize:11,fontFamily:'JetBrains Mono,monospace',color:ap.expiresAt-Date.now()<300000?C.re:C.dm}}>{timeLeft(ap.expiresAt)}</span>
                </div>
                <div style={{marginBottom:10}}><div style={{fontSize:11,color:C.dm,marginBottom:4}}>Wants to execute:</div><div style={{background:C.sf2,border:`1px solid ${C.bd}`,borderRadius:4,padding:'8px 10px',fontSize:12,fontFamily:'JetBrains Mono,monospace',color:C.tx,wordBreak:'break-all',whiteSpace:'pre-wrap'}}>{editing===ap.id?ep:ap.payload}</div></div>
                <div style={{marginBottom:10,padding:'8px 10px',background:'rgba(255,255,255,0.025)',borderRadius:4}}><div style={{fontSize:10,color:C.dm,marginBottom:3}}>CONTEXT</div><div style={{fontSize:12,color:C.mu,whiteSpace:'pre-wrap'}}>{ap.context}</div></div>
                {ap.justification&&<div style={{marginBottom:10,padding:'8px 10px',background:'rgba(59,130,246,0.06)',border:`1px solid ${C.ac}40`,borderRadius:4}}><div style={{fontSize:10,color:C.ac,marginBottom:3}}>AGENT RESPONSE</div><div style={{fontSize:12,color:C.mu}}>{ap.justification}</div></div>}
                {editing===ap.id&&<div style={{marginBottom:10}}><div style={{fontSize:11,color:C.am,marginBottom:4}}>Editing payload — changes will be logged:</div><Txta value={ep} onChange={e=>sep(e.target.value)} rows={3}/></div>}
                <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                  <Btn variant='success' onClick={()=>decide(ap.id,'approved',editing===ap.id?ep:null)}>✓ Approve</Btn>
                  <Btn variant='danger' onClick={()=>decide(ap.id,'denied')}>✗ Deny</Btn>
                  {editing===ap.id?<><Btn variant='warning' onClick={()=>decide(ap.id,'approved',ep)}>✓ Approve Modified</Btn><Btn onClick={()=>se(null)}>Cancel Edit</Btn></>:<Btn onClick={()=>{se(ap.id);sep(ap.payload);}}>✎ Modify & Approve</Btn>}
                  {!ap.justification&&<Btn variant='ghost' disabled={asking===ap.id} onClick={()=>askWhy(ap.id)}>{asking===ap.id?'Asking agent...':'? Ask Agent Why'}</Btn>}
                </div>
              </div>
            );
          })
        ):past.length===0?<div style={{textAlign:'center',padding:40,color:C.dm,fontSize:12}}>No approval history</div>:past.map(ap=>{
          const r=RCOL[ap.risk];
          return(
            <div key={ap.id} style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:4,padding:10,marginBottom:7,opacity:0.75}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                <span style={{fontSize:11,fontWeight:700,color:ap.status==='approved'?C.gr:C.re,fontFamily:'JetBrains Mono,monospace'}}>{ap.status==='approved'?'✓ APPROVED':'✗ DENIED'}</span>
                <span style={{fontSize:11,color:r.c}}>{ap.risk} risk</span>
                <span style={{fontSize:11,color:C.mu,fontFamily:'JetBrains Mono,monospace'}}>{ap.agentName}</span>
                <span style={{marginLeft:'auto',fontSize:11,color:C.dm}}>{ap.decisionAt?ago(ap.decisionAt)+' ago':''}</span>
              </div>
              <div style={{fontSize:11,color:C.dm,fontFamily:'JetBrains Mono,monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ap.action}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LLVL={ok:{c:C.gr,bg:'transparent',l:'OK  '},info:{c:C.ac,bg:'transparent',l:'INFO'},warn:{c:C.am,bg:'transparent',l:'WARN'},error:{c:C.re,bg:'rgba(239,68,68,0.04)',l:'ERR '}};

const LogsPage=({logs,agents})=>{
  const [fa,sfa]=useState([]);
  const [fl,sfl]=useState([]);
  const [search,ss]=useState('');
  const [auto,sa]=useState(true);
  const bot=useRef(null);
  const filtered=useMemo(()=>logs.filter(l=>(fa.length===0||fa.includes(l.agentId))&&(fl.length===0||fl.includes(l.level))&&(!search||l.message.toLowerCase().includes(search.toLowerCase())||l.agentName.toLowerCase().includes(search.toLowerCase()))).slice(-2000),[logs,fa,fl,search]);
  useEffect(()=>{if(auto&&bot.current)bot.current.scrollIntoView();},[filtered,auto]);
  const toggleA=id=>sfa(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const toggleL=lv=>sfl(p=>p.includes(lv)?p.filter(x=>x!==lv):[...p,lv]);
  const exportL=()=>{const t=filtered.map(l=>`${fmtTime(l.ts)}  [${l.agentName.padEnd(10)}]  ${LLVL[l.level].l}  ${l.message}`).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/plain'}));a.download=`logs-${Date.now()}.txt`;a.click();};
  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'8px 16px',borderBottom:`1px solid ${C.bd}`,display:'flex',alignItems:'center',gap:8,flexShrink:0,flexWrap:'wrap'}}>
        <span style={{fontWeight:600,fontSize:14,color:C.tx}}>Logs</span>
        <Inp value={search} onChange={e=>ss(e.target.value)} placeholder='Search logs...' style={{width:190}}/>
        <div style={{display:'flex',gap:3}}>{agents.map(a=><button key={a.id} onClick={()=>toggleA(a.id)} style={{padding:'2px 8px',borderRadius:3,border:`1px solid ${fa.includes(a.id)?C.ac:C.bd}`,background:fa.includes(a.id)?'rgba(59,130,246,0.1)':'transparent',color:fa.includes(a.id)?C.ac:C.dm,cursor:'pointer',fontSize:10,fontFamily:'JetBrains Mono,monospace'}}>{a.name.split('-')[0]}</button>)}</div>
        <div style={{display:'flex',gap:3}}>{['ok','info','warn','error'].map(lv=>{const s=LLVL[lv];return<button key={lv} onClick={()=>toggleL(lv)} style={{padding:'2px 7px',borderRadius:3,border:`1px solid ${fl.includes(lv)?s.c:C.bd}`,background:fl.includes(lv)?`${s.c}20`:'transparent',color:fl.includes(lv)?s.c:C.dm,cursor:'pointer',fontSize:10,fontFamily:'JetBrains Mono,monospace',textTransform:'uppercase'}}>{lv}</button>;})}
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
          <span style={{fontSize:10,color:C.dm,fontFamily:'JetBrains Mono,monospace'}}>{filtered.length} lines</span>
          <label style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer',fontSize:11,color:C.mu}}><input type='checkbox' checked={auto} onChange={e=>sa(e.target.checked)}/> Auto-scroll</label>
          <Btn size='xs' onClick={exportL}>↓ Export</Btn>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',fontFamily:'JetBrains Mono,monospace',fontSize:11,background:C.bg}}>
        {filtered.map(log=>{
          const ls=LLVL[log.level];
          return(
            <div key={log.id} onClick={()=>navigator.clipboard?.writeText(`${fmtTime(log.ts)}  [${log.agentName}]  ${log.message}`)} title='Click to copy' style={{display:'flex',gap:10,padding:'2px 16px',background:ls.bg,cursor:'copy',borderBottom:`1px solid rgba(30,30,34,0.6)`}}>
              <span style={{color:C.dm,flexShrink:0,width:92}}>{fmtTime(log.ts)}</span>
              <span style={{color:C.dm,flexShrink:0,width:82,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>[{log.agentName}]</span>
              <span style={{color:ls.c,flexShrink:0,width:38}}>{ls.l}</span>
              <span style={{color:log.level==='error'?C.re:log.level==='warn'?C.am:C.mu,flex:1}}>{log.message}</span>
            </div>
          );
        })}
        <div ref={bot}/>
        {filtered.length===0&&<div style={{textAlign:'center',padding:40,color:C.dm}}>No logs match current filters</div>}
      </div>
    </div>
  );
};

const CostsPage=({agents})=>{
  const total=agents.reduce((s,a)=>s+a.costToday,0);
  const budget=5.0;
  const pct=total/budget;
  const agColors=[C.ac,'#8b5cf6','#ec4899',C.am,C.gr];
  const donut=agents.map((a,i)=>({name:a.name,value:a.costToday,color:agColors[i%agColors.length]}));
  const tip=({active,payload})=>active&&payload?.length?<div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:4,padding:'5px 9px',fontSize:11,fontFamily:'JetBrains Mono,monospace',color:C.tx}}>${payload[0].value}</div>:null;
  return(
    <div style={{padding:20,overflowY:'auto',height:'100%'}}>
      <div style={{fontWeight:700,fontSize:16,color:C.tx,marginBottom:18}}>Cost Dashboard</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:18}}>
        {[["Today's Spend",`${fmtCost(total)} / ${fmtCost(budget)}`,pct>0.9?C.re:pct>0.7?C.am:C.gr,true],["This Week","$12.40",C.tx,false],["This Month","$47.20",C.tx,false],["All-Time","$203.81",C.tx,false]].map(([l,v,c,bar])=>(
          <div key={l} style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:6,padding:'10px 12px'}}>
            <div style={{fontSize:10,color:C.dm,marginBottom:5,textTransform:'uppercase'}}>{l}</div>
            <div style={{fontSize:18,fontWeight:700,fontFamily:'JetBrains Mono,monospace',color:c,marginBottom:bar?7:0}}>{v}</div>
            {bar&&<div style={{height:3,background:C.bd,borderRadius:2}}><div style={{height:'100%',width:`${Math.min(pct*100,100)}%`,background:pct>0.9?C.re:pct>0.7?C.am:C.gr,borderRadius:2,transition:'width 0.5s'}}/></div>}
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
        <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:6,padding:12}}>
          <div style={{fontSize:12,fontWeight:600,color:C.tx,marginBottom:10}}>Hourly Spend — Today</div>
          <ResponsiveContainer width='100%' height={150}>
            <AreaChart data={HOURLY}><defs><linearGradient id='ag' x1='0' y1='0' x2='0' y2='1'><stop offset='5%' stopColor={C.ac} stopOpacity={0.3}/><stop offset='95%' stopColor={C.ac} stopOpacity={0}/></linearGradient></defs><XAxis dataKey='h' tick={{fontSize:9,fill:C.dm,fontFamily:'JetBrains Mono,monospace'}} tickLine={false} axisLine={false} interval={3}/><YAxis tick={{fontSize:9,fill:C.dm,fontFamily:'JetBrains Mono,monospace'}} tickLine={false} axisLine={false} tickFormatter={v=>`$${v}`}/><Tooltip content={tip}/><Area type='monotone' dataKey='v' stroke={C.ac} fill='url(#ag)' strokeWidth={1.5} dot={false}/></AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:6,padding:12}}>
          <div style={{fontSize:12,fontWeight:600,color:C.tx,marginBottom:10}}>Spend by Agent</div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <ResponsiveContainer width={130} height={130}><PieChart><Pie data={donut} cx='50%' cy='50%' innerRadius={38} outerRadius={60} dataKey='value' paddingAngle={2}>{donut.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie></PieChart></ResponsiveContainer>
            <div style={{flex:1}}>{donut.map((d,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:7,marginBottom:5}}><span style={{width:8,height:8,borderRadius:'50%',background:d.color,flexShrink:0,display:'inline-block'}}/><span style={{fontSize:10,color:C.mu,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:'JetBrains Mono,monospace'}}>{d.name}</span><span style={{fontSize:11,fontFamily:'JetBrains Mono,monospace',color:C.tx}}>{fmtCost(d.value)}</span></div>)}</div>
          </div>
        </div>
      </div>
      <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:6,padding:12,marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:600,color:C.tx,marginBottom:10}}>30-Day Spend</div>
        <ResponsiveContainer width='100%' height={150}>
          <BarChart data={DAILY}><XAxis dataKey='d' tick={{fontSize:9,fill:C.dm,fontFamily:'JetBrains Mono,monospace'}} tickLine={false} axisLine={false} interval={4}/><YAxis tick={{fontSize:9,fill:C.dm,fontFamily:'JetBrains Mono,monospace'}} tickLine={false} axisLine={false} tickFormatter={v=>`$${v}`}/><Tooltip content={tip}/><Bar dataKey='v' fill={C.ac} radius={[2,2,0,0]} opacity={0.8}/></BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:6,padding:12}}>
        <div style={{fontSize:12,fontWeight:600,color:C.tx,marginBottom:10}}>Per-Agent Breakdown</div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>{['Agent','Role','Tokens In','Tokens Out','Cost Today','Status'].map(h=><th key={h} style={{padding:'5px 8px',textAlign:'left',fontSize:10,color:C.dm,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>)}</tr></thead>
          <tbody>{agents.map(a=><tr key={a.id} style={{borderBottom:`1px solid rgba(30,30,34,0.6)`}}><td style={{padding:'7px 8px'}}><span style={{display:'inline-flex',alignItems:'center',gap:6}}><Dot status={a.status} size={6}/><span style={{fontSize:11,fontFamily:'JetBrains Mono,monospace',color:C.tx}}>{a.name}</span></span></td><td style={{padding:'7px 8px'}}><Badge>{a.role}</Badge></td><td style={{padding:'7px 8px',fontFamily:'JetBrains Mono,monospace',fontSize:11,color:C.mu}}>{fmtK(a.tokensIn)}</td><td style={{padding:'7px 8px',fontFamily:'JetBrains Mono,monospace',fontSize:11,color:C.mu}}>{fmtK(a.tokensOut)}</td><td style={{padding:'7px 8px',fontFamily:'JetBrains Mono,monospace',fontSize:11,color:C.gr,fontWeight:600}}>{fmtCost(a.costToday)}</td><td style={{padding:'7px 8px',fontFamily:'JetBrains Mono,monospace',fontSize:10,color:a.status==='active'?C.gr:a.status==='error'?C.re:a.status==='idle'?C.am:C.dm}}>{a.status}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
};

const HealthPage=({conn})=>{
  const [m,sm]=useState({cpu:[45,52,48,61,55,70,65,58],mem:847,db:2.4,q:3,ws:4,up:99.94});
  useEffect(()=>{const iv=setInterval(()=>sm(x=>({...x,cpu:[...x.cpu.slice(1),Math.floor(Math.random()*40+25)],mem:Math.floor(Math.random()*200+680),q:Math.floor(Math.random()*12)})),3000);return()=>clearInterval(iv);},[]);
  const cpuD=m.cpu.map((v,i)=>({i,v}));
  const tip=({active,payload})=>active&&payload?.[0]?<div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:3,padding:'4px 8px',fontSize:11,fontFamily:'JetBrains Mono,monospace',color:C.tx}}>{payload[0].value}%</div>:null;
  return(
    <div style={{padding:20,overflowY:'auto',height:'100%'}}>
      <div style={{fontWeight:700,fontSize:16,color:C.tx,marginBottom:18}}>System Health</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
        {[['Gateway',conn.toUpperCase(),conn==='connected'?C.gr:conn==='reconnecting'?C.am:C.re],['Uptime',`${m.up}%`,C.gr],['WS Connections',m.ws,C.ac],['Memory',`${m.mem}MB`,m.mem>900?C.re:m.mem>800?C.am:C.gr],['Event Queue',`${m.q} buffered`,m.q>10?C.am:C.gr],['DB Size',`${m.db}MB`,C.tx]].map(([l,v,c])=>(
          <div key={l} style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:6,padding:'10px 12px'}}>
            <div style={{fontSize:10,color:C.dm,marginBottom:4,textTransform:'uppercase'}}>{l}</div>
            <div style={{fontSize:22,fontWeight:700,fontFamily:'JetBrains Mono,monospace',color:c}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:6,padding:12,marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:600,color:C.tx,marginBottom:10}}>CPU Usage (live — updates every 3s)</div>
        <ResponsiveContainer width='100%' height={120}><AreaChart data={cpuD}><defs><linearGradient id='cg' x1='0' y1='0' x2='0' y2='1'><stop offset='5%' stopColor={C.gr} stopOpacity={0.3}/><stop offset='95%' stopColor={C.gr} stopOpacity={0}/></linearGradient></defs><XAxis dataKey='i' hide/><YAxis domain={[0,100]} tick={{fontSize:9,fill:C.dm}} tickLine={false} axisLine={false} tickFormatter={v=>`${v}%`}/><Tooltip content={tip}/><Area type='monotone' dataKey='v' stroke={C.gr} fill='url(#cg)' strokeWidth={1.5} dot={false}/></AreaChart></ResponsiveContainer>
      </div>
      <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:6,padding:12}}>
        <div style={{fontSize:12,fontWeight:600,color:C.tx,marginBottom:10}}>Active Alert Rules</div>
        {[['Builder cost > $1.50/hr',C.gr,'monitoring'],['Any agent → ERROR status',C.am,'triggered once'],['Error storm: 3+ errors in 60s',C.gr,'monitoring'],['Gateway disconnect',C.gr,'monitoring'],['Budget threshold 80%',C.gr,'monitoring']].map(([rule,c,st],i,a)=>(
          <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 0',borderBottom:i<a.length-1?`1px solid ${C.bd}`:'none'}}>
            <span style={{fontSize:12,color:C.mu}}>{rule}</span>
            <span style={{fontSize:10,fontFamily:'JetBrains Mono,monospace',color:c,background:`${c}18`,padding:'2px 8px',borderRadius:3}}>{st}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CmdPalette=({onClose,tasks,agents,setNav})=>{
  const [q,sq]=useState('');
  const ref=useRef(null);
  useEffect(()=>ref.current?.focus(),[]);
  useEffect(()=>{const h=e=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);},[onClose]);
  const res=useMemo(()=>{
    const lq=q.toLowerCase();
    if(!lq)return[];
    return[
      ...tasks.filter(t=>t.title.toLowerCase().includes(lq)).slice(0,4).map(t=>({icon:'◫',label:t.title,sub:t.status,go:()=>setNav('tasks')})),
      ...agents.filter(a=>a.name.toLowerCase().includes(lq)).slice(0,3).map(a=>({icon:'◉',label:a.name,sub:a.status,go:()=>setNav('agents')})),
      ...['tasks','agents','approvals','logs','costs','health'].filter(p=>p.includes(lq)).map(p=>({icon:'→',label:`Go to ${p}`,sub:'navigation',go:()=>setNav(p)})),
    ].slice(0,8);
  },[q,tasks,agents]);
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:'14vh',zIndex:2000}}>
      <div style={{background:C.sf,border:`1px solid ${C.bd2}`,borderRadius:8,width:500,boxShadow:'0 20px 60px rgba(0,0,0,0.6)',overflow:'hidden'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderBottom:`1px solid ${C.bd}`}}>
          <span style={{color:C.dm,fontSize:15}}>⌘</span>
          <input ref={ref} value={q} onChange={e=>sq(e.target.value)} placeholder='Search tasks, agents, navigate...' style={{flex:1,background:'none',border:'none',color:C.tx,fontSize:14,fontFamily:'Inter,sans-serif',outline:'none'}}/>
          <span style={{fontSize:10,color:C.dm,background:C.bd,padding:'2px 6px',borderRadius:3,fontFamily:'JetBrains Mono,monospace'}}>ESC</span>
        </div>
        <div style={{padding:6,minHeight:60}}>
          {!q&&<div style={{textAlign:'center',padding:'18px 0',color:C.dm,fontSize:12}}>Start typing to search tasks, agents, and pages...</div>}
          {q&&res.length===0&&<div style={{textAlign:'center',padding:'18px 0',color:C.dm,fontSize:12}}>No results for "{q}"</div>}
          {res.map((r,i)=>(
            <button key={i} onClick={()=>{r.go();onClose();}} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'8px 10px',background:'transparent',border:'none',borderRadius:4,cursor:'pointer',textAlign:'left'}}>
              <span style={{fontSize:13,color:C.dm}}>{r.icon}</span>
              <span style={{flex:1,fontSize:13,color:C.tx}}>{r.label}</span>
              <span style={{fontSize:11,color:C.dm,fontFamily:'JetBrains Mono,monospace'}}>{r.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const LOG_POOL=[
  a=>({level:'info',message:`Analyzing ${['pricing.ts','auth.js','config.json','worker.py','routes/api.ts'][Math.floor(Math.random()*5)]} (${(Math.random()*50+0.5).toFixed(1)} KB)`}),
  a=>({level:'info',message:`Tool call: ${['read_file','bash_exec','web_search','git_diff','write_file'][Math.floor(Math.random()*5)]}`}),
  a=>({level:'ok',message:`Step ${Math.floor(Math.random()*4+1)}/${Math.floor(Math.random()*3+5)} complete`}),
  a=>({level:'warn',message:`Rate limit at ${Math.floor(Math.random()*30+65)}% — ${Math.floor(Math.random()*8+2)} requests remaining`}),
  a=>({level:'info',message:`Generated ${Math.floor(Math.random()*200+50)} tokens in response`}),
  a=>({level:'info',message:`git ${['commit -m "feat: update"','diff HEAD~1','log --oneline -5','status'][Math.floor(Math.random()*4)]}`}),
];

export default function App(){
  const [nav,sNav]=useState('tasks');
  const [gw,sgw]=useState('ws://localhost:18789');
  const [conn,sc]=useState('connected');
  const [attempt,sat]=useState(0);
  const [agents,sa]=useState(AGENTS0);
  const [tasks,st]=useState(TASKS0);
  const [approvals,sap]=useState(APPROVALS0);
  const [logs,sl]=useState(LOGS0);
  const [cmd,scmd]=useState(false);

  useEffect(()=>{
    const lv=setInterval(()=>{
      const active=agents.filter(a=>a.status==='active'||a.status==='idle');
      if(!active.length)return;
      const ag=active[Math.floor(Math.random()*active.length)];
      const {level,message}=LOG_POOL[Math.floor(Math.random()*LOG_POOL.length)](ag);
      sl(p=>[...p.slice(-1999),{id:uid(),agentId:ag.id,agentName:ag.name.split('-')[0],level,message,ts:Date.now()}]);
      if(Math.random()<0.25)sa(p=>p.map(a=>a.id===ag.id?{...a,costToday:parseFloat((a.costToday+Math.random()*0.004).toFixed(4)),tokensIn:a.tokensIn+Math.floor(Math.random()*400+80),tokensOut:a.tokensOut+Math.floor(Math.random()*150+30)}:a));
    },2200);
    const wv=setInterval(()=>{
      if(Math.random()<0.04){
        sc('reconnecting');sat(1);
        setTimeout(()=>sat(2),2000);
        setTimeout(()=>{sc('connected');sat(0);},5000);
      }
    },18000);
    const pv=setInterval(()=>{
      st(p=>p.map(t=>t.status!=='in_progress'&&t.status!=='testing'?t:{...t,progress:Math.min(t.progress+Math.floor(Math.random()*4+1),99),updatedAt:Date.now()}));
    },6000);
    return()=>{clearInterval(lv);clearInterval(wv);clearInterval(pv);};
  },[]);

  useEffect(()=>{
    const h=e=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();scmd(p=>!p);}};
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);
  },[]);

  const pending=approvals.filter(a=>a.status==='pending').length;
  return(
    <>
      <style>{css}</style>
      <div style={{background:C.bg,color:C.tx,height:'100vh',display:'flex',flexDirection:'column',fontFamily:'Inter,sans-serif',fontSize:13}}>
        <StatusBar conn={conn} attempt={attempt} gwUrl={gw} setGwUrl={sgw}/>
        <div style={{display:'flex',flex:1,overflow:'hidden'}}>
          <Sidebar nav={nav} setNav={sNav} agents={agents} pending={pending}/>
          <main style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
            {nav==='tasks'&&<TasksPage tasks={tasks} agents={agents} setTasks={st}/>}
            {nav==='agents'&&<AgentsPage agents={agents} setAgents={sa}/>}
            {nav==='approvals'&&<ApprovalsPage approvals={approvals} setApprovals={sap}/>}
            {nav==='logs'&&<LogsPage logs={logs} agents={agents}/>}
            {nav==='costs'&&<CostsPage agents={agents}/>}
            {nav==='health'&&<HealthPage conn={conn}/>}
          </main>
        </div>
      </div>
      {cmd&&<CmdPalette onClose={()=>scmd(false)} tasks={tasks} agents={agents} setNav={p=>{sNav(p);scmd(false);}}/>}
    </>
  );
}
