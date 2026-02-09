import { useState, Fragment } from 'react';
import { 
    History, 
    ArrowUpRight, 
    CheckCircle, 
    XCircle, 
    Clock, 
    ChevronLeft, 
    ChevronRight,
    Repeat,      
    Gift,        
    ShieldCheck, 
    Globe,       
    Server,
    ArrowRightLeft,
    ShieldAlert
} from 'lucide-react';

interface Props {
  transactions: any[];
}

export default function TransactionHistory({ transactions }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = transactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(transactions.length / itemsPerPage);

  const nextPage = () => { if (currentPage < totalPages) setCurrentPage(prev => prev + 1); };
  const prevPage = () => { if (currentPage > 1) setCurrentPage(prev => prev - 1); };

  // --- HELPER: GET CORRECT LABELS & ICONS ---
  const getTxConfig = (tx: any) => {
      // 1. INTERNAL TRANSFER
      const isTransfer = tx.type === 'transfer' || (tx.method && tx.method.includes('->'));
      
      if (isTransfer) {
          return {
              label: 'INTERNAL TRANSFER',
              subLabel: 'SELF-MANAGED',
              icon: <ArrowRightLeft size={14} />,
              color: 'text-blue-400',
              bg: 'bg-blue-400/10',
              border: 'border-blue-400/20',
              channelIcon: <Server size={12} />,
              channelName: 'SYSTEM'
          };
      }

      // 2. BONUS
      if (tx.type === 'bonus') {
          return {
              label: 'PERFORMANCE BONUS',
              subLabel: 'AGENT GRANTED',
              icon: <Gift size={14} />,
              color: 'text-[#F0B90B]', 
              bg: 'bg-[#F0B90B]/10',
              border: 'border-[#F0B90B]/20',
              channelIcon: <ShieldCheck size={12} />,
              channelName: 'AGENT'
          };
      }

      // 3. EXTERNAL DEPOSIT / WITHDRAWAL
      if (['deposit', 'withdrawal', 'external_deposit', 'external_withdraw'].includes(tx.type)) {
          const isIn = tx.type.includes('deposit');
          return {
              label: isIn ? 'EXTERNAL DEPOSIT' : 'WITHDRAWAL REQUEST',
              subLabel: isIn ? 'INBOUND LIQUIDITY' : 'OUTBOUND TRANSFER',
              icon: isIn ? <Globe size={14} /> : <ArrowUpRight size={14} />,
              color: isIn ? 'text-[#21ce99]' : 'text-[#f23645]',
              bg: isIn ? 'bg-[#21ce99]/10' : 'bg-[#f23645]/10',
              border: isIn ? 'border-[#21ce99]/20' : 'border-[#f23645]/20',
              channelIcon: <Globe size={12} />,
              channelName: 'CRYPTO / WIRE'
          };
      }

      // 3.5. HOLD
      if (tx.status === 'on_hold') {
          return {
              label: 'TRANSACTION ON HOLD',
              subLabel: 'ACTION REQUIRED',
              icon: <ShieldAlert size={14} />,
              color: 'text-orange-400',
              bg: 'bg-orange-400/10',
              border: 'border-orange-400/20',
              channelIcon: <Server size={12} />,
              channelName: 'COMPLIANCE'
          };
      }

      // 4. DEFAULT SYSTEM
      return {
          label: 'SYSTEM ADJUSTMENT',
          subLabel: 'AUTOMATED',
          icon: <Repeat size={14} />,
          color: 'text-gray-400',
          bg: 'bg-gray-400/10',
          border: 'border-gray-400/20',
          channelIcon: <Server size={12} />,
          channelName: 'SYSTEM'
      };
  };

  return (
    <div className="bg-[#151a21] border border-white/10 rounded-[22px] flex flex-col overflow-hidden shadow-2xl h-full">
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#191f2e]">
           <div className="flex items-center gap-2">
             <History size={16} className="text-[#21ce99]" />
             <h3 className="font-black text-white text-xs uppercase tracking-widest">Financial Ledger</h3>
           </div>
           <div className="px-2 py-1 rounded bg-black/40 border border-white/5 text-[10px] text-gray-500 font-mono">
              PAGE {currentPage} / {totalPages || 1}
           </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse">
             <thead className="bg-[#0b0e11] text-gray-500 text-[9px] uppercase font-bold tracking-widest">
               <tr>
                 <th className="px-6 py-4">Event Type</th>
                 <th className="px-6 py-4">Channel / Method</th>
                 <th className="px-6 py-4 text-right">Net Amount</th>
                 <th className="px-6 py-4 text-center">State</th>
                 <th className="px-6 py-4 text-right">Time Log</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-white/5 text-sm">
               {currentTransactions.length === 0 ? (
                 <tr><td colSpan={5} className="p-10 text-center text-gray-600 font-mono text-xs">NO FINANCIAL RECORDS FOUND</td></tr>
               ) : (
                 currentTransactions.map(tx => {
                   const config = getTxConfig(tx);
                   const displayMethod = tx.method || config.channelName || 'System'; 
                   
                   return (
                    <Fragment key={tx.id}>
                    <tr className="hover:bg-white/[0.02] transition-colors group">
                      
                      {/* 1. EVENT TYPE */}
                      <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                             <div className={`h-9 w-9 rounded-lg flex items-center justify-center border ${config.bg} ${config.border} ${config.color}`}>
                               {config.icon}
                             </div>
                             <div className="flex flex-col">
                                 <span className="font-black uppercase text-white text-[11px] tracking-wide group-hover:text-[#21ce99] transition-colors">
                                     {config.label}
                                 </span>
                                 <span className="text-[9px] text-gray-600 font-mono uppercase">
                                     {config.subLabel}
                                 </span>
                             </div>
                          </div>
                      </td>

                      {/* 2. CHANNEL / METHOD */}
                      <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 bg-white/5 px-3 py-1.5 rounded-lg w-fit border border-white/5">
                             {config.channelIcon}
                             <span className="uppercase tracking-wider">{displayMethod}</span>
                          </div>
                      </td>

                      {/* 3. AMOUNT */}
                      <td className={`px-6 py-4 text-right font-mono font-bold text-sm ${config.color}`}>
                        {['deposit', 'bonus', 'relay_in', 'external_deposit', 'profit'].includes(tx.type) ? '+' : ''}
                        ${(tx.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* 4. STATUS */}
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-[6px] text-[9px] font-black uppercase inline-flex items-center gap-1.5 border ${
                          tx.status === 'approved' ? 'bg-[#21ce99]/10 text-[#21ce99] border-[#21ce99]/20' :
                          tx.status === 'rejected' ? 'bg-[#f23645]/10 text-[#f23645] border-[#f23645]/20' :
                          tx.status === 'on_hold' ? 'bg-orange-400/10 text-orange-400 border-orange-400/20' :
                          'bg-[#F0B90B]/10 text-[#F0B90B] border-[#F0B90B]/20'
                        }`}>
                          {tx.status === 'approved' && <CheckCircle size={10} />}
                          {tx.status === 'rejected' && <XCircle size={10} />}
                          {tx.status === 'on_hold' && <ShieldAlert size={10} />}
                          {tx.status === 'pending' && <Clock size={10} />}
                          {tx.status === 'pending' ? 'PROCESSING' : tx.status === 'on_hold' ? 'ON HOLD' : tx.status.toUpperCase()}
                        </span>
                      </td>

                      {/* 5. TIMESTAMP */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end text-[10px] text-gray-500 font-mono">
                            <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                            <span className="opacity-50">{new Date(tx.created_at).toLocaleTimeString()}</span>
                        </div>
                      </td>

                    </tr>

                    {/* 🟢 COMMENT ROW - CHANGED TEXT HERE */}
                    {tx.admin_comment && (
                        <tr className="bg-white/[0.01]">
                            <td colSpan={5} className="px-6 py-2 border-b border-white/5">
                                <div className="flex items-start gap-2 text-[10px] text-gray-400 bg-white/5 p-2 rounded-lg border border-white/5 mx-10">
                                    <div className="mt-0.5 text-orange-400"><ShieldAlert size={12} /></div>
                                    <div>
                                        <span className="font-bold text-gray-300 uppercase tracking-wider mr-2">Financial Team:</span>
                                        <span className="font-mono">{tx.admin_comment}</span>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    )}
                   </Fragment>
                   )
                 })
               )}
             </tbody>
           </table>
        </div>

        {/* FOOTER PAGINATION */}
        {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-white/5 bg-[#151a21] flex justify-between items-center mt-auto">
                <button 
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-white disabled:opacity-30 uppercase tracking-widest transition-colors"
                >
                  <ChevronLeft size={12} /> Prev
                </button>
                <div className="h-1 flex-1 mx-4 bg-[#1e232d] rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-[#21ce99] transition-all duration-300" 
                        style={{ width: `${(currentPage / totalPages) * 100}%` }}
                    />
                </div>
                <button 
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-white disabled:opacity-30 uppercase tracking-widest transition-colors"
                >
                   Next <ChevronRight size={12} />
                </button>
            </div>
        )}
    </div>
  );
}