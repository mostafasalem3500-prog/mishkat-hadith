import { useEffect, useMemo, useRef, useState } from "react";
import { toJpeg, toPng, toSvg } from "html-to-image";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Check,
  DownloadSimple,
  Eye,
  Info,
  LinkSimple,
  MagnifyingGlass,
  Palette,
  Sparkle,
  ShieldCheck,
  SlidersHorizontal,
  Translate,
  UploadSimple,
  X,
} from "@phosphor-icons/react";
const API = "https://hadeethenc.com/api/v1",
  SOURCE = "https://hadeethenc.com";
const fallbackLangs = [
  { code: "ar", native: "العربية" },
  { code: "en", native: "English" },
  { code: "ur", native: "اردو" },
];
const sample = {
  id: "4560",
  title: "إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى",
  hadeeth:
    "عن عمر بن الخطاب رضي الله عنه قال: قال رسول الله صلى الله عليه وسلم: «إِنَّمَا الْأَعْمَالُ بِالنِّيَّةِ، وَإِنَّمَا لِامْرِئٍ مَا نَوَى».",
  attribution: "متفق عليه",
  grade: "صحيح",
  reference: "صحيح البخاري (1)، وصحيح مسلم (1907).",
  explanation:
    "يبيّن الحديث أن الأعمال معتبرة بالنية، وأن الجزاء يرتبط بما قصده الإنسان من عمله.",
  translations: ["ar", "en", "ur"],
};
const formats = [
  { id: "square", label: "1:1", size: "1080×1080" },
  { id: "portrait", label: "4:5", size: "1080×1350" },
  { id: "story", label: "9:16", size: "1080×1920" },
  { id: "landscape", label: "فيسبوك", size: "1200×630" },
];
const fonts = [
  { id: "naskh", label: "نسخ احترافي" },
  { id: "amiri", label: "أميري" },
  { id: "kufi", label: "كوفي" },
  { id: "cairo", label: "Cairo" },
];
const backgrounds = [
  { id: "sky", label: "ضوء الفجر", cls: "theme-sky" },
  { id: "sand", label: "رمال هادئة", cls: "theme-sand" },
  { id: "navy", label: "ليل أزرق", cls: "theme-navy" },
  { id: "green", label: "محراب أخضر", cls: "theme-green" },
  { id: "motion", label: "نور متحرك", cls: "theme-motion", animated: true },
  {
    id: "mountain",
    label: "جبال طبيعية 4K",
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2160&q=90",
  },
  {
    id: "desert",
    label: "صحراء 4K",
    url: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=2160&q=90",
  },
  {
    id: "mosque",
    label: "عمارة إسلامية",
    url: "https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=2160&q=90",
  },
];
const rtl = new Set(["ar", "ur", "fa", "ug", "ps", "prs"]);
const topicSuggestions = [
  "الصبر",
  "الصلاة",
  "الرحمة",
  "الأخلاق",
  "النية",
  "الوالدان",
  "الدعاء",
  "الرزق",
];
const synonymGroups = [
  ["القلق", "الخوف", "الحزن", "الهم"],
  ["الصبر", "الابتلاء", "المصيبة"],
  ["الرزق", "المال", "الكسب", "العمل"],
  ["الأخلاق", "الخلق", "المعاملة", "الآداب"],
  ["الوالدان", "الوالدين", "الأم", "الأب", "البر"],
  ["الدعاء", "الذكر", "الاستغفار"],
  ["الصلاة", "الصلوات", "المسجد"],
];
const stopWords = new Set([
  "حديث",
  "احاديث",
  "أحاديث",
  "عن",
  "في",
  "من",
  "إلى",
  "ما",
  "ماذا",
  "قال",
  "النبي",
  "الرسول",
  "حول",
  "اريد",
  "أريد",
]);
const norm = (d) => ({
  ...d,
  id: String(d.id || sample.id),
  title: d.title || sample.title,
  hadeeth: d.hadeeth || d.hadith_text || sample.hadeeth,
  attribution: d.attribution || "",
  grade: d.grade || "",
  reference: d.reference || "",
  explanation: d.explanation || "",
  translations: d.translations || ["ar"],
});
const save = (url, name) => {
  const a = document.createElement("a");
  a.download = name;
  a.href = url;
  a.click();
};
function splitInTwo(text, limit) {
  if (!text || text.length <= limit) return [text || ""];
  const middle = Math.floor(text.length / 2),
    windowSize = Math.min(180, Math.floor(text.length / 4));
  const candidates = [];
  for (let i = middle - windowSize; i <= middle + windowSize; i++)
    if (/[.!؟؛،:\n»]/.test(text[i] || "")) candidates.push(i + 1);
  let cut = candidates.sort(
    (a, b) => Math.abs(a - middle) - Math.abs(b - middle),
  )[0];
  if (!cut) {
    cut = text.lastIndexOf(" ", middle);
    if (cut < middle * 0.65) cut = text.indexOf(" ", middle);
  }
  return [text.slice(0, cut).trim(), text.slice(cut).trim()].filter(Boolean);
}
function intelligentTerms(value) {
  const cleaned = value.trim().replace(/[؟?!.,،؛:]/g, " ");
  const words = cleaned
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
  const terms = [cleaned, ...words];
  for (const word of words) {
    const group = synonymGroups.find((items) =>
      items.some((item) => word.includes(item) || item.includes(word)),
    );
    if (group) terms.push(...group);
  }
  return [...new Set(terms.filter(Boolean))].slice(0, 5);
}
export function App() {
  const [query, setQuery] = useState(""),
    [results, setResults] = useState([]),
    [visible, setVisible] = useState(10),
    [hadith, setHadith] = useState(sample),
    [translation, setTranslation] = useState(null),
    [languages, setLanguages] = useState(fallbackLangs),
    [language, setLanguage] = useState("en"),
    [categories, setCategories] = useState([]),
    [activeCategory, setActiveCategory] = useState(""),
    [searching, setSearching] = useState(false),
    [loadingTr, setLoadingTr] = useState(false),
    [error, setError] = useState("");
  const [format, setFormat] = useState("portrait"),
    [theme, setTheme] = useState("sky"),
    [customBg, setCustomBg] = useState(""),
    [font, setFont] = useState("naskh"),
    [translationFont, setTranslationFont] = useState("cairo"),
    [fontScale, setFontScale] = useState(100),
    [translationScale, setTranslationScale] = useState(100),
    [arabicAlign, setArabicAlign] = useState("center"),
    [translationAlign, setTranslationAlign] = useState("center"),
    [arabicLine, setArabicLine] = useState(165),
    [translationLine, setTranslationLine] = useState(150),
    [overlay, setOverlay] = useState(44),
    [showTranslation, setShowTranslation] = useState(true),
    [showExplanation, setShowExplanation] = useState(false),
    [showQr, setShowQr] = useState(true),
    [showSource, setShowSource] = useState(true),
    [exportType, setExportType] = useState("png"),
    [quality, setQuality] = useState(2.5),
    [notice, setNotice] = useState(""),
    [page, setPage] = useState(0),
    [prefsReady, setPrefsReady] = useState(false);
  const previewRef = useRef(null);
  useEffect(() => {
    Promise.allSettled([
      fetch(`${API}/languages/`).then((r) =>
        r.ok ? r.json() : Promise.reject(),
      ),
      fetch(`${API}/categories/roots/?language=ar`).then((r) =>
        r.ok ? r.json() : Promise.reject(),
      ),
    ]).then(([langs, cats]) => {
      if (langs.status === "fulfilled") setLanguages(langs.value);
      if (cats.status === "fulfilled") setCategories(cats.value);
    });
  }, []);
  useEffect(() => {
    const controller = new AbortController(),
      t = setTimeout(async () => {
        let p = query.trim();
        if (p.length < 2) {
          if (!activeCategory) setResults([]);
          setError("");
          return;
        }
        setSearching(true);
        setError("");
        try {
          const responses = await Promise.all(
            intelligentTerms(p).map((term) =>
              fetch(
                `${API}/hadeeths/search/?language=ar&phrase=${encodeURIComponent(term)}`,
                { signal: controller.signal },
              ).then((r) => (r.ok ? r.json() : [])),
            ),
          );
          const unique = new Map();
          responses
            .flatMap((d) => (Array.isArray(d) ? d : d.data || []))
            .forEach((item) => unique.set(String(item.id), item));
          let d = [...unique.values()].sort(
            (a, b) =>
              Number((b.title || "").includes(p)) -
              Number((a.title || "").includes(p)),
          );
          setResults(d);
          setActiveCategory("");
          setVisible(10);
          if (!d.length)
            setError("لا توجد نتائج مطابقة. جرّب كلمة أقصر أو اسم راوٍ.");
        } catch (e) {
          if (e?.name !== "AbortError") {
            setResults([]);
            setError("تعذّر الوصول إلى المصدر الآن. حاول مرة أخرى.");
          }
        } finally {
          if (!controller.signal.aborted) setSearching(false);
        }
      }, 400);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);
  async function browseCategory(category) {
    setSearching(true);
    setError("");
    setQuery("");
    setActiveCategory(String(category.id));
    setVisible(20);
    try {
      const r = await fetch(
        `${API}/hadeeths/list/?language=ar&category_id=${category.id}&page=1&per_page=100`,
      );
      if (!r.ok) throw 0;
      const d = await r.json();
      setResults(d.data || []);
      if (!(d.data || []).length)
        setError("لا توجد نتائج منشورة في هذا الموضوع.");
    } catch {
      setError("تعذّر تحميل أحاديث الموضوع الآن.");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }
  async function choose(item) {
    setSearching(true);
    setTranslation(null);
    setPage(0);
    try {
      let r = await fetch(`${API}/hadeeths/one/?language=ar&id=${item.id}`);
      if (!r.ok) throw 0;
      let d = norm(await r.json());
      setHadith(d);
      setResults([]);
      setQuery("");
      setLanguage(
        d.translations.includes(language)
          ? language
          : d.translations.find((x) => x !== "ar") || "ar",
      );
    } catch {
      setError("تعذّر تحميل الحديث من المصدر.");
    } finally {
      setSearching(false);
    }
  }
  useEffect(() => {
    let live = true;
    setTranslation(null);
    (async () => {
      if (language === "ar" || !hadith.translations?.includes(language)) return;
      setLoadingTr(true);
      try {
        let r = await fetch(
          `${API}/hadeeths/one/?language=${language}&id=${hadith.id}`,
        );
        if (!r.ok) throw 0;
        let d = norm(await r.json());
        if (live) setTranslation(d);
      } catch {
        if (live) setTranslation(null);
      } finally {
        if (live) setLoadingTr(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [hadith.id, language]);
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("mishkat-editor") || "null");
      if (p) {
        setFormat(p.format || "portrait");
        setTheme(p.theme || "sky");
        setFont(p.font || "naskh");
        setTranslationFont(p.translationFont || "cairo");
        setFontScale(p.fontScale || 100);
        setTranslationScale(p.translationScale || 100);
        setArabicAlign(p.arabicAlign || "center");
        setTranslationAlign(p.translationAlign || "center");
        setArabicLine(p.arabicLine || 165);
        setTranslationLine(p.translationLine || 150);
        setOverlay(p.overlay ?? 44);
        setShowTranslation(p.showTranslation ?? true);
        setShowExplanation(p.showExplanation ?? false);
        setShowQr(p.showQr ?? true);
        setShowSource(p.showSource ?? true);
        setQuality(p.quality || 2.5);
      }
    } catch {
    } finally {
      setPrefsReady(true);
    }
  }, []);
  useEffect(() => {
    if (prefsReady)
      localStorage.setItem(
        "mishkat-editor",
        JSON.stringify({
          format,
          theme,
          font,
          translationFont,
          fontScale,
          translationScale,
          arabicAlign,
          translationAlign,
          arabicLine,
          translationLine,
          overlay,
          showTranslation,
          showExplanation,
          showQr,
          showSource,
          quality,
        }),
      );
  }, [
    prefsReady,
    format,
    theme,
    font,
    translationFont,
    fontScale,
    translationScale,
    arabicAlign,
    translationAlign,
    arabicLine,
    translationLine,
    overlay,
    showTranslation,
    showExplanation,
    showQr,
    showSource,
    quality,
  ]);
  const available = useMemo(
    () => languages.filter((l) => hadith.translations?.includes(l.code)),
    [languages, hadith.translations],
  );
  const bg = backgrounds.find((b) => b.id === theme),
    bgUrl = customBg || bg?.url || "",
    baseLimit =
      format === "story"
        ? 760
        : format === "portrait"
          ? 560
          : format === "square"
            ? 390
            : 310,
    totalDesignLength =
      hadith.hadeeth.length +
      (showTranslation ? translation?.hadeeth?.length || 0 : 0) +
      (showExplanation ? hadith.explanation?.length || 0 : 0),
    shouldSplit = totalDesignLength > baseLimit * 1.3,
    splitLimit = shouldSplit ? 1 : baseLimit;
  const hadithPages = useMemo(
      () => splitInTwo(hadith.hadeeth, splitLimit),
      [hadith.hadeeth, splitLimit],
    ),
    translationPages = useMemo(
      () => splitInTwo(translation?.hadeeth || "", splitLimit),
      [translation?.hadeeth, splitLimit],
    ),
    explanationPages = useMemo(
      () => splitInTwo(hadith.explanation || "", splitLimit),
      [hadith.explanation, splitLimit],
    ),
    pageCount = Math.max(
      hadithPages.length,
      showTranslation ? translationPages.length : 1,
      showExplanation ? explanationPages.length : 1,
    ),
    safePage = Math.min(page, pageCount - 1),
    hadithPage = hadithPages[safePage] || "",
    translationPage = translationPages[safePage] || "",
    explanationPage = explanationPages[safePage] || "";
  let length =
    hadithPage.length +
    (showTranslation ? translationPage.length : 0) +
    (showExplanation ? explanationPage.length : 0);
  let fit =
    length > 1200
      ? 0.48
      : length > 900
        ? 0.58
        : length > 650
          ? 0.7
          : length > 430
            ? 0.8
            : length > 250
              ? 0.9
              : 1;
  const canvasStyle = {
    "--text-fit": (fit * fontScale) / 100,
    "--translation-scale": translationScale / 100,
    "--arabic-align": arabicAlign,
    "--translation-align": translationAlign,
    "--arabic-line": arabicLine / 100,
    "--translation-line": translationLine / 100,
    "--overlay": overlay / 100,
    backgroundImage: bgUrl
      ? `linear-gradient(rgba(8,25,37,${overlay / 100}),rgba(8,25,37,${Math.min(0.86, overlay / 100 + 0.12)})),url(${bgUrl})`
      : undefined,
  };
  async function makeExportUrl() {
    await document.fonts.ready;
    let o = { pixelRatio: quality, cacheBust: true, backgroundColor: "#fff" },
      u;
    if (exportType === "jpg")
      u = await toJpeg(previewRef.current, { ...o, quality: 0.96 });
    else if (exportType === "svg") u = await toSvg(previewRef.current, o);
    else if (exportType === "webp") {
      let p = await toPng(previewRef.current, o);
      u = await new Promise((ok, no) => {
        let i = new Image();
        i.onload = () => {
          let c = document.createElement("canvas");
          c.width = i.width;
          c.height = i.height;
          c.getContext("2d").drawImage(i, 0, 0);
          ok(c.toDataURL("image/webp", 0.96));
        };
        i.onerror = no;
        i.src = p;
      });
    } else u = await toPng(previewRef.current, o);
    return u;
  }
  async function exportDesign() {
    if (!previewRef.current) return;
    setNotice("جارٍ إنشاء الملف عالي الدقة…");
    try {
      const u = await makeExportUrl();
      save(u, `mishkat-${hadith.id}-${format}-${safePage + 1}.${exportType}`);
      setNotice(`تم تصدير الصفحة ${safePage + 1} من ${pageCount}.`);
    } catch {
      setNotice("تعذّر التصدير؛ استخدم خلفية مدمجة أو صورة من جهازك.");
    }
    setTimeout(() => setNotice(""), 4000);
  }
  async function exportBothPages() {
    const original = safePage;
    setNotice("جارٍ تصدير الصفحتين…");
    try {
      for (let index = 0; index < pageCount; index++) {
        setPage(index);
        await new Promise((resolve) => setTimeout(resolve, 180));
        save(
          await makeExportUrl(),
          `mishkat-${hadith.id}-${format}-${index + 1}.${exportType}`,
        );
      }
      setPage(original);
      setNotice("تم تصدير الصفحتين بالترتيب.");
    } catch {
      setPage(original);
      setNotice("تعذّر تصدير الصفحتين؛ حاول مرة أخرى.");
    }
    setTimeout(() => setNotice(""), 4000);
  }
  function upload(e) {
    let f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    let r = new FileReader();
    r.onload = () => {
      setCustomBg(String(r.result));
      setTheme("custom");
    };
    r.readAsDataURL(f);
  }
  useEffect(() => {
    if (page >= pageCount) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);
  const sourceUrl = `${SOURCE}/${language}/browse/hadith/${hadith.id}`;
  return (
    <div className="app" dir="rtl">
      <header className="topbar">
        <a className="brand" href="#studio">
          <span className="brand-mark">
            <BookOpenText weight="duotone" />
          </span>
          <span>
            <strong>مِشكاة الحديث</strong>
            <small>نص موثّق، تصميم مؤثر</small>
          </span>
        </a>
        <nav>
          <a className="active" href="#studio">
            الاستوديو
          </a>
          <a href={SOURCE} target="_blank" rel="noreferrer">
            المصدر الرسمي
          </a>
        </nav>
        <span className="source-status">
          <ShieldCheck weight="fill" /> متصل بـ HadeethEnc
        </span>
      </header>
      <main id="studio">
        <section className="hero">
          <div>
            <span>استوديو نشر الحديث الشريف</span>
            <h1>اختر الحديث، ترجمته، ثم صمّمه للنشر</h1>
            <p>
              النصوص والترجمات تُجلب من المصدر كما هي ولا يسمح المحرّر بتعديلها.
            </p>
          </div>
          <a href={sourceUrl} target="_blank" rel="noreferrer">
            <LinkSimple /> فتح الحديث في المصدر
          </a>
        </section>
        <section className="workspace">
          <article className="content-pane">
            <div className="search-title">
              <div>
                <small>الخطوة 1</small>
                <h2>ابحث في مكتبة الأحاديث</h2>
              </div>
              <span>
                <Sparkle weight="fill" /> بحث ذكي بالموضوع والمرادفات
              </span>
            </div>
            <div className="search-line">
              <div className="search-box">
                <MagnifyingGlass />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="اسأل: ماذا قال النبي عن الصبر والابتلاء؟"
                />
                {query && (
                  <button aria-label="مسح" onClick={() => setQuery("")}>
                    <X />
                  </button>
                )}
              </div>
              <button className="filter">
                <SlidersHorizontal /> من المصدر فقط
              </button>
            </div>
            <div className="smart-search-box">
              <div className="smart-search-intro">
                <Sparkle weight="fill" />
                <span>
                  <strong>وصول أسرع للحديث</strong>
                  <small>
                    اكتب سؤالًا طبيعيًا أو اختر موضوعًا؛ نبحث بالكلمات القريبة
                    ونزيل التكرار.
                  </small>
                </span>
              </div>
              <div className="suggestion-chips">
                {topicSuggestions.map((topic) => (
                  <button key={topic} onClick={() => setQuery(topic)}>
                    {topic}
                  </button>
                ))}
              </div>
              <div className="category-chips" aria-label="التصنيفات الرسمية">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    className={
                      activeCategory === String(category.id) ? "active" : ""
                    }
                    onClick={() => browseCategory(category)}
                  >
                    {category.title}
                    <small>{category.hadeeths_count}</small>
                  </button>
                ))}
              </div>
            </div>
            {(searching || results.length > 0 || error) && (
              <div className="results-panel">
                {searching ? (
                  <div className="loading">جارٍ البحث في المصدر الرسمي…</div>
                ) : error ? (
                  <div className="error">{error}</div>
                ) : (
                  <>
                    <div className="result-summary">
                      عُثر على {results.length} نتيجة
                    </div>
                    {results.slice(0, visible).map((r) => (
                      <button
                        className="result"
                        key={r.id}
                        onClick={() => choose(r)}
                      >
                        <span>
                          <strong>{r.title}</strong>
                          <small>{r.hadith_text?.slice(0, 150)}</small>
                        </span>
                        <ArrowLeft />
                      </button>
                    ))}
                    {visible < results.length && (
                      <button
                        className="more"
                        onClick={() => setVisible((v) => v + 10)}
                      >
                        عرض 10 نتائج إضافية
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
            <div className="selected-head">
              <div>
                <small>الحديث المختار</small>
                <h2>{hadith.title}</h2>
              </div>
              <a href={sourceUrl} target="_blank" rel="noreferrer">
                فتح المصدر <ArrowLeft />
              </a>
            </div>
            <div className="verified">
              <ShieldCheck weight="fill" /> موثّق من موسوعة الأحاديث النبوية
            </div>
            <blockquote>
              <p>{hadith.hadeeth}</p>
            </blockquote>
            <div className="metadata">
              <div>
                <span>
                  الدرجة<strong>{hadith.grade || "—"}</strong>
                </span>
              </div>
              <div>
                <span>
                  العزو<strong>{hadith.attribution || "—"}</strong>
                </span>
              </div>
              <div>
                <span>
                  رقم الحديث<strong>{hadith.id}</strong>
                </span>
              </div>
            </div>
            <details>
              <summary>
                <span>
                  <BookOpenText /> الشرح والفوائد
                </span>
                <span>⌄</span>
              </summary>
              <p>{hadith.explanation || "لا يتوفر شرح لهذا الحديث."}</p>
            </details>
            <div className="translation-head">
              <div>
                <Translate />
                <span>
                  <strong>الترجمة المعتمدة</strong>
                  <small>{available.length} لغة متاحة لهذا الحديث</small>
                </span>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {available.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.native}
                  </option>
                ))}
              </select>
            </div>
            <div
              className="translation-card"
              dir={rtl.has(language) ? "rtl" : "ltr"}
            >
              {loadingTr ? (
                <p>جارٍ تحميل الترجمة…</p>
              ) : language === "ar" ? (
                <p>اختر لغة أخرى لعرض الترجمة.</p>
              ) : translation ? (
                <>
                  <strong>
                    {languages.find((l) => l.code === language)?.native}
                  </strong>
                  <p>{translation.hadeeth}</p>
                </>
              ) : (
                <p>هذه الترجمة غير متاحة.</p>
              )}
            </div>
            <div className="source-foot">
              <a href={sourceUrl} target="_blank" rel="noreferrer">
                <LinkSimple /> فتح النص والترجمة في HadeethEnc
              </a>
              <span>لا يتم تعديل المحتوى الموثّق</span>
            </div>
          </article>
          <aside className="preview-pane">
            <div className="preview-title">
              <strong>الخطوة 2 — صمّم وصدّر</strong>
              <span>
                <Eye /> معاينة حيّة
              </span>
            </div>
            <div className="format-row">
              {formats.map((f) => (
                <button
                  key={f.id}
                  title={f.size}
                  className={format === f.id ? "active" : ""}
                  onClick={() => {
                    setFormat(f.id);
                    setPage(0);
                  }}
                >
                  {f.label}
                  <small>{f.size}</small>
                </button>
              ))}
            </div>
            <div className={`canvas-wrap ${format}`}>
              <div
                className={`social-canvas ${bg?.cls || "theme-custom"} font-${font} translation-font-${translationFont} ${bgUrl ? "photo-bg" : ""}`}
                style={canvasStyle}
                ref={previewRef}
              >
                <div className="canvas-brand">
                  <BookOpenText weight="duotone" />
                  <span>
                    مِشكاة الحديث<small>حديث موثّق، أثر أوسع</small>
                  </span>
                  {pageCount > 1 && (
                    <b>
                      {safePage + 1}/{pageCount}
                    </b>
                  )}
                </div>
                <div className="canvas-body">
                  {hadithPage && (
                    <>
                      <small>قال رسول الله ﷺ</small>
                      <h2>{hadithPage}</h2>
                    </>
                  )}
                  {showTranslation && translationPage && (
                    <>
                      <i />
                      <p
                        className="canvas-translation"
                        dir={rtl.has(language) ? "rtl" : "ltr"}
                      >
                        {translationPage}
                      </p>
                    </>
                  )}
                  {showExplanation && explanationPage && (
                    <p className="canvas-explanation">{explanationPage}</p>
                  )}
                  {showSource && (
                    <b>
                      {hadith.attribution} · {hadith.grade} · رقم {hadith.id}
                    </b>
                  )}
                </div>
                <div className="canvas-footer">
                  {showQr && (
                    <div className="qr">
                      <QRCodeSVG
                        value={sourceUrl}
                        size={64}
                        level="M"
                        marginSize={1}
                      />
                    </div>
                  )}
                  <span>
                    امسح الرمز لفتح
                    <br />
                    الحديث في المصدر
                  </span>
                  <strong>
                    HadeethEnc.com<small>موسوعة الأحاديث النبوية</small>
                  </strong>
                </div>
              </div>
            </div>
            {pageCount > 1 && (
              <div className="page-nav">
                <button
                  disabled={safePage === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ArrowRight /> السابقة
                </button>
                <span>
                  الصفحة {safePage + 1} من {pageCount}
                  <small>قسّم النص تلقائيًا لمنع القص</small>
                </span>
                <button
                  disabled={safePage === pageCount - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  التالية <ArrowLeft />
                </button>
              </div>
            )}
            <div className="editor">
              <div className="editor-section full">
                <label>
                  <Palette /> الخلفية
                </label>
                <div className="backgrounds">
                  {backgrounds.map((b) => (
                    <button
                      key={b.id}
                      title={b.label}
                      className={`${theme === b.id ? "active" : ""} ${b.cls || "photo"}`}
                      style={
                        b.url ? { backgroundImage: `url(${b.url})` } : undefined
                      }
                      onClick={() => {
                        setTheme(b.id);
                        setCustomBg("");
                      }}
                    >
                      <span>{b.animated ? "متحركة" : b.label}</span>
                    </button>
                  ))}
                  <label className="upload">
                    <UploadSimple />
                    <span>رفع صورة</span>
                    <input type="file" accept="image/*" onChange={upload} />
                  </label>
                </div>
              </div>
              <div>
                <label>خط الحديث</label>
                <select value={font} onChange={(e) => setFont(e.target.value)}>
                  {fonts.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>حجم الحديث {fontScale}%</label>
                <input
                  type="range"
                  min="65"
                  max="135"
                  value={fontScale}
                  onChange={(e) => setFontScale(+e.target.value)}
                />
              </div>
              <div>
                <label>خط الترجمة</label>
                <select
                  value={translationFont}
                  onChange={(e) => setTranslationFont(e.target.value)}
                >
                  {fonts.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>حجم الترجمة {translationScale}%</label>
                <input
                  type="range"
                  min="70"
                  max="130"
                  value={translationScale}
                  onChange={(e) => setTranslationScale(+e.target.value)}
                />
              </div>
              <div>
                <label>محاذاة العربي</label>
                <div className="align-control">
                  {[
                    ["right", "يمين"],
                    ["center", "وسط"],
                    ["left", "يسار"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      className={arabicAlign === value ? "active" : ""}
                      onClick={() => setArabicAlign(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label>محاذاة الترجمة</label>
                <div className="align-control">
                  {[
                    ["left", "يسار"],
                    ["center", "وسط"],
                    ["right", "يمين"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      className={translationAlign === value ? "active" : ""}
                      onClick={() => setTranslationAlign(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label>تباعد العربي {arabicLine}%</label>
                <input
                  type="range"
                  min="120"
                  max="210"
                  value={arabicLine}
                  onChange={(e) => setArabicLine(+e.target.value)}
                />
              </div>
              <div>
                <label>تباعد الترجمة {translationLine}%</label>
                <input
                  type="range"
                  min="110"
                  max="190"
                  value={translationLine}
                  onChange={(e) => setTranslationLine(+e.target.value)}
                />
              </div>
              <div>
                <label>تعتيم الخلفية {overlay}%</label>
                <input
                  type="range"
                  min="10"
                  max="80"
                  value={overlay}
                  onChange={(e) => setOverlay(+e.target.value)}
                />
              </div>
              <div className="checks full">
                <label>
                  <input
                    type="checkbox"
                    checked={showTranslation}
                    onChange={(e) => {
                      setShowTranslation(e.target.checked);
                      setPage(0);
                    }}
                  />{" "}
                  الترجمة
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={showExplanation}
                    onChange={(e) => setShowExplanation(e.target.checked)}
                  />{" "}
                  الشرح
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={showSource}
                    onChange={(e) => setShowSource(e.target.checked)}
                  />{" "}
                  التخريج
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={showQr}
                    onChange={(e) => setShowQr(e.target.checked)}
                  />{" "}
                  رمز QR حقيقي
                </label>
              </div>
            </div>
            <div className="export-bar">
              <select
                value={exportType}
                onChange={(e) => setExportType(e.target.value)}
              >
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
                <option value="webp">WebP</option>
                <option value="svg">SVG</option>
              </select>
              <select
                value={quality}
                onChange={(e) => setQuality(+e.target.value)}
              >
                <option value="2">عالية 2×</option>
                <option value="3">فائقة 3×</option>
                <option value="4">طباعة 4×</option>
              </select>
              <button onClick={exportDesign}>
                <DownloadSimple /> تصدير الصفحة {safePage + 1}
              </button>
              {pageCount === 2 && (
                <button className="export-both" onClick={exportBothPages}>
                  <DownloadSimple /> تصدير الصفحتين
                </button>
              )}
            </div>
            <p className="integrity">
              <Info /> الإعدادات تُحفظ تلقائيًا، والنص الطويل يُقسّم دون حذف.
            </p>
          </aside>
        </section>
      </main>
      {notice && (
        <div className="toast">
          <Check /> {notice}
        </div>
      )}
    </div>
  );
}
