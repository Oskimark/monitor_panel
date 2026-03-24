'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Monitor, Activity, Clock, PcCase, Power, MessageSquare, 
  ShieldAlert, XCircle, Globe, Cpu, Sun, Moon 
} from 'lucide-react';

export default function Dashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [aliases, setAliases] = useState<{[key: string]: string}>({});
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

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
    const { error } = await supabase.from('nombres_dispositivos').upsert({ mac, alias: nuevoAlias });
    if (!error) setAliases(prev => ({ ...prev, [mac]: nuevoAlias }));
  };

  const enviarComando = async (alias: string, accion: string, payload: string = "") => {
    await supabase.from('comandos_remotos').insert([{ alias_pc: alias, accion, payload, ejecutado: false }]);
    alert(`Comando ${accion} enviado.`);
  };

  const parsearRed = (redString: string) => {
    if (!redString) return [];
    return redString.split(' | ').map(item => {
      const match = item.match(/(.+) \[(.+)\]/);
      return { ip: match ? match[1] : 'Desconocida', mac: match ? match[2] : item };
    });
  };

  // Definición de Estilos Dinámicos
  const s = {
    bg: theme === 'dark' ? 'bg-[#050505]' : 'bg-slate-50',
    card: theme === 'dark' ? 'bg-[#0a0a0a] border-slate-800' : 'bg-white border-slate-200 shadow-sm',
    header: theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-100 border-slate-200',
    textMain: theme === 'dark' ? 'text-white' : 'text-slate-900',
    textSec: theme === 'dark' ? 'text-slate-400' : 'text-slate-500',
    tableHeader: theme === 'dark' ? 'bg-slate-900/80 text-slate-400' : 'bg-slate-50 text-slate-600',
    input: theme === 'dark' ? 'text-slate-300' : 'text-slate-800',
    border: theme === 'dark' ? 'border-slate-800' : 'border-slate-200',
  };

  return (
    <div className={`min-h-screen ${s.bg} ${s.textMain} p-6 font-mono transition-colors duration-300`}>
      <header className={`mb-8 flex justify-between items-center border-b ${theme === 'dark' ? 'border-red-900/30' : 'border-red-200'} pb-4`}>
        <h1 className="text-2xl font-black flex items-center gap-3 text-red-600 tracking-tighter">
          <Activity className="animate-pulse" /> CONTROL TÁCTICO
        </h1>
        
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-[10px] uppercase tracking-widest transition-all ${
            theme === 'dark' ? 'bg-white text-black hover:bg-slate-200' : 'bg-black text-white hover:bg-slate-800'
          }`}
        >
          {theme === 'dark' ? <><Sun size={14} /> Modo Claro</> : <><Moon size={14} /> Modo Oscuro</>}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {logs.map((log) => (
          <div key={log.id} className={`${s.card} border rounded-lg overflow-hidden`}>
            {/* Header de la Card */}
            <div className={`${s.header} p-4 flex justify-between items-center border-b`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-red-500/10' : 'bg-red-100'}`}>
                    <Monitor size={20} className="text-red-600" />
                </div>
                <div>
                  <h2 className={`text-lg font-bold tracking-tight ${s.textMain}`}>{log.alias_pc}</h2>
                  <span className="text-[10px] text-blue-600 font-bold">{log.ip_local}</span>
                </div>
              </div>
              <button 
                onClick={() => confirm("¿APAGAR EQUIPO?") && enviarComando(log.alias_pc, 'APAGAR')}
                className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
              >
                <Power size={20} />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* Tabla de Dispositivos */}
              <div>
                <h3 className={`text-[11px] font-bold ${s.textSec} mb-3 uppercase flex items-center gap-2`}>
                  <Globe size={14} className="text-blue-600" /> Red Local (LAN)
                </h3>
                <div className={`overflow-x-auto rounded-lg border ${s.border}`}>
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className={`${s.tableHeader} uppercase font-bold border-b ${s.border}`}>
                        <th className="px-3 py-2">IP</th>
                        <th className="px-3 py-2">MAC</th>
                        <th className="px-3 py-2">Alias</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${s.border}`}>
                      {parsearRed(log.datos_actividad.red).map((device, idx) => (
                        <tr key={idx} className={`${theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'} transition-colors`}>
                          <td className="px-3 py-2 text-blue-600 font-bold">{device.ip}</td>
                          <td className="px-3 py-2 text-slate-400 font-mono">{device.mac}</td>
                          <td className="px-3 py-2">
                            <input 
                              type="text"
                              value={aliases[device.mac] || ""}
                              placeholder="Identificar..."
                              onChange={(e) => guardarAlias(device.mac, e.target.value)}
                              className={`bg-transparent border-none focus:ring-1 focus:ring-red-500/50 rounded w-full ${s.input} outline-none px-1`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Procesos */}
              <div>
                <h3 className={`text-[11px] font-bold ${s.textSec} mb-3 uppercase flex items-center gap-2`}>
                  <Cpu size={14} className="text-red-600" /> Aplicaciones Activas
                </h3>
                <div className="flex flex-wrap gap-2">
                  {log.datos_actividad.apps?.split(', ').map((app: string) => (
                    <div key={app} className={`${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'} border text-[10px] pl-3 pr-2 py-1.5 rounded-md flex items-center gap-2`}>
                      {app}
                      <button onClick={() => enviarComando(log.alias_pc, 'CERRAR_PROCESO', app)} className="text-slate-400 hover:text-red-600">
                        <XCircle size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Controles Inferiores */}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => { const m = prompt("Mensaje:"); if(m) enviarComando(log.alias_pc, 'MENSAJE', m); }}
                  className="bg-blue-600 text-white text-[11px] font-bold py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <MessageSquare size={16} /> MENSAJE
                </button>
                <button 
                  onClick={() => confirm("¿MODO PANICO?") && enviarComando(log.alias_pc, 'CERRAR_APPS')}
                  className="bg-orange-600 text-white text-[11px] font-bold py-3 rounded-lg hover:bg-orange-700 flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <ShieldAlert size={16} /> PÁNICO
                </button>
              </div>

              {/* Footer de la Card */}
              <div className={`flex justify-between items-center text-[9px] ${s.textSec} border-t ${s.border} pt-4`}>
                <div className="flex items-center gap-2 font-bold"><Clock size={12} /> {log.datos_actividad.hora}</div>
                <div className={`${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-200'} px-2 py-1 rounded font-bold`}>{log.nombre_equipo}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
