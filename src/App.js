import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LogOut, Home, Search, Users, DollarSign, Globe, Building, Package, Warehouse, Percent, Bot, Smile, Meh, Frown, Ship, Train, Truck, Car, Plane, Sparkles, Send } from 'lucide-react';

// URL da logo do usuário.
const userLogoUrl = 'https://storage.googleapis.com/gemini-generative-ai-public-files/image_74b444.png';

// --- FUNÇÃO PARA CHAMADA DA API GEMINI ---
const callGeminiAPI = async (prompt, chatHistory = []) => {
    // Chave da API do Gemini inserida diretamente para garantir o funcionamento.
    const apiKey = 'AIzaSyBSGdn1weejg1TA4maZwwh4qC8XZ6L8ptg'; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    const fullHistory = [...chatHistory, { role: "user", parts: [{ text: prompt }] }];

    const payload = {
        contents: fullHistory
    };

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
        
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            return result.candidates[0].content.parts[0].text;
        } else {
            console.warn("Resposta da API Gemini com estrutura inesperada:", result);
            return "Não foi possível obter uma resposta da IA. A resposta pode estar vazia ou bloqueada por políticas de segurança.";
        }
    } catch (error) {
        console.error("Erro ao chamar a API Gemini:", error);
        return `Ocorreu um erro ao se comunicar com a IA: ${error.message}`;
    }
};

// Hook de dados para buscar e processar dados da Planilha Google
const useData = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Chaves inseridas diretamente para garantir o funcionamento na Vercel
        const SPREADSHEET_ID = '1QZ5t4RR1Sd4JP5M6l4cyh7Vyr3ruQiA_EF9hNYVk2NQ';
        const API_KEY = 'AIzaSyDESwQr8FkkWk1k2ybbbO3bRwH0JlxdfDw';
        const RANGE = 'BaseReceber!A2:AB';

        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    console.error("Google Sheets API Error:", errorData);
                    throw new Error('Falha ao buscar dados. Verifique se a chave de API é válida, se a planilha está compartilhada como "Qualquer pessoa com o link pode ver" e se o endereço do site está autorizado nas restrições da chave.');
                }
                const result = await response.json();
                const rows = result.values || [];

                const headers = [
                    'Codigo', 'Cliente', 'Vencimento', 'Emissao', 'NF', 'Lotacao_Origem', 'TP_Receita', 'TP_Receita_Detalhada', 'Vlr_NF', 'Vlr_Titulo',
                    'Vlr_Receber', 'Vlr_Juros_Multa', 'Data_Pagamento', 'Vlr_Recebido', 'Vlr_Desconto', 'Status_titulo', 'Tipo_Resumido', 'Recebido_em',
                    'Recebido_em_Banco', 'Recebido_em_Atraso', 'Recebido_em_Atraso_Juros', 'Observacao', 'Faturado_Por', 'Faturado_Em', 'Competencia',
                    'Quinzenal', 'Lotacao', 'Dias_Atraso'
                ];

                const parseBrDate = (dateString) => {
                    if (!dateString || typeof dateString !== 'string') return null;
                    const parts = dateString.split('/');
                    if (parts.length === 3) {
                        return new Date(parts[2], parts[1] - 1, parts[0]);
                    }
                    return null;
                };

                const parseCurrency = (currencyString) => {
                    if (typeof currencyString !== 'string') return 0;
                    return parseFloat(currencyString.replace(/[R$.]/g, '').replace(',', '.').trim()) || 0;
                };

                const twoYearsAgo = new Date();
                twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

                const processedData = rows.map((row, rowIndex) => {
                    const rowData = {};
                    headers.forEach((header, index) => {
                        rowData[header] = row[index] || null;
                    });
                    
                    rowData.EmissaoDate = parseBrDate(rowData.Emissao);
                    
                    return rowData;
                }).filter(d => d.EmissaoDate && d.EmissaoDate >= twoYearsAgo)
                .map((d, index) => ({
                    ...d,
                    id: index,
                    Codigo: parseInt(d.Codigo, 10),
                    VencimentoDate: parseBrDate(d.Vencimento),
                    PagamentoDate: parseBrDate(d.Data_Pagamento),
                    Vlr_Titulo: parseCurrency(d.Vlr_Titulo),
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
        if(show) {
            setMessages([{ 
                sender: 'ai', 
                text: `Olá! Sou o assistente de IA da Mercocamp. Tenho acesso aos dados de ${contextName}, à data atual e posso fazer pesquisas na web. Como posso ajudar?` 
            }]);
        }
    }, [show, contextName]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = { sender: 'user', text: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        const dataSample = dataContext.slice(0, 15); // Limita a amostra de dados
        const currentDate = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const prompt = `Você é um analista de dados sênior da Mercocamp. A data de hoje é ${currentDate}.
        Você tem acesso a uma amostra dos dados de faturamento de "${contextName}" e pode usar a ferramenta de busca do Google para informações externas ou cálculos.
        
        Amostra de Dados (JSON):
        ${JSON.stringify(dataSample, null, 2)}
        
        Histórico da conversa:
        ${newMessages.map(m => `${m.sender}: ${m.text}`).join('\n')}
        
        Responda à última pergunta do usuário de forma concisa e direta. Se a resposta não estiver nos dados, use a busca na internet. Se precisar de um cálculo, use a ferramenta de busca.`;
        
        const aiResponseText = await callGeminiAPI(prompt, newMessages);
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

// Animação de Introdução Logística (Estilo GIF Centralizado)
const LogisticsIntroAnimation = ({ onAnimationEnd }) => {
    const stages = [
        { icon: <Car size={80} />, name: "Veículo" },
        { icon: <Truck size={80} />, name: "Caminhão" },
        { icon: <Ship size={80} />, name: "Navio" },
        { icon: <Plane size={80} />, name: "Avião" },
    ];
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (index >= stages.length) {
            setTimeout(onAnimationEnd, 1500); // Tempo para a animação do avião terminar
            return;
        }

        const timer = setTimeout(() => {
            setIndex(prev => prev + 1);
        }, 1200); // Duração de cada etapa da animação

        return () => clearTimeout(timer);
    }, [index, onAnimationEnd, stages.length]);

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-gray-800 p-4 overflow-hidden relative">
            <div className="relative w-64 h-64 flex items-center justify-center">
                {stages.map((v, i) => (
                    <div
                        key={v.name}
                        className={`absolute flex flex-col items-center justify-center transition-opacity duration-500
                            ${i === index ? 'opacity-100' : 'opacity-0'}
                            ${v.name === 'Avião' && i === index ? 'animate-takeoff-center' : ''}
                        `}
                    >
                        <div className="text-teal-500">{v.icon}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Página de Login
const LoginPage = ({ onEnter }) => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 p-4">
        <StyledCard className="p-10 flex flex-col items-center text-center">
            <img src={userLogoUrl} alt="Mercocamp Logo" className="w-64 h-auto mb-8" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/256x100/f1f5f9/06b6d4?text=Mercocamp'; }} />
            <button onClick={onEnter} className={`px-12 py-3 font-semibold text-white bg-gradient-to-r from-blue-600 to-teal-500 rounded-xl shadow-lg hover:scale-105 transform transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-opacity-50`}>
                Entrar
            </button>
        </StyledCard>
    </div>
);

// Página de Menu
const MenuPage = ({ onSelect, onLogout, onGeminiClick }) => {
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
        { id: 'ANALISE', label: 'Análise Individual', icon: <Search /> },
    ];

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-gray-800 p-4">
            <GeminiButton onClick={onGeminiClick} />
            <div className="absolute top-5 right-5 text-right">
                <p className="font-semibold text-xl text-gray-700">{time.toLocaleTimeString()}</p>
                <p className="text-gray-500">{time.toLocaleDateString()}</p>
            </div>
            <div className="absolute top-5 left-5">
                <button onClick={onLogout} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors">
                    <LogOut size={20} /> Sair
                </button>
            </div>

            <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-6">
                    <SpinningGlobe />
                    <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">
                        MERCOCAMP
                    </h1>
                </div>
                <p className="mt-4 text-2xl text-gray-600">{greeting}, seja bem-vindo(a)!</p>
            </div>

            <StyledCard className="p-8 w-full max-w-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {menuOptions.map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => onSelect(opt.id === 'ANALISE' ? 'ANALISE' : 'DASHBOARD', opt.id)}
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


// Página do Dashboard
const DashboardPage = ({ data, loading, error, dashboardId, onBack, onGeminiClick }) => {
    const [filterType, setFilterType] = useState('competencia');
    const [competencias, setCompetencias] = useState([]);
    const [selectedCompetencia, setSelectedCompetencia] = useState('');
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    });
    const [scoreModal, setScoreModal] = useState({ isOpen: false, title: '', data: [] });
    const [aiSummary, setAiSummary] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    useEffect(() => {
        if (data.length > 0) {
            const comps = [...new Set(data.map(d => d.Competencia))].filter(Boolean).sort((a, b) => {
                const [mB, yB] = b.split('/');
                const [mA, yA] = a.split('/');
                return new Date(yB, mB - 1) - new Date(yA, mA - 1);
            });
            setCompetencias(comps);
            if (comps.length > 0) setSelectedCompetencia(comps[0]);
        }
    }, [data]);
    
    useEffect(() => {
        setAiSummary('');
    }, [dashboardId, selectedCompetencia, dateRange, filterType]);

    const { filteredData, globalTotal, previousPeriodData } = useMemo(() => {
        if (!data) return { filteredData: [], globalTotal: 0, previousPeriodData: [] };
        
        let currentPeriodData, previousPeriodDataResult;
        
        if (filterType === 'competencia') {
            currentPeriodData = data.filter(d => d.Competencia === selectedCompetencia);
            const comps = [...new Set(data.map(d => d.Competencia))].filter(Boolean).sort((a, b) => {
                const [mB, yB] = b.split('/');
                const [mA, yA] = a.split('/');
                return new Date(yB, mB - 1) - new Date(yA, mA - 1);
            });
            const currentIndex = comps.indexOf(selectedCompetencia);
            const previousCompetencia = comps[currentIndex + 1];
            previousPeriodDataResult = previousCompetencia ? data.filter(d => d.Competencia === previousCompetencia) : [];
        } else {
            currentPeriodData = data.filter(d => d.EmissaoDate && d.EmissaoDate >= dateRange.start && d.EmissaoDate <= dateRange.end);
            const prevMonthStart = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth() - 1, 1);
            const prevMonthEnd = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), 0);
            previousPeriodDataResult = data.filter(d => d.EmissaoDate && d.EmissaoDate >= prevMonthStart && d.EmissaoDate <= prevMonthEnd);
        }
        
        const globalTotal = currentPeriodData.reduce((acc, d) => acc + d.Vlr_Titulo, 0);

        const cdMap = {
            'CD MATRIZ': ['CD MATRIZ', 'CD MATRIZ A', 'CD MATRIZ B'],
            'CD CARIACICA': ['CD CARIACICA', 'CD CARIACICA 1', 'CD CARIACICA 2', 'CD CARIACICA 3'],
            'CD VIANA': ['CD VIANA'],
            'CD CIVIT': ['CD CIVIT']
        };
        const locations = cdMap[dashboardId] || [];
        
        const filtered = dashboardId === 'GLOBAL' ? currentPeriodData : currentPeriodData.filter(d => locations.includes(d.Lotacao));
        const prevFiltered = dashboardId === 'GLOBAL' ? previousPeriodDataResult : previousPeriodDataResult.filter(d => locations.includes(d.Lotacao));

        return { filteredData: filtered, globalTotal, previousPeriodData: prevFiltered };
    }, [data, dashboardId, filterType, selectedCompetencia, dateRange]);

    const kpis = useMemo(() => {
        const armazenagemData = filteredData.filter(d => d.Tipo_Resumido === 'Armazenagem');
        const aluguelData = filteredData.filter(d => d.Tipo_Resumido === 'Aluguel');
        const cdTotalValue = filteredData.reduce((acc, d) => acc + d.Vlr_Titulo, 0);
        return {
            armazenagem: { count: armazenagemData.length, value: armazenagemData.reduce((acc, d) => acc + d.Vlr_Titulo, 0) },
            aluguel: { count: aluguelData.length, value: aluguelData.reduce((acc, d) => acc + d.Vlr_Titulo, 0) },
            cdTotal: { count: filteredData.length, value: cdTotalValue },
            percentage: globalTotal > 0 ? (cdTotalValue / globalTotal) * 100 : 0
        };
    }, [filteredData, globalTotal]);

    const previousPeriodKpis = useMemo(() => {
        if (!previousPeriodData || previousPeriodData.length === 0) return null;
        const armazenagem = previousPeriodData.filter(d => d.Tipo_Resumido === 'Armazenagem').reduce((acc, d) => acc + d.Vlr_Titulo, 0);
        const aluguel = previousPeriodData.filter(d => d.Tipo_Resumido === 'Aluguel').reduce((acc, d) => acc + d.Vlr_Titulo, 0);
        const total = armazenagem + aluguel;
        return {
            total,
            armazenagem,
            aluguel,
            count: previousPeriodData.length
        };
    }, [previousPeriodData]);

    const dailyFaturamento = useMemo(() => {
        const dailyData = {};
        filteredData.forEach(d => {
            if(!d.EmissaoDate) return;
            const day = d.EmissaoDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            if (!dailyData[day]) dailyData[day] = { Valor: 0, Quantidade: 0 };
            dailyData[day].Valor += d.Vlr_Titulo;
            dailyData[day].Quantidade++;
        });
        return Object.keys(dailyData).map(day => ({ name: day, ...dailyData[day] })).sort((a,b) => a.name.localeCompare(b.name));
    }, [filteredData]);

    const topBottomClientes = useMemo(() => {
        const clientTotals = {};
        filteredData
            .filter(d => d.Tipo_Resumido === 'Armazenagem')
            .forEach(d => {
                clientTotals[d.Cliente] = (clientTotals[d.Cliente] || 0) + d.Vlr_Titulo;
            });

        const sortedClients = Object.entries(clientTotals).sort(([, a], [, b]) => b - a);
        
        const totalClients = sortedClients.length;
        let topList = [];
        let bottomList = [];

        if (totalClients <= 1) {
            topList = sortedClients;
        } else if (totalClients <= 10) {
            const splitIndex = Math.ceil(totalClients / 2);
            topList = sortedClients.slice(0, splitIndex);
            bottomList = sortedClients.slice(splitIndex);
        } else {
            topList = sortedClients.slice(0, 5);
            bottomList = sortedClients.slice(-5).reverse();
        }

        return { top5: topList, bottom5: bottomList };
    }, [filteredData]);

    const scoreDistribution = useMemo(() => {
        const uniqueClients = [...new Map(filteredData.map(item => [item.Cliente, item])).values()];
        const distribution = { 'Bom Pagador': [], 'Pagador em Alerta': [], 'Inadimplente': [] };
        uniqueClients.forEach(client => {
            const score = getClientScore(client.Cliente, data).text;
            const clientInvoices = filteredData.filter(f => f.Cliente === client.Cliente);
            const avgFaturamento = clientInvoices.length > 0 ? clientInvoices.reduce((acc, curr) => acc + curr.Vlr_Titulo, 0) / clientInvoices.length : 0;
            if (distribution[score]) {
                distribution[score].push({ name: client.Cliente, avg: avgFaturamento });
            }
        });
        return distribution;
    }, [filteredData, data]);
    
    const handleScoreCardClick = (title, data) => {
        setScoreModal({ isOpen: true, title, data });
    };

    const handleGenerateSummary = async () => {
        setIsAiLoading(true);
        setAiSummary('');
        const periodo = filterType === 'competencia' ? `na competência ${selectedCompetencia}` : `no período de ${dateRange.start.toLocaleDateString('pt-BR')} a ${dateRange.end.toLocaleDateString('pt-BR')}`;
        
        let comparisonText = "Não há dados do período anterior para comparação.";
        if (previousPeriodKpis && previousPeriodKpis.count > 0) {
            comparisonText = `Compare com os dados do período anterior:
            - Faturamento Total Anterior: ${formatCurrency(previousPeriodKpis.total)} em ${previousPeriodKpis.count} títulos.
            - Faturamento de Armazenagem Anterior: ${formatCurrency(previousPeriodKpis.armazenagem)}.
            - Faturamento de Aluguel Anterior: ${formatCurrency(previousPeriodKpis.aluguel)}.`;
        }
    
        const prompt = `Você é um analista financeiro sênior da empresa de logística Mercocamp. Analise os seguintes dados de faturamento para o ${dashboardId} ${periodo}.
        Dados do Período Atual:
        - Faturamento Total: ${formatCurrency(kpis.cdTotal.value)} em ${kpis.cdTotal.count} títulos.
        - Faturamento de Armazenagem: ${formatCurrency(kpis.armazenagem.value)} em ${kpis.armazenagem.count} títulos.
        - Faturamento de Aluguel: ${formatCurrency(kpis.aluguel.value)} em ${kpis.aluguel.count} títulos.
        - Representação no Faturamento Global: ${kpis.percentage.toFixed(2)}%.
    
        Dados para Comparação:
        ${comparisonText}
    
        Com base na comparação, gere um resumo executivo em um único parágrafo. Destaque se houve crescimento ou queda, e, se possível, infira as causas (ex: aumento no valor médio por fatura, mudança na quantidade de clientes/títulos em armazenagem ou aluguel). Seja direto e focado em insights para um gestor.`;

        const summary = await callGeminiAPI(prompt);
        setAiSummary(summary);
        setIsAiLoading(false);
    };

    if (loading) return <div className="w-full h-full flex items-center justify-center bg-slate-100 text-gray-800">Carregando dados...</div>;
    if (error) return <div className="w-full h-full flex items-center justify-center text-red-500 bg-slate-100">{error}</div>;
    
    return (
        <div className="bg-slate-100 text-gray-800 min-h-screen p-4 sm:p-6 lg:p-8">
            <GeminiButton onClick={onGeminiClick} />
            <header className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">{dashboardId}</h1>
                <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors"><Home size={20} /> Menu</button>
            </header>

            <StyledCard className="p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="flex items-center gap-4">
                        <ToggleSwitch active={filterType === 'competencia'} onChange={() => setFilterType('competencia')} />
                        <label className="font-semibold text-gray-700">Competência:</label>
                        <select value={selectedCompetencia} onChange={(e) => setSelectedCompetencia(e.target.value)} disabled={filterType !== 'competencia'} className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50">
                            {competencias.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-4">
                        <ToggleSwitch active={filterType === 'data'} onChange={() => setFilterType('data')} />
                        <label className="font-semibold text-gray-700">Período:</label>
                        <input type="date" value={dateRange.start.toISOString().split('T')[0]} onChange={(e) => setDateRange(prev => ({...prev, start: new Date(e.target.value)}))} disabled={filterType !== 'data'} className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50" />
                        <input type="date" value={dateRange.end.toISOString().split('T')[0]} onChange={(e) => setDateRange(prev => ({...prev, end: new Date(e.target.value)}))} disabled={filterType !== 'data'} className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50" />
                    </div>
                </div>
                 <div className="mt-4 pt-4 border-t border-slate-200">
                    <button onClick={handleGenerateSummary} disabled={isAiLoading} className="w-full flex items-center justify-center gap-2 px-4 py-2 font-semibold text-white bg-gradient-to-r from-blue-600 to-teal-500 rounded-lg shadow-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                        <Sparkles size={18} />
                        {isAiLoading ? 'Analisando...' : '✨ Gerar Análise com IA'}
                    </button>
                    {aiSummary && !isAiLoading && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-lg text-gray-600 text-sm">
                            <p>{aiSummary}</p>
                        </div>
                    )}
                </div>
            </StyledCard>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatCard icon={<Warehouse size={24} />} title="Faturado (Armazenagem)" quantity={kpis.armazenagem.count} value={formatCurrency(kpis.armazenagem.value)} />
                <StatCard icon={<Package size={24} />} title="Faturado (Aluguel)" quantity={kpis.aluguel.count} value={formatCurrency(kpis.aluguel.value)} />
                <StatCard icon={<DollarSign size={24} />} title="Faturado (Total CD)" quantity={kpis.cdTotal.count} value={formatCurrency(kpis.cdTotal.value)} />
                <StatCard icon={<Percent size={24} />} title="% Faturamento Global" value={`${kpis.percentage.toFixed(2)}%`} subValue={`de ${formatCurrency(globalTotal)}`} />
            </div>
            
            <StyledCard className="p-4 mb-6">
                 <h3 className="font-semibold mb-4 text-lg text-gray-800">Clientes Faturados</h3>
                 <div className="overflow-y-auto h-[240px] pr-2">
                    {filteredData.sort((a,b) => b.Vlr_Titulo - a.Vlr_Titulo).map(item => {
                        const score = getClientScore(item.Cliente, data);
                        return (
                            <div key={item.id} className="grid grid-cols-4 items-center gap-4 p-2 rounded-lg hover:bg-slate-50 text-sm">
                                <p className="font-semibold text-gray-800 col-span-2 truncate">{item.Cliente}</p>
                                <p className="text-gray-500">Venc: {item.VencimentoDate ? item.VencimentoDate.toLocaleDateString('pt-BR') : 'N/A'}</p>
                                <div className="flex justify-between items-center">
                                    <p className="font-bold text-teal-600">{formatCurrency(item.Vlr_Titulo)}</p>
                                    <span className={`w-3 h-3 rounded-full ${score.color.replace('text-', 'bg-')}`} title={score.text}></span>
                                </div>
                            </div>
                        )
                    })}
                 </div>
            </StyledCard>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <StyledCard className="p-4">
                    <h3 className="font-semibold mb-4 text-lg text-green-600">Melhores Clientes (Armazenagem)</h3>
                    <ul>{topBottomClientes.top5.map(([name, value]) => (<li key={name} className="flex justify-between items-center py-1 border-b border-slate-200"><span className="text-gray-700 text-sm">{name}</span><span className="font-semibold text-green-600 text-sm">{formatCurrency(value)}</span></li>))}</ul>
                </StyledCard>
                <StyledCard className="p-4">
                    <h3 className="font-semibold mb-4 text-lg text-red-600">Piores Clientes (Armazenagem)</h3>
                     <ul>{topBottomClientes.bottom5.map(([name, value]) => (<li key={name} className="flex justify-between items-center py-1 border-b border-slate-200"><span className="text-gray-700 text-sm">{name}</span><span className="font-semibold text-red-600 text-sm">{formatCurrency(value)}</span></li>))}</ul>
                </StyledCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <StyledCard onClick={() => handleScoreCardClick('Bons Pagadores', scoreDistribution['Bom Pagador'])} className="p-4 text-center transition-transform hover:scale-105">
                    <Smile className="mx-auto text-green-500" size={32} />
                    <p className="text-2xl font-bold mt-2 text-gray-800">{scoreDistribution['Bom Pagador'].length}</p>
                    <p className="text-gray-500">Bons Pagadores</p>
                </StyledCard>
                <StyledCard onClick={() => handleScoreCardClick('Pagadores em Alerta', scoreDistribution['Pagador em Alerta'])} className="p-4 text-center transition-transform hover:scale-105">
                    <Meh className="mx-auto text-yellow-500" size={32} />
                    <p className="text-2xl font-bold mt-2 text-gray-800">{scoreDistribution['Pagador em Alerta'].length}</p>
                    <p className="text-gray-500">Pagadores em Alerta</p>
                </StyledCard>
                <StyledCard onClick={() => handleScoreCardClick('Inadimplentes', scoreDistribution['Inadimplente'])} className="p-4 text-center transition-transform hover:scale-105">
                    <Frown className="mx-auto text-red-500" size={32} />
                    <p className="text-2xl font-bold mt-2 text-gray-800">{scoreDistribution['Inadimplente'].length}</p>
                    <p className="text-gray-500">Inadimplentes</p>
                </StyledCard>
            </div>

            <StyledCard className="p-4">
                <h3 className="font-semibold mb-4 text-lg text-gray-800">Faturamento e Títulos por Dia</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyFaturamento}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#64748b" />
                        <YAxis yAxisId="left" stroke="#0d9488" tickFormatter={formatCurrency} />
                        <YAxis yAxisId="right" orientation="right" stroke="#4f46e5" />
                        <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '1rem' }} />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="Valor" stroke="#0d9488" strokeWidth={2} dot={{r: 4}} activeDot={{r: 8}} />
                        <Line yAxisId="right" type="monotone" dataKey="Quantidade" stroke="#4f46e5" strokeWidth={2} dot={{r: 4}} activeDot={{r: 8}} />
                    </LineChart>
                </ResponsiveContainer>
            </StyledCard>
            
            <Modal show={scoreModal.isOpen} onClose={() => setScoreModal({isOpen: false, title: '', data: []})} title={scoreModal.title}>
                <div className="max-h-96 overflow-y-auto">
                    {scoreModal.data.length > 0 ? scoreModal.data.map(client => (
                        <div key={client.name} className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-100">
                            <p className="text-gray-800">{client.name}</p>
                            <p className="text-gray-600">Média: {formatCurrency(client.avg)}</p>
                        </div>
                    )) : <p className="text-gray-500 text-center">Nenhum cliente nesta categoria.</p>}
                </div>
            </Modal>
        </div>
    );
};

// Página de Análise Individual
const AnalysisPage = ({ data, loading, error, onBack, onGeminiClick }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);
    const [aiProfile, setAiProfile] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    const clients = useMemo(() => {
        if (!data) return [];
        const clientMap = new Map();
        data.forEach(d => { if (d.Codigo && !clientMap.has(d.Codigo)) clientMap.set(d.Codigo, { Codigo: d.Codigo, Cliente: d.Cliente }); });
        return Array.from(clientMap.values());
    }, [data]);

    const clientData = useMemo(() => {
        if (!selectedClient || !data) return null;
        return data.filter(d => d.Codigo === selectedClient.Codigo).sort((a,b) => a.EmissaoDate - b.EmissaoDate);
    }, [selectedClient, data]);

    const clientAnalysis = useMemo(() => {
        if (!clientData || clientData.length === 0 || !selectedClient) return null;
        const firstInvoice = clientData[0];
        const lastInvoice = clientData[clientData.length - 1];
        const totalInvoices = clientData.length;
        const aluguelCount = clientData.filter(d => d.Tipo_Resumido === 'Aluguel').length;
        const armazenagemCount = totalInvoices - aluguelCount;
        const latePayments = clientData.filter(d => d.Dias_Atraso > 0 && d.Status_titulo === 'Quitado');
        const avgDelay = latePayments.length > 0 ? latePayments.reduce((acc, d) => acc + d.Dias_Atraso, 0) / latePayments.length : 0;
        const score = getClientScore(selectedClient.Cliente, data);
        const evolutionByYear = clientData.reduce((acc, d) => {
            if (!d.EmissaoDate) return acc;
            const year = d.EmissaoDate.getFullYear();
            if (!acc[year]) acc[year] = { year, total: 0, count: 0 };
            acc[year].total += d.Vlr_Titulo;
            acc[year].count++;
            return acc;
        }, {});
        const yearlyData = Object.values(evolutionByYear).map(y => ({...y, media: y.total/y.count}));
        const currentYear = new Date().getFullYear();
        const evolutionThisYear = clientData.filter(d => d.EmissaoDate && d.EmissaoDate.getFullYear() === currentYear).reduce((acc, d) => {
            const month = d.EmissaoDate.toLocaleString('pt-BR', { month: 'short' });
            if (!acc[month]) acc[month] = { month, total: 0 };
            acc[month].total += d.Vlr_Titulo;
            return acc;
        }, {});
        const monthlyData = Object.values(evolutionThisYear);
        return { firstInvoiceDate: firstInvoice.EmissaoDate.toLocaleDateString('pt-BR'), lastInvoiceDate: lastInvoice.EmissaoDate.toLocaleDateString('pt-BR'), totalInvoices, aluguelCount, armazenagemCount, avgDelay: avgDelay.toFixed(1), score, lotacao: firstInvoice.Lotacao, yearlyData, monthlyData };
    }, [clientData, selectedClient, data]);

    const handleSelectClient = (client) => {
        setSelectedClient(client);
        setSearchTerm('');
        setAiProfile('');
    }
    
    const filteredClients = useMemo(() => {
        if (!searchTerm) return [];
        return clients.filter(c => c.Cliente.toLowerCase().includes(searchTerm.toLowerCase()) || c.Codigo.toString().includes(searchTerm)).slice(0, 5);
    }, [searchTerm, clients]);

    const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const handleGenerateProfile = async () => {
        if (!clientAnalysis) return;
        setIsAiLoading(true);
        setAiProfile('');

        const lastYearData = clientAnalysis.yearlyData[clientAnalysis.yearlyData.length - 2];
        const currentYearData = clientAnalysis.yearlyData[clientAnalysis.yearlyData.length - 1];
        let growthComparison = "Cliente novo, sem histórico para comparação anual.";
        if (lastYearData && currentYearData) {
            growthComparison = `Em ${lastYearData.year}, o valor médio por fatura foi de ${formatCurrency(lastYearData.media)}. Em ${currentYearData.year}, a média até o momento é de ${formatCurrency(currentYearData.media)}.`;
        }

        const prompt = `Você é um analista de crédito da Mercocamp. Crie um perfil conciso sobre o cliente "${selectedClient.Cliente}" com base nos seguintes dados:
        - Status de Pagamento: ${clientAnalysis.score.text}.
        - Média de dias em atraso (quando ocorre): ${clientAnalysis.avgDelay} dias.
        - Total de faturas no histórico: ${clientAnalysis.totalInvoices}.
        - Cliente desde: ${clientAnalysis.firstInvoiceDate}.
        - Lotação principal: ${clientAnalysis.lotacao}.
        - Comparativo de faturamento médio anual: ${growthComparison}
    
        Descreva o comportamento de pagamento do cliente, comente sobre sua evolução de faturamento (se está crescendo, estável ou diminuindo com base nos dados anuais) e forneça uma recomendação geral em um parágrafo conciso e profissional.`;
        
        const profile = await callGeminiAPI(prompt);
        setAiProfile(profile);
        setIsAiLoading(false);
    };


    return (
         <div className="bg-slate-100 text-gray-800 min-h-screen p-4 sm:p-6 lg:p-8">
            <GeminiButton onClick={onGeminiClick} />
            <header className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">Análise Individual de Cliente</h1>
                <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors"><Home size={20} /> Menu</button>
            </header>
            
            <StyledCard className="p-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                    <input type="text" placeholder="Pesquisar por nome ou código do cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onFocus={() => {setSelectedClient(null); setAiProfile('');}} className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    {searchTerm && filteredClients.length > 0 && (
                        <ul className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg">
                            {filteredClients.map(c => ( <li key={c.Codigo} onClick={() => handleSelectClient(c)} className="px-4 py-2 hover:bg-slate-100 cursor-pointer">{c.Codigo} - {c.Cliente}</li> ))}
                        </ul>
                    )}
                </div>
            </StyledCard>
            
            {selectedClient && clientAnalysis ? (
                <div className="space-y-6">
                    <StyledCard className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedClient.Cliente} <span className="text-base font-normal text-gray-500">#{selectedClient.Codigo}</span></h2>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                    <span className={`text-lg font-bold ${clientAnalysis.score.color}`}>{clientAnalysis.score.text}</span>
                                    <span className="text-gray-400 hidden sm:inline">•</span>
                                    <span className="text-gray-600">Lotação: <span className="font-semibold text-gray-800">{clientAnalysis.lotacao}</span></span>
                                </div>
                            </div>
                            <button onClick={handleGenerateProfile} disabled={isAiLoading} className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-teal-500 rounded-lg shadow-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                                <Sparkles size={16} />
                                {isAiLoading ? 'Gerando...' : '✨ Gerar Perfil'}
                            </button>
                        </div>
                         {aiProfile && !isAiLoading && (
                            <div className="mt-4 pt-4 border-t border-slate-200 text-gray-600 text-sm">
                                <p>{aiProfile}</p>
                            </div>
                        )}
                    </StyledCard>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
                        <StyledCard className="p-4"><p className="text-sm text-gray-500">1ª Fatura</p><p className="text-lg font-bold text-gray-800">{clientAnalysis.firstInvoiceDate}</p></StyledCard>
                        <StyledCard className="p-4"><p className="text-sm text-gray-500">Última Fatura</p><p className="text-lg font-bold text-gray-800">{clientAnalysis.lastInvoiceDate}</p></StyledCard>
                        <StyledCard className="p-4"><p className="text-sm text-gray-500">Total Faturas</p><p className="text-lg font-bold text-gray-800">{clientAnalysis.totalInvoices}</p></StyledCard>
                        <StyledCard className="p-4"><p className="text-sm text-gray-500">Faturas (Armz / Aluguel)</p><p className="text-lg font-bold text-gray-800">{clientAnalysis.armazenagemCount} / {clientAnalysis.aluguelCount}</p></StyledCard>
                        <StyledCard className="p-4"><p className="text-sm text-gray-500">Média de Atraso (dias)</p><p className="text-lg font-bold text-gray-800">{clientAnalysis.avgDelay}</p></StyledCard>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <StyledCard className="p-4">
                            <h3 className="font-semibold mb-4 text-lg text-gray-800">Evolução Anual (Valor Médio)</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={clientAnalysis.yearlyData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="year" stroke="#64748b" /><YAxis stroke="#64748b" tickFormatter={formatCurrency} /><Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '1rem' }} formatter={(value) => formatCurrency(value)} /><Bar dataKey="media" name="Valor Médio" fill="#0d9488" /></BarChart>
                            </ResponsiveContainer>
                        </StyledCard>
                        <StyledCard className="p-4">
                            <h3 className="font-semibold mb-4 text-lg text-gray-800">Evolução Mensal em {new Date().getFullYear()}</h3>
                             <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={clientAnalysis.monthlyData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="month" stroke="#64748b" /><YAxis stroke="#64748b" tickFormatter={formatCurrency} /><Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '1rem' }} formatter={(value) => formatCurrency(value)} /><Bar dataKey="total" name="Valor Total" fill="#4f46e5" /></BarChart>
                            </ResponsiveContainer>
                        </StyledCard>
                    </div>
                </div>
            ) : (
                !loading && (
                    <div className="text-center py-20">
                        <Search size={48} className="mx-auto text-gray-400 mb-4" />
                        <h2 className="text-xl font-semibold text-gray-600">Selecione um cliente para iniciar a análise.</h2>
                        <p className="text-gray-500">Use a barra de pesquisa acima para encontrar um cliente por nome ou código.</p>
                    </div>
                )
            )}
         </div>
    );
}


// Componente Principal da Aplicação
export default function App() {
    const [page, setPage] = useState('LOGIN'); // LOGIN, ANIMATING, MENU, DASHBOARD, ANALISE
    const [dashboardId, setDashboardId] = useState(null);
    const { data, loading, error } = useData();
    const [isChatOpen, setIsChatOpen] = useState(false);

    const handleSelect = (pageType, id) => {
        setDashboardId(id);
        setPage(pageType);
    };

    const handleBackToMenu = () => {
        setPage('MENU');
        setDashboardId(null);
    };

    const handleLogout = () => {
        setPage('LOGIN');
        setDashboardId(null);
    }
    
    const handleGeminiClick = () => setIsChatOpen(prev => !prev);
    const handleGeminiClose = () => setIsChatOpen(false);

    const { chatDataContext, chatContextName } = useMemo(() => {
        if (page === 'DASHBOARD' && dashboardId) {
            // Lógica para filtrar dados para o dashboard atual
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
        // Poderíamos adicionar contexto para a página de Análise aqui se quiséssemos
        return { chatDataContext: data, chatContextName: "Geral" };
    }, [page, dashboardId, data]);

    const renderPage = () => {
        if (loading) {
            return <div className="w-full h-full flex items-center justify-center bg-slate-100 text-gray-800">Carregando dados da planilha...</div>;
        }
        if (error) {
            return <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-red-500 p-4 text-center">
                <h2 className="text-2xl font-bold mb-4">Erro ao Carregar Dados</h2>
                <p className="max-w-md">{error}</p>
            </div>;
        }

        switch (page) {
            case 'LOGIN':
                return <LoginPage onEnter={() => setPage('ANIMATING')} />;
            case 'ANIMATING':
                return <LogisticsIntroAnimation onAnimationEnd={() => setPage('MENU')} />;
            case 'MENU':
                return <MenuPage onSelect={handleSelect} onLogout={handleLogout} onGeminiClick={handleGeminiClick} />;
            case 'DASHBOARD':
                return <DashboardPage data={data} loading={loading} error={error} dashboardId={dashboardId} onBack={handleBackToMenu} onGeminiClick={handleGeminiClick} />;
            case 'ANALISE':
                return <AnalysisPage data={data} loading={loading} error={error} onBack={handleBackToMenu} onGeminiClick={handleGeminiClick} />;
            default:
                return <LoginPage onEnter={() => setPage('ANIMATING')} />;
        }
    };

    return (
        <main className="w-screen h-screen bg-slate-100 font-sans">
            <style>{`
                @keyframes spin-slow { from { background-position: 0% 50%; } to { background-position: 200% 50%; } }
                .globe-bg { animation: spin-slow 40s linear infinite; }
                
                @keyframes takeoff-center {
                    0% {
                        transform: translate(0, 0) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translate(80vw, -80vh) rotate(20deg);
                        opacity: 0;
                    }
                }
                .animate-takeoff-center {
                    animation: takeoff-center 1.5s ease-in forwards;
                    animation-delay: 0.2s;
                }
            `}</style>
            
            {renderPage()}

            <GeminiButton onClick={handleGeminiClick} />
            <ChatModal 
                show={isChatOpen} 
                onClose={handleGeminiClose} 
                dataContext={chatDataContext}
                contextName={chatContextName}
            />
        </main>
    );
}
