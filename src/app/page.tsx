'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Monitor, Activity, Clock, PcCase, Power, MessageSquare, ShieldAlert, XCircle, Tag, Cpu, Globe } from 'lucide-react';

export default function Dashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [aliases, setAliases] = useState<{[key: string]: string}>({});

  useEffect(() => {
    fetchLogs();
    fetchAliases();
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'log_monitoreo' }, () => fetchLogs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLogs = async () => {
    const { data } = await supabase.from('log_monitoreo').select('*').order('fecha_registro', { ascending: false });
    if (data) {
      const unicas = data.reduce((acc: any[], curr) => {
        if (!acc.find(i => i.alias_pc === curr.alias_pc)) acc.push(curr);
        return acc;
      }, []);
      setLogs(unicas);
    }
  };

  const fetchAliases = async () => {
    const { data } = await supabase.from('nombres_dispositivos').select('*');
    if (data) {
      const map: any = {};
      data.forEach(item => map[item.mac] = item.alias);
      setAliases(map);
    }
  };

  const guardarAlias = async (mac: string, nuevoAlias: string) => {
    const { error } = await supabase
      .from('nombres_dispositivos')
      .upsert({ mac, alias: nuevoAlias });
    
    if (!error) {
      setAliases(prev => ({ ...prev, [mac]: nuevoAlias }));
    }
  };

  const enviarComando = async (alias: string, accion: string, payload: string = "") => {
    await supabase.from('comandos_remotos').insert([{ alias_pc: alias, accion, payload, ejecutado: false }]);
    alert(`Comando ${accion} enviado.`);
  };

  // Función para procesar la cadena de red
  const parsearRed = (redString: string) => {
    if (!redString) return [];
    return redString.split(' | ').map(item => {
      const match = item.match(/(.+) \[(.+)\]/);
      return {
        ip: match ? match[1] : 'Desconocida',
        mac: match ? match[2] : item
      };
    });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 p-6 font-mono">
      <header className="mb-8 flex justify-between items-center border-b border-red-900/30 pb-4">
        <h1 className="text-2xl font-black flex items-center gap-3 text-red-500 tracking-tighter">
          <Activity className="animate-pulse" /> SISTEMA DE CONTROL TÁCTICO
        </h1>
        <div className="text-[10px] text-red-900 font-bold uppercase tracking-[0.2em]">Estado: Operativo</div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {logs.map((log) => (
          <div key={log.id} className="bg-[#0a0a0a] border border-slate-800 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            {/* Header de la PC */}
            <div className="bg-slate-900/50 p-4 flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                    <Monitor size={20} className="text-red-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">{log.alias_pc}</h2>
                  <span className="text-[10px] text-blue-500">{log.ip_local}</span>
                </div>
              </div>
              <button 
                onClick={() => confirm("¿ORDENAR APAGADO?") && enviarComando(log.alias_pc, 'APAGAR')}
                className="p-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-all border border-red-600/20"
              >
                <Power size={20} />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* Sección Dispositivos en Red */}
              <div>
                <h3 className="text-[11px] font-bold text-slate-500 mb-3 uppercase flex items-center gap-2">
                  <Globe size={14} className="text-blue-500" /> Dispositivos Detectados en LAN
                </h3>
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-900/80 text-slate-400 uppercase font-bold border-b border-slate-800">
                        <th className="px-3 py-2">IP</th>
                        <th className="px-3 py-2">MAC</th>
                        <th className="px-3 py-2">Alias / Identificación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {parsearRed(log.datos_actividad.red).map((device, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-3 py-2 text-blue-400 font-bold">{device.ip}</td>
                          <td className="px-3 py-2 text-slate-500">{device.mac}</td>
                          <td className="px-3 py-2">
                            <input 
                              type="text"
                              value={aliases[device.mac] || ""}
                              placeholder="Sin nombre..."
                              onChange={(e) => guardarAlias(device.mac, e.target.value)}
                              className="bg-transparent border-none focus:ring-1 focus:ring-red-500/50 rounded w-full text-slate-300 placeholder:text-slate-700 outline-none px-1"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Procesos y Aplicaciones */}
              <div>
                <h3 className="text-[11px] font-bold text-slate-500 mb-3 uppercase flex items-center gap-2">
                  <Cpu size={14} className="text-red-500" /> Aplicaciones en Ejecución
                </h3>
                <div className="flex flex-wrap gap-2">
                  {log.datos_actividad.apps?.split(', ').map((app: string) => (
                    <div key={app} className="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] pl-3 pr-2 py-1.5 rounded-md flex items-center gap-2 group">
                      {app}
                      <button 
                        onClick={() => enviarComando(log.alias_pc, 'CERRAR_PROCESO', app)}
                        className="text-slate-600 hover:text-red-500 transition-colors"
                        title="Forzar Cierre"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botones de Control */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={() => { const m = prompt("Escribe el mensaje para la PC:"); if(m) enviarComando(log.alias_pc, 'MENSAJE', m); }}
                  className="bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white text-[11px] font-bold py-3 rounded-lg border border-blue-600/20 flex items-center justify-center gap-2 transition-all"
                >
                  <MessageSquare size={16} /> ENVIAR MENSAJE
                </button>
                <button 
                  onClick={() => confirm("¿BLOQUEAR APLICACIONES?") && enviarComando(log.alias_pc, 'CERRAR_APPS')}
                  className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white text-[11px] font-bold py-3 rounded-lg border border-red-600/20 flex items-center justify-center gap-2 transition-all"
                >
                  <ShieldAlert size={16} /> MODO PÁNICO
                </button>
              </div>

              {/* Footer de la Card */}
              <div className="flex justify-between items-center text-[9px] text-slate-600 border-t border-slate-800 pt-4">
                <div className="flex items-center gap-2">
                  <Clock size={12} /> {log.datos_actividad.hora}
                </div>
                <div className="bg-slate-900 px-2 py-1 rounded text-slate-500">
                  {log.nombre_equipo}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
