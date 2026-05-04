import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Briefcase, Plus, Search, FileCheck, CheckCircle2, XCircle, AlertCircle, Users, BadgeInfo, FileText, Smartphone, Mail, MapPin, DollarSign } from 'lucide-react';
import { JobOffer, CandidateEvaluation, Employee } from '../types';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const Recruitment: React.FC = () => {
    const { jobOffers, evaluations, employees, addJobOffer, updateJobOffer, deleteJobOffer, addEvaluation, addEmployee } = useData();
    const [isAddOfferModalOpen, setIsAddOfferModalOpen] = useState(false);
    const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
    const [selectedOffer, setSelectedOffer] = useState<JobOffer | null>(null);
    const [candidateName, setCandidateName] = useState('');
    const [candidateResume, setCandidateResume] = useState('');
    const [isEvaluating, setIsEvaluating] = useState(false);

    // Offer form
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [requirements, setRequirements] = useState('');
    const [salary, setSalary] = useState(0);
    const [location, setLocation] = useState('Pasto, Nariño');
    const [status, setStatus] = useState<'active' | 'closed'>('active');

    const handleAddOffer = async (e: React.FormEvent) => {
        e.preventDefault();
        await addJobOffer({
            title,
            description,
            requirements: requirements.split('\\n').filter(r => r.trim() !== ''),
            salary,
            location,
            status
        });
        setIsAddOfferModalOpen(false);
        resetOfferForm();
    };

    const resetOfferForm = () => {
        setTitle('');
        setDescription('');
        setRequirements('');
        setSalary(0);
        setLocation('Pasto, Nariño');
        setStatus('active');
    };

    const handleEvaluateCandidate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOffer || !candidateResume) return;

        setIsEvaluating(true);
        try {
            const prompt = `EVALUACIÓN DE CANDIDATO PARA EL CARGO: ${selectedOffer.title}
            
            REQUISITOS DE LA OFERTA:
            ${selectedOffer.requirements.join('\\n')}
            ${selectedOffer.description}
            
            HOJA DE VIDA DEL CANDIDATO:
            ${candidateResume}
            
            POR FAVOR EVALÚA SI EL CANDIDATO ES ELEGIBLE. 
            DAME UNA RESPUESTA EN FORMATO JSON PLANO (SIN MARKDOWN):
            {
              "score": número del 0 al 100,
              "eligible": true/false (si score > 70 es true),
              "summary": "resumen breve de por qué es o no elegible",
              "strengths": ["fortaleza 1", "..."],
              "weaknesses": ["debilidad 1", "..."]
            }`;

            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: { parts: [{ text: prompt }] }
            });

            const resultText = response.text;
            const cleanedJson = resultText.replace(/```json|```/g, '').trim();
            const evaluationResult = JSON.parse(cleanedJson);

            await addEvaluation({
                jobOfferId: selectedOffer.id,
                candidateName,
                resumeText: candidateResume,
                matchScore: evaluationResult.score,
                eligible: evaluationResult.eligible,
                aiSummary: evaluationResult.summary
            });

            alert(`Evaluación completada: ${evaluationResult.eligible ? 'ELEGIBLE' : 'NO ELEGIBLE'} (${evaluationResult.score}%)`);
            setIsEvaluationModalOpen(false);
            setCandidateResume('');
            setCandidateName('');
        } catch (error) {
            console.error(error);
            alert("Error al evaluar el candidato con IA.");
        } finally {
            setIsEvaluating(false);
        }
    };

    const handleDirectHire = async (evalId: string) => {
        const ev = evaluations.find(e => e.id === evalId);
        if (!ev) return;
        const offer = jobOffers.find(o => o.id === ev.jobOfferId);

        if (!window.confirm(`¿Deseas contratar directamente a ${ev.candidateName} como ${offer?.title}?`)) return;

        try {
            await addEmployee({
                name: ev.candidateName,
                role: 'employee',
                salary: offer?.salary || 0,
                position: offer?.title || 'Operario',
                resumeText: ev.resumeText,
                email: ev.candidateName.toLowerCase().replace(/\\s+/g, '.') + '@quepollo.com',
                password: Math.random().toString(36).slice(-8)
            });
            alert("Empleado contratado con éxito. Se ha creado su perfil con los datos de la evaluación.");
        } catch (error) {
            console.error(error);
            alert("Error al contratar el empleado.");
        }
    };

    return (
        <div className="space-y-8 pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Gestión de Reclutamiento</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Publica ofertas y evalúa candidatos con IA.</p>
                </div>
                <button 
                    onClick={() => setIsAddOfferModalOpen(true)}
                    className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-slate-900/10 flex items-center gap-2"
                >
                    <Plus size={18} /> Crear Oferta Laboral
                </button>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Job Offers Column */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                            <Briefcase className="text-orange-500" /> Ofertas Vigentes
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {jobOffers.map(offer => (
                            <motion.div 
                                key={offer.id}
                                layoutId={offer.id}
                                className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-orange-200 transition-all group flex flex-col justify-between"
                            >
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className={cn(
                                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                            offer.status === 'active' ? "bg-green-50 text-green-600 border-green-200" : "bg-slate-50 text-slate-400 border-slate-200"
                                        )}>
                                            {offer.status === 'active' ? 'Publicada' : 'Cerrada'}
                                        </div>
                                        <button 
                                            onClick={() => {
                                                if (window.confirm('¿Eliminar esta oferta?')) deleteJobOffer(offer.id);
                                            }}
                                            className="p-2 text-slate-200 hover:text-red-500 transition-colors"
                                        >
                                            <XCircle size={18} />
                                        </button>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-black text-slate-950 uppercase tracking-tighter leading-tight">{offer.title}</h3>
                                        <div className="flex items-center gap-4 mt-2">
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                                                <MapPin size={10} /> {offer.location}
                                            </span>
                                            <span className="flex items-center gap-1 text-[10px] font-black text-orange-600 uppercase">
                                                {formatCurrency(offer.salary)} / Quincenal
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-xs text-slate-600 font-medium line-clamp-3 leading-relaxed">
                                            {offer.description}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {offer.requirements.slice(0, 3).map((req, idx) => (
                                                <span key={idx} className="text-[9px] font-black text-slate-500 uppercase bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                                                    {req}
                                                </span>
                                            ))}
                                            {offer.requirements.length > 3 && (
                                                <span className="text-[9px] font-black text-slate-400 uppercase">+{offer.requirements.length - 3} más</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-50 flex gap-3">
                                    <button 
                                        onClick={() => {
                                            setSelectedOffer(offer);
                                            setIsEvaluationModalOpen(true);
                                        }}
                                        disabled={offer.status === 'closed'}
                                        className="flex-1 py-3 bg-slate-950 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-slate-950/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Evaluar Candidato
                                    </button>
                                    <button 
                                        onClick={() => {
                                            const template = `
                                            OFERTA LABORAL: ${offer.title}
                                            🏢 Que Pollo Del Sur S.A.S
                                            📍 Ubicación: ${offer.location}
                                            💰 Salario: ${formatCurrency(offer.salary)} Quincenal
                                            
                                            DESCRIPCIÓN:
                                            ${offer.description}
                                            
                                            REQUISITOS:
                                            ${offer.requirements.map(r => `• ${r}`).join('\\n')}
                                            
                                            ¡Únete a nuestro equipo! Postúlate enviando tu HV.
                                            `.trim();
                                            navigator.clipboard.writeText(template);
                                            alert("Plantilla de oferta copiada al portapapeles para su publicación.");
                                        }}
                                        className="p-3 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-100"
                                        title="Copiar Plantilla para Redes Sociales"
                                    >
                                        <FileText size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}

                        {jobOffers.length === 0 && (
                            <div className="md:col-span-2 py-32 flex flex-col items-center justify-center text-slate-300 gap-4 border-2 border-dashed border-slate-100 rounded-[40px]">
                                <Briefcase size={64} strokeWidth={1} />
                                <p className="font-bold uppercase tracking-widest italic text-sm text-center px-8">No hay ofertas laborales publicadas. Pulsa en "+" para crear una plantilla.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Evaluations Column */}
                <div className="space-y-6">
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                        <FileCheck className="text-blue-500" /> Candidatos Evaluados
                    </h2>

                    <div className="space-y-4">
                        {evaluations.slice().reverse().map(ev => {
                            const offer = jobOffers.find(o => o.id === ev.jobOfferId);
                            return (
                                <motion.div 
                                    key={ev.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                <Users size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-900 text-sm">{ev.candidateName}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{offer?.title || 'Oferta Eliminada'}</p>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "flex flex-col items-end",
                                            ev.eligible ? "text-green-600" : "text-red-500"
                                        )}>
                                            <span className="text-xl font-black">{ev.matchScore}%</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest">Match IA</span>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 italic text-[11px] text-slate-600 leading-relaxed">
                                        "{ev.aiSummary}"
                                    </div>

                                    <div className="flex gap-2">
                                        {ev.eligible && (
                                            <button 
                                                onClick={() => handleDirectHire(ev.id)}
                                                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-blue-500/10 active:scale-95 transition-all"
                                            >
                                                CONTRATAR DIRECTO
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => {
                                                const win = window.open();
                                                win?.document.write(`<html><body style="font-family: sans-serif; padding:40px;"><pre style="white-space: pre-wrap;">\${ev.resumeText}</pre></body></html>`);
                                            }}
                                            className="px-4 py-3 bg-white text-slate-400 border border-slate-200 rounded-xl font-black uppercase tracking-widest text-[9px] hover:text-slate-900 transition-colors"
                                        >
                                            Ver HV
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}

                        {evaluations.length === 0 && (
                            <div className="py-20 flex flex-col items-center justify-center text-slate-300 gap-2 border border-dashed border-slate-100 rounded-[32px]">
                                <FileCheck size={32} strokeWidth={1} />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-center px-4">Ningún candidato evaluado aún.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Application Modals */}
            <AnimatePresence>
                {isAddOfferModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
                        <motion.div 
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl p-10 space-y-8 my-8"
                        >
                            <header className="text-center space-y-2">
                                <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter">Crear Oferta de Trabajo</h2>
                                <p className="text-sm text-slate-400 font-medium tracking-tight italic uppercase">Nueva Plantilla de Captación</p>
                            </header>

                            <form onSubmit={handleAddOffer} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Título del Cargo</label>
                                    <input 
                                        type="text" required autoFocus
                                        value={title} onChange={e => setTitle(e.target.value)}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold text-slate-950 placeholder:text-slate-300"
                                        placeholder="Ej: Operario de Procesamiento de Aves"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Salario Quincenal</label>
                                        <input 
                                            type="number" required
                                            value={salary || ''} onChange={e => setSalary(parseFloat(e.target.value))}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold text-slate-950"
                                            placeholder="650000"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Ubicación</label>
                                        <input 
                                            type="text" required
                                            value={location} onChange={e => setLocation(e.target.value)}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold text-slate-950"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Descripción del Cargo</label>
                                    <textarea 
                                        required
                                        value={description} onChange={e => setDescription(e.target.value)}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold text-slate-950 min-h-[100px]"
                                        placeholder="Describe las tareas principales..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Requisitos (Uno por línea)</label>
                                    <textarea 
                                        required
                                        value={requirements} onChange={e => setRequirements(e.target.value)}
                                        className="w-full px-6 py-4 bg-slate-100/50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-medium text-slate-900 min-h-[120px]"
                                        placeholder="Ej:\\nExperiencia en despresaje\\nManipulación de alimentos\\nDisponibilidad de tiempo"
                                    />
                                </div>

                                <div className="flex flex-col md:flex-row gap-4 pt-6">
                                    <button type="submit" className="flex-1 py-5 bg-slate-950 text-white rounded-[24px] font-black uppercase tracking-widest text-sm shadow-2xl shadow-slate-950/30 active:scale-95 transition-all">
                                        Publicar Oferta
                                    </button>
                                    <button type="button" onClick={() => setIsAddOfferModalOpen(false)} className="px-10 py-5 text-slate-400 font-bold uppercase tracking-widest text-xs">
                                        Cerrar
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {isEvaluationModalOpen && selectedOffer && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl p-10 space-y-8"
                        >
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mx-auto">
                                    <FileCheck size={28} />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tighter italic">Evaluación con IA</h2>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Cargo: {selectedOffer.title}</p>
                                </div>
                            </div>

                            <form onSubmit={handleEvaluateCandidate} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Candidato</label>
                                    <input 
                                        type="text" required autoFocus
                                        value={candidateName} onChange={e => setCandidateName(e.target.value)}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-950"
                                        placeholder="Nombre completo"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Pegar Hoja de Vida</label>
                                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest animate-pulse">Inteligencia Artificial</span>
                                    </div>
                                    <textarea 
                                        required
                                        value={candidateResume} onChange={e => setCandidateResume(e.target.value)}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-900 min-h-[250px] text-sm leading-relaxed"
                                        placeholder="Copia y pega el texto de la hoja de vida aquí para que la IA lo analice contra los requisitos del cargo..."
                                    />
                                </div>

                                <div className="flex flex-col gap-3 pt-4">
                                    <button 
                                        type="submit" 
                                        disabled={isEvaluating}
                                        className={cn(
                                            "w-full py-5 bg-blue-600 text-white rounded-[24px] font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2",
                                            isEvaluating && "opacity-80 scale-95"
                                        )}
                                    >
                                        {isEvaluating ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                IA Analizando...
                                            </>
                                        ) : (
                                            <>Analizar Elegibilidad</>
                                        )}
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsEvaluationModalOpen(false)} 
                                        className="w-full py-4 text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Recruitment;
