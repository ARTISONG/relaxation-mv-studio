import { useState, useRef, useEffect, useCallback } from "react";
import { analyzeBands } from "./utils/audio.js";
import { RENDER_MAP, TRAIL_MODES, resetState } from "./visualizers/index.js";
import { renderSongTitle } from "./visualizers/songTitle.js";

/* ═══════════════════════════════════════════════════════════
   MOTION DEFINITIONS
   ═══════════════════════════════════════════════════════════ */
const MOTIONS = [
  { id:"ethereal_breath", name:"Dust Particles", nameTh:"ละอองฝุ่นเรืองแสง", icon:"◉",
    desc:"อนุภาคฝุ่นจำนวนมากลอยฟุ้งในอากาศ เคลื่อนไหวตามจังหวะเพลง — Bass ผลักกระจาย, Mid เปลี่ยนทิศ, Brilliance จุดประกายแสง — Brownian Motion ที่มีจิตวิญญาณ",
    research:"Polyvagal Theory — Porges · Stochastic Visual Relaxation", palette:[[25,18,8],[212,175,55],[245,230,163]], trail:false },
  { id:"liquid_aurora", name:"Harmonic Waves", nameTh:"คลื่นเสียงหลายมิติ", icon:"◇",
    desc:"คลื่นเสียงเส้นเดียวซ้อนกัน 12 ชั้นด้วย turbulence — แต่ละชั้นมีสี ขนาด ความโค้งต่างกันตาม frequency band — สร้างมิติของแสงเสียงที่ dynamic",
    research:"Cymatics & Sound Visualization — Hans Jenny", palette:[[15,40,45],[46,139,139],[110,207,207]], trail:false },
  { id:"sacred_geometry", name:"Hyper Polyhedra", nameTh:"ทรงเรขาหลายมิติ", icon:"✦",
    desc:"ทรง Icosahedron ซ้อนทรง Dodecahedron หมุน 3 แกนใน 3D ฉายลง 2D — จุดยอดเรืองแสง สันเส้นเปลี่ยนสีตาม frequency band พร้อม morphing vertices",
    research:"Fractal Fluency — Richard Taylor, 2006", palette:[[20,15,8],[201,169,110],[236,217,161]], trail:false },
  { id:"cosmic_flow", name:"Cosmic Flow Field", nameTh:"สนามพลังจักรวาล", icon:"⋆",
    desc:"อนุภาค 2,000 ตัวไหลตาม Noise Flow Field — Presence ควบคุมทิศ Bass สร้าง glow ทิ้ง trail สะสมเป็นลายเส้นจักรวาล",
    research:"Alpha Wave Entrainment — Neuroscience Letters", palette:[[5,5,15],[100,140,200],[200,220,255]], trail:true },
  { id:"deep_ocean", name:"Deep Ocean Pulse", nameTh:"ชีพจรมหาสมุทร", icon:"∿",
    desc:"คลื่น interference 8 ชั้น + bioluminescence + actual waveform — Sub-Bass สั่นสะเทือนมหาสมุทร",
    research:"Theta Oscillation — Sleep Medicine Reviews", palette:[[5,15,25],[20,80,120],[60,160,200]], trail:false },
  { id:"nebula_consciousness", name:"Plasma Duo", nameTh:"หยินหยางพลาสม่า", icon:"◎",
    desc:"ก้อน Plasma ขนาดใหญ่ 2 ก้อนโคจรรอบกันแบบหยินหยาง — เมื่อเข้าใกล้จะยืดตัวเข้าหาและเรืองแสง Bass ผลักให้แยก Mid เปลี่ยนสี — เหมือนน้ำมันกับน้ำเต้นรำด้วยกัน",
    research:"Awe & DMN Suppression — Keltner & Haidt, 2003", palette:[[10,5,20],[139,110,199],[200,170,255]], trail:false },
  { id:"rain_drops", name:"Rain Drops", nameTh:"หยาดฝนเรืองแสง", icon:"⊹",
    desc:"สายฝนตกลงมาหลายชั้นความลึก — Bass ทำให้ฝนตกหนัก Mid เปลี่ยนทิศลม Brilliance จุดประกายหยดน้ำ — เมื่อกระทบพื้นเกิด ripple วงน้ำกระจาย",
    research:"Pink Noise & Sleep Onset — Journal of Theoretical Biology", palette:[[8,12,20],[80,130,180],[150,200,240]], trail:false },
  { id:"audio_spectrum", name:"Ambient Spectrum", nameTh:"สเปกตรัมแสงเสียง", icon:"≋",
    desc:"Audio Spectrum แบบ organic — แท่งความถี่โค้งมนเรืองแสง มี reflection สะท้อนน้ำ + ambient glow ตาม energy — ไม่ใช่ equalizer ทั่วไป แต่เป็นงานศิลป์จากเสียง",
    research:"Synesthesia & Relaxation — Cytowic, 2002", palette:[[5,8,18],[60,120,180],[140,190,230]], trail:false },
  { id:"nakhwa_fire", name:"Nakhwa Fire Blossom", nameTh:"นัคฮวา ดอกไม้ไฟโบราณ", icon:"✿",
    desc:"จำลองเทศกาล Haman Nakhwa (함안 낙화놀이) — ประกายไฟทองร่วงหล่นจากสายลวดเหนือผืนน้ำ สะท้อนแสงบนผิวน้ำมืด — Bass จุดไฟ Mid เปลี่ยนลม Brilliance ส่องประกาย",
    research:"Joseon Dynasty Nakhwanori · Intangible Cultural Heritage", palette:[[10,5,2],[255,180,50],[255,220,120]], trail:false },
  { id:"ring_spectrum", name:"Ring Spectrum", nameTh:"ฉัพพรรณรังสี", icon:"◎",
    desc:"วงแหวน 6 ชั้นตามพุทธรังสี — นีล ปีต โลหิต โอทาต มัญเชฐ ประภัสสร — แผ่รัศมีเหมือน Sun Ray ขยาย-หดตาม beat ปรับมืด-สว่างตาม dB",
    research:"ฉัพพรรณรังสี · Gestalt Proximity · Circular Audio Viz", palette:[[5,5,20],[80,140,220],[160,200,255]], trail:false },
];

/* ═══════════════════════════════════════════════════════════
   DOWNLOAD HELPER
   ═══════════════════════════════════════════════════════════ */
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_self";
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* ═══════════════════════════════════════════════════════════
   BUTTON COMPONENT (outside App to prevent remount on re-render)
   ═══════════════════════════════════════════════════════════ */
const Btn=({children,primary,disabled,onClick,sx})=>(
  <button onClick={onClick} disabled={disabled} style={{
    background:primary?(disabled?"#1A1814":"linear-gradient(135deg,#D4AF37,#B8973A)"):"transparent",
    color:primary?(disabled?"#6A6050":"#080604"):"#C8C4BE",
    border:primary?"none":"1px solid #2A2520",padding:"12px 32px",borderRadius:6,fontSize:15,
    fontFamily:"'Sarabun',sans-serif",fontWeight:primary?600:400,
    cursor:disabled?"default":"pointer",letterSpacing:0.5,transition:"all 0.3s",...sx
  }}>{children}</button>
);

/* ═══════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════ */
export default function App() {
  const [motion, setMotion] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [audioName, setAudioName] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [songTitle2, setSongTitle2] = useState("");
  const [loops, setLoops] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProg, setExportProg] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [downloadName, setDownloadName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [resolution, setResolution] = useState("1080p");
  const [step, setStep] = useState(1);
  const [showTitle, setShowTitle] = useState(true);
  const [bandLevels, setBandLevels] = useState(null);
  const [titlePos, setTitlePos] = useState("bottom-center");
  const [titleFontSize, setTitleFontSize] = useState(50);
  const [titleFontSize2, setTitleFontSize2] = useState(30);
  const [endLogo, setEndLogo] = useState(null); // HTMLImageElement

  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const audioBufferRef = useRef(null);
  const fileRef = useRef(null);
  const startTRef = useRef(0);
  const exportTimerRef = useRef(null);
  const downloadBlobRef = useRef(null);

  const RES = {"720p":[1280,720],"1080p":[1920,1080],"1440p":[2560,1440]};

  // Stop preview/audio only — does NOT touch exporting state
  const stopPreviewOnly = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current); animRef.current = null;
    if (exportTimerRef.current) { cancelAnimationFrame(exportTimerRef.current); clearTimeout(exportTimerRef.current); } exportTimerRef.current = null;
    if (sourceRef.current) { try{sourceRef.current.stop()}catch(e){} sourceRef.current=null; }
    setPlaying(false); setBandLevels(null); resetState();
  }, []);

  // Full stop including exporting reset
  const stopAll = useCallback(() => {
    stopPreviewOnly();
    setExporting(false);
  }, [stopPreviewOnly]);

  const startPreview = useCallback(() => {
    if (!motion) return; stopAll();
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const [cw,ch] = RES[resolution]; canvas.width=cw; canvas.height=ch;
    const renderFn = RENDER_MAP[motion]; if (!renderFn) return;
    let analyser=null, sampleRate=44100;
    if (audioBufferRef.current) {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const actx = audioCtxRef.current; sampleRate=actx.sampleRate;
      analyser = actx.createAnalyser(); analyser.fftSize=2048; analyser.smoothingTimeConstant=0.82;
      const src = actx.createBufferSource(); src.buffer=audioBufferRef.current; src.loop=true;
      src.connect(analyser); analyser.connect(actx.destination);
      src.start(0); sourceRef.current=src;
    }
    const useTrail = TRAIL_MODES.has(motion);
    startTRef.current=0; let fc=0;
    const loop = (ts) => {
      if (!startTRef.current) startTRef.current=ts;
      const elapsed = ts-startTRef.current;
      const bands = analyzeBands(analyser, sampleRate);
      if (fc%3===0) setBandLevels(bands);
      if (useTrail) { ctx.fillStyle="rgba(0,0,0,0.08)"; ctx.fillRect(0,0,cw,ch); }
      else { ctx.fillStyle="#000"; ctx.fillRect(0,0,cw,ch); }
      renderFn(ctx,cw,ch,elapsed,bands);
      if (showTitle) renderSongTitle(ctx,cw,ch,songTitle||audioName,songTitle2,bands,elapsed,titlePos,titleFontSize,titleFontSize2);
      fc++; animRef.current=requestAnimationFrame(loop);
    };
    animRef.current=requestAnimationFrame(loop); setPlaying(true);
  }, [motion,resolution,audioName,songTitle,songTitle2,showTitle,titlePos,titleFontSize,titleFontSize2,stopAll]);

  const handleFile = useCallback(async(file) => {
    if (!file || !file.type.startsWith("audio/")) return;
    setAudioFile(file); setAudioName(file.name);
    setSongTitle(file.name.replace(/\.[^/.]+$/,"").replace(/[-_]/g," "));
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    audioBufferRef.current = await audioCtxRef.current.decodeAudioData(await file.arrayBuffer());
  },[]);

  const handleLogoFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const img = new Image();
    img.onload = () => setEndLogo(img);
    img.src = URL.createObjectURL(file);
  },[]);

  const generateCover = useCallback(() => {
    const src = canvasRef.current;
    if (!src) return;

    const cw = 1280, ch = 720;
    const cover = document.createElement("canvas");
    cover.width = cw; cover.height = ch;
    const ctx = cover.getContext("2d");

    ctx.drawImage(src, 0, 0, cw, ch);

    // Vignette
    const vig = ctx.createRadialGradient(cw/2, ch/2, cw*0.25, cw/2, ch/2, cw*0.7);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, cw, ch);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const tx = cw / 2;

    const title1 = songTitle || audioName || "Relaxation";
    const title2Text = songTitle2 || "";

    const calcCoverFs = (text, pct) => {
      let fs = Math.round(cw * 0.15);
      ctx.font = `800 ${fs}px "Sarabun", sans-serif`;
      let m = ctx.measureText(text).width;
      const target = cw * (pct / 100);
      if (m > target && m > 0) fs = Math.round(fs * (target / m));
      fs = Math.max(16, Math.min(fs, ch * 0.35));
      ctx.font = `800 ${fs}px "Sarabun", sans-serif`;
      m = ctx.measureText(text).width;
      return { fs, measured: m, textH: fs * 0.85 };
    };

    const l1 = calcCoverFs(title1, titleFontSize);
    const l2 = title2Text ? calcCoverFs(title2Text, titleFontSize2) : null;
    const gap = l2 ? Math.max(l1.fs, l2.fs) * 0.15 : 0;
    const totalH = l1.textH + gap + (l2 ? l2.textH : 0);
    const cy2 = ch / 2;
    const y1 = l2 ? cy2 - totalH/2 + l1.textH/2 : cy2;
    const y2 = l2 ? cy2 + totalH/2 - l2.textH/2 : 0;

    const drawCoverLine = (text, info, ty) => {
      ctx.font = `800 ${info.fs}px "Sarabun", sans-serif`;
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 40; ctx.shadowOffsetY = 4;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillText(text, tx, ty + 3);
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      const tg = ctx.createLinearGradient(tx - info.measured/2, ty - info.fs/2, tx + info.measured/2, ty + info.fs/2);
      tg.addColorStop(0, "rgba(255,255,255,0.95)");
      tg.addColorStop(0.4, "rgba(220,220,220,0.9)");
      tg.addColorStop(0.7, "rgba(180,180,180,0.85)");
      tg.addColorStop(1, "rgba(140,140,140,0.8)");
      ctx.fillStyle = tg; ctx.fillText(text, tx, ty);
      const hg = ctx.createLinearGradient(0, ty - info.fs*0.4, 0, ty);
      hg.addColorStop(0, "rgba(255,255,255,0.3)");
      hg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = hg; ctx.fillText(text, tx, ty);
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1; ctx.strokeText(text, tx, ty);
    };

    drawCoverLine(title1, l1, y1);
    if (l2 && title2Text) drawCoverLine(title2Text, l2, y2);

    const refInfo = l2 || l1;
    const refText = title2Text || title1;
    const refTy = l2 ? y2 : y1;
    const refY = refTy + refInfo.textH * 0.5;
    ctx.save();
    ctx.translate(0, refY); ctx.scale(1, -1); ctx.translate(0, -refY);
    ctx.font = `800 ${refInfo.fs}px "Sarabun", sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const rg = ctx.createLinearGradient(0, refTy - refInfo.textH*0.4, 0, refTy + refInfo.textH*0.4);
    rg.addColorStop(0, "rgba(80,80,80,0)");
    rg.addColorStop(1, "rgba(200,200,200,0.15)");
    ctx.fillStyle = rg; ctx.fillText(refText, tx, refTy);
    ctx.restore();

    cover.toBlob((blob) => {
      if (!blob) return;
      const fname = `${(songTitle||"cover").replace(/\s+/g,"-")}-cover.png`;
      downloadBlobRef.current = { blob, name: fname };
      triggerDownload(blob, fname);
      setTimeout(() => {
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setDownloadName(fname);
      }, 500);
    }, "image/png");
  }, [songTitle, songTitle2, audioName, titleFontSize, titleFontSize2]);

  const handleExport = useCallback(async() => {
    if (!motion) return;
    setExporting(true); setExportProg(0); stopPreviewOnly();
    let rec = null;
    try {
    const [cw,ch]=RES[resolution]; const off=document.createElement("canvas");
    off.width=cw; off.height=ch; const octx=off.getContext("2d");
    const renderFn=RENDER_MAP[motion];
    const dur = audioBufferRef.current?audioBufferRef.current.duration:60;
    const totalDur=dur*loops; const stream=off.captureStream(30);
    let analyser=null,sampleRate=44100;
    let hasAudio = false;
    let exportGain = null;
    if (audioBufferRef.current) {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const actx=audioCtxRef.current;
      await actx.resume();
      sampleRate=actx.sampleRate;
      analyser=actx.createAnalyser(); analyser.fftSize=2048; analyser.smoothingTimeConstant=0.82;
      exportGain=actx.createGain(); exportGain.gain.value=1;
      const dest=actx.createMediaStreamDestination();
      const src=actx.createBufferSource(); src.buffer=audioBufferRef.current; src.loop=true;
      src.connect(analyser); analyser.connect(exportGain);
      exportGain.connect(dest); exportGain.connect(actx.destination);
      src.start(0); sourceRef.current=src;
      dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
      hasAudio = stream.getAudioTracks().length > 0;
    }
    const mimeType = hasAudio ? "video/webm;codecs=vp9,opus" : "video/webm;codecs=vp9";
    rec=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:30000000});
    const chunks=[]; rec.ondataavailable=e=>{if(e.data.size>0)chunks.push(e.data)};
    const done=new Promise(r=>{rec.onstop=r}); rec.start(100);
    const useTrail=TRAIL_MODES.has(motion); resetState();
    const visCanvas=canvasRef.current;
    const visCtx=visCanvas?visCanvas.getContext("2d"):null;
    if(visCanvas){visCanvas.width=cw;visCanvas.height=ch;}
    const exportStartTime = Date.now();
    const totalMs = totalDur * 1000;
    let lastProgUpdate = 0;
    await new Promise((resolveRender)=>{
      const render=()=>{
        const elapsed = Date.now() - exportStartTime;
        if(elapsed >= totalMs){
          try{rec.stop();}catch(e){}
          if(sourceRef.current){try{sourceRef.current.stop()}catch(e){}sourceRef.current=null;}
          resolveRender(); return;
        }
        const t = elapsed;
        const bands=analyzeBands(analyser,sampleRate);
        if(useTrail){octx.fillStyle="rgba(0,0,0,0.08)";octx.fillRect(0,0,cw,ch)}
        else{octx.fillStyle="#000";octx.fillRect(0,0,cw,ch)}
        renderFn(octx,cw,ch,t,bands);
        if(showTitle)renderSongTitle(octx,cw,ch,songTitle||audioName,songTitle2,bands,t,titlePos,titleFontSize,titleFontSize2);
        const fadeMs = 15000;
        const remaining = totalMs - elapsed;
        if(remaining < fadeMs){
          const fadeAlpha = 1 - (remaining / fadeMs);
          octx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
          octx.fillRect(0,0,cw,ch);
          if(exportGain) exportGain.gain.value = 1 - fadeAlpha;
          if(endLogo && remaining < fadeMs * 0.67){
            const logoFadeIn = 1 - (remaining / (fadeMs * 0.67));
            const logoAlpha = Math.min(1, logoFadeIn * 2) * (1 - Math.max(0, logoFadeIn - 0.7) / 0.3);
            const maxLogoH = ch * 0.2;
            const logoScale = Math.min(maxLogoH / endLogo.height, (cw * 0.3) / endLogo.width);
            const logoW = endLogo.width * logoScale;
            const logoH = endLogo.height * logoScale;
            octx.globalAlpha = logoAlpha * 0.9;
            octx.drawImage(endLogo, (cw - logoW)/2, (ch - logoH)/2, logoW, logoH);
            octx.globalAlpha = 1;
          }
        }
        if(visCtx)visCtx.drawImage(off,0,0);
        if(elapsed - lastProgUpdate > 500){
          lastProgUpdate = elapsed;
          setExportProg(Math.min(100, Math.round((elapsed / totalMs) * 100)));
        }
        exportTimerRef.current = requestAnimationFrame(render);
      };
      exportTimerRef.current = requestAnimationFrame(render);
    });
    await done;
    console.log("Export done. Chunks:", chunks.length, "Total size:", chunks.reduce((s,c)=>s+c.size,0));
    if(chunks.length === 0){
      console.error("No data recorded!");
      return;
    }
    const blob=new Blob(chunks,{type:"video/webm"});
    console.log("Blob size:", blob.size);
    const fname=`${(songTitle||"relaxation-mv").replace(/\s+/g,"-")}-${motion}.webm`;
    downloadBlobRef.current = { blob, name: fname };
    const url=URL.createObjectURL(blob);
    setDownloadUrl(url);
    setDownloadName(fname);
    } catch(err) {
      console.error("Export error:", err);
      if(rec && rec.state==="recording") try{rec.stop();}catch(e){}
      if(sourceRef.current){try{sourceRef.current.stop()}catch(e){}sourceRef.current=null;}
    } finally {
      setExporting(false);
      exportTimerRef.current = null;
    }
  },[motion,loops,resolution,audioName,songTitle,songTitle2,showTitle,titlePos,titleFontSize,titleFontSize2,endLogo,stopPreviewOnly]);

  useEffect(()=>()=>stopAll(),[stopAll]);

  // Set canvas size when step 3 loads
  useEffect(()=>{
    if(step===3 && canvasRef.current){
      const [cw,ch]=RES[resolution];
      canvasRef.current.width=cw;
      canvasRef.current.height=ch;
      const ctx=canvasRef.current.getContext("2d");
      ctx.fillStyle="#000";
      ctx.fillRect(0,0,cw,ch);
    }
  },[step,resolution]);

  const mData = MOTIONS.find(m=>m.id===motion);
  const bandNames=["Sub","Bass","Low","Mid","Hi","Pres","Air"];
  const bandKeys=["subBass","bass","lowMid","mid","highMid","presence","brilliance"];

  const gold = (a=1) => `rgba(212,175,55,${a})`;

  return (
    <div style={{minHeight:"100vh",background:"#030201",color:"#F0EDE8",fontFamily:"'Cormorant Garamond','Sarabun',Georgia,serif",position:"relative",overflowY:"auto"}}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300&family=Sarabun:wght@200;300;400;600&display=swap" rel="stylesheet"/>
      <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:0,background:"radial-gradient(ellipse at 30% 20%,rgba(212,175,55,0.015) 0%,transparent 50%),radial-gradient(ellipse at 70% 80%,rgba(139,110,199,0.01) 0%,transparent 50%)"}}/>
      <div style={{position:"relative",zIndex:1,maxWidth:1100,margin:"0 auto",padding:"36px 20px"}}>

        <header style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontSize:16,letterSpacing:10,textTransform:"uppercase",color:gold(0.4),marginBottom:14,fontFamily:"'Sarabun'",fontWeight:200}}>◈ &nbsp; Audio-Reactive Generative Art &nbsp; ◈</div>
          <h1 style={{fontSize:38,fontWeight:300,margin:0,letterSpacing:3,background:"linear-gradient(135deg,#D4AF37 0%,#F5E6A3 40%,#D4AF37 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Relaxation MV Studio</h1>
          <p style={{fontSize:17,fontWeight:200,color:"#B0AAA2",marginTop:10,fontFamily:"'Sarabun'"}}>Real-time FFT × 7 Frequency Bands × Simplex Noise × Multi-body Physics</p>
        </header>

        <div style={{display:"flex",justifyContent:"center",gap:32,marginBottom:44}}>
          {[{n:1,l:"Visual"},{n:2,l:"Audio & Title"},{n:3,l:"Preview"}].map(st=>(
            <div key={st.n} onClick={()=>{if(st.n===1||(st.n>=2&&motion))setStep(st.n)}} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",opacity:step>=st.n?1:0.25,transition:"all 0.4s"}}>
              <div style={{width:28,height:28,borderRadius:"50%",border:step===st.n?"1px solid "+gold(0.6):"1px solid #1E1C18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,fontFamily:"'Sarabun'",background:step===st.n?"rgba(212,175,55,0.06)":"transparent",color:step===st.n?gold(0.8):"#4A4030"}}>{st.n}</div>
              <span style={{fontSize:16,fontFamily:"'Sarabun'",fontWeight:300,color:step===st.n?gold(0.7):"#4A4030"}}>{st.l}</span>
            </div>
          ))}
        </div>

        {step===1&&(
          <div>
            <p style={{textAlign:"center",fontSize:16,color:"#9A948C",fontFamily:"'Sarabun'",fontWeight:200,marginBottom:32}}>
              ทุก Motion มีการเคลื่อนไหวเฉพาะตัว — Orbits, Fluid Physics, 3D Projection, Flow Field, Wave Interference, Spiral Vortex
            </p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:12}}>
              {MOTIONS.map(m=>{
                const sel=motion===m.id;
                const accent=`rgb(${m.palette[1].join(",")})`;
                return(
                  <div key={m.id} onClick={()=>setMotion(m.id)} style={{
                    border:sel?`1px solid ${accent}`:"1px solid #0E0D0B",borderRadius:10,
                    padding:"20px 18px",cursor:"pointer",transition:"all 0.4s",position:"relative",
                    background:sel?`linear-gradient(135deg,rgba(${m.palette[1].join(",")},0.05),rgba(${m.palette[2].join(",")},0.02))`:"rgba(8,6,4,0.7)",
                  }}>
                    <div style={{display:"flex",gap:12}}>
                      <div style={{fontSize:24,color:accent,lineHeight:1,marginTop:2,textShadow:`0 0 25px rgba(${m.palette[1].join(",")},0.3)`,flexShrink:0}}>{m.icon}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:16,fontWeight:400,color:"#F0EDE8",marginBottom:1}}>{m.name}</div>
                        <div style={{fontSize:17,color:accent,fontFamily:"'Sarabun'",fontWeight:200,marginBottom:8,opacity:0.8}}>{m.nameTh}</div>
                        <p style={{fontSize:16,color:"#B0AAA2",lineHeight:1.7,margin:"0 0 8px",fontFamily:"'Sarabun'",fontWeight:300}}>{m.desc}</p>
                        <div style={{fontSize:16,color:"#8A8478",fontStyle:"italic"}}>⟡ {m.research}</div>
                      </div>
                    </div>
                    {sel&&<div style={{position:"absolute",top:10,right:14,fontSize:16,color:accent,fontFamily:"'Sarabun'"}}>✓</div>}
                  </div>
                );
              })}
            </div>
            <div style={{textAlign:"center",marginTop:36}}><Btn primary disabled={!motion} onClick={()=>motion&&setStep(2)}>ถัดไป →</Btn></div>
          </div>
        )}

        {step===2&&(
          <div style={{maxWidth:580,margin:"0 auto"}}>
            <div onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);e.dataTransfer.files[0]&&handleFile(e.dataTransfer.files[0])}}
              onClick={()=>fileRef.current?.click()}
              style={{border:dragOver?"1px solid "+gold(0.6):audioFile?"1px solid #1E1C18":"1px dashed #1A1814",borderRadius:12,padding:"48px 28px",textAlign:"center",cursor:"pointer",background:dragOver?"rgba(212,175,55,0.03)":"rgba(8,6,4,0.7)",transition:"all 0.4s"}}>
              <input ref={fileRef} type="file" accept=".mp3,.wav,.flac,.ogg,.aac,.m4a,.wma,.opus,audio/mpeg,audio/wav,audio/flac,audio/ogg,audio/aac,audio/mp4,audio/*" style={{display:"none"}} onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])}/>
              {audioFile?(
                <div>
                  <div style={{fontSize:28,color:gold(0.6),marginBottom:10}}>♪</div>
                  <div style={{fontSize:17,color:"#F0EDE8"}}>{audioName}</div>
                  <div style={{fontSize:17,color:"#9A948C",fontFamily:"'Sarabun'",marginTop:4}}>
                    {audioBufferRef.current?`${Math.floor(audioBufferRef.current.duration/60)}:${String(Math.floor(audioBufferRef.current.duration%60)).padStart(2,"0")} · ${audioBufferRef.current.numberOfChannels}ch · ${audioBufferRef.current.sampleRate/1000}kHz`:"decoding..."}
                  </div>
                  <div style={{fontSize:17,color:gold(0.4),fontFamily:"'Sarabun'",fontWeight:200,marginTop:10}}>คลิกเพื่อเปลี่ยนไฟล์</div>
                </div>
              ):(
                <div>
                  <div style={{fontSize:36,color:"#5A5448",marginBottom:14}}>◈</div>
                  <div style={{fontSize:16,color:"#9A948C"}}>ลากไฟล์เพลงมาวางที่นี่</div>
                  <div style={{fontSize:17,color:"#7A746C",fontFamily:"'Sarabun'",marginTop:6}}>MP3 · WAV · FLAC · OGG · AAC</div>
                </div>
              )}
            </div>
            <div style={{marginTop:24}}>
              <label style={{fontSize:14,color:"#9A948C",fontFamily:"'Sarabun'",fontWeight:200,display:"block",marginBottom:6}}>บรรทัดที่ 1</label>
              <input value={songTitle} onChange={e=>setSongTitle(e.target.value)} placeholder="ชื่อเพลง"
                style={{width:"100%",boxSizing:"border-box",background:"rgba(8,6,4,0.8)",border:"1px solid #1A1814",borderRadius:8,padding:"12px 16px",color:"#F0EDE8",fontSize:17,fontFamily:"'Sarabun'",fontWeight:400,outline:"none",letterSpacing:0.5}}
                onFocus={e=>e.target.style.borderColor=gold(0.3)} onBlur={e=>e.target.style.borderColor="#1A1814"}/>

              <label style={{fontSize:14,color:"#9A948C",fontFamily:"'Sarabun'",fontWeight:200,display:"block",marginBottom:6,marginTop:12}}>บรรทัดที่ 2 (ไม่บังคับ)</label>
              <input value={songTitle2} onChange={e=>setSongTitle2(e.target.value)} placeholder="ศิลปิน / คำโปรย"
                style={{width:"100%",boxSizing:"border-box",background:"rgba(8,6,4,0.8)",border:"1px solid #1A1814",borderRadius:8,padding:"12px 16px",color:"#F0EDE8",fontSize:17,fontFamily:"'Sarabun'",fontWeight:400,outline:"none",letterSpacing:0.5}}
                onFocus={e=>e.target.style.borderColor=gold(0.3)} onBlur={e=>e.target.style.borderColor="#1A1814"}/>

              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10}}>
                <div onClick={()=>setShowTitle(!showTitle)} style={{width:18,height:18,borderRadius:3,border:"1px solid "+(showTitle?gold(0.5):"#1E1C18"),display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",background:showTitle?"rgba(212,175,55,0.1)":"transparent",fontSize:13,color:gold(0.7)}}>{showTitle?"✓":""}</div>
                <span style={{fontSize:14,color:"#9A948C",fontFamily:"'Sarabun'",fontWeight:200}}>แสดงชื่อเพลงบนวิดีโอ</span>
              </div>

              {showTitle && (
                <div style={{marginTop:16}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
                    <div>
                      <label style={{fontSize:14,color:"#9A948C",fontFamily:"'Sarabun'",fontWeight:200,display:"block",marginBottom:6}}>ตำแหน่ง</label>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3,width:90}}>
                        {[
                          ["top-left","↖"],["top-center","↑"],["top-right","↗"],
                          ["middle-left","←"],["middle-center","•"],["middle-right","→"],
                          ["bottom-left","↙"],["bottom-center","↓"],["bottom-right","↘"],
                        ].map(([pos,icon])=>(
                          <div key={pos} onClick={()=>setTitlePos(pos)} style={{
                            width:28,height:28,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",
                            cursor:"pointer",fontSize:13,transition:"all 0.2s",
                            border:titlePos===pos?"1px solid "+gold(0.5):"1px solid #1A1814",
                            background:titlePos===pos?"rgba(212,175,55,0.1)":"rgba(8,6,4,0.6)",
                            color:titlePos===pos?gold(0.8):"#9A948C",
                          }}>{icon}</div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{fontSize:14,color:"#9A948C",fontFamily:"'Sarabun'",fontWeight:200,display:"block",marginBottom:6}}>ขนาดบรรทัด 1 ({titleFontSize}%)</label>
                      <input type="range" min={10} max={90} value={titleFontSize} onChange={e=>setTitleFontSize(Number(e.target.value))}
                        style={{width:"100%",accentColor:"#D4AF37",cursor:"pointer"}}/>
                      <label style={{fontSize:14,color:"#9A948C",fontFamily:"'Sarabun'",fontWeight:200,display:"block",marginBottom:6,marginTop:10}}>ขนาดบรรทัด 2 ({titleFontSize2}%)</label>
                      <input type="range" min={10} max={90} value={titleFontSize2} onChange={e=>setTitleFontSize2(Number(e.target.value))}
                        style={{width:"100%",accentColor:"#D4AF37",cursor:"pointer"}}/>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginTop:24}}>
              <div>
                <label style={{fontSize:17,color:"#9A948C",fontFamily:"'Sarabun'",fontWeight:200,display:"block",marginBottom:6}}>จำนวน Loop</label>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <button onClick={()=>setLoops(Math.max(1,loops-1))} style={{width:32,height:32,borderRadius:6,border:"1px solid #1E1C18",background:"rgba(8,6,4,0.8)",color:gold(0.6),fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                  <span style={{fontSize:20,fontWeight:300,color:gold(0.7),minWidth:32,textAlign:"center"}}>{loops}</span>
                  <button onClick={()=>setLoops(Math.min(99,loops+1))} style={{width:32,height:32,borderRadius:6,border:"1px solid #1E1C18",background:"rgba(8,6,4,0.8)",color:gold(0.6),fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                </div>
                {audioBufferRef.current&&<div style={{fontSize:16,color:"#8A8478",fontFamily:"'Sarabun'",marginTop:4}}>≈ {Math.floor(audioBufferRef.current.duration*loops/60)} min</div>}
              </div>
              <div>
                <label style={{fontSize:17,color:"#9A948C",fontFamily:"'Sarabun'",fontWeight:200,display:"block",marginBottom:6}}>Resolution</label>
                <div style={{display:"flex",gap:6}}>
                  {["720p","1080p","1440p"].map(r=>(
                    <button key={r} onClick={()=>setResolution(r)} style={{padding:"7px 14px",borderRadius:6,fontSize:16,fontFamily:"'Sarabun'",cursor:"pointer",border:resolution===r?"1px solid "+gold(0.4):"1px solid #1E1C18",background:resolution===r?"rgba(212,175,55,0.06)":"rgba(8,6,4,0.8)",color:resolution===r?gold(0.7):"#4A4030",transition:"all 0.3s"}}>{r}</button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{marginTop:20}}>
              <label style={{fontSize:14,color:"#9A948C",fontFamily:"'Sarabun'",fontWeight:200,display:"block",marginBottom:6}}>End Credit Logo (ไม่บังคับ — แสดง 15 วินาทีสุดท้าย)</label>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <button onClick={()=>{
                    const inp=document.createElement("input"); inp.type="file"; inp.accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp";
                    inp.onchange=e=>e.target.files[0]&&handleLogoFile(e.target.files[0]); inp.click();
                  }}
                  style={{background:"rgba(8,6,4,0.8)",border:"1px solid #1E1C18",color:"#9A948C",padding:"8px 20px",borderRadius:6,fontSize:14,fontFamily:"'Sarabun'",cursor:"pointer"}}>
                  {endLogo ? "เปลี่ยน Logo" : "เลือกไฟล์ PNG"}
                </button>
                {endLogo && (
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <img src={endLogo.src} alt="logo" style={{height:32,borderRadius:4,border:"1px solid #1E1C18"}}/>
                    <span style={{fontSize:13,color:"#8A8478",fontFamily:"'Sarabun'"}}>✓ พร้อมใช้งาน</span>
                    <button onClick={()=>setEndLogo(null)} style={{background:"none",border:"none",color:"#6A6050",cursor:"pointer",fontSize:13}}>✕</button>
                  </div>
                )}
              </div>
            </div>

            <div style={{display:"flex",justifyContent:"space-between",marginTop:36}}>
              <Btn onClick={()=>setStep(1)}>← ย้อนกลับ</Btn>
              <Btn primary onClick={()=>setStep(3)}>Preview & Export →</Btn>
            </div>
          </div>
        )}

        {step===3&&(
          <div>
            {mData&&(
              <div style={{textAlign:"center",marginBottom:20}}>
                <span style={{fontSize:17,color:`rgb(${mData.palette[1].join(",")})`,fontFamily:"'Sarabun'",fontWeight:300}}>{mData.icon} {mData.name}</span>
                {songTitle&&<span style={{fontSize:17,color:"#8A8478",fontFamily:"'Sarabun'",fontWeight:200}}> · {songTitle}</span>}
                <span style={{fontSize:16,color:"#7A746C",fontFamily:"'Sarabun'",fontWeight:200}}> · {loops}× · {resolution}</span>
              </div>
            )}
            <div style={{position:"relative",border:"1px solid #0E0D0B",borderRadius:10,overflow:"hidden",background:"#000",maxWidth:880,margin:"0 auto"}}>
              <canvas ref={canvasRef} style={{width:"100%",height:"auto",display:"block"}}/>
              {!playing&&!exporting&&(
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.5)",backdropFilter:"blur(2px)"}}>
                  <div onClick={startPreview} style={{width:64,height:64,borderRadius:"50%",border:"1px solid "+gold(0.3),display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",background:"rgba(212,175,55,0.05)",transition:"all 0.3s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background="rgba(212,175,55,0.12)";e.currentTarget.style.borderColor=gold(0.6)}}
                    onMouseLeave={e=>{e.currentTarget.style.background="rgba(212,175,55,0.05)";e.currentTarget.style.borderColor=gold(0.3)}}>
                    <span style={{fontSize:22,color:gold(0.7),marginLeft:3}}>▶</span>
                  </div>
                </div>
              )}
            </div>
            {playing&&bandLevels&&(
              <div style={{maxWidth:880,margin:"12px auto 0",display:"flex",justifyContent:"center",gap:6,alignItems:"flex-end"}}>
                {bandKeys.map((key,i)=>{
                  const val=bandLevels[key]||0;
                  const accent=mData?`rgb(${mData.palette[1].join(",")})`:"rgba(212,175,55,0.5)";
                  return(
                    <div key={key} style={{textAlign:"center"}}>
                      <div style={{width:24,height:50,background:"rgba(15,13,10,0.8)",borderRadius:3,position:"relative",overflow:"hidden",border:"1px solid #0E0D0B"}}>
                        <div style={{position:"absolute",bottom:0,left:0,right:0,height:`${val*100}%`,background:`linear-gradient(to top,${accent},${gold(0.3)})`,borderRadius:2,transition:"height 0.08s"}}/>
                      </div>
                      <div style={{fontSize:8,color:"#8A8478",fontFamily:"'Sarabun'",marginTop:3,fontWeight:200}}>{bandNames[i]}</div>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{display:"flex",justifyContent:"center",gap:12,marginTop:20,flexWrap:"wrap"}}>
              <Btn onClick={playing?stopAll:startPreview} sx={{color:playing?"#C85050":gold(0.7),borderColor:playing?"rgba(200,80,80,0.2)":"#1E1C18",background:playing?"rgba(200,80,80,0.06)":"transparent"}}>
                {playing?"■  Stop":"▶  Start Preview"}
              </Btn>
              <Btn primary disabled={exporting} onClick={handleExport}>{exporting?`Exporting ${exportProg}%`:"⬇  Export WebM"}</Btn>
              <Btn onClick={generateCover} disabled={exporting} sx={{borderColor:gold(0.2),color:gold(0.6)}}>
                🖼  Generate Cover
              </Btn>
            </div>
            {exporting&&(
              <div style={{maxWidth:380,margin:"16px auto 0"}}>
                <div style={{background:"#080604",borderRadius:6,overflow:"hidden",height:3}}>
                  <div style={{height:"100%",width:`${exportProg}%`,background:"linear-gradient(90deg,#D4AF37,#F5E6A3)",transition:"width 0.3s",borderRadius:6}}/>
                </div>
                <div style={{textAlign:"center",fontSize:16,color:"#9A948C",fontFamily:"'Sarabun'",fontWeight:200,marginTop:6}}>
                  Export แบบ real-time (เสียง+ภาพ sync) · ใช้เวลาเท่าความยาววิดีโอ
                  {audioBufferRef.current && <span> · ≈ {Math.ceil(audioBufferRef.current.duration * loops / 60)} นาที</span>}
                </div>
              </div>
            )}
            <div style={{textAlign:"center",marginTop:24}}><Btn onClick={()=>{stopAll();setStep(2)}}>← ย้อนกลับ</Btn></div>
          </div>
        )}

        {/* ═══ DOWNLOAD POPUP ═══ */}
        {downloadUrl&&(
          <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)"}}>
            <div style={{background:"#0C0A08",border:"1px solid #1E1C18",borderRadius:14,padding:"36px 40px",maxWidth:420,width:"90%",textAlign:"center"}}>
              <div style={{fontSize:36,marginBottom:16}}>✓</div>
              <div style={{fontSize:18,fontWeight:400,color:"#F0EDE8",marginBottom:6}}>{downloadName.endsWith(".png") ? "Cover สำเร็จ" : "Export สำเร็จ"}</div>
              <div style={{fontSize:14,color:"#8A8478",fontFamily:"'Sarabun'",fontWeight:200,marginBottom:16}}>
                {downloadName.endsWith(".png") ? "ไฟล์ถูกดาวน์โหลดอัตโนมัติแล้ว" : "กดปุ่มด้านล่างเพื่อดาวน์โหลดวิดีโอ"}
              </div>
              <div style={{fontSize:16,color:"#9A948C",fontFamily:"'Sarabun'",fontWeight:200,marginBottom:24}}>
                {downloadName}
                {downloadName.endsWith(".png") && downloadUrl && (
                  <div style={{marginTop:12,borderRadius:8,overflow:"hidden",border:"1px solid #1E1C18",maxWidth:360,margin:"12px auto 0"}}>
                    <img src={downloadUrl} alt="cover" style={{width:"100%",display:"block"}} />
                  </div>
                )}
              </div>
              <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",alignItems:"center"}}>
                {downloadUrl && <iframe id="dl-frame" style={{display:"none"}} title="download"/>}
                <button onClick={(e)=>{
                    e.preventDefault();
                    e.stopPropagation();
                    const d = downloadBlobRef.current;
                    if(!d) return;
                    const url = URL.createObjectURL(d.blob);
                    let downloaded = false;
                    if(navigator.msSaveBlob){
                      navigator.msSaveBlob(d.blob, d.name);
                      downloaded = true;
                    }
                    if(!downloaded){
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = d.name;
                      link.style.display = "none";
                      const container = document.body || document.documentElement;
                      container.appendChild(link);
                      link.click();
                      container.removeChild(link);
                    }
                    setTimeout(() => URL.revokeObjectURL(url), 30000);
                  }}
                  style={{background:"linear-gradient(135deg,#D4AF37,#B8973A)",border:"none",color:"#080604",padding:"12px 36px",borderRadius:8,fontSize:14,fontFamily:"'Sarabun'",fontWeight:600,cursor:"pointer"}}>
                  ⬇  {downloadName.endsWith(".png") ? "ดาวน์โหลดอีกครั้ง" : "ดาวน์โหลด WebM"}
                </button>
                <button onClick={(e)=>{
                    e.preventDefault();
                    e.stopPropagation();
                    URL.revokeObjectURL(downloadUrl);setDownloadUrl(null);setDownloadName("");downloadBlobRef.current=null;
                  }}
                  style={{background:"transparent",border:"1px solid #2A2520",color:"#B0AAA2",padding:"12px 28px",borderRadius:8,fontSize:14,fontFamily:"'Sarabun'",cursor:"pointer"}}>
                  ปิด
                </button>
              </div>
              <div style={{fontSize:12,color:"#7A746C",fontFamily:"'Sarabun'",fontWeight:200,marginTop:16}}>
                หากดาวน์โหลดไม่ขึ้น ให้ทดสอบบน GitHub Pages โดยตรง
              </div>
            </div>
          </div>
        )}

        <footer style={{textAlign:"center",marginTop:64,paddingTop:24,borderTop:"1px solid #0A0908"}}>
          <div style={{fontSize:17,color:"#5A5448",fontFamily:"'Sarabun'",fontWeight:200,letterSpacing:3}}>AUDIO-REACTIVE GENERATIVE ART · THERAPEUTIC VISUAL · SPA THERAPY</div>
        </footer>
      </div>
    </div>
  );
}
