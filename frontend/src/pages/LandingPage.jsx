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
  const links = ["Home", "Features", "How it Works", "Dashboard", "Pricing", "About"];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-[#E2E8F0]/50">
      <div className="max-w-[1280px] mx-auto flex items-center justify-between h-[72px] px-6 xl:px-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("/")}>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shadow-md shadow-indigo-200">
            <Eye className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#0F172A]">
            Retail<span className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] bg-clip-text text-transparent">Eye</span>
          </span>
        </div>

        {/* Center Links */}
        <div className="hidden lg:flex items-center gap-1">
          {links.map(link => {
            const id = link.toLowerCase().replace(/ /g, '-');
            return (
              <button
                key={link}
                onClick={() => {
                  setActive(link);
                  if (link === "Dashboard") {
                    navigate("/dashboard");
                  } else if (link === "Home") {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  } else {
                    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className={`px-4 py-2 text-[13.5px] font-semibold rounded-lg transition-colors ${active === link
                    ? "text-[#6366F1]"
                    : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
                  }`}
              >
                {link}
              </button>
            );
          })}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#E2E8F0]/40 bg-[#EEF2FF]">
            <Sparkles className="h-3.5 w-3.5 text-[#6366F1]" />
            <span className="text-[11.5px] font-bold text-[#6366F1] tracking-wide">AI Powered</span>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-sm font-bold shadow-lg shadow-indigo-200/60 hover:shadow-xl hover:shadow-indigo-300/60 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Launch App <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
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
    <section id="home" className="relative pt-[100px] pb-12 overflow-hidden bg-white">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-white pointer-events-none" />
      {/* Decorative blobs */}
      <div className="absolute top-20 right-20 w-[500px] h-[500px] rounded-full bg-[#EEF2FF] blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#F5F3FF] blur-3xl opacity-40 pointer-events-none" />

      <div className="relative max-w-[1280px] mx-auto px-6 xl:px-10">
        <div className="grid lg:grid-cols-2 gap-8 items-center min-h-[520px]">

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
            <h1 className="text-[3.2rem] xl:text-[3.6rem] font-extrabold leading-[1.08] tracking-tight text-[#0F172A]">
              See Every Shelf.
              <br />
              Know Every{" "}
              <span className="bg-gradient-to-r from-[#6366F1] to-[#A855F7] bg-clip-text text-transparent">
                Opportunity.
              </span>
            </h1>

            {/* Description */}
            <p className="text-[15.5px] text-[#64748B] leading-relaxed max-w-[440px]">
              RetailEye uses advanced AI vision to analyze shelf images,
              track inventory, detect empty spots, and boost retail efficiency
              like never before.
            </p>

            {/* Buttons */}
            <div className="flex items-center gap-4 mt-1">
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-sm font-bold shadow-lg shadow-indigo-200/60 hover:shadow-xl hover:shadow-indigo-300/60 hover:scale-[1.03] active:scale-[0.98] transition-all"
              >
                Launch Dashboard <Rocket className="h-4 w-4 fill-current" />
              </button>
              <button className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl border-2 border-[#E2E8F0] text-sm font-bold text-[#0F172A] hover:bg-[#F8FAFC] hover:border-[#C7D2FE] transition-all group">
                <div className="h-7 w-7 rounded-full bg-[#F1F5F9] flex items-center justify-center group-hover:bg-[#EEF2FF] transition-colors">
                  <Play className="h-3.5 w-3.5 text-[#6366F1] ml-0.5" />
                </div>
                Watch Demo
              </button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-4 mt-8">
              {[
                { icon: Store, value: "500+", label: "Stores Analyzed", iconBg: "bg-purple-100", iconColor: "text-purple-600" },
                { icon: Target, value: "98.5%", label: "Accuracy Rate", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
                { icon: Brain, value: "AI Real-time", label: "Instant Insights", iconBg: "bg-purple-100", iconColor: "text-purple-600" },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/60 backdrop-blur-md border border-white/80 rounded-full px-5 py-2.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                  <div className={`h-8 w-8 rounded-full ${stat.iconBg} flex items-center justify-center`}>
                    <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-[14px] font-extrabold text-[#0F172A] leading-none">{stat.value}</p>
                    <p className="text-[11px] text-[#94A3B8] font-medium mt-0.5">{stat.label}</p>
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
    icon: Eye,
    title: "AI Vision Detection",
    desc: "Advanced computer vision detects products, gaps, and planogram compliance.",
    iconBg: "bg-[#EEF2FF]",
    iconColor: "text-[#6366F1]",
  },
  {
    icon: Scan,
    title: "Real-time Insights",
    desc: "Get instant analytics and actionable insights as events happen.",
    iconBg: "bg-[#EFF6FF]",
    iconColor: "text-[#3B82F6]",
  },
  {
    icon: Lightbulb,
    title: "Smart Suggestions",
    desc: "AI-powered recommendations to optimize inventory and improve shelf performance.",
    iconBg: "bg-[#FAF5FF]",
    iconColor: "text-[#A855F7]",
  },
  {
    icon: TrendingUp,
    title: "Boost Efficiency",
    desc: "Reduce out-of-stocks, increase availability, and maximize sales performance.",
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
    { num: "01", title: "Connect Cameras", desc: "Link your existing store CCTV or aisle cameras to RetailEye seamlessly." },
    { num: "02", title: "AI Processing", desc: "Our vision models analyze the video feed in real-time to detect products." },
    { num: "03", title: "Get Insights", desc: "Receive instant alerts for empty slots and actionable planogram insights." }
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
            <div key={i} className="relative p-8 rounded-3xl bg-[#F8FAFC] border border-[#F1F5F9] hover:shadow-lg transition-all group">
              <div className="text-4xl font-black text-[#E2E8F0] mb-4 group-hover:text-[#C7D2FE] transition-colors">{step.num}</div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-3">{step.title}</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="py-16 bg-[#F8FAFC] relative">
      <div className="max-w-[1280px] mx-auto px-6 xl:px-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] mb-4">Simple, Transparent Pricing</h2>
          <p className="text-[15px] text-[#64748B]">Scale your retail intelligence across all your stores.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Starter */}
          <div className="p-8 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-bold text-[#0F172A] mb-2">Starter</h3>
            <p className="text-sm text-[#64748B] mb-6">Perfect for single stores.</p>
            <div className="mb-6"><span className="text-4xl font-extrabold text-[#0F172A]">$99</span><span className="text-[#64748B]">/mo</span></div>
            <button className="w-full py-3 rounded-xl bg-[#F1F5F9] text-[#0F172A] font-bold mb-6 hover:bg-[#E2E8F0] transition">Get Started</button>
            <ul className="space-y-3 text-sm text-[#64748B]">
              <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-[#6366F1]" /> Up to 5 cameras</li>
              <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-[#6366F1]" /> Daily reports</li>
              <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-[#6366F1]" /> Standard support</li>
            </ul>
          </div>
          {/* Pro */}
          <div className="p-8 rounded-3xl bg-[#0F172A] text-white border border-[#1E293B] shadow-2xl relative transform lg:-translate-y-4">
            <div className="absolute top-0 right-8 -translate-y-1/2 px-3 py-1 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] rounded-full text-[10px] font-bold tracking-wider">MOST POPULAR</div>
            <h3 className="text-xl font-bold mb-2">Professional</h3>
            <p className="text-sm text-[#94A3B8] mb-6">For growing retail chains.</p>
            <div className="mb-6"><span className="text-4xl font-extrabold">$299</span><span className="text-[#94A3B8]">/mo</span></div>
            <button className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-bold mb-6 hover:shadow-lg hover:shadow-indigo-500/30 transition">Start Free Trial</button>
            <ul className="space-y-3 text-sm text-[#CBD5E1]">
              <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" /> Up to 25 cameras</li>
              <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" /> Real-time alerts</li>
              <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" /> Priority support</li>
            </ul>
          </div>
          {/* Enterprise */}
          <div className="p-8 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm hidden lg:block hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-bold text-[#0F172A] mb-2">Enterprise</h3>
            <p className="text-sm text-[#64748B] mb-6">For large supermarkets.</p>
            <div className="mb-6"><span className="text-4xl font-extrabold text-[#0F172A]">Custom</span></div>
            <button className="w-full py-3 rounded-xl bg-[#F1F5F9] text-[#0F172A] font-bold mb-6 hover:bg-[#E2E8F0] transition">Contact Sales</button>
            <ul className="space-y-3 text-sm text-[#64748B]">
              <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-[#6366F1]" /> Unlimited cameras</li>
              <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-[#6366F1]" /> API access</li>
              <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-[#6366F1]" /> Dedicated manager</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer id="about" className="bg-white border-t border-[#F1F5F9] py-12">
      <div className="max-w-[1280px] mx-auto px-6 xl:px-10 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
            <Eye className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#0F172A]">
            Retail<span className="text-[#6366F1]">Eye</span>
          </span>
        </div>
        <p className="text-sm text-[#64748B]">&copy; 2026 RetailEye AI. All rights reserved.</p>
      </div>
    </footer>
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
      <Footer />
    </div>
  );
}
