import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { Web3Storage } from 'web3.storage';

import BDAG_ABI from '../abis/BDAG.json';
import LEX_ABI from '../abis/LexChainRegistry.json';

const BDAG_ADDRESS = process.env.NEXT_PUBLIC_BDAG_ADDRESS;
const LEX_ADDRESS = process.env.NEXT_PUBLIC_LEX_ADDRESS;

function makeStorageClient() { return new Web3Storage({ token: process.env.NEXT_PUBLIC_WEB3STORAGE_TOKEN }); }

export default function Home(){
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState('');
  const [bdag, setBdag] = useState(null);
  const [lex, setLex] = useState(null);
  const [file, setFile] = useState(null);
  const [docHash, setDocHash] = useState('');
  const [meta, setMeta] = useState('');
  const [grantee, setGrantee] = useState('');
  const [keyHash, setKeyHash] = useState('');
  const [logs, setLogs] = useState([]);
  const [balance, setBalance] = useState('0');

  useEffect(()=>{ if(window.ethereum){ const prov = new ethers.BrowserProvider(window.ethereum); setProvider(prov); } },[]);

  const connect = async ()=>{
    if(!provider) return alert('Install MetaMask');
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const s = await provider.getSigner();
    const addr = await s.getAddress();
    setSigner(s); setAccount(addr);
    const b = new ethers.Contract(BDAG_ADDRESS, BDAG_ABI, s);
    const l = new ethers.Contract(LEX_ADDRESS, LEX_ABI, s);
    setBdag(b); setLex(l);
    setLogs(lgs=>['Connected: '+addr, ...lgs]);
    try { const bal = await b.balanceOf(addr); setBalance(ethers.formatUnits(bal, 18)); } catch(e){ console.log('balance fetch failed', e); }
  }

  const uploadToIPFS = async ()=>{ if(!file) return null; const client = makeStorageClient(); const cid = await client.put([new File([file], file.name)]); return cid; }

  const upload = async ()=>{
    try{
      if(!lex) return alert('Connect wallet first');
      const cid = file ? await uploadToIPFS() : null;
      const hash = cid || docHash;
      const tx = await lex.uploadDocument(hash, meta);
      await tx.wait();
      setLogs(l=>[`Uploaded ${hash}`, ...l]);
    }catch(e){ console.error(e); alert(e.message || e); }
  }

  const grant = async ()=>{ try{ if(!lex) return alert('Connect wallet'); const duration = 60*60*24*7; const tx = await lex.grantAccess(docHash, grantee, duration); await tx.wait(); setLogs(l=>[`Granted ${grantee} access to ${docHash}`, ...l]); }catch(e){ console.error(e); alert(e.message || e); } }
  const revoke = async ()=>{ try{ if(!lex) return alert('Connect wallet'); const tx = await lex.revokeAccess(docHash, grantee); await tx.wait(); setLogs(l=>[`Revoked ${grantee} access to ${docHash}`, ...l]); }catch(e){ console.error(e); alert(e.message || e); } }
  const activateEmergency = async ()=>{ try{ if(!lex) return alert('Connect wallet'); const tx = await lex.activateEmergency(docHash, keyHash); await tx.wait(); setLogs(l=>[`Emergency activated for ${docHash}`, ...l]); }catch(e){ console.error(e); alert(e.message || e); } }
  const checkAccess = async ()=>{ try{ if(!lex) return alert('Connect wallet'); const has = await lex.hasAccess(account, docHash); setLogs(l=>[`You have access to ${docHash}: ${has}`, ...l]); }catch(e){ console.error(e); alert(e.message || e); } }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, Arial', padding: 24, background: 'linear-gradient(180deg,#0f172a,#0b1220)', minHeight: '100vh', color: '#fff' }}>
      <header style={{ maxWidth: 1100, margin: '0 auto 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>LexChain</h1>
          <div style={{ color: '#9ca3af', fontSize: 14 }}>Document registry — BlockDAG Testnet</div>
        </div>
        <div>
          {!account ? <button onClick={connect} style={{ background: '#2563eb', padding: '8px 12px', borderRadius: 6 }}>Connect Wallet</button> : <div style={{ textAlign: 'right' }}><div>{account}</div><div style={{ fontSize:12,color:'#9ca3af' }}>BDAG Balance: {balance}</div></div>}
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <section style={{ background: 'rgba(15,23,42,0.6)', padding: 18, borderRadius: 12 }}>
          <h2>Upload Document</h2>
          <input type="file" onChange={(e)=>setFile(e.target.files[0])} style={{ display:'block', marginBottom:8 }} />
          <input placeholder="or enter document hash" value={docHash} onChange={e=>setDocHash(e.target.value)} style={{ width:'100%', padding:8, marginBottom:8 }} />
          <input placeholder="metadata (title)" value={meta} onChange={e=>setMeta(e.target.value)} style={{ width:'100%', padding:8, marginBottom:8 }} />
          <button onClick={upload} style={{ background:'#16a34a', padding:'8px 12px', borderRadius:8 }}>Upload</button>
        </section>

        <section style={{ background: 'rgba(15,23,42,0.6)', padding: 18, borderRadius: 12 }}>
          <h2>Manage Access</h2>
          <input placeholder="document hash" value={docHash} onChange={e=>setDocHash(e.target.value)} style={{ width:'100%', padding:8, marginBottom:8 }} />
          <input placeholder="grantee address" value={grantee} onChange={e=>setGrantee(e.target.value)} style={{ width:'100%', padding:8, marginBottom:8 }} />
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={grant} style={{ background:'#4f46e5', padding:'8px 12px', borderRadius:8 }}>Grant</button>
            <button onClick={revoke} style={{ background:'#ef4444', padding:'8px 12px', borderRadius:8 }}>Revoke</button>
          </div>

          <hr style={{ margin:'12px 0', borderColor:'#1f2937' }} />
          <h3>Emergency</h3>
          <input placeholder="emergency key hash" value={keyHash} onChange={e=>setKeyHash(e.target.value)} style={{ width:'100%', padding:8, marginBottom:8 }} />
          <button onClick={activateEmergency} style={{ background:'#dc2626', padding:'8px 12px', borderRadius:8 }}>Activate Emergency</button>

          <hr style={{ margin:'12px 0', borderColor:'#1f2937' }} />
          <button onClick={checkAccess} style={{ background:'#f59e0b', padding:'8px 12px', borderRadius:8, marginTop:8 }}>Check My Access</button>
        </section>

        <section style={{ gridColumn: '1 / -1', background: 'rgba(15,23,42,0.6)', padding: 18, borderRadius: 12 }}>
          <h3>Activity Log</h3>
          <div style={{ maxHeight: 220, overflow: 'auto' }}>
            {logs.map((l,i)=>(<div key={i} style={{ padding:8, background:'#0b1220', marginBottom:6, borderRadius:6 }}>{l}</div>))}
          </div>
        </section>
      </main>

      <footer style={{ textAlign:'center', marginTop:24, color:'#9ca3af' }}>LexChain — Prepared for BlockDAG Testnet</footer>
    </div>
  );
}
