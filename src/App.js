import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LogOut, Home, Search, Users, DollarSign, Globe, Building, Package, Warehouse, Percent, Bot, Smile, Meh, Frown, Ship, Train, Truck, Car, Plane, Sparkles, Send, User, Lock, Info, Settings, Clipboard, KeyRound } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';


// --- Configuração do Firebase ---
const firebaseConfig = {
    apiKey: "AIzaSyCzW9Ct-r-Wskd4I7_PfH69DpspxqUIQQQ",
    authDomain: "dashboard-mercocamp-214f1.firebaseapp.com",
    projectId: "dashboard-mercocamp-214f1",
    storageBucket: "dashboard-mercocamp-214f1.appspot.com",
    messagingSenderId: "337375823957",
    appId: "1:337375823957:web:8cf52e5c9c8018d19b2cdc"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'southamerica-east1');


// --- Componente de Spinner de Carregamento ---
const LoadingSpinner = () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100">
        <div className="spinner">
            <div className="dot1"></div>
            <div className="dot2"></div>
            <div className="dot3"></div>
            <div className="dot4"></div>
            <div className="dot5"></div>
            <div className="dot6"></div>
        </div>
        <p className="mt-4 text-gray-600">Carregando...</p>
    </div>
);


// --- Componente da Logo Simples (Imagem Estática) ---
function ClientLogo({ clientCode, clientName }) {
    if (!clientCode || !clientName) {
        return <div className="w-20 h-20 rounded-full bg-slate-200" />;
    }

    const simplifiedName = clientName.split(' ')[0].toUpperCase();
    const fileName = `${clientCode}-${simplifiedName}`;
    const logoUrl = `https://storage.googleapis.com/logos-portal-mercocamp/${fileName}`;
    const fallbackLogoUrl = 'https://placehold.co/100x100/e2e8f0/0d9488?text=Logo';
    const [imageSrc, setImageSrc] = useState(logoUrl);

    useEffect(() => {
        setImageSrc(logoUrl);
    }, [logoUrl]);

    const handleError = () => {
        setImageSrc(fallbackLogoUrl);
    };

    return (
        <img
            key={clientCode}
            src={imageSrc}
            onError={handleError}
            alt={`Logo de ${clientName}`}
            className="w-20 h-20 rounded-full object-cover border-2 border-slate-200"
        />
    );
}


// URL da logo do usuário.
const userLogoUrl = 'https://storage.googleapis.com/logos-portal-mercocamp/logo.png';

// --- FUNÇÃO PARA CHAMADA DA API GEMINI ---
const callGeminiAPI = async (prompt, chatHistory = []) => {
    // NOTA: É mais seguro usar uma Cloud Function para intermediar chamadas de API
    // e não expor a chave no código do cliente.
    const apiKey = "AIzaSyBSGdn1weejg1TA4maZwwh4qC8XZ6L8ptg";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    const fullHistory = [...chatHistory, { role: "user", parts: [{ text: prompt }] }];
    const payload = { contents: fullHistory };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorBody = await response.json();
            console.error("API Error Body:", errorBody);
            throw new Error(`API Error: ${response.statusText}.`);
        }
        const result = await response.json();
        if (result.candidates && result.candidates[0]?.content?.parts?.[0]) {
            return result.candidates[0].content.parts[0].text;
        } else {
            console.warn("Resposta da API Gemini com estrutura inesperada:", result);
            return "Não foi possível obter uma resposta da IA.";
        }
    } catch (error) {
        console.error("Erro ao chamar a API Gemini:", error);
        return `Ocorreu um erro ao se comunicar com a IA: ${error.message}`;
    }
};

// --- NOVO HOOK para buscar dados comerciais dos clientes ---
const useClientData = () => {
    const [clientDetails, setClientDetails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const SPREADSHEET_ID = '1QZ5t4RR1Sd4JP5M6l4cyh7Vyr3ruQiA_EF9hNYVk2NQ';
        const API_KEY = 'AIzaSyDESwQr8FkkWk1k2ybbbO3bRwH0JlxdfDw';
        const RANGE = 'ClienteCD!A2:P'; // Colunas de A a P para incluir o Mínimo de Contrato

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`);
                if (!response.ok) throw new Error('Falha ao buscar dados comerciais dos clientes.');

                const result = await response.json();
                const rows = result.values || [];

                const headers = ['Codigo', 'Cliente', 'CNPJ', 'Email', 'Endereco', 'Bairro', 'Cidade', 'UF', 'CEP', 'Contato', 'TipoFatura', 'Perc_Valr', 'VlrAluguel', 'AdValorem', 'Segmento', 'MinimoContrato'];

                const processedData = rows.map(row => {
                    const rowData = {};
                    headers.forEach((header, index) => {
                        rowData[header] = row[index] || null;
                    });
                    return rowData;
                }).filter(client => {
                    const code = parseInt(client.Codigo, 10);
                    return !isNaN(code);
                }).map(client => ({
                    ...client,
                    Codigo: parseInt(client.Codigo, 10)
                }));

                setClientDetails(processedData);
            } catch (e) {
                console.error(e);
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return { clientDetails, loading, error };
};


// Hook de dados para buscar e processar dados da Planilha Google
const useData = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const SPREADSHEET_ID = '1QZ5t4RR1Sd4JP5M6l4cyh7Vyr3ruQiA_EF9hNYVk2NQ';
        const API_KEY = 'AIzaSyDESwQr8FkkWk1k2ybbbO3bRwH0JlxdfDw';
        const RANGE = 'BaseReceber!A2:AB';

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`);
                if (!response.ok) throw new Error('Falha ao buscar dados de faturamento.');

                const result = await response.json();
                const rows = result.values || [];
                const headers = ['Codigo', 'Cliente', 'Vencimento', 'Emissao', 'NF', 'Lotacao_Origem', 'TP_Receita', 'TP_Receita_Detalhada', 'Vlr_NF', 'Vlr_Titulo', 'Vlr_Receber', 'Vlr_Juros_Multa', 'Data_Pagamento', 'Vlr_Recebido', 'Vlr_Desconto', 'Status_titulo', 'Tipo_Resumido', 'Recebido_em', 'Recebido_em_Banco', 'Recebido_em_Atraso', 'Recebido_em_Atraso_Juros', 'Observacao', 'Faturado_Por', 'Faturado_Em', 'Competencia', 'Quinzenal', 'Lotacao', 'Dias_Atraso'];

                const parseBrDate = (dateString) => {
                    if (!dateString || typeof dateString !== 'string') return null;
                    const parts = dateString.split('/');
                    if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
                    return null;
                };

                const parseCurrency = (currencyString) => {
                    if (typeof currencyString !== 'string') return 0;
                    return parseFloat(currencyString.replace(/[R$.]/g, '').replace(',', '.').trim()) || 0;
                };

                const twoYearsAgo = new Date();
                twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

                const processedData = rows.map((row) => {
                    const rowData = {};
                    headers.forEach((header, index) => { rowData[header] = row[index] || null; });
                    return rowData;
                }).filter(d => {
                    const code = parseInt(d.Codigo, 10);
                    const emissionDate = parseBrDate(d.Emissao);
                    return !isNaN(code) && emissionDate && emissionDate >= twoYearsAgo;
                })
                    .map((d, index) => ({
                        ...d,
                        id: index,
                        Codigo: parseInt(d.Codigo, 10),
                        EmissaoDate: parseBrDate(d.Emissao),
                        VencimentoDate: parseBrDate(d.Vencimento),
                        PagamentoDate: parseBrDate(d.Data_Pagamento),
                        Vlr_Titulo: parseCurrency(d.Vlr_Titulo),
                        Vlr_Receber: parseCurrency(d.Vlr_Receber),
                        Vlr_Recebido: parseCurrency(d.Vlr_Recebido),
                        Dias_Atraso: parseInt(d.Dias_Atraso, 10) || 0,
                    }));

                setData(processedData);
            } catch (e) {
                console.error(e);
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return { data, loading, error };
};


// Componente Card (Estilo iOS)
const StyledCard = ({ children, className = '', onClick }) => (
    <div onClick={onClick} className={`bg-white rounded-2xl shadow-lg p-6 ${className} ${onClick ? 'cursor-pointer hover:shadow-xl transition-shadow' : ''}`}>
        {children}
    </div>
);

// Componente de Card de Estatística
const StatCard = ({ icon, title, quantity, value, subValue }) => (
    <StyledCard>
        <div className="flex items-center justify-between text-gray-500">
            <span className="font-semibold">{title}</span>
            {icon}
        </div>
        <div className="mt-2 text-right">
            <p className={`text-3xl font-bold text-gray-800`}>{value}</p>
            {quantity && <p className="text-sm text-gray-500">{quantity} Títulos</p>}
            {subValue && <p className="text-sm font-semibold text-gray-500">{subValue}</p>}
        </div>
    </StyledCard>
);

// Componente de Toggle Switch
const ToggleSwitch = ({ active, onChange }) => (
    <button onClick={onChange} className={`relative inline-flex items-center h-8 w-16 rounded-full transition-colors duration-300 ease-in-out focus:outline-none ${active ? 'bg-teal-500' : 'bg-gray-300'}`}>
        <span className={`inline-block w-6 h-6 transform bg-white rounded-full transition-transform duration-300 ease-in-out shadow-md ${active ? 'translate-x-9' : 'translate-x-1'}`} />
    </button>
);

// Lógica de Score do Cliente
const getClientScore = (cliente, allData) => {
    if (!allData || allData.length === 0) return { text: 'N/A', color: 'text-gray-500' };
    const clientData = allData.filter(d => d.Cliente === cliente);
    if (clientData.length < 2) return { text: 'Novo Cliente', color: 'text-blue-500' };
    const recentData = clientData.filter(d => d.EmissaoDate && d.EmissaoDate > new Date(new Date().setMonth(new Date().getMonth() - 6)));
    if (recentData.length === 0) return { text: 'Inativo', color: 'text-gray-500' };
    const latePayments = recentData.filter(d => d.Recebido_em_Atraso === 'Sim' || d.Status_titulo === 'Atrasado').length;
    const latePercentage = (latePayments / recentData.length) * 100;
    if (latePercentage > 50) return { text: 'Inadimplente', color: 'text-red-500' };
    if (latePercentage > 10) return { text: 'Pagador em Alerta', color: 'text-yellow-500' };
    return { text: 'Bom Pagador', color: 'text-green-500' };
};

// Componente Modal
const Modal = ({ show, onClose, title, children }) => {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg m-4 transform transition-all duration-300 scale-95" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-2xl font-bold">&times;</button>
                </div>
                <div>{children}</div>
            </div>
        </div>
    );
};

// Botão Flutuante IA
const GeminiButton = ({ onClick }) => (
    <button
        onClick={onClick}
        className="fixed bottom-6 right-6 bg-gradient-to-br from-blue-600 to-teal-500 text-white p-4 rounded-full shadow-2xl hover:scale-110 transform transition-all duration-300 z-40"
        title="Consultar IA Gemini"
    >
        <Bot size={28} />
    </button>
);

// Componente Chat Modal
const ChatModal = ({ show, onClose, dataContext, contextName }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        if (show) {
            setMessages([{
                sender: 'ai',
                text: `Olá! Sou o assistente de IA. Tenho acesso aos dados de ${contextName}. Como posso ajudar?`
            }]);
        }
    }, [show, contextName]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        const apiChatHistory = messages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        const dataSample = dataContext.slice(0, 15);
        const currentDate = new Date().toLocaleDateString('pt-BR');

        const prompt = `Contexto: Hoje é ${currentDate}. Dados de "${contextName}": ${JSON.stringify(dataSample, null, 2)}. Pergunta: "${currentInput}"`;

        const aiResponseText = await callGeminiAPI(prompt, apiChatHistory);
        const aiMessage = { sender: 'ai', text: aiResponseText };

        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
    };

    if (!show) return null;

    return (
        <div className="fixed bottom-20 right-6 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-96 h-[32rem] flex flex-col">
                <header className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">Assistente Gemini AI</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-xl font-bold">&times;</button>
                </header>
                <div className="flex-1 p-4 overflow-y-auto">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex mb-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`rounded-lg px-3 py-2 max-w-xs ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-gray-800'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="rounded-lg px-3 py-2 max-w-xs bg-slate-100 text-gray-800">
                                ...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <footer className="p-4 border-t">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Pergunte sobre os dados..."
                            className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <button onClick={handleSend} disabled={isLoading} className="bg-gradient-to-r from-blue-600 to-teal-500 text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50">
                            <Send size={20} />
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};


// Componente Globo Terrestre Realista
const SpinningGlobe = () => {
    const worldTextureUrl = 'https://raw.githubusercontent.com/turban/webgl-earth/master/images/2_no_clouds_4k.jpg';
    return (
        <div className="w-24 h-24">
            <div className="w-full h-full rounded-full animate-spin-slow globe-bg" style={{
                backgroundImage: `url(${worldTextureUrl})`,
                backgroundSize: '200% 100%',
                boxShadow: 'inset 10px 0 20px rgba(0,0,0,0.2), 0 0 20px 2px rgba(6, 182, 212, 0.3)'
            }}>
                <div className="w-full h-full rounded-full" style={{
                    background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 60%)'
                }}></div>
            </div>
        </div>
    );
};

// --- NOVA Animação de Boas-Vindas ---
const WelcomeAnimation = ({ userName, onAnimationEnd }) => {
    const [stage, setStage] = useState(0);

    useEffect(() => {
        if (stage === 0) {
            setTimeout(() => setStage(1), 2000);
        } else if (stage === 1) {
            setTimeout(() => setStage(2), 2000);
        } else if (stage === 2) {
            setTimeout(onAnimationEnd, 500);
        }
    }, [stage, onAnimationEnd]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Bom dia';
        if (hour < 18) return 'Boa tarde';
        return 'Boa noite';
    }

    return (
        <div className="w-full h-full flex items-center justify-center bg-slate-200 overflow-hidden">
            <div className="text-center">
                <div className={`transition-all duration-500 ${stage === 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5'}`}>
                    <h1 className="text-4xl font-bold text-gray-700">{getGreeting()}, {userName}!</h1>
                </div>
                <div className={`transition-all duration-500 delay-300 ${stage === 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
                    <h2 className="text-3xl text-gray-600">O que posso fazer por você?</h2>
                </div>
            </div>
        </div>
    );
};

// Página de Login com Usuário e Senha
const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Por favor, preencha e-mail e senha.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError('E-mail ou senha incorretos.');
            console.error("Erro de login:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-200 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm">
                <img src={userLogoUrl} alt="Mercocamp Logo" className="w-48 h-auto mx-auto mb-8" onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/192x100/e2e8f0/0d9488?text=Mercocamp'; }} />

                <div className="space-y-4">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="E-mail"
                        className="w-full px-4 py-3 bg-slate-100 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Senha"
                        className="w-full px-4 py-3 bg-slate-100 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                </div>

                {error && <p className="text-red-500 text-center mt-4">{error}</p>}

                <button onClick={handleLogin} disabled={loading} className={`w-full mt-6 px-12 py-3 font-semibold text-white bg-gradient-to-r from-blue-600 to-teal-500 rounded-xl shadow-lg hover:scale-105 transform transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-opacity-50 disabled:opacity-50`}>
                    {loading ? 'Entrando...' : 'Entrar'}
                </button>
            </div>
        </div>
    );
};

// Página de Menu
const MenuPage = ({ onSelect, onLogout, onGeminiClick, userIsAdmin, onProfileClick }) => {
    const [time, setTime] = useState(new Date());
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Bom dia');
        else if (hour < 18) setGreeting('Boa tarde');
        else setGreeting('Boa noite');
        return () => clearInterval(timer);
    }, []);

    const menuOptions = [
        { id: 'GLOBAL', label: 'Faturamento Global', icon: <Globe /> },
        { id: 'CD MATRIZ', label: 'CD Matriz', icon: <Building /> },
        { id: 'CD CARIACICA', label: 'CD Cariacica', icon: <Building /> },
        { id: 'CD VIANA', label: 'CD Viana', icon: <Building /> },
        { id: 'CD CIVIT', label: 'CD Civit', icon: <Building /> },
        { id: 'VISAO_360', label: 'Visão 360° do Cliente', icon: <Search /> },
        { id: 'COBRANCA', label: 'Cobrança', icon: <DollarSign /> },
        ...(userIsAdmin ? [{ id: 'SETTINGS', label: 'Configurações', icon: <Settings /> }] : [])
    ];

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-200 text-gray-800 p-4">
            <GeminiButton onClick={onGeminiClick} />
            <div className="absolute top-5 right-5 text-right">
                <p className="font-semibold text-xl text-gray-700">{time.toLocaleTimeString()}</p>
                <p className="text-gray-500">{time.toLocaleDateString()}</p>
            </div>
            <div className="absolute top-5 left-5 flex gap-4">
                <button onClick={onProfileClick} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors">
                    <User size={20} /> Meu Perfil
                </button>
                <button onClick={onLogout} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors">
                    <LogOut size={20} /> Sair
                </button>
            </div>

            <div className="text-center mb-12">
                <img src={userLogoUrl} alt="Mercocamp Logo" className="w-72 h-auto mx-auto" onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/288x150/e2e8f0/0d9488?text=Mercocamp'; }} />
                <p className="mt-4 text-2xl text-gray-600">{greeting}, seja bem-vindo(a)!</p>
            </div>

            <StyledCard className="p-8 w-full max-w-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {menuOptions.map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => onSelect(opt.id, opt.id)}
                            className="p-6 bg-slate-50 rounded-xl flex flex-col items-center justify-center gap-3 text-center hover:bg-white hover:shadow-lg hover:scale-105 transform transition-all duration-300 border border-slate-200"
                        >
                            <div className="text-teal-500">{React.cloneElement(opt.icon, { size: 32 })}</div>
                            <span className="font-semibold text-lg text-gray-700">{opt.label}</span>
                        </button>
                    ))}
                </div>
            </StyledCard>
        </div>
    );
};


// --- NOVO Componente para o Modal de Perfil / Mudar Senha ---
const ProfileModal = ({ isOpen, onClose, showNotification }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError("As novas senhas não correspondem.");
            return;
        }
        if (newPassword.length < 6) {
            setError("A nova senha deve ter pelo menos 6 caracteres.");
            return;
        }

        setIsLoading(true);
        const user = auth.currentUser;
        if (!user) {
            setError("Usuário não encontrado. Por favor, faça login novamente.");
            setIsLoading(false);
            return;
        }

        const credential = EmailAuthProvider.credential(user.email, currentPassword);

        try {
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            showNotification('Senha alterada com sucesso!', 'success');
            onClose();
        } catch (err) {
            console.error(err);
            setError("A senha atual está incorreta.");
        } finally {
            setIsLoading(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }
    };

    if (!isOpen) return null;

    return (
        <Modal show={isOpen} onClose={onClose} title="Meu Perfil">
            <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Senha Atual</label>
                    <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Nova Senha</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500" />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancelar</button>
                    <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {isLoading ? 'Salvando...' : 'Salvar Nova Senha'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};


// --- Componente para a página "Em Construção" ---
const ConstructionPage = ({ onBack, title = "Página" }) => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-200 text-gray-800 p-4">
        <SpinningGlobe />
        <h1 className="text-3xl font-bold text-gray-700 mt-8">{title} em Construção</h1>
        <p className="text-gray-500 mt-2">Estamos preparando algo incrível aqui. Volte em breve!</p>
        <button
            onClick={onBack}
            className="mt-8 flex items-center gap-2 px-6 py-3 font-semibold text-white bg-gradient-to-r from-blue-600 to-teal-500 rounded-xl shadow-lg hover:scale-105 transform transition-all duration-300 ease-in-out"
        >
            <Home size={20} /> Voltar ao Menu
        </button>
    </div>
);

// --- Componente de Configurações ---
const SettingsPage = ({ onBack, currentUserData }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const showNotification = (message, type) => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification({ show: false, message: '', type: '' });
        }, 3000);
    };

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const usersCollectionRef = collection(db, "users");
            const querySnapshot = await getDocs(usersCollectionRef);
            const usersList = querySnapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            }));
            setUsers(usersList);
        } catch (err) {
            console.error("Erro ao buscar usuários:", err);
            if (err.code === 'permission-denied') {
                setError("Você não tem permissão para acessar esta página.");
            } else {
                setError("Ocorreu um erro ao carregar os usuários.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAddUser = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const handleEditUser = (user) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleDeleteUser = (user) => {
        setUserToDelete(user);
    };
    
    const executeDelete = async () => {
        if (!userToDelete) return;
        setIsSubmitting(true);
        try {
            const deleteUserFunction = httpsCallable(functions, 'deleteUser');
            await deleteUserFunction({ uid: userToDelete.uid });
            showNotification('Usuário excluído com sucesso!', 'success');
            setUserToDelete(null);
            fetchUsers();
        } catch (error) {
            console.error("Erro ao deletar usuário:", error);
            showNotification(`Falha ao excluir: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleSaveUser = async (userData) => {
        setIsSubmitting(true);
        try {
            if (userData.uid) {
                const updateUserFunction = httpsCallable(functions, 'updateUser');
                await updateUserFunction(userData);
                showNotification('Usuário atualizado com sucesso!', 'success');
            } else {
                const createUserFunction = httpsCallable(functions, 'createUser');
                await createUserFunction(userData);
                showNotification('Usuário criado com sucesso!', 'success');
            }
            handleCloseModal();
            fetchUsers();
        } catch (error) {
            console.error("Erro ao salvar usuário:", error);
            showNotification(`Falha ao salvar: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <LoadingSpinner />;
    
    if (error) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-red-500 p-4 text-center">
                <Lock size={48} className="mb-4" />
                <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
                <p>{error}</p>
                <button
                    onClick={onBack}
                    className="mt-8 flex items-center gap-2 px-6 py-3 font-semibold text-white bg-gradient-to-r from-blue-600 to-teal-500 rounded-xl shadow-lg hover:scale-105"
                >
                    <Home size={20} /> Voltar ao Menu
                </button>
            </div>
        );
    }

    return (
        <div className="bg-slate-200 text-gray-800 min-h-screen p-4 sm:p-6 lg:p-8">
            {notification.show && (
                <div className={`fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white z-50 ${notification.type === 'success' ? 'bg-teal-500' : 'bg-red-500'}`}>
                    {notification.message}
                </div>
            )}
            <header className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">Configurações</h1>
                <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors"><Home size={20} /> Menu</button>
            </header>

            <StyledCard>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-700">Gerenciamento de Usuários</h2>
                    <button
                        onClick={handleAddUser}
                        className="px-4 py-2 font-semibold text-white bg-gradient-to-r from-blue-600 to-teal-500 rounded-lg shadow-md hover:opacity-90"
                    >
                        Adicionar Usuário
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Nome</th>
                                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">E-mail</th>
                                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Admin</th>
                                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {users.map(user => (
                                <tr key={user.uid} className="hover:bg-slate-50">
                                    <td className="py-3 px-4 text-sm text-gray-800">{user.nome || 'Não definido'}</td>
                                    <td className="py-3 px-4 text-sm text-gray-500">{user.email}</td>
                                    <td className="py-3 px-4 text-sm">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.isAdmin ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {user.isAdmin ? 'Sim' : 'Não'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm flex gap-2">
                                        <button onClick={() => handleEditUser(user)} className="text-blue-600 hover:text-blue-800">Editar</button>
                                        <button
                                            onClick={() => handleDeleteUser(user)}
                                            className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={user.email === 'administrativo@mercocamp.com'}
                                        >
                                            Excluir
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </StyledCard>

            <UserModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveUser}
                userData={editingUser}
                isSubmitting={isSubmitting}
            />
            
            <Modal show={!!userToDelete} onClose={() => setUserToDelete(null)} title="Confirmar Exclusão">
                 <div>
                    <p className="mb-6">Tem certeza que deseja excluir o usuário <span className="font-bold">{userToDelete?.nome}</span>?</p>
                    <div className="flex justify-end gap-4">
                        <button onClick={() => setUserToDelete(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
                            Cancelar
                        </button>
                        <button onClick={executeDelete} disabled={isSubmitting} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                            {isSubmitting ? 'Excluindo...' : 'Excluir'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};


// --- Componente para o Modal de Usuário ---
const UserModal = ({ isOpen, onClose, onSave, userData, isSubmitting }) => {
    const [formData, setFormData] = useState({});

    const allPermissions = [
        { id: 'GLOBAL', label: 'Faturamento Global' },
        { id: 'CD_MATRIZ', label: 'CD Matriz' },
        { id: 'CD_CARIACICA', label: 'CD Cariacica' },
        { id: 'CD_VIANA', label: 'CD Viana' },
        { id: 'CD_CIVIT', label: 'CD Civit' },
        { id: 'VISAO_360', label: 'Visão 360°' },
        { id: 'COBRANCA', label: 'Cobrança' },
        { id: 'SETTINGS', label: 'Configurações' },
    ];

    useEffect(() => {
        if (userData) {
            setFormData({
                uid: userData.uid,
                nome: userData.nome || '',
                email: userData.email || '',
                isAdmin: userData.isAdmin || false,
                permissoes: userData.permissoes || {},
            });
        } else {
            setFormData({
                nome: '',
                email: '',
                password: '',
                isAdmin: false,
                permissoes: {},
            });
        }
    }, [userData, isOpen]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handlePermissionChange = (permissionId) => {
        setFormData(prev => {
            const newPermissoes = { ...prev.permissoes };
            if (newPermissoes[permissionId]) {
                delete newPermissoes[permissionId];
            } else {
                newPermissoes[permissionId] = true;
            }
            return { ...prev, permissoes: newPermissoes };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <Modal show={isOpen} onClose={onClose} title={userData ? 'Editar Usuário' : 'Adicionar Novo Usuário'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
                    <input type="text" name="nome" value={formData.nome || ''} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">E-mail</label>
                    <input type="email" name="email" value={formData.email || ''} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500" readOnly={!!userData} />
                </div>
                {!userData && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Senha Provisória (mínimo 6 caracteres)</label>
                        <input type="password" name="password" value={formData.password || ''} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500" />
                    </div>
                )}
                <div className="flex items-center">
                    <input type="checkbox" name="isAdmin" checked={formData.isAdmin || false} onChange={handleChange} className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" />
                    <label className="ml-2 block text-sm text-gray-900">É Administrador? (Acesso total)</label>
                </div>

                <fieldset>
                    <legend className="text-sm font-medium text-gray-700">Permissões de Acesso</legend>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                        {allPermissions.map(perm => (
                            <div key={perm.id} className="flex items-start">
                                <div className="flex items-center h-5">
                                    <input
                                        id={perm.id}
                                        name={perm.id}
                                        type="checkbox"
                                        checked={!!formData.permissoes?.[perm.id] || formData.isAdmin}
                                        onChange={() => handlePermissionChange(perm.id)}
                                        disabled={formData.isAdmin}
                                        className="focus:ring-teal-500 h-4 w-4 text-teal-600 border-gray-300 rounded disabled:opacity-50"
                                    />
                                </div>
                                <div className="ml-3 text-sm">
                                    <label htmlFor={perm.id} className="font-medium text-gray-700">{perm.label}</label>
                                </div>
                            </div>
                        ))}
                    </div>
                </fieldset>

                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {isSubmitting ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};


// Componente Principal da Aplicação
export default function App() {
    const [page, setPage] = useState('LOADING');
    const [currentUser, setCurrentUser] = useState(null);
    const [currentUserData, setCurrentUserData] = useState(null);
    const [dashboardId, setDashboardId] = useState(null);
    const { data, loading: faturamentoLoading, error: faturamentoError } = useData();
    const { clientDetails, loading: clientLoading, error: clientError } = useClientData();
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [selectedClientForProfile, setSelectedClientForProfile] = useState(null);
    // --- NOVOS ESTADOS PARA NOTIFICAÇÃO E MODAL DE PERFIL ---
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    const showNotification = (message, type) => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification({ show: false, message: '', type: '' });
        }, 3000);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    await user.getIdToken(true);
                    const userDocRef = doc(db, "users", user.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        setCurrentUserData(userDocSnap.data());
                    } else {
                        if (user.email.toLowerCase() === 'administrativo@mercocamp.com') {
                            const adminData = {
                                nome: 'William',
                                isAdmin: true,
                                permissoes: { GLOBAL: true, CD_MATRIZ: true, CD_CARIACICA: true, CD_VIANA: true, CD_CIVIT: true, VISAO_360: true, COBRANCA: true, SETTINGS: true }
                            };
                            await setDoc(userDocRef, adminData);
                            setCurrentUserData(adminData);
                        } else {
                            setCurrentUserData({ nome: user.email.split('@')[0], isAdmin: false, permissoes: {} });
                        }
                    }
                    setCurrentUser(user);
                    setPage('ANIMATING');
                } catch (error) {
                    console.error("Erro ao buscar dados do usuário:", error);
                    signOut(auth);
                }
            } else {
                setCurrentUser(null);
                setCurrentUserData(null);
                setPage('LOGIN');
            }
        });
        return () => unsubscribe();
    }, []);

    const handleSelect = (pageType, id) => {
        const pageId = pageType === 'DASHBOARD' || pageType === 'VISAO_360' || pageType === 'COBRANCA' || pageType === 'SETTINGS' ? pageType : 'DASHBOARD';
        setDashboardId(id);
        setPage(pageId);
        setSelectedClientForProfile(null);
    };

    const handleNavigateToProfile = (client) => {
        setSelectedClientForProfile(client);
        setPage('VISAO_360');
    };

    const handleBackToMenu = () => {
        setPage('MENU');
        setDashboardId(null);
        setSelectedClientForProfile(null);
    };

    const handleLogout = async () => {
        await signOut(auth);
    }

    const handleGeminiClick = () => setIsChatOpen(prev => !prev);
    const handleGeminiClose = () => setIsChatOpen(false);

    const { chatDataContext, chatContextName } = useMemo(() => {
        if (page === 'DASHBOARD' && dashboardId) {
            const cdMap = {
                'CD MATRIZ': ['CD MATRIZ', 'CD MATRIZ A', 'CD MATRIZ B'],
                'CD CARIACICA': ['CD CARIACICA', 'CD CARIACICA 1', 'CD CARIACICA 2', 'CD CARIACICA 3'],
                'CD VIANA': ['CD VIANA'],
                'CD CIVIT': ['CD CIVIT']
            };
            const locations = cdMap[dashboardId] || [];
            const filtered = dashboardId === 'GLOBAL' ? data : data.filter(d => locations.includes(d.Lotacao));
            return { chatDataContext: filtered, chatContextName: dashboardId };
        }
        if (page === 'VISAO_360' && selectedClientForProfile) {
            const clientData = data.filter(d => d.Codigo === selectedClientForProfile.Codigo);
            return { chatDataContext: clientData, chatContextName: `Visão 360° de ${selectedClientForProfile.Cliente}` };
        }
        return { chatDataContext: data, chatContextName: "Geral" };
    }, [page, dashboardId, data, selectedClientForProfile]);

    const renderPage = () => {
        const loading = faturamentoLoading || clientLoading;
        const error = faturamentoError || clientError;

        if (page === 'LOADING' || (currentUser && !currentUserData) || (currentUser && loading)) {
            return <LoadingSpinner />;
        }

        if (error) {
            return <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-red-500 p-4 text-center">
                <h2 className="text-2xl font-bold mb-4">Erro ao Carregar Dados</h2>
                <p className="max-w-md">{error}</p>
            </div>;
        }

        switch (page) {
            case 'LOGIN': return <LoginPage />;
            case 'ANIMATING': return <WelcomeAnimation userName={currentUserData?.nome || 'Usuário'} onAnimationEnd={() => setPage('MENU')} />;
            case 'MENU': return <MenuPage onSelect={handleSelect} onLogout={handleLogout} onGeminiClick={handleGeminiClick} userIsAdmin={currentUserData?.isAdmin} onProfileClick={() => setIsProfileModalOpen(true)} />;
            case 'DASHBOARD': return <DashboardPage data={data} loading={loading} error={error} dashboardId={dashboardId} onBack={handleBackToMenu} onGeminiClick={handleGeminiClick} onClientClick={handleNavigateToProfile} />;
            case 'VISAO_360': return <Visao360Page data={data} clientDetails={clientDetails} loading={loading} error={error} onBack={handleBackToMenu} onGeminiClick={handleGeminiClick} initialClient={selectedClientForProfile} />;
            case 'COBRANCA': return <ConstructionPage onBack={handleBackToMenu} title="Cobrança" />;
            case 'SETTINGS': return <SettingsPage onBack={handleBackToMenu} currentUserData={currentUserData} />;
            default: return <LoginPage />;
        }
    };

    return (
        <main className="w-screen h-screen bg-slate-200 font-sans">
            {notification.show && (
                <div className={`fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white z-50 ${notification.type === 'success' ? 'bg-teal-500' : 'bg-red-500'}`}>
                    {notification.message}
                </div>
            )}
            <style>{`
                @keyframes spin-slow { from { background-position: 0% 50%; } to { background-position: 200% 50%; } }
                .globe-bg { animation: spin-slow 40s linear infinite; }
                .tooltip { position: relative; display: inline-block; }
                .tooltip .tooltip-text { visibility: hidden; width: 220px; background-color: #555; color: #fff; text-align: center; border-radius: 6px; padding: 5px; position: absolute; z-index: 1; bottom: 125%; left: 50%; margin-left: -110px; opacity: 0; transition: opacity 0.3s; }
                .tooltip:hover .tooltip-text { visibility: visible; opacity: 1; }
                .spinner { position: relative; width: 56px; height: 56px; }
                .spinner div { position: absolute; width: 10px; height: 10px; border-radius: 50%; animation: spinner-anim 1.2s linear infinite; }
                .spinner .dot1 { animation-delay: 0s; background: #0d9488; }
                .spinner .dot2 { animation-delay: -0.1s; background: #0d9488; }
                .spinner .dot3 { animation-delay: -0.2s; background: #0d9488; }
                .spinner .dot4 { animation-delay: -0.3s; background: #4f46e5; }
                .spinner .dot5 { animation-delay: -0.4s; background: #4f46e5; }
                .spinner .dot6 { animation-delay: -0.5s; background: #4f46e5; }
                @keyframes spinner-anim { 0%, 20%, 80%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.5; } }
                .spinner div:nth-child(1) { top: 0; left: 23px; }
                .spinner div:nth-child(2) { top: 8px; left: 42px; }
                .spinner div:nth-child(3) { top: 23px; left: 46px; }
                .spinner div:nth-child(4) { top: 38px; left: 42px; }
                .spinner div:nth-child(5) { top: 46px; left: 23px; }
                .spinner div:nth-child(6) { top: 38px; left: 8px; }
            `}</style>

            {renderPage()}
            
            <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} showNotification={showNotification} />

            <ChatModal
                show={isChatOpen}
                onClose={handleGeminiClose}
                dataContext={chatDataContext}
                contextName={chatContextName}
            />
        </main>
    )
}
