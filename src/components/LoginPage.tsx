import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, Lock, Mail, ArrowRight, Loader2, ShieldCheck, Zap, User, Phone, Globe, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- FULL COUNTRIES LIST ---
const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)",
  "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "East Timor (Timor-Leste)", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (formerly Burma)",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
  "Oman",
  "Pakistan", "Palau", "Palestine State", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States of America", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe"
];

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isLogin) {
        // --- LOGIN LOGIC ---
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
        onLogin();
      } else {
        // --- REGISTER LOGIC ---
        
        // 1. Validate Inputs (Strict)
        if (!email || !password || !name || !surname || !phone || !country) {
            throw new Error("All fields are required for registration.");
        }

        // 2. Create Auth User
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email.trim(),
            password: password.trim(),
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Registration failed.");

        // 3. SECURE DATABASE ENTRY (Using the new SQL Function)
        const { error: dbError } = await supabase.rpc('register_new_user', {
            p_id: authData.user.id,
            p_email: email,
            p_name: name,
            p_surname: surname,
            p_phone: phone,
            p_country: country
        });

        if (dbError) {
            console.error("Database registration error:", dbError);
            // We don't block the user if Auth succeeded, but we log it
        }

        setSuccessMsg("Registration Successful! System Access Granted.");
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Shared Input Styles
  const inputClasses = "w-full bg-[#0b0e11] border border-[#2a2e39] rounded-xl py-4 pl-12 pr-4 text-white placeholder-[#2a2e39] focus:border-[#21ce99] focus:shadow-[0_0_20px_rgba(33,206,153,0.1)] outline-none transition-all font-mono text-sm font-medium";
  const labelClasses = "text-[10px] font-bold text-[#8b9bb4] uppercase tracking-widest ml-1 group-focus-within:text-[#21ce99] transition-colors";
  const iconClasses = "absolute left-4 top-1/2 -translate-y-1/2 text-[#5e6673] group-focus-within:text-[#21ce99] transition-colors z-0";

  return (
    // Main container scrollable
    <div className="h-screen bg-[#0b0e11] flex flex-col items-center p-4 relative overflow-y-auto font-sans selection:bg-[#21ce99] selection:text-black">
      
      {/* --- BACKGROUND FX --- */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#151a21] via-[#0b0e11] to-[#000000] -z-10" />
      <div className="absolute inset-0 opacity-[0.03] -z-10" style={{ backgroundImage: 'linear-gradient(#21ce99 1px, transparent 1px), linear-gradient(90deg, #21ce99 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-[#21ce99]/20 to-transparent" />
      <div className="absolute bottom-0 w-full h-px bg-gradient-to-r from-transparent via-[#21ce99]/20 to-transparent" />

      {/* --- CONTENT CONTAINER --- */}
      <div className="relative z-10 w-full max-w-md py-10 m-auto">
        
        {/* LOGO AREA */}
        <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }}
            className="mb-10 text-center"
        >
            <div className="relative inline-block group">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#21ce99] to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                <div className="relative h-20 w-20 bg-[#151a21] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[#21ce99]/30 shadow-2xl">
                    <LayoutDashboard size={40} className="text-[#21ce99] drop-shadow-[0_0_10px_rgba(33,206,153,0.5)]" />
                </div>
            </div>
            
            <h1 className="text-4xl font-black text-white tracking-tighter mb-2">
                VOID<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#21ce99] to-emerald-600">NET</span>
            </h1>
            <div className="flex items-center justify-center gap-2 text-[#5e6673] text-xs font-mono tracking-widest uppercase">
                <span className="w-2 h-2 bg-[#21ce99] rounded-full animate-pulse"></span>
                System Operational
            </div>
        </motion.div>

        {/* AUTH CARD */}
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.5, delay: 0.1 }}
            // Ensure no overflow-hidden so native elements don't get clipped weirdly
            className="bg-[#151a21]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] relative"
        >
            {/* Top Light Accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#21ce99] to-transparent opacity-50 rounded-t-3xl" />

            {/* TABS */}
            <div className="flex gap-2 p-1.5 bg-[#0b0e11] rounded-xl border border-white/5 mb-8">
                <button
                    onClick={() => { setIsLogin(true); setError(null); setSuccessMsg(null); }}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-lg transition-all relative overflow-hidden ${
                        isLogin ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                    {isLogin && <motion.div layoutId="authTab" className="absolute inset-0 bg-[#2a2e39] rounded-lg shadow-sm" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                    <span className="relative z-10">Access Terminal</span>
                </button>
                <button
                    onClick={() => { setIsLogin(false); setError(null); setSuccessMsg(null); }}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-lg transition-all relative overflow-hidden ${
                        !isLogin ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                    {!isLogin && <motion.div layoutId="authTab" className="absolute inset-0 bg-[#2a2e39] rounded-lg shadow-sm" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                    <span className="relative z-10">New Registration</span>
                </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
                <AnimatePresence>
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: 'auto' }} 
                            exit={{ opacity: 0, height: 0 }}
                            className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold text-center flex items-center justify-center gap-2"
                        >
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                            {error}
                        </motion.div>
                    )}
                    {successMsg && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: 'auto' }} 
                            exit={{ opacity: 0, height: 0 }}
                            className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs font-bold text-center flex items-center justify-center gap-2"
                        >
                            <ShieldCheck size={14} />
                            {successMsg}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* --- REGISTRATION FIELDS --- */}
                {!isLogin && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 group">
                                <label className={labelClasses}>First Name</label>
                                <div className="relative">
                                    <div className={iconClasses}><User size={18} /></div>
                                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="JOHN" className={inputClasses} />
                                </div>
                            </div>
                            <div className="space-y-2 group">
                                <label className={labelClasses}>Last Name</label>
                                <input type="text" value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="DOE" className={`${inputClasses} pl-4`} />
                            </div>
                        </div>

                        <div className="space-y-2 group">
                            <label className={labelClasses}>Phone Number</label>
                            <div className="relative">
                                <div className={iconClasses}><Phone size={18} /></div>
                                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 890" className={inputClasses} />
                            </div>
                        </div>

                        {/* FIX: DROPDOWN SCROLLABILITY */}
                        <div className="space-y-2 group">
                            <label className={labelClasses}>Country</label>
                            <div className="relative">
                                <div className={iconClasses}><Globe size={18} /></div>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2a2e39] pointer-events-none group-focus-within:text-[#21ce99] transition-colors z-20">
                                    <ChevronDown size={16} />
                                </div>
                                <select 
                                    value={country} 
                                    onChange={(e) => setCountry(e.target.value)} 
                                    style={{ colorScheme: 'dark' }}
                                    className={`${inputClasses} appearance-none cursor-pointer relative z-10`}
                                >
                                    <option value="" disabled>SELECT COUNTRY</option>
                                    {COUNTRIES.map(c => (
                                        <option key={c} value={c} className="bg-[#0b0e11] text-gray-300">
                                            {c.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </>
                )}

                {/* --- COMMON FIELDS --- */}
                <div className="space-y-2 group">
                    <label className={labelClasses}>Identification (Email)</label>
                    <div className="relative">
                        <div className={iconClasses}><Mail size={18} /></div>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="OPERATIVE ID..." className={inputClasses} />
                    </div>
                </div>

                <div className="space-y-2 group">
                    <label className={labelClasses}>Access Key (Password)</label>
                    <div className="relative">
                        <div className={iconClasses}><Lock size={18} /></div>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" className={inputClasses} />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#21ce99] to-[#1db586] hover:from-[#1db586] hover:to-[#1aa37a] text-[#0b0e11] font-black py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(33,206,153,0.3)] hover:shadow-[0_0_30px_rgba(33,206,153,0.5)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed group mt-2"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (
                        <>
                            {isLogin ? <Zap size={20} className="fill-current" /> : <ShieldCheck size={20} />}
                            <span className="uppercase tracking-widest text-xs">{isLogin ? 'Initialize Session' : 'Create Secure ID'}</span>
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-8 flex items-center justify-center gap-6 opacity-40 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2 text-[10px] text-[#8b9bb4] uppercase font-bold tracking-widest">
                    <ShieldCheck size={12} /> 256-Bit Encrypted
                </div>
                <div className="w-1 h-1 bg-[#2a2e39] rounded-full" />
                <div className="flex items-center gap-2 text-[10px] text-[#8b9bb4] uppercase font-bold tracking-widest">
                    <Zap size={12} /> Low Latency
                </div>
            </div>
        </motion.div>

        <p className="mt-8 text-center text-[10px] text-[#5e6673] font-mono">
            SECURE CONNECTION ESTABLISHED v2.4.0 <br/>
            <span className="opacity-50">UNAUTHORIZED ACCESS IS PROHIBITED</span>
        </p>
      </div>
    </div>
  );
}