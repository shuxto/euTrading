import { CheckCircle, XCircle, ShieldAlert, User, Clock, Loader2, ChevronLeft, ChevronRight, Eye, FileText, Download } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface AdminVerificationTabProps {
  users: any[];
  onVerify?: (userId: string) => void;
  onReject?: (userId: string) => void;
}

export default function AdminVerificationTab({ users }: AdminVerificationTabProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // --- INSPECT MODAL STATE ---
  const [inspectUser, setInspectUser] = useState<any | null>(null);
  const [kycDetails, setKycDetails] = useState<any | null>(null);
  const [kycDocs, setKycDocs] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // 🟢 1. FILTER
  const pendingUsers = users.filter(u => 
    u.role === 'user' &&
    !completedIds.includes(u.id) &&
    (u.kyc_status === 'pending' || u.kyc_status === 'unverified' || u.kyc_status === null || u.kyc_status === '')
  );

  // 🟢 2. PAGINATION
  const totalPages = Math.ceil(pendingUsers.length / itemsPerPage);
  const currentItems = pendingUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // 🟢 3. FETCH DETAILS LOGIC
  const handleInspect = async (user: any) => {
    setInspectUser(user);
    setLoadingDetails(true);
    setKycDetails(null);
    setKycDocs([]);

    try {
        // 1. Find the CRM Lead linked to this Trading Account
        const { data: lead } = await supabase
            .from('crm_leads')
            .select('id')
            .eq('trading_account_id', user.id)
            .maybeSingle();

        if (lead) {
            // 2. Fetch KYC Data
            const { data: kyc } = await supabase.from('crm_kyc').select('*').eq('lead_id', lead.id).maybeSingle();
            if (kyc) setKycDetails(kyc);

            // 3. Fetch Documents
            const { data: docs } = await supabase.from('crm_kyc_documents').select('*').eq('lead_id', lead.id);
            if (docs) setKycDocs(docs);
        }
    } catch (err) {
        console.error("Error fetching KYC details:", err);
    } finally {
        setLoadingDetails(false);
    }
  };

  // 🟢 4. DOCUMENT VIEWER
  const handleViewDoc = async (path: string) => {
      try {
          const { data } = await supabase.storage.from('kyc-documents').createSignedUrl(path, 60);
          if (data?.signedUrl) window.open(data.signedUrl, '_blank');
      } catch (e) { alert("Could not open document"); }
  };

  // 🟢 5. VERIFICATION LOGIC (Only Verify)
  const handleVerify = async (userId: string) => {
    if (!window.confirm(`Are you sure you want to VERIFY this client?`)) return;
    
    setProcessingId(userId);
    try {
        // Update Trading Profile
        const { error: profileError } = await supabase.from('profiles').update({ kyc_status: 'verified' }).eq('id', userId);
        if (profileError) throw profileError;

        // Update CRM Lead
        await supabase.from('crm_leads').update({ kyc_status: 'Approved' }).eq('trading_account_id', userId);

        setCompletedIds(prev => [...prev, userId]);
        setInspectUser(null); // Close modal if open
        // alert(`User successfully Verified.`); // Optional: removed alert for speed

    } catch (err: any) {
        alert("Verification Error: " + err.message);
    } finally {
        setProcessingId(null);
    }
  };

  return (
    <div className="w-full min-h-screen p-6 animate-in fade-in duration-500 relative font-sans space-y-6 overflow-visible bg-[#0b0e11]">
      
      {/* HEADER ALERT */}
      <div className="flex items-center justify-between p-6 bg-[#F0B90B]/5 border border-[#F0B90B]/20 rounded-3xl shadow-xl shadow-yellow-900/5">
         <div className="flex items-center gap-5">
            <div className="p-4 bg-[#F0B90B]/10 rounded-2xl text-[#F0B90B]"><ShieldAlert size={32} /></div>
            <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">KYC Queue</h3>
                <p className="text-sm text-[#F0B90B] font-medium uppercase tracking-widest opacity-80">{pendingUsers.length} Nodes Awaiting Clearance</p>
            </div>
         </div>
      </div>

      {/* TABLE */}
      <div className="bg-[#151a21] rounded-[2rem] border border-[#2a2e39] shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-[#1e232d] text-[10px] uppercase font-black text-gray-500 tracking-widest border-b border-[#2a2e39]">
              <tr>
                <th className="p-5 pl-8">Client Identification</th>
                <th className="p-5">Node Registration</th>
                <th className="p-5 text-center">Status</th>
                <th className="p-5 text-right pr-8">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2e39]/30">
              {currentItems.length === 0 ? (
                <tr><td colSpan={4} className="p-20 text-center text-gray-500 font-bold uppercase tracking-widest">All Nodes Cleared</td></tr>
              ) : (
                currentItems.map(user => (
                  <tr key={user.id} className="group hover:bg-[#1e232d]/60 transition-colors">
                    {/* IDENTITY */}
                    <td className="p-5 pl-8">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-2xl flex items-center justify-center bg-[#0b0e11] border border-white/5 text-gray-500"><User size={18} /></div>
                          <div>
                            <div className="text-sm font-bold text-white mb-1">{user.real_name || 'System Lead'}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </div>
                    </td>
                    {/* DATE */}
                    <td className="p-5 text-gray-400">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                            <Clock size={12} className="text-gray-600" />
                            {new Date(user.created_at).toLocaleDateString()}
                        </div>
                    </td>
                    {/* STATUS */}
                    <td className="p-5 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F0B90B]/10 text-[#F0B90B] rounded-lg text-[9px] font-black uppercase border border-[#F0B90B]/20 animate-pulse">Awaiting Review</span>
                    </td>
                    {/* ACTIONS */}
                    <td className="p-5 text-right pr-8">
                      <div className="flex justify-end gap-2">
                        {/* INSPECT BUTTON */}
                        <button 
                          onClick={() => handleInspect(user)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-xl transition-all font-bold text-[10px] uppercase tracking-wider border border-blue-500/20"
                        >
                          <Eye size={14} /> Inspect
                        </button>

                        {/* VERIFY BUTTON (NO REJECT) */}
                        <button 
                          disabled={processingId === user.id} 
                          onClick={() => handleVerify(user.id)} 
                          className="flex items-center gap-2 px-4 py-2 bg-[#21ce99]/10 text-[#21ce99] hover:bg-[#21ce99] hover:text-black rounded-xl border border-[#21ce99]/20 transition font-bold text-[10px] uppercase tracking-wider"
                        >
                          <CheckCircle size={14} /> Verify
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="p-6 bg-[#1e232d]/40 border-t border-[#2a2e39] flex justify-between items-center">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="text-xs font-bold text-gray-500 hover:text-white disabled:opacity-20"><ChevronLeft size={16} /> Prev</button>
              <span className="text-[10px] font-black text-gray-600 uppercase">Page {currentPage} / {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="text-xs font-bold text-gray-500 hover:text-white disabled:opacity-20">Next <ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      {/* 🟡 INSPECT MODAL */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#151a21] border border-[#2a2e39] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="p-6 border-b border-[#2a2e39] bg-[#1e232d] flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <User size={18} className="text-blue-400"/> {inspectUser.real_name || 'Client'}
                        </h3>
                        <p className="text-xs text-gray-500">{inspectUser.email}</p>
                    </div>
                    {/* Close Button uses XCircle, so we keep the import */}
                    <button onClick={() => setInspectUser(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition"><XCircle size={20}/></button>
                </div>

                {/* Modal Content */}
                <div className="p-8 overflow-y-auto space-y-8">
                    {loadingDetails ? (
                        <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-blue-400 mb-2" size={32}/> <p className="text-gray-500 text-xs uppercase tracking-widest">Retrieving Secure Data...</p></div>
                    ) : (
                        <>
                            {/* Personal Info */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Identity</h4>
                                    <div className="space-y-2 text-sm text-gray-300">
                                        <div className="flex justify-between"><span>Nationality:</span> <span className="text-white">{kycDetails?.nationality || '-'}</span></div>
                                        <div className="flex justify-between"><span>DOB:</span> <span className="text-white">{kycDetails?.date_of_birth || '-'}</span></div>
                                        <div className="flex justify-between"><span>Doc No:</span> <span className="text-white font-mono">{kycDetails?.document_number || '-'}</span></div>
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Residence</h4>
                                    <div className="space-y-2 text-sm text-gray-300">
                                        <div className="flex justify-between"><span>Country:</span> <span className="text-white">{kycDetails?.residence_country || '-'}</span></div>
                                        <div className="flex justify-between"><span>City:</span> <span className="text-white">{kycDetails?.city || '-'}</span></div>
                                        <div className="truncate text-xs text-gray-500 mt-2">{kycDetails?.street_address || 'No address provided'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Documents */}
                            <div>
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Submitted Documents</h4>
                                {kycDocs.length === 0 ? (
                                    <div className="text-center p-6 border border-dashed border-white/10 rounded-xl text-gray-600 text-xs italic">No documents found.</div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        {kycDocs.map((doc, i) => (
                                            <div key={i} onClick={() => handleViewDoc(doc.file_path)} className="cursor-pointer group p-4 rounded-xl bg-black/20 border border-white/5 hover:border-blue-500/50 hover:bg-blue-500/5 transition flex items-center gap-3">
                                                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg group-hover:scale-110 transition"><FileText size={18}/></div>
                                                <div className="overflow-hidden">
                                                    <div className="text-xs font-bold text-white group-hover:text-blue-400 transition truncate">{doc.file_type.toUpperCase().replace('_', ' ')}</div>
                                                    <div className="text-[10px] text-gray-500 flex items-center gap-1"><Download size={10}/> Click to View</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Modal Footer (Actions - ONLY VERIFY) */}
                <div className="p-6 border-t border-[#2a2e39] bg-[#1e232d] flex gap-3">
                    <button onClick={() => handleVerify(inspectUser.id)} className="flex-1 bg-[#21ce99] hover:bg-[#1db586] text-[#0b0e11] font-bold py-3 rounded-xl uppercase tracking-wider text-xs transition">
                        Verify Client
                    </button>
                </div>
            </div>
        </div>
      )}

      <div className="h-20 w-full" />
    </div>
  );
}