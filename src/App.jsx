import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { ArrowLeft, BookmarkSimple, BookOpenText, Check, DownloadSimple, Eye, Globe, Info, LinkSimple, MagnifyingGlass, Palette, QrCode, ShieldCheck, SlidersHorizontal, Translate, User, X } from "@phosphor-icons/react";

const API = "https://hadeethenc.com/api/v1";
const sample = {
  id: "1", title: "إنما الأعمال بالنيات",
  hadeeth: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
  attribution: "عن أمير المؤمنين عمر بن الخطاب رضي الله عنه قال: قال رسول الله ﷺ:",
  grade: "صحيح", reference: "صحيح البخاري (1)",
  explanation: "يبين الحديث الشريف أن قيمة العمل وقبوله عند الله تعالى إنما تعتمد على النية الصادقة، فلكل إنسان جزاء ما نوى.",
  translations: { en: "Actions are only by intentions, and indeed for everyone is what they intended.", ur: "اعمال کا دار و مدار نیتوں پر ہے، اور ہر شخص کو وہی ملے گا جس کی اس نے نیت کی۔", fr: "Les actes ne valent que par les intentions, et chacun n’aura que ce qu’il a eu comme intention." }
};
const formats = [{id:"square",label:"1:1"},{id:"portrait",label:"4:5"},{id:"story",label:"9:16"}];
const languages = [{id:"en",label:"English"},{id:"ur",label:"اردو"},{id:"fr",label:"Français"}];

function normalized(d) { return { id:String(d.id??sample.id), title:d.title||sample.title, hadeeth:d.hadeeth||d.text||sample.hadeeth, attribution:d.attribution||sample.attribution, grade:d.grade||d.hadeeth_type||sample.grade, reference:d.reference||sample.reference, explanation:d.explanation||sample.explanation, translations:{...sample.translations} }; }

export function App(){
  const [query,setQuery]=useState(""); const [results,setResults]=useState([]); const [hadith,setHadith]=useState(sample);
  const [searching,setSearching]=useState(false); const [format,setFormat]=useState("portrait"); const [language,setLanguage]=useState("en");
  const [theme,setTheme]=useState("sky"); const [qr,setQr]=useState(true); const [saved,setSaved]=useState(false); const [notice,setNotice]=useState("");
  const previewRef=useRef(null);
  useEffect(()=>{const t=setTimeout(async()=>{if(query.trim().length<2){setResults([]);return}setSearching(true);try{const r=await fetch(`${API}/hadeeths/search/?phrase=${encodeURIComponent(query)}&language=ar`);if(!r.ok)throw 0;const p=await r.json();setResults((p.data||p||[]).slice(0,5))}catch{setResults([{id:"2962",title:sample.title}])}finally{setSearching(false)}},450);return()=>clearTimeout(t)},[query]);
  async function selectHadith(item){setSearching(true);try{const [a,t]=await Promise.all([fetch(`${API}/hadeeths/one/?language=ar&id=${item.id}`),fetch(`${API}/hadeeths/one/?language=${language}&id=${item.id}`)]);const ar=await a.json();const next=normalized(ar);if(t.ok){const tr=await t.json();next.translations[language]=tr.hadeeth||tr.text||next.translations[language]}setHadith(next);setResults([]);setQuery("")}catch{setNotice("تعذّر الاتصال بالمصدر؛ عُرض النموذج التجريبي.")}finally{setSearching(false)}}
  async function exportImage(){if(!previewRef.current)return;setNotice("جارٍ تجهيز التصميم…");try{const url=await toPng(previewRef.current,{pixelRatio:2.5,cacheBust:true});const a=document.createElement("a");a.download=`mishkat-hadith-${hadith.id}-${format}.png`;a.href=url;a.click();setNotice("تم تصدير التصميم بنجاح.")}catch{setNotice("تعذّر التصدير. حاول مرة أخرى.")}setTimeout(()=>setNotice(""),3000)}
  const translation=hadith.translations?.[language]||sample.translations[language];
  return <div className="app" dir="rtl">
    <header className="topbar"><a className="brand" href="#studio"><span className="brand-mark"><BookOpenText weight="duotone"/></span><span><strong>مِشكاة الحديث</strong><small>من نور الحديث… للعالم أجمع</small></span></a><div className="global-search"><MagnifyingGlass/><input placeholder="ابحث في الأحاديث والرواة والموضوعات…"/><kbd>Ctrl K</kbd></div><nav><a className="active" href="#studio">اكتشف</a><a href="#library">مكتبتي</a><a href="#designs">تصاميمي</a><a href="#sources">المصادر</a></nav><button className="avatar"><User/></button></header>
    <main id="studio"><section className="steps"><div className="step active"><b>1</b><span><strong>الحديث</strong><small>اختر حديثًا موثّقًا من HadeethEnc</small></span></div><i/><div className="step"><b>2</b><span><strong>اللغات</strong><small>قارن الترجمات المعتمدة</small></span></div><i/><div className="step"><b>3</b><span><strong>التصميم</strong><small>صمّم وشارك</small></span></div></section>
      <section className="workspace">
        <article className="content-pane"><div className="search-line"><div className="search-box"><MagnifyingGlass/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث عن حديث أو راوٍ أو موضوع…"/>{query&&<button onClick={()=>setQuery("")}><X/></button>}</div><button className="filter"><SlidersHorizontal/> تصفية</button>{(searching||results.length>0)&&<div className="results-popover">{searching?<p>جارٍ البحث في المصدر…</p>:results.map(r=><button key={r.id} onClick={()=>selectHadith(r)}><span>{r.title||r.hadeeth?.slice(0,65)}</span><ArrowLeft/></button>)}</div>}</div>
          <div className="section-heading"><div><small>الحديث المختار</small><h1>{hadith.title}</h1></div><a href={`https://hadeethenc.com/ar/browse/hadith/${hadith.id}`} target="_blank">فتح في المصدر <ArrowLeft/></a></div><div className="verified"><ShieldCheck weight="fill"/> موثّق من HadeethEnc.com</div>
          <blockquote><span className="attribution">{hadith.attribution}</span><p>{hadith.hadeeth}</p></blockquote>
          <div className="metadata"><div><User/><span>الراوي<strong>عمر بن الخطاب رضي الله عنه</strong></span></div><div><ShieldCheck/><span>درجة الحديث<strong>{hadith.grade}</strong></span></div><div><BookOpenText/><span>المصدر<strong>{hadith.reference}</strong></span></div><div><LinkSimple/><span>رقم المرجع<strong>{hadith.id}</strong></span></div></div>
          <details open><summary><span><BookOpenText/> شرح موجز للحديث</span><span>⌄</span></summary><p>{hadith.explanation}</p></details>
          <div className="translation-head"><div><Translate/><span><strong>الترجمات المعتمدة</strong><small>مأخوذة من HadeethEnc.com ولا يتم تعديلها</small></span></div><button>عرض ترجمات إضافية <ArrowLeft/></button></div><div className="translation-card"><strong>{languages.find(l=>l.id===language)?.label}</strong><p dir={language==="ur"?"rtl":"ltr"}>{translation}</p></div><div className="source-foot"><a href={`https://hadeethenc.com/${language}/browse/hadith/${hadith.id}`} target="_blank"><LinkSimple/> HadeethEnc.com</a><span>آخر مزامنة: 20 سبتمبر 2026</span></div>
        </article>
        <aside className="preview-pane"><div className="preview-title"><strong>معاينة التصميم</strong><span><Eye/> معاينة حيّة</span></div><div className="format-row"><span>منشور اجتماعي ({formats.find(f=>f.id===format)?.label})</span><div>{formats.map(f=><button key={f.id} className={format===f.id?"active":""} onClick={()=>setFormat(f.id)}>{f.label}</button>)}</div></div>
          <div className={`canvas-wrap ${format}`}><div className={`social-canvas theme-${theme}`} ref={previewRef}><div className="canvas-brand"><BookOpenText weight="duotone"/><span>مِشكاة الحديث<small>حديثٌ موثّق، أثرٌ أوسع</small></span></div><div className="canvas-body"><small>قال رسول الله ﷺ</small><h2>{hadith.hadeeth}</h2><i/><p dir={language==="ur"?"rtl":"ltr"}>{translation}</p><b>{hadith.reference}</b></div><div className="canvas-footer">{qr&&<div className="qr"><QrCode weight="fill"/></div>}<span>اكتشف المزيد<br/>في مِشكاة الحديث</span><strong>HadeethEnc.com<small>النص والترجمة من المصدر</small></strong></div></div></div>
          <div className="controls"><div><label><Palette/> القالب البصري</label><div className="swatches"><button className={`${theme==="sky"?"active ":""}sky`} onClick={()=>setTheme("sky")}/><button className={`${theme==="sand"?"active ":""}sand`} onClick={()=>setTheme("sand")}/><button className={`${theme==="navy"?"active ":""}navy`} onClick={()=>setTheme("navy")}/></div></div><div><label><Globe/> لغة التصميم</label><select value={language} onChange={e=>setLanguage(e.target.value)}>{languages.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}</select></div><button className={`toggle ${qr?"on":""}`} onClick={()=>setQr(!qr)}><span/><QrCode/> إظهار رمز QR</button></div>
          <div className="actions"><button className="primary" onClick={exportImage}><DownloadSimple/> تصدير ومشاركة</button><button className={saved?"saved":""} onClick={()=>setSaved(!saved)}><BookmarkSimple weight={saved?"fill":"regular"}/>{saved?"محفوظ في مكتبتي":"حفظ في مكتبتي"}</button></div><p className="integrity"><Info/> نحافظ على النص كما ورد في المصدر</p>
        </aside>
      </section></main>{notice&&<div className="toast"><Check/> {notice}</div>}
  </div>
}
