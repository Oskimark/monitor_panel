'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Monitor, Activity, Wifi, Clock, PcCase } from 'lucide-react';

export default function Dashboard() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    // Carga inicial
    fetchLogs();

    // Suscripción en tiempo real (opcional, para ver cambios en vivo)
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'log_monitoreo' }, 
      (payload) => {
        setLogs((current) => [payload.new, ...current.slice(0, 49)]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('log_monitoreo')
      .select('*')
      .order('fecha_registro', { ascending: false })
      .limit(50);
    if (data) setLogs(data);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <header className="mb-10 flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Activity className="text-green-400" /> Sistema de Monitoreo Táctico
        </h1>
        <div className="text-sm bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
          Logs totales: {logs.length}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {logs.map((log) => (
          <div key={log.id} className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-blue-500 transition-all shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2 uppercase">
                  <Monitor size={20} /> {log.alias_pc || 'Sin Alias'}
                </h2>
                <p className="text-xs text-slate-400 font-mono">{log.nombre_equipo}</p>
              </div>
              <span className="bg-green-500/10 text-green-400 text-[10px] px-2 py-1 rounded border border-green-500/20 font-bold uppercase">
                {log.ip_local}
              </span>
            </div>

            <div className="space-y-4">
              {/* Sección Apps */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1 uppercase">
                   <PcCase size={14} /> Aplicaciones Activas
                </p>
                <div className="flex flex-wrap gap-1">
                  {log.datos_actividad.apps?.split(', ').map((app: string) => (
                    <span key={app} className="bg-slate-700 text-slate-300 text-[11px] px-2 py-0.5 rounded">
                      {app}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sección Red Local */}
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1 uppercase">
                  <Wifi size={14} /> Dispositivos Detectados en Red
                </p>
                <p className="text-[10px] font-mono text-blue-300 leading-relaxed">
                  {log.datos_actividad.red || "No se detectaron dispositivos"}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-700 flex justify-between items-center text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {new Date(log.fecha_registro).toLocaleString()}
                </span>
                <span className="italic">User: {log.usuario_pc}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}