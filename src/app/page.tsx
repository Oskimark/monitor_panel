'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Monitor, Activity, Wifi, Clock, PcCase, Power, MessageSquare, ShieldAlert, XCircle } from 'lucide-react';

export default function Dashboard() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchLogs();
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'log_monitoreo' }, () => fetchLogs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLogs = async () => {
    const { data } = await supabase.from('log_monitoreo').select('*').order('fecha_registro', { ascending: false });
    if (data) {
      const pcssUnicas = data.reduce((acc: any[], current) => {
        if (!acc.find(item => item.alias_pc === current.alias_pc)) acc.push(current);
        return acc;
      }, []);
      setLogs(pcssUnicas);
    }
  };

  const enviarComando = async (alias: string, accion: string, payload: string = "") => {
    await supabase.from('comandos_remotos').insert([{ alias_pc: alias, accion, payload, ejecutado: false }]);
    alert(`Comando ${accion} enviado a ${alias}`);
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 p-6 font-sans">
      <header className="mb-8 flex justify-between items-center border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-black tracking-tighter flex items-center gap-2">
          <Activity className="text-red-500 animate-pulse" /> PANEL DE CONTROL TÁCTICO
        </h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {logs.map((log) => (
          <div key={log.id} className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
            {/* Cabecera de la Card */}
            <div className="bg-slate-800 p-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Monitor size={18} /> {log.alias_pc}
                </h2>
                <span className="text-[10px] text-slate-400 font-mono">{log.ip_local}</span>
              </div>
              <button 
                onClick={() => confirm("¿APAGAR EQUIPO?") && enviarComando(log.alias_pc, 'APAGAR')}
                className="p-2 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-full transition-all"
              >
                <Power size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Apps con botón de cierre */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest flex items-center gap-1">
                  <PcCase size={12} /> Procesos Activos
                </p>
                <div className="flex flex-wrap gap-2">
                  {log.datos_actividad.apps?.split(', ').map((app: string) => (
                    <span key={app} className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] pl-2 pr-1 py-1 rounded flex items-center gap-2">
                      {app}
                      <button onClick={() => enviarComando(log.alias_pc, 'CERRAR_PROCESO', app)} className="text-slate-500 hover:text-red-500">
                        <XCircle size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Red Local */}
              <div className="bg-black/50 p-3 rounded border border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Dispositivos en Red</p>
                <p className="text-[10px] font-mono text-blue-400 leading-tight italic">{log.datos_actividad.red}</p>
              </div>

              {/* Botones de Acción Rapida */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button 
                  onClick={() => {
                    const m = prompt("Mensaje para la PC:");
                    if(m) enviarComando(log.alias_pc, 'MENSAJE', m);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-2 rounded flex items-center justify-center gap-2"
                >
                  <MessageSquare size={14} /> MENSAJE
                </button>
                <button 
                  onClick={() => confirm("¿ACTIVAR PÁNICO?") && enviarComando(log.alias_pc, 'CERRAR_APPS')}
                  className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold py-2 rounded flex items-center justify-center gap-2"
                >
                  <ShieldAlert size={14} /> PÁNICO
                </button>
              </div>

              <div className="text-[9px] text-slate-600 flex justify-between border-t border-slate-800 pt-3">
                <span className="flex items-center gap-1"><Clock size={10} /> {log.datos_actividad.hora}</span>
                <span>ID: {log.nombre_equipo}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
