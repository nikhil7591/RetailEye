import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Eye, ChevronRight, Play, Users, BarChart3, Zap,
  Scan, TrendingUp, Lightbulb, Rocket, Sparkles, Target, Package,
  Store, Brain
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════════════════════════════ */
function Navbar() {
  const navigate = useNavigate();
  const [active, setActive] = useState("Home");
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = ["Home", "Features", "How it Works", "Dashboard", "Pricing", "About"];

  const handleNav = (link) => {
    setActive(link);
    setMobileOpen(false);
    if (link === "Dashboard") {
      navigate("/dashboard");
    } else if (link === "Home") {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const id = link.toLowerCase().replace(/ /g, '-');
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-[#E2E8F0]/50"
    >
      <div className="max-w-[1280px] mx-auto flex items-center justify-between h-[64px] md:h-[72px] px-4 md:px-6 xl:px-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("/")}>
          <div className="h-8 w-8 md:h-9 md:w-9 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shadow-md shadow-indigo-200">
            <Eye className="h-4 w-4 md:h-5 md:w-5 text-white" />
          </div>
          <span className="text-lg md:text-xl font-bold tracking-tight text-[#0F172A]">
            Retail<span className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] bg-clip-text text-transparent">Eye</span>
          </span>
        </div>

        {/* Center Links (desktop) */}
        <div className="hidden lg:flex items-center gap-1">
          {links.map(link => (
            <button
              key={link}
              onClick={() => handleNav(link)}
              className={`px-4 py-2 text-[13.5px] font-semibold rounded-lg transition-colors ${active === link
                  ? "text-[#6366F1]"
                  : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
                }`}
            >
              {link}
            </button>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#E2E8F0]/40 bg-[#EEF2FF]">
            <Sparkles className="h-3.5 w-3.5 text-[#6366F1]" />
            <span className="text-[11.5px] font-bold text-[#6366F1] tracking-wide">AI Powered</span>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="hidden sm:flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-xs md:text-sm font-bold shadow-lg shadow-indigo-200/60 hover:shadow-xl hover:shadow-indigo-300/60 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Launch App <ChevronRight className="h-4 w-4" />
          </button>
          {/* Hamburger button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="lg:hidden bg-white/95 backdrop-blur-xl border-t border-[#E2E8F0]/50 shadow-lg"
        >
          <div className="flex flex-col py-3 px-4">
            {links.map(link => (
              <button
                key={link}
                onClick={() => handleNav(link)}
                className={`w-full text-left px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${active === link
                    ? "text-[#6366F1] bg-[#EEF2FF]"
                    : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
                  }`}
              >
                {link}
              </button>
            ))}
            <button
              onClick={() => { setMobileOpen(false); navigate("/dashboard"); }}
              className="mt-3 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-sm font-bold shadow-lg"
            >
              Launch App <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FLOATING CARDS (on the 3D visual side)
   ═══════════════════════════════════════════════════════════════════════════ */
function ShelfOccupancyCard() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6, duration: 0.6 }}
      className="absolute top-[5%] left-[-8%] z-20"
    >
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl px-5 py-4 shadow-[0_20px_40px_-15px_rgba(99,102,241,0.2)] border border-white/60">
        <p className="text-[11px] font-semibold text-[#64748B] mb-1">Shelf Occupancy</p>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-[#0F172A]">64%</span>
          <span className="text-[11px] font-bold text-[#22C55E] mb-1">↑ 12%</span>
        </div>
        {/* Mini graph */}
        <svg className="w-full h-8 mt-2" viewBox="0 0 120 30">
          <path d="M0,25 Q15,20 30,18 T60,12 T90,8 T120,5" fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M0,25 Q15,20 30,18 T60,12 T90,8 T120,5 L120,30 L0,30 Z" fill="url(#miniGrad)" opacity="0.15" />
          <defs>
            <linearGradient id="miniGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </motion.div>
  );
}

function AIDetectionCard() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.8, duration: 0.6 }}
      className="absolute -top-[2%] -right-[5%] md:-right-[15%] z-20 hidden sm:block"
    >
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl px-5 py-4 shadow-[0_20px_40px_-15px_rgba(99,102,241,0.2)] border border-white/60 min-w-[190px]">
        <div className="flex items-center gap-2 mb-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E] animate-pulse" />
          <span className="text-[11px] font-bold text-[#0F172A]">AI Detection</span>
          <span className="text-[11px] font-bold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] bg-clip-text text-transparent">Live</span>
        </div>
        <div className="flex flex-col gap-2">
          {[
            { label: "Products Detected", value: "23" },
            { label: "Empty Slots", value: "13" },
            { label: "Shelf Score", value: "67/100" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-[11px] text-[#64748B]">{item.label}</span>
              <span className="text-[12px] font-bold text-[#0F172A]">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ScoreCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.0, duration: 0.6 }}
      className="absolute bottom-[8%] -right-[5%] md:-right-[15%] z-20 hidden sm:block"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="bg-white/95 backdrop-blur-xl rounded-2xl p-5 shadow-[0_25px_50px_-12px_rgba(99,102,241,0.25)] border border-white/60 flex flex-col items-center"
      >
        {/* Circular score */}
        <div className="relative h-[90px] w-[90px]">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#F1F5F9" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke="url(#scoreGrad)" strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${67 * 2.64} ${100 * 2.64}`}
            />
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-[#0F172A]">67</span>
            <span className="text-[9px] text-[#94A3B8] font-semibold">/100</span>
          </div>
        </div>
        <span className="text-xs font-bold text-[#6366F1] mt-1.5 tracking-wider">FAIR</span>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HERO SECTION
   ═══════════════════════════════════════════════════════════════════════════ */
function HeroSection() {
  const navigate = useNavigate();

  return (
    <section id="home" className="relative pt-[80px] md:pt-[100px] pb-8 md:pb-12 overflow-hidden bg-white">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-white pointer-events-none" />
      {/* Decorative blobs */}
      <div className="absolute top-20 right-20 w-[500px] h-[500px] rounded-full bg-[#EEF2FF] blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#F5F3FF] blur-3xl opacity-40 pointer-events-none" />

      <div className="relative max-w-[1280px] mx-auto px-4 md:px-6 xl:px-10">
        <div className="grid lg:grid-cols-2 gap-6 md:gap-8 items-center min-h-0 lg:min-h-[520px]">

          {/* ─── LEFT: TEXT ─── */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="flex flex-col gap-6"
          >
            {/* Badge */}
            <div className="flex">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EEF2FF] border border-[#C7D2FE]/30 text-[12px] font-bold text-[#6366F1]">
                <Sparkles className="h-3.5 w-3.5" />
                AI Retail Intelligence Platform
              </span>
            </div>

            {/* Heading */}
            <h1 className="text-[2rem] sm:text-[2.6rem] md:text-[3.2rem] xl:text-[3.6rem] font-extrabold leading-[1.08] tracking-tight text-[#0F172A]">
              See Every Shelf.
              <br />
              Know Every{" "}
              <span className="bg-gradient-to-r from-[#6366F1] to-[#A855F7] bg-clip-text text-transparent">
                Opportunity.
              </span>
            </h1>

            {/* Description */}
            <p className="text-[13.5px] sm:text-[15.5px] text-[#64748B] leading-relaxed max-w-[440px]">
              RetailEye uses advanced AI vision to analyze shelf images,
              track inventory, detect empty spots, and boost retail efficiency
              like never before.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mt-1">
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center justify-center gap-2.5 px-5 sm:px-7 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-sm font-bold shadow-lg shadow-indigo-200/60 hover:shadow-xl hover:shadow-indigo-300/60 hover:scale-[1.03] active:scale-[0.98] transition-all"
              >
                Launch Dashboard <Rocket className="h-4 w-4 fill-current" />
              </button>
              <button className="flex items-center justify-center gap-2.5 px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl border-2 border-[#E2E8F0] text-sm font-bold text-[#0F172A] hover:bg-[#F8FAFC] hover:border-[#C7D2FE] transition-all group">
                <div className="h-7 w-7 rounded-full bg-[#F1F5F9] flex items-center justify-center group-hover:bg-[#EEF2FF] transition-colors">
                  <Play className="h-3.5 w-3.5 text-[#6366F1] ml-0.5" />
                </div>
                Watch Demo
              </button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-6 sm:mt-8">
              {[
                { icon: Store, value: "500+", label: "Stores Analyzed", iconBg: "bg-purple-100", iconColor: "text-purple-600" },
                { icon: Target, value: "98.5%", label: "Accuracy Rate", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
                { icon: Brain, value: "AI Real-time", label: "Instant Insights", iconBg: "bg-purple-100", iconColor: "text-purple-600" },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-2 sm:gap-3 bg-white/60 backdrop-blur-md border border-white/80 rounded-full px-3 sm:px-5 py-2 sm:py-2.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                  <div className={`h-6 w-6 sm:h-8 sm:w-8 rounded-full ${stat.iconBg} flex items-center justify-center shrink-0`}>
                    <stat.icon className={`h-3 w-3 sm:h-4 sm:w-4 ${stat.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-[12px] sm:text-[14px] font-extrabold text-[#0F172A] leading-none">{stat.value}</p>
                    <p className="text-[9px] sm:text-[11px] text-[#94A3B8] font-medium mt-0.5">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ─── RIGHT: 3D VISUAL ─── */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative flex items-center justify-center lg:justify-end mt-12 lg:mt-20 pr-4 xl:pr-10"
          >
            <div className="relative w-full max-w-[600px]">
              {/* Main integrated scene image */}
              <div className="relative">
                <img
                  src="/image.png"
                  alt="3D Smart Shelf & AI Robot"
                  className="w-full h-auto drop-shadow-2xl object-contain"
                />
              </div>

              {/* Floating cards */}
              <ShelfOccupancyCard />
              <AIDetectionCard />
              <ScoreCard />

              {/* Decorative floating dots */}
              <motion.div
                className="absolute top-[10%] -right-[10%] h-3 w-3 rounded-full bg-[#6366F1] shadow-[0_0_15px_rgba(99,102,241,0.8)]"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute top-[60%] -left-[10%] h-2 w-2 rounded-full bg-[#A855F7] shadow-[0_0_15px_rgba(168,85,247,0.8)]"
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              />
              <motion.div
                className="absolute bottom-[20%] -right-[5%] h-2.5 w-2.5 rounded-full bg-[#3B82F6] shadow-[0_0_15px_rgba(59,130,246,0.8)]"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FEATURE CARDS
   ═══════════════════════════════════════════════════════════════════════════ */
const features = [
  {
    icon: Brain,
    title: "Dual-Model YOLOv8",
    desc: "Two specialized YOLO models run in parallel to detect both products and empty shelf slots simultaneously.",
    iconBg: "bg-[#EEF2FF]",
    iconColor: "text-[#6366F1]",
  },
  {
    icon: Scan,
    title: "Groq Vision ID",
    desc: "Powered by Llama 4 Scout to rapidly identify exact product names and categories from cropped detections.",
    iconBg: "bg-[#EFF6FF]",
    iconColor: "text-[#3B82F6]",
  },
  {
    icon: Lightbulb,
    title: "Smart Row Clustering",
    desc: "Detections are automatically clustered by Y-coordinate to analyze occupancy on a per-shelf-row basis.",
    iconBg: "bg-[#FAF5FF]",
    iconColor: "text-[#A855F7]",
  },
  {
    icon: TrendingUp,
    title: "Actionable Analytics",
    desc: "Immediate shelf scores, occupancy percentages, heatmaps, and color-coded restock priority alerts.",
    iconBg: "bg-[#FFF7ED]",
    iconColor: "text-[#F59E0B]",
  },
];

function FeatureCards() {
  return (
    <section id="features" className="relative pb-16 pt-4 z-10 bg-white">
      <div className="max-w-[1280px] mx-auto px-6 xl:px-10">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {features.map((feat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className="group bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-[0_8px_30px_-5px_rgba(0,0,0,0.06)] border border-[#E2E8F0]/60 hover:shadow-2xl hover:shadow-indigo-100/60 hover:border-[#C7D2FE] transition-all cursor-default flex items-start gap-5 relative overflow-hidden"
            >
              <div className={`shrink-0 h-16 w-16 rounded-2xl ${feat.iconBg} flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform`}>
                <feat.icon className={`h-7 w-7 ${feat.iconColor}`} />
              </div>
              <div className="flex-1 pt-1">
                <h3 className="text-[15px] font-extrabold text-[#0F172A] mb-1.5">{feat.title}</h3>
                <p className="text-[12.5px] text-[#64748B] leading-[1.6]">{feat.desc}</p>
              </div>
              <div className="absolute bottom-5 right-5 h-6 w-6 rounded-full bg-white shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="h-3 w-3 text-[#94A3B8]" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ADDITIONAL SECTIONS
   ═══════════════════════════════════════════════════════════════════════════ */
function HowItWorks() {
  const steps = [
    { num: "01", title: "Upload Media", desc: "Simply upload a shelf photo or MP4 video directly to the RetailEye dashboard." },
    { num: "02", title: "AI Processing", desc: "Our dual YOLOv8 pipeline and Groq Vision LLM instantly map products and empty spaces." },
    { num: "03", title: "Review Insights", desc: "Get an annotated visual report, a 0-100 shelf score, and color-coded restock alerts." }
  ];
  return (
    <section id="how-it-works" className="py-16 bg-white relative border-t border-[#F1F5F9]">
      <div className="max-w-[1280px] mx-auto px-6 xl:px-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] mb-4">How RetailEye Works</h2>
          <p className="text-[15px] text-[#64748B]">Three simple steps to transform your retail operations with AI.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 relative">
          {steps.map((step, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative p-8 rounded-3xl bg-[#F8FAFC] border border-[#F1F5F9] hover:shadow-lg transition-all group"
            >
              <div className="text-4xl font-black text-[#E2E8F0] mb-4 group-hover:text-[#C7D2FE] transition-colors">{step.num}</div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-3">{step.title}</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("idle"); // idle | processing | success
  const [hoveredCard, setHoveredCard] = useState("Professional");

  const handleCheckout = (plan) => {
    if (plan === "Demo") {
      navigate("/dashboard");
      return;
    }
    setSelectedPlan(plan);
    setPaymentStatus("idle");
    setShowModal(true);
  };

  const processPayment = () => {
    setPaymentStatus("processing");
    setTimeout(() => {
      setPaymentStatus("success");
      setTimeout(() => {
        setShowModal(false);
        navigate("/dashboard");
      }, 1500);
    }, 2000);
  };

  const plans = [
    {
      name: "Demo",
      subtitle: "Experience the power of AI.",
      price: "Free",
      period: "",
      buttonText: "Try for Free",
      lightButtonClass: "border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC]",
      lightDotClass: "bg-[#94A3B8]",
      features: [
        "Up to 10 Image Scans/mo",
        "Manual Image Upload Only",
        "Basic YOLOv8 Detection",
        "No CCTV / Video feeds"
      ]
    },
    {
      name: "Starter",
      subtitle: "Perfect for single stores.",
      price: "₹2,499",
      period: "/mo",
      buttonText: "Get Started",
      lightButtonClass: "bg-[#F1F5F9] text-[#0F172A] hover:bg-[#E2E8F0]",
      lightDotClass: "bg-[#6366F1]",
      features: [
        "1 Store / 3 Static Cameras",
        "100 Daily Image Scans",
        "Dual YOLOv8 Detection",
        "Standard Email Support"
      ]
    },
    {
      name: "Professional",
      subtitle: "For growing retail chains.",
      price: "₹7,499",
      period: "/mo",
      buttonText: "Get Started",
      isPopular: true,
      lightButtonClass: "bg-[#F1F5F9] text-[#0F172A] hover:bg-[#E2E8F0]",
      lightDotClass: "bg-[#6366F1]",
      features: [
        "5 Stores / 25 Live Streams",
        "Real-time Video Processing",
        "Groq Vision AI LLM",
        "Priority Alerts & History"
      ]
    },
    {
      name: "Enterprise",
      subtitle: "For large supermarkets.",
      price: "Custom",
      period: "",
      buttonText: "Contact Sales",
      lightButtonClass: "bg-[#F1F5F9] text-[#0F172A] hover:bg-[#E2E8F0]",
      lightDotClass: "bg-[#6366F1]",
      features: [
        "Unlimited Camera Feeds",
        "Edge Computing Deployment",
        "Custom Model Training",
        "Dedicated Account Manager"
      ]
    }
  ];

  return (
    <section id="pricing" className="py-16 bg-[#F8FAFC] relative">
      <div className="max-w-[1280px] mx-auto px-6 xl:px-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] mb-4">Simple, Transparent Pricing</h2>
          <p className="text-[15px] text-[#64748B]">Scale your retail intelligence across all your stores.</p>
        </div>
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto items-stretch"
          onMouseLeave={() => setHoveredCard("Professional")}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            visible: { transition: { staggerChildren: 0.1 } }
          }}
        >
          {plans.map((plan) => {
            const isHovered = hoveredCard === plan.name;
            return (
              <motion.div 
                key={plan.name}
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
                }}
                onMouseEnter={() => setHoveredCard(plan.name)}
                className={`p-6 xl:p-8 rounded-3xl border shadow-sm transition-all duration-300 flex flex-col cursor-pointer relative transform ${
                  isHovered 
                    ? "bg-[#0F172A] border-[#1E293B] shadow-2xl -translate-y-4" 
                    : "bg-white border-[#E2E8F0] hover:-translate-y-2"
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute top-0 right-8 -translate-y-1/2 px-3 py-1 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] rounded-full text-[10px] font-bold tracking-wider text-white whitespace-nowrap">
                    MOST POPULAR
                  </div>
                )}
                <h3 className={`text-xl font-bold mb-2 transition-colors ${isHovered ? "text-white" : "text-[#0F172A]"}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mb-6 transition-colors ${isHovered ? "text-[#94A3B8]" : "text-[#64748B]"}`}>
                  {plan.subtitle}
                </p>
                <div className="mb-6">
                  <span className={`text-4xl font-extrabold transition-colors ${isHovered ? "text-white" : "text-[#0F172A]"}`}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className={`transition-colors ${isHovered ? "text-[#94A3B8]" : "text-[#64748B]"}`}>
                      {plan.period}
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => handleCheckout(plan.name)}
                  className={`w-full py-3 rounded-xl font-bold mb-6 transition-all duration-300 active:scale-95 ${
                    isHovered
                      ? "bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white border-transparent"
                      : plan.lightButtonClass
                  }`}
                >
                  {plan.buttonText}
                </button>
                <ul className={`space-y-3 text-sm mt-auto transition-colors ${isHovered ? "text-[#CBD5E1]" : "text-[#64748B]"}`}>
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 transition-colors ${isHovered ? "bg-[#8B5CF6]" : plan.lightDotClass}`} /> 
                      <span className={isHovered && plan.isPopular && idx === 0 ? "font-semibold text-white" : ""}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Mock Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full relative border border-slate-100"
          >
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            
            <div className="text-center mb-8">
              <div className="h-14 w-14 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-4">
                <Target className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900">Checkout Demo</h3>
              <p className="text-sm text-slate-500 mt-1">Simulated payment for {selectedPlan} plan</p>
            </div>

            {paymentStatus === "idle" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex justify-between items-center">
                  <span className="font-medium text-slate-700">{selectedPlan} Plan</span>
                  <span className="font-bold text-slate-900">
                    {selectedPlan === "Starter" ? "₹2,499.00" : selectedPlan === "Professional" ? "₹7,499.00" : "Custom"}
                  </span>
                </div>
                
                <div className="space-y-3 pt-2">
                  <input type="text" placeholder="Card Number" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-600 font-medium" value="•••• •••• •••• 4242" readOnly />
                  <div className="flex gap-3">
                    <input type="text" placeholder="MM/YY" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-600 font-medium" value="12/26" readOnly />
                    <input type="text" placeholder="CVC" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-600 font-medium" value="123" readOnly />
                  </div>
                </div>

                <button 
                  onClick={processPayment}
                  className="w-full py-3.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors mt-6 shadow-lg shadow-slate-200"
                >
                  Pay Now
                </button>
              </div>
            )}

            {paymentStatus === "processing" && (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <svg className="animate-spin h-10 w-10 text-indigo-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="font-semibold text-slate-900">Processing Payment...</p>
                <p className="text-sm text-slate-500 mt-1">Please do not close this window.</p>
              </div>
            )}

            {paymentStatus === "success" && (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4"
                >
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </motion.div>
                <p className="text-xl font-bold text-slate-900">Payment Successful!</p>
                <p className="text-sm text-slate-500 mt-2">Redirecting to your dashboard...</p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </section>
  );
}

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0F172A] relative overflow-hidden pt-12 md:pt-20 pb-8 md:pb-10 border-t border-[#1E293B]">
      {/* Decorative background glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#6366F1] rounded-full mix-blend-screen filter blur-[120px] opacity-10 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#8B5CF6] rounded-full mix-blend-screen filter blur-[120px] opacity-10 pointer-events-none" />

      <div className="max-w-[1280px] mx-auto px-4 md:px-6 xl:px-10 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-8 mb-12 md:mb-16">
          
          {/* Brand Column */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">
                Retail<span className="text-[#818CF8]">Eye</span>
              </span>
            </div>
            <p className="text-[#94A3B8] text-[15px] leading-relaxed max-w-sm">
              Revolutionizing retail inventory management through advanced AI computer vision and real-time analytics.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <a href="#" className="h-10 w-10 rounded-full bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[#94A3B8] hover:bg-[#6366F1] hover:text-white hover:border-[#6366F1] transition-all">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
              <a href="https://github.com/nikhil7591/RetailEye" target="_blank" rel="noreferrer" className="h-10 w-10 rounded-full bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[#94A3B8] hover:bg-[#6366F1] hover:text-white hover:border-[#6366F1] transition-all">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
              <a href="#" className="h-10 w-10 rounded-full bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[#94A3B8] hover:bg-[#6366F1] hover:text-white hover:border-[#6366F1] transition-all">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M22.675 0h-21.35C.598 0 0 .598 0 1.325v21.351C0 23.403.598 24 1.325 24h11.495v-9.294H9.691v-3.622h3.129V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.597 1.323-1.325V1.325C24 .598 23.402 0 22.675 0z"/></svg>
              </a>
            </div>
          </div>

          {/* Links Column 1 */}
          <div className="lg:col-span-2">
            <h4 className="text-white font-bold mb-5 tracking-wide text-[15px]">Product</h4>
            <ul className="flex flex-col gap-3.5 text-[#94A3B8] text-[14px]">
              <li><a href="#features" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="h-3 w-3 text-[#6366F1]" /> Features</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="h-3 w-3 text-[#6366F1]" /> How it Works</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="h-3 w-3 text-[#6366F1]" /> Pricing</a></li>
              <li><a href="/dashboard" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="h-3 w-3 text-[#6366F1]" /> Dashboard</a></li>
            </ul>
          </div>

          {/* Links Column 2 */}
          <div className="lg:col-span-2">
            <h4 className="text-white font-bold mb-5 tracking-wide text-[15px]">Company</h4>
            <ul className="flex flex-col gap-3.5 text-[#94A3B8] text-[14px]">
              <li><a href="#about" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="h-3 w-3 text-[#6366F1]" /> About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="h-3 w-3 text-[#6366F1]" /> Careers</a></li>
              <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="h-3 w-3 text-[#6366F1]" /> Contact</a></li>
              <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="h-3 w-3 text-[#6366F1]" /> Privacy Policy</a></li>
            </ul>
          </div>

          {/* Newsletter Column */}
          <div className="lg:col-span-4">
            <h4 className="text-white font-bold mb-5 tracking-wide text-[15px]">Stay Updated</h4>
            <p className="text-[#94A3B8] text-[14px] leading-relaxed mb-4">
              Join our newsletter for the latest updates on AI retail solutions and feature releases.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="bg-[#1E293B] border border-[#334155] rounded-xl px-4 py-3 text-sm text-white w-full focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] transition-all placeholder:text-[#64748B]"
              />
              <button className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white px-5 py-3 rounded-xl text-sm font-bold shadow-lg hover:shadow-indigo-500/25 transition-all whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#1E293B] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#64748B] text-sm">
            &copy; {currentYear} RetailEye AI. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-4 sm:gap-6 text-xs sm:text-sm text-[#64748B]">
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function AboutUs() {
  const team = [
    {
      name: "Nikhil Kumar",
      role: "AI & Full-Stack Developer",
      email: "nikhil759100@gmail.com",
      linkedin: "https://www.linkedin.com/in/nikhil-kumar-2974292a9/",
      image: "https://ui-avatars.com/api/?name=Nikhil+Kumar&background=6366F1&color=fff&size=256"
    },
    {
      name: "Kushagra Kataria",
      role: "AI & Full-Stack Developer",
      email: "kushagrakataria@gmail.com",
      linkedin: "https://www.linkedin.com/in/kushagra-kataria-04829a2ba/",
      image: "https://ui-avatars.com/api/?name=Kushagra+Kataria&background=8B5CF6&color=fff&size=256"
    }
  ];

  return (
    <section id="about" className="py-20 bg-white relative">
      <div className="max-w-[1280px] mx-auto px-6 xl:px-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] mb-4">About the Creators</h2>
          <p className="text-[15px] text-[#64748B] italic">
            "Built to explore how computer vision and LLM agents can eliminate manual shelf auditing in retail — from image to insight, zero human counting."
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {team.map((member, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="p-8 rounded-3xl bg-[#F8FAFC] border border-[#E2E8F0] hover:shadow-xl hover:border-[#C7D2FE] transition-all flex flex-col items-center text-center group"
            >
              <div className="h-24 w-24 rounded-full overflow-hidden mb-5 border-4 border-white shadow-lg group-hover:scale-105 transition-transform duration-300">
                <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-1">{member.name}</h3>
              <p className="text-sm font-semibold text-[#6366F1] mb-5">{member.role}</p>
              
              <div className="flex items-center gap-3 mt-auto">
                <a 
                  href={member.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-[13px] font-bold hover:bg-[#1E293B] hover:shadow-md transition-all flex items-center gap-2"
                >
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.603 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  LinkedIn
                </a>
                <a 
                  href={`mailto:${member.email}`}
                  className="px-4 py-2 rounded-xl bg-white border border-[#E2E8F0] text-[#0F172A] text-[13px] font-bold hover:bg-[#F1F5F9] transition-all"
                >
                  Email
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LANDING PAGE (MAIN EXPORT)
   ═══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <div className="min-h-screen relative font-sans overflow-x-hidden selection:bg-[#6366F1] selection:text-white bg-white">
      {/* Very subtle glow to prevent harsh contrast, but keep it mostly white to blend with image.png */}
      <div className="fixed inset-0 bg-white -z-10" />
      <div className="fixed top-0 left-0 w-[800px] h-[800px] bg-gradient-to-br from-[#EEF2FF] to-transparent rounded-full blur-[120px] opacity-40 pointer-events-none -z-10" />

      <Navbar />
      <HeroSection />
      <FeatureCards />
      <HowItWorks />
      <Pricing />
      <AboutUs />
      <Footer />
    </div>
  );
}
