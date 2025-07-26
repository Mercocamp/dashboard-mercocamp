import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LogOut, Home, Search, Users, DollarSign, Globe, Building, Package, Warehouse, Percent, Bot, Smile, Meh, Frown, Ship, Train, Truck, Caravan, Plane, Sparkles } from 'lucide-react';

// URL da logo do usuário.
const userLogoUrl = 'https://storage.googleapis.com/gemini-generative-ai-public-files/logo.png';

// --- FUNÇÃO PARA CHAMADA DA API GEMINI ---
const callGeminiAPI = async (prompt) => {
    const apiKey = ""; // Deixe em branco, será gerenciado pelo ambiente
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }]
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            return result.candidates[0].content.parts[0].text;
        } else {
            return "Não foi possível obter uma resposta da IA. Tente novamente.";
        }
    } catch (error) {
        console.error("Erro ao chamar a API Gemini:", error);
        return "Ocorreu um erro ao se comunicar com a IA.";
    }
};

// Hook de dados para buscar e processar dados da Planilha Google
const useData = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const SPREADSHEET_ID = '1QZ5t4RR1Sd4JP5M6l4cyh7Vyr3ruQiA_EF9hNYVk2NQ';
        const API_KEY = 'AIzaSyDESwQr8FkkWk1k2ybbbO3bRwH0JlxdfDw';
        const RANGE = 'BaseReceber!A2:AB'; // Da célula A2 até a coluna AB

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
                        // Ano, Mês (0-11), Dia
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
                }).filter(d => d.EmissaoDate && d.EmissaoDate >= twoYearsAgo) // Filtra dados dos últimos 2 anos
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


// Componente para o efeito de "vidro"
const GlassCard = ({ children, className = '', onClick }) => (
    <div onClick={onClick} className={`bg-gray-800 bg-opacity-40 backdrop-blur-lg rounded-2xl border border-gray-700/50 shadow-2xl ${className} ${onClick ? 'cursor-pointer hover:border-teal-500/80' : ''}`}>
        {children}
    </div>
);

// Componente de Card de Estatística
const StatCard = ({ icon, title, quantity, value, subValue }) => (
    <GlassCard className="p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-300">
            <span className="font-semibold">{title}</span>
            {icon}
        </div>
        <div className="mt-2 text-right">
            <p className={`text-3xl font-bold text-white`}>{value}</p>
            {quantity && <p className="text-sm text-gray-400">{quantity} Títulos</p>}
            {subValue && <p className="text-sm font-semibold text-gray-400">{subValue}</p>}
        </div>
    </GlassCard>
);

// Componente de Toggle Switch
const ToggleSwitch = ({ active, onChange }) => (
    <button onClick={onChange} className={`relative inline-flex items-center h-8 w-16 rounded-full transition-colors duration-300 ease-in-out focus:outline-none ${active ? 'bg-teal-600' : 'bg-gray-600'}`}>
        <span className={`inline-block w-6 h-6 transform bg-white rounded-full transition-transform duration-300 ease-in-out ${active ? 'translate-x-9' : 'translate-x-1'}`} />
    </button>
);

// Lógica de Score do Cliente
const getClientScore = (cliente, allData) => {
    if (!allData || allData.length === 0) return { text: 'N/A', color: 'text-gray-500' };
    const clientData = allData.filter(d => d.Cliente === cliente);
    if (clientData.length < 2) return { text: 'Novo Cliente', color: 'text-blue-400' };
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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity duration-300" onClick={onClose}>
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg m-4 transform transition-all duration-300 scale-95" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-teal-400">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
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

// Componente Globo Terrestre Realista
const SpinningGlobe = () => {
    const worldTextureUrl = 'https://raw.githubusercontent.com/turban/webgl-earth/master/images/2_no_clouds_4k.jpg';
    return (
        <div className="w-24 h-24">
            <div className="w-full h-full rounded-full animate-spin-slow globe-bg" style={{ 
                backgroundImage: `url(${worldTextureUrl})`,
                backgroundSize: '200% 100%',
                boxShadow: 'inset 10px 0 20px rgba(0,0,0,0.5), 0 0 20px 2px rgba(6, 182, 212, 0.5)'
            }}>
                <div className="w-full h-full rounded-full" style={{
                    background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 60%)'
                }}></div>
            </div>
        </div>
    );
};

// Animação de Introdução Logística (Estilo GIF Centralizado)
const LogisticsIntroAnimation = ({ onAnimationEnd }) => {
    const stages = [
        { icon: <Caravan size={80} />, name: "Van" },
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
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-4 overflow-hidden relative">
            <div className="relative w-64 h-64 flex items-center justify-center">
                {stages.map((v, i) => (
                    <div
                        key={v.name}
                        className={`absolute flex flex-col items-center justify-center transition-opacity duration-500
                            ${i === index ? 'opacity-100' : 'opacity-0'}
                            ${v.name === 'Avião' && i === index ? 'animate-takeoff-center' : ''}
                        `}
                    >
                        <div className="text-teal-300">{v.icon}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Página de Login
const LoginPage = ({ onEnter }) => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-4">
        <GlassCard className="p-10 flex flex-col items-center text-center">
            <img src={userLogoUrl} alt="Mercocamp Logo" className="w-64 h-auto mb-8" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/256x100/111827/06b6d4?text=Mercocamp'; }} />
            <button onClick={onEnter} className={`px-8 py-3 font-semibold text-white bg-gradient-to-r from-blue-600 to-teal-500 rounded-xl shadow-lg hover:scale-105 transform transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-opacity-50`}>
                Entrar
            </button>
        </GlassCard>
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
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-4">
            <GeminiButton onClick={onGeminiClick} />
            <div className="absolute top-5 right-5 text-right">
                <p className="font-semibold text-xl">{time.toLocaleTimeString()}</p>
                <p className="text-gray-400">{time.toLocaleDateString()}</p>
            </div>
            <div className="absolute top-5 left-5">
                <button onClick={onLogout} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <LogOut size={20} /> Sair
                </button>
            </div>

            <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-6">
                    <SpinningGlobe />
                    <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">
                        MERCOCAMP
                    </h1>
                </div>
                <p className="mt-4 text-2xl text-gray-300">{greeting}, seja bem-vindo(a)!</p>
            </div>

            <GlassCard className="p-8 w-full max-w-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {menuOptions.map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => onSelect(opt.id === 'ANALISE' ? 'ANALISE' : 'DASHBOARD', opt.id)}
                            className="p-6 bg-gray-800/50 rounded-xl flex flex-col items-center justify-center gap-3 text-center hover:bg-teal-900/50 hover:scale-105 transform transition-all duration-300 border border-transparent hover:border-teal-500"
                        >
                            <div className="text-teal-400">{React.cloneElement(opt.icon, { size: 32 })}</div>
                            <span className="font-semibold text-lg">{opt.label}</span>
                        </button>
                    ))}
                </div>
            </GlassCard>
        </div>
    );
};


// Página do Dashboard
const DashboardPage = ({ data, loading, error, dashboardId, onBack, onGeminiClick }) => {
    // ... (código do dashboard sem alterações, já está pronto para os dados reais)
};

// Página de Análise Individual
const AnalysisPage = ({ data, loading, error, onBack, onGeminiClick }) => {
    // ... (código da página de análise sem alterações, já está pronto para os dados reais)
};


// Componente Principal da Aplicação
export default function App() {
    const [page, setPage] = useState('LOGIN'); // LOGIN, ANIMATING, MENU, DASHBOARD, ANALISE
    const [dashboardId, setDashboardId] = useState(null);
    const { data, loading, error } = useData();
    const [isGeminiModalOpen, setGeminiModalOpen] = useState(false);

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
    
    const handleGeminiClick = () => setGeminiModalOpen(true);
    const handleGeminiClose = () => setGeminiModalOpen(false);

    const renderPage = () => {
        if (loading) {
            return <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">Carregando dados da planilha...</div>;
        }
        if (error) {
            return <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-red-400 p-4 text-center">
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
        <main className="w-screen h-screen bg-gray-900 font-sans">
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

            <Modal show={isGeminiModalOpen} onClose={handleGeminiClose} title="Assistente Gemini AI">
                <div className="text-center text-gray-300">
                    <Bot size={48} className="mx-auto text-teal-400 mb-4" />
                    <p className="mb-2">Esta funcionalidade está em desenvolvimento.</p>
                    <p className="text-sm">Em breve, você poderá fazer perguntas em linguagem natural sobre seus dados e obter insights instantâneos.</p>
                </div>
            </Modal>
        </main>
    );
}
