import React, { useState, useRef, useEffect } from 'react';
import { 
    FileText, 
    Plus, 
    PenTool, 
    CheckCircle2, 
    Eye, 
    Download, 
    Trash2, 
    User, 
    Shield, 
    Upload,
    Calendar,
    Briefcase,
    ChevronRight,
    AlertCircle,
    Info,
    Volume2,
    Bot,
    Pause,
    Play,
    Signature,
    X
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    updateDoc, 
    doc, 
    deleteDoc,
    serverTimestamp,
    orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import SignaturePad from 'react-signature-canvas';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { GoogleGenAI } from '@google/genai';

interface SignatureInfo {
    image: string;
    name: string;
    documentId: string;
}

interface SignatureData {
    worker?: SignatureInfo;
    employer?: SignatureInfo;
    boss?: SignatureInfo;
    hr?: SignatureInfo;
    legalRep?: SignatureInfo;
}

interface LaborContract {
    id: string;
    employeeId: string;
    employeeName: string;
    type: 'termino_fijo' | 'termino_indefinido' | 'obra_labor' | 'aprendizaje';
    status: 'draft' | 'socializing' | 'signed' | 'archived';
    contractText: string;
    regulationsText: string;
    dotationText: string;
    createdAt: any;
    signedAt?: any;
    signatures: SignatureData;
    attachments: {
        workerId?: string;
        legalRepId?: string;
        originalPdf?: string;
    };
}

const LaborContracts: React.FC = () => {
    const { employees } = useData();
    const { user } = useAuth();
    const [contracts, setContracts] = useState<LaborContract[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<LaborContract | null>(null);
    const [isSigningMode, setIsSigningMode] = useState(false);
    const [currentSigningRole, setCurrentSigningRole] = useState<keyof SignatureData | null>(null);
    const [signerName, setSignerName] = useState('');
    const [signerDocumentId, setSignerDocumentId] = useState('');
    const [loading, setLoading] = useState(false);
    
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    // AI Explanation state
    const [aiExplanation, setAiExplanation] = useState<string | null>(null);
    const [isExplaining, setIsExplaining] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
    
    // Form state
    const [employeeId, setEmployeeId] = useState('');
    const [contractType, setContractType] = useState<'termino_fijo' | 'termino_indefinido' | 'obra_labor' | 'aprendizaje'>('termino_indefinido');
    const [contractText, setContractText] = useState('');
    const [regulationsText, setRegulationsText] = useState('');
    const [dotationText, setDotationText] = useState('');

    const sigPad = useRef<SignaturePad>(null);
    const contractRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const q = query(collection(db, 'contracts'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const contractsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as LaborContract[];
            setContracts(contractsData);
        });

        return () => unsubscribe();
    }, []);

    const handleCreateContract = async (e: React.FormEvent) => {
        e.preventDefault();
        const employee = employees.find(emp => emp.id === employeeId);
        if (!employee) return;

        setLoading(true);
        try {
            await addDoc(collection(db, 'contracts'), {
                employeeId,
                employeeName: employee.name,
                type: contractType,
                status: 'draft',
                contractText,
                regulationsText,
                dotationText,
                createdAt: serverTimestamp(),
                signatures: {},
                attachments: {},
            });
            setIsAddModalOpen(false);
            resetForm();
        } catch (error) {
            console.error("Error creating contract:", error);
            alert("Error al crear el contrato.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteContract = async (id: string) => {
        if (!window.confirm("¿Estás seguro de que deseas eliminar este contrato? Esta acción no se puede deshacer.")) return;
        
        try {
            await deleteDoc(doc(db, 'contracts', id));
        } catch (error) {
            console.error("Error deleting contract:", error);
            alert("Error al eliminar el contrato.");
        }
    };

    const handleStartSigning = (role: keyof SignatureData) => {
        setCurrentSigningRole(role);
        if (role === 'worker' && selectedContract) {
            setSignerName(selectedContract.employeeName);
            // Optionally fetch worker document ID if available in employee data
            const employee = employees.find(e => e.id === selectedContract.employeeId);
            if (employee && employee.documentId) {
                setSignerDocumentId(employee.documentId);
            }
        } else {
            setSignerName('');
            setSignerDocumentId('');
        }
    };

    const handleDigitalize = async (file: File, type: 'contract' | 'regulations' | 'dotation') => {
        if (!file) return;
        setLoading(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64 = (reader.result as string).split(',')[1];
                
                try {
                    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
                    const prompt = "Por favor extrae todo el texto de este documento legal de forma estructurada y fiel al original. Extrae el texto COMPLETO sin omitir cláusulas. IMPORTANTE: No utilices ningún tipo de formato Markdown como asteriscos (*) para negritas o itálicas. Solo devuelve el texto plano limpio.";
                    
                    let result;
                    const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
                    let success = false;

                    for (const modelName of models) {
                        let retries = 3;
                        let delay = 1000;
                        
                        while (retries > 0 && !success) {
                            try {
                                result = await ai.models.generateContent({
                                    model: modelName,
                                    contents: [
                                        { text: prompt },
                                        { inlineData: { data: base64, mimeType: file.type } }
                                    ]
                                });
                                success = true;
                            } catch (err: any) {
                                const isQuotaError = err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED');
                                if (retries > 1 && isQuotaError) {
                                    await sleep(delay);
                                    delay *= 2; // Exponential backoff
                                    retries--;
                                    continue;
                                }
                                if (modelName === models[models.length - 1]) throw err;
                                break; // Try next model
                            }
                        }
                        if (success) break;
                    }
                    
                    let text = result?.text;
                    if (!text) throw new Error("No se pudo extraer el texto del documento.");

                    // Clean any residual asterisks
                    text = text.replace(/\*/g, '').replace(/__/g, '');

                    if (type === 'contract') setContractText(text);
                    if (type === 'regulations') setRegulationsText(text);
                    if (type === 'dotation') setDotationText(text);
                } catch (apiError: any) {
                    console.error("Gemini API Error:", apiError);
                    if (apiError.message?.includes('429') || apiError.message?.includes('RESOURCE_EXHAUSTED')) {
                        alert("El servicio de IA está saturado en este momento debido a alta demanda global de Google. Por favor, intente de nuevo en un minuto o ingrese el texto manualmente.");
                    } else {
                        alert("Error al procesar el documento con inteligencia artificial. Por favor, compruebe su conexión e intente de nuevo.");
                    }
                } finally {
                    setLoading(false);
                }
            };
        } catch (error) {
            console.error("Error reading file:", error);
            alert("Error al leer el archivo.");
            setLoading(false);
        }
    };

    const handleSaveSignature = async () => {
        if (!sigPad.current || !selectedContract || !currentSigningRole || !signerName || !signerDocumentId) {
            alert("Por favor completa los datos y firma.");
            return;
        }
        
        const signatureBase64 = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
        
        try {
            const updatedSignatures = {
                ...selectedContract.signatures,
                [currentSigningRole]: {
                    image: signatureBase64,
                    name: signerName.toUpperCase(),
                    documentId: signerDocumentId
                }
            };

            const updates: any = {
                signatures: updatedSignatures
            };

            const requiredSignatures = ['worker', 'employer', 'boss', 'hr'];
            const allSigned = requiredSignatures.every(role => !!updatedSignatures[role as keyof SignatureData]);

            if (allSigned) {
                updates.status = 'signed';
                updates.signedAt = serverTimestamp();
            }

            await updateDoc(doc(db, 'contracts', selectedContract.id), updates);
            
            const updatedContract = { ...selectedContract, ...updates };
            setSelectedContract(updatedContract);
            setCurrentSigningRole(null);
            setSignerName('');
            setSignerDocumentId('');
            sigPad.current.clear();

            if (allSigned) {
                setTimeout(() => downloadPDF(updatedContract), 1000);
            }
        } catch (error) {
            console.error("Error saving signature:", error);
            alert("Error al guardar la firma.");
        }
    };

    const downloadPDF = async (contractToDownload = selectedContract) => {
        if (!contractRef.current || !contractToDownload) return;
        setLoading(true);
        try {
            // Ensure images are loaded
            const images = Array.from(contractRef.current.querySelectorAll('img')) as HTMLImageElement[];
            await Promise.all(images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            }));

            const canvas = await html2canvas(contractRef.current, {
                scale: 2,
                logging: false,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            // Handle multi-page if needed
            let heightLeft = pdfHeight;
            let position = 0;
            const pageHeight = pdf.internal.pageSize.getHeight();

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`Contrato_${contractToDownload.employeeName}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Error al generar el PDF.");
        } finally {
            setLoading(false);
        }
    };

    const handleExplainContract = async () => {
        if (!selectedContract) return;
        
        setIsExplaining(true);
        setAiExplanation(null);
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
            
            const prompt = `Como un asistente legal experto de Distribuciones Que Pollo del Sur, explica de forma muy sencilla y clara este contrato de trabajo para el trabajador ${selectedContract.employeeName}. 
            Resume los puntos clave: tipo de contrato (${selectedContract.type}), obligaciones principales, reglamento interno y dotación. 
            Habla directamente al trabajador con un tono amable y profesional. Máximo 200 palabras.
            IMPORTANTE: NO USES ASTERISCOS (*) NI NINGÚN FORMATO MARKDOWN. SOLO TEXTO PLANO.
            
            TEXTO DEL CONTRATO:
            ${selectedContract.contractText}
            
            REGLAMENTO:
            ${selectedContract.regulationsText}
            
            DOTACIÓN:
            ${selectedContract.dotationText}`;

            let result;
            const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
            let success = false;

            for (const modelName of models) {
                let retries = 3;
                let delay = 1000;
                
                while (retries > 0 && !success) {
                    try {
                        result = await ai.models.generateContent({
                            model: modelName,
                            contents: [{ text: prompt }]
                        });
                        success = true;
                    } catch (err: any) {
                        const isQuotaError = err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED');
                        if (retries > 1 && isQuotaError) {
                            await sleep(delay);
                            delay *= 2; // Exponential backoff
                            retries--;
                            continue;
                        }
                        if (modelName === models[models.length - 1]) throw err;
                        break; // Try next model
                    }
                }
                if (success) break;
            }
            
            let explanation = result?.text;
            if (explanation) {
                // Final safety cleanup of any Markdown markers
                explanation = explanation.replace(/\*/g, '').replace(/__/g, '');
                setAiExplanation(explanation);
            }
        } catch (error: any) {
            console.error("Error generating AI explanation:", error);
            if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
                alert("El asistente de IA está muy ocupado en este momento. Por favor, intenta de nuevo en unos segundos.");
            } else {
                alert("No se pudo generar la explicación con IA en este momento.");
            }
        } finally {
            setIsExplaining(false);
        }
    };

    const handleSpeak = () => {
        if (!aiExplanation) return;
        
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(aiExplanation);
        utterance.lang = 'es-ES';
        utterance.onend = () => setIsSpeaking(false);
        speechRef.current = utterance;
        
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
    };

    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    const resetForm = () => {
        setEmployeeId('');
        setContractText('');
        setRegulationsText('');
        setDotationText('');
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft': return <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase tracking-wider">Borrador</span>;
            case 'socializing': return <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded-md text-[10px] font-bold uppercase tracking-wider">En Socialización</span>;
            case 'signed': return <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded-md text-[10px] font-bold uppercase tracking-wider">Firmado</span>;
            default: return null;
        }
    };

    return (
        <div className="space-y-8 pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        Contratos Laborales
                        <FileText className="text-orange-500" />
                    </h1>
                    <p className="text-slate-500 font-medium italic">Gestión digital de vinculaciones y firmas.</p>
                </div>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/20 active:scale-95"
                >
                    <Plus size={20} />
                    Nuevo Contrato
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contracts.map(contract => (
                    <div key={contract.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 leading-tight">{contract.employeeName}</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{contract.type?.replace('_', ' ')}</p>
                                </div>
                            </div>
                            {getStatusBadge(contract.status)}
                        </div>
                        
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                <Calendar size={14} />
                                Creado el {new Date(contract.createdAt?.seconds * 1000).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                <Shield size={14} />
                                {Object.keys(contract.signatures || {}).length} Firmas recolectadas
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={() => setSelectedContract(contract)}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all active:scale-95"
                            >
                                <Eye size={16} />
                                Ver y Gestionar
                            </button>
                            <button 
                                onClick={() => handleDeleteContract(contract.id)}
                                className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all active:scale-95 border border-red-100"
                                title="Eliminar Contrato"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Contract Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Crear Nuevo Contrato</h2>
                                <p className="text-sm text-slate-500 font-medium italic">Sube el documento sin firmar para procesarlo.</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                                <X size={24} className="text-slate-400" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreateContract} className="p-8 space-y-6 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest pl-1">Empleado</label>
                                    <select 
                                        required
                                        value={employeeId} 
                                        onChange={(e) => setEmployeeId(e.target.value)}
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl transition-all outline-none font-bold"
                                    >
                                        <option value="">Seleccionar empleado...</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest pl-1">Tipo de Contrato</label>
                                    <select 
                                        required
                                        value={contractType} 
                                        onChange={(e) => setContractType(e.target.value as any)}
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl transition-all outline-none font-bold"
                                    >
                                        <option value="termino_indefinido">Término Indefinido</option>
                                        <option value="termino_fijo">Término Fijo</option>
                                        <option value="obra_labor">Obra o Labor</option>
                                        <option value="aprendizaje">Aprendizaje</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Documentación del Empleado</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="relative group">
                                        <input 
                                            type="file" 
                                            accept="image/*,application/pdf"
                                            onChange={(e) => e.target.files?.[0] && handleDigitalize(e.target.files[0], 'contract')}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <div className="h-24 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-1 group-hover:border-orange-400 transition-colors">
                                            <Upload size={20} className="text-slate-400 group-hover:text-orange-500" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center px-2">Subir Contrato</span>
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <input 
                                            type="file" 
                                            accept="image/*,application/pdf"
                                            onChange={(e) => e.target.files?.[0] && handleDigitalize(e.target.files[0], 'regulations')}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <div className="h-24 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-1 group-hover:border-orange-400 transition-colors">
                                            <Upload size={20} className="text-slate-400 group-hover:text-orange-500" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center px-2">Subir Reglamento</span>
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <input 
                                            type="file" 
                                            accept="image/*,application/pdf"
                                            onChange={(e) => e.target.files?.[0] && handleDigitalize(e.target.files[0], 'dotation')}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <div className="h-24 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-1 group-hover:border-orange-400 transition-colors">
                                            <Upload size={20} className="text-slate-400 group-hover:text-orange-500" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center px-2">Subir Dotación</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-slate-400 tracking-widest pl-1">Vista Previa / Edición de Contrato</label>
                                <textarea 
                                    value={contractText}
                                    onChange={(e) => setContractText(e.target.value)}
                                    placeholder="El texto digitalizado aparecerá aquí para revisión final..."
                                    className="w-full h-40 px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl transition-all outline-none font-medium text-sm"
                                ></textarea>
                            </div>

                            <button 
                                disabled={loading || !employeeId || !contractText}
                                type="submit"
                                className="w-full py-5 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-orange-600/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Procesando...</span>
                                    </>
                                ) : 'Guardar Draft para Socialización'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Contract Management / Signing View */}
            {selectedContract && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-slate-100 w-full max-w-6xl rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 flex flex-col lg:flex-row h-full max-h-[95vh]">
                        {/* Left Side: Document Viewer */}
                        <div className="lg:w-2/3 bg-white p-6 lg:p-12 overflow-y-auto" ref={contractRef}>
                            <div className="max-w-prose mx-auto space-y-12">
                                <div className="text-center space-y-4 pb-8 border-b-4 border-slate-900 flex flex-col items-center">
                                    <div className="w-24 h-24 bg-orange-500 rounded-3xl flex items-center justify-center p-4">
                                        <img src="/icon.svg" alt="Que Pollo del Sur Logo" className="w-full h-full invert brightness-0" />
                                    </div>
                                    <div>
                                        <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Contrato de Trabajo</h2>
                                        <p className="font-bold text-slate-500 tracking-widest uppercase text-sm">Distribuciones Que Pollo del Sur</p>
                                    </div>
                                </div>

                                <section className="space-y-6">
                                    <h3 className="text-xl font-black uppercase border-l-4 border-orange-500 pl-4">Cláusulas del Contrato</h3>
                                    <div className="text-slate-700 leading-relaxed whitespace-pre-wrap font-serif text-lg">
                                        {selectedContract.contractText}
                                    </div>
                                </section>

                                <section className="space-y-6 page-break-before">
                                    <h3 className="text-xl font-black uppercase border-l-4 border-orange-500 pl-4">Reglamento Interno</h3>
                                    <div className="text-slate-700 leading-relaxed whitespace-pre-wrap font-serif text-lg">
                                        {selectedContract.regulationsText || "No hay reglamento adjunto."}
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <h3 className="text-xl font-black uppercase border-l-4 border-orange-500 pl-4">Acta de Dotación</h3>
                                    <div className="text-slate-700 leading-relaxed whitespace-pre-wrap font-serif text-lg">
                                        {selectedContract.dotationText || "No hay registros de dotación."}
                                    </div>
                                </section>

                                <div className="grid grid-cols-2 gap-12 pt-20 border-t border-slate-100">
                                    <div className="space-y-4">
                                        <div className="h-32 border-b-2 border-slate-900 flex items-center justify-center overflow-hidden">
                                            {selectedContract.signatures?.worker && <img src={selectedContract.signatures.worker.image} alt="Firma Trabajador" className="h-full object-contain" />}
                                        </div>
                                        <div className="text-center space-y-1">
                                            <p className="font-black uppercase text-xs">Firma: {selectedContract.signatures?.worker?.name || selectedContract.employeeName}</p>
                                            <p className="font-bold text-[10px] text-slate-500">CC: {selectedContract.signatures?.worker?.documentId || '________________'}</p>
                                            <p className="font-black uppercase text-[10px] text-slate-400">TRABAJADOR</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="h-32 border-b-2 border-slate-900 flex items-center justify-center overflow-hidden">
                                            {selectedContract.signatures?.employer && <img src={selectedContract.signatures.employer.image} alt="Firma Empleador" className="h-full object-contain" />}
                                        </div>
                                        <div className="text-center space-y-1">
                                            <p className="font-black uppercase text-xs">Firma: {selectedContract.signatures?.employer?.name || 'Representante Legal'}</p>
                                            <p className="font-bold text-[10px] text-slate-500">ID: {selectedContract.signatures?.employer?.documentId || '________________'}</p>
                                            <p className="font-black uppercase text-[10px] text-slate-400">EMPLEADOR</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="h-32 border-b-2 border-slate-900 flex items-center justify-center overflow-hidden">
                                            {selectedContract.signatures?.boss && <img src={selectedContract.signatures.boss.image} alt="Firma Jefe" className="h-full object-contain" />}
                                        </div>
                                        <div className="text-center space-y-1">
                                            <p className="font-black uppercase text-xs">Firma: {selectedContract.signatures?.boss?.name || 'Jefe Inmediato'}</p>
                                            <p className="font-bold text-[10px] text-slate-500">ID: {selectedContract.signatures?.boss?.documentId || '________________'}</p>
                                            <p className="font-black uppercase text-[10px] text-slate-400">JEFE INMEDIATO</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="h-32 border-b-2 border-slate-900 flex items-center justify-center overflow-hidden">
                                            {selectedContract.signatures?.hr && <img src={selectedContract.signatures.hr.image} alt="Firma RH" className="h-full object-contain" />}
                                        </div>
                                        <div className="text-center space-y-1">
                                            <p className="font-black uppercase text-xs">Firma: {selectedContract.signatures?.hr?.name || 'Jefe Talento Humano'}</p>
                                            <p className="font-bold text-[10px] text-slate-500">ID: {selectedContract.signatures?.hr?.documentId || '________________'}</p>
                                            <p className="font-black uppercase text-[10px] text-slate-400">TALENTO HUMANO</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Signing Controls */}
                        <div className="lg:w-1/3 p-8 flex flex-col gap-8 bg-white lg:bg-transparent border-t lg:border-t-0 lg:border-l border-slate-200">
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de Firmas</h3>
                                    <button onClick={() => {
                                        setSelectedContract(null);
                                        setAiExplanation(null);
                                        window.speechSynthesis.cancel();
                                        setIsSpeaking(false);
                                    }} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                                <p className="text-sm text-slate-500 font-medium italic">Selecciona el rol para autorizar con firma digital.</p>
                            </div>

                            {/* AI Socialization Assistant */}
                            <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-4 shadow-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white">
                                        <Bot size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-sm uppercase tracking-tight">Asistente de Socialización</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Powered by Gemini AI</p>
                                    </div>
                                </div>
                                
                                {aiExplanation ? (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="text-xs text-slate-300 leading-relaxed font-medium italic line-clamp-6 hover:line-clamp-none transition-all cursor-pointer">
                                            "{aiExplanation}"
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={handleSpeak}
                                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
                                            >
                                                {isSpeaking ? <Pause size={16} /> : <Volume2 size={16} />}
                                                {isSpeaking ? 'Pausar Lectura' : 'Leer Contrato'}
                                            </button>
                                            <button 
                                                onClick={handleExplainContract}
                                                className="p-3 bg-slate-800 text-slate-400 rounded-xl hover:text-white transition-all"
                                                title="Regenerar explicación"
                                            >
                                                <Plus size={16} className="rotate-45" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={handleExplainContract}
                                        disabled={isExplaining}
                                        className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                    >
                                        {isExplaining ? 'Procesando contrato...' : 'Explicar Contrato (IA)'}
                                    </button>
                                )}
                            </div>

                            <div className="space-y-3">
                                {['worker', 'employer', 'boss', 'hr', 'legalRep'].map((role) => (
                                    <button
                                        key={role}
                                        onClick={() => handleStartSigning(role as keyof SignatureData)}
                                        className={cn(
                                            "w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all group",
                                            selectedContract.signatures?.[role as keyof SignatureData]
                                                ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                                                : currentSigningRole === role
                                                    ? "bg-orange-50 border-orange-500 text-orange-700 shadow-lg shadow-orange-500/10"
                                                    : "bg-white border-slate-100 hover:border-slate-300"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                                selectedContract.signatures?.[role as keyof SignatureData] ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-900 group-hover:text-white"
                                            )}>
                                                {selectedContract.signatures?.[role as keyof SignatureData] ? <CheckCircle2 size={20} /> : <Signature size={20} />}
                                            </div>
                                            <div className="text-left">
                                                <span className="block text-sm font-black uppercase tracking-tight">
                                                    {role === 'worker' ? 'Trabajador' : 
                                                     role === 'employer' ? 'Empleador' : 
                                                     role === 'boss' ? 'Jefe Inmediato' : 
                                                     role === 'hr' ? 'Talento Humano' : 'Representante Legal'}
                                                </span>
                                                <span className="text-[10px] font-bold opacity-60">
                                                    {selectedContract.signatures?.[role as keyof SignatureData] ? 'Firmado' : 'Pendiente por Firmar'}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight size={18} className={cn("transition-transform", currentSigningRole === role ? "translate-x-1" : "")} />
                                    </button>
                                ))}
                            </div>

                            <div className="mt-auto space-y-4">
                                {selectedContract.status === 'signed' && (
                                    <button 
                                        onClick={downloadPDF}
                                        className="w-full flex items-center justify-center gap-3 py-5 bg-emerald-600 text-white rounded-3xl font-black uppercase text-sm tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20"
                                    >
                                        <Download size={20} />
                                        Descargar Certificado
                                    </button>
                                )}
                                <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100 flex gap-4">
                                    <Info className="text-orange-500 shrink-0" size={20} />
                                    <p className="text-[11px] text-orange-800 font-medium leading-normal">
                                        Al firmar digitalmente, las partes declaran haber socializado y aceptado las cláusulas del contrato, el reglamento interno y la entrega de dotación correspondiente.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Signature Modal */}
            {currentSigningRole && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                    <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-8 space-y-6 animate-in zoom-in duration-200">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto text-orange-600 mb-2">
                                <PenTool size={28} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Firma Digital Authorizada</h3>
                            <p className="text-xs text-slate-500 font-medium">Firma aquí como <span className="font-black text-slate-900 uppercase">{currentSigningRole}</span></p>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Nombre Completo</label>
                                <input 
                                    type="text" 
                                    value={signerName}
                                    onChange={(e) => setSignerName(e.target.value)}
                                    placeholder="Ingrese nombre y apellido"
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-xl transition-all outline-none font-bold text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Número de Documento</label>
                                <input 
                                    type="text" 
                                    value={signerDocumentId}
                                    onChange={(e) => setSignerDocumentId(e.target.value)}
                                    placeholder="Cédula / Documento"
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-xl transition-all outline-none font-bold text-sm"
                                />
                            </div>
                        </div>

                        <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl overflow-hidden touch-none relative group">
                            <div className="absolute top-2 left-2 text-[10px] font-black text-slate-300 uppercase tracking-widest z-0 group-hover:text-slate-400 transition-colors">Área de Firma</div>
                            <SignaturePad 
                                ref={sigPad}
                                canvasProps={{
                                    className: "w-full h-48 cursor-crosshair relative z-10",
                                    style: { background: 'transparent' }
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => sigPad.current?.clear()}
                                className="py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-colors active:scale-95"
                            >
                                Limpiar
                            </button>
                            <button 
                                onClick={handleSaveSignature}
                                className="py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95 shadow-slate-900/20"
                            >
                                Confirmar Firma
                            </button>
                        </div>
                        <button 
                            onClick={() => {
                                setCurrentSigningRole(null);
                                setSignerName('');
                                setSignerDocumentId('');
                            }}
                            className="w-full py-2 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-600 transition-colors"
                        >
                            Cancelar Operación
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LaborContracts;
