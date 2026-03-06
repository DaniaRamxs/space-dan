import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Box, Package, Shield, User, Sparkles, MessageSquare,
    Radio, Layout, ChevronLeft, Search, Filter, CheckCircle2,
    Zap, Disc, Award, Star
} from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { useEconomy } from '../contexts/EconomyContext';
import * as storeService from '../services/store';
import useShopItems from '../hooks/useShopItems';
import { getFrameStyle } from '../utils/styles';
import '../styles/NicknameStyles.css';

const CAT_LABELS = {
    nickname_style: 'Estilos de Nickname',
    frame: 'Marcos de Avatar',
    role: 'Roles Especiales',
    chat_effect: 'Efectos de Chat',
    chat_badge: 'Emblemas de Chat',
    radio: 'Radios Equipables',
    holocard: 'HoloCards',
    character: 'Personajes Coleccionables',
};

const CAT_ICONS = {
    nickname_style: <User size={18} />,
    frame: <Shield size={18} />,
    role: <Award size={18} />,
    chat_effect: <Sparkles size={18} />,
    chat_badge: <MessageSquare size={18} />,
    radio: <Radio size={18} />,
    holocard: <Layout size={18} />,
    character: <Disc size={18} />,
};

const RARITY_COLORS = {
    common: 'text-gray-400 group-hover:text-gray-300',
    rare: 'text-cyan-400 group-hover:text-cyan-300',
    epic: 'text-purple-400 group-hover:text-purple-300',
    legendary: 'text-amber-400 group-hover:text-amber-300',
    mythic: 'text-rose-400 group-hover:text-rose-300',
};

const RARITY_BORDERS = {
    common: 'border-white/5 hover:border-white/20',
    rare: 'border-cyan-500/10 hover:border-cyan-500/40',
    epic: 'border-purple-500/10 hover:border-purple-500/40',
    legendary: 'border-amber-500/10 hover:border-amber-500/40',
    mythic: 'border-rose-500/10 hover:border-rose-500/40',
};

export default function InventoryPage() {
    const navigate = useNavigate();
    const { user, profile } = useAuthContext();
    const { balance } = useEconomy();
    const localShop = useShopItems();

    const [activeTab, setActiveTab] = useState('all');
    const [activeRarity, setActiveRarity] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [ownedItems, setOwnedItems] = useState([]);
    const [ownedCollectibles, setOwnedCollectibles] = useState([]);
    const [totalCollectibles, setTotalCollectibles] = useState(0);
    const [flash, setFlash] = useState(null);

    const fetchInventory = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [items, collectibles, storeItems] = await Promise.all([
                storeService.getUserItems(user.id),
                storeService.getUserCollectibles(user.id),
                storeService.getStoreItems('character')
            ]);
            setOwnedItems(items || []);
            setOwnedCollectibles(collectibles || []);
            setTotalCollectibles(storeItems?.length || 0);
        } catch (err) {
            console.error('[Inventory] Load error:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    const showFlash = (msg, ok) => {
        setFlash({ msg, ok });
        setTimeout(() => setFlash(null), 3000);
    };

    const currentItems = useMemo(() => {
        // Merge standard items with their equipment state
        const base = ownedItems.map(ui => ({
            ...ui.item,
            is_equipped: ui.is_equipped,
            kind: 'standard'
        }));

        // Add collectibles
        const charItems = ownedCollectibles.map(c => ({
            ...c,
            category: 'character',
            kind: 'collectible'
        }));

        let result = [...base, ...charItems];

        if (activeTab !== 'all') {
            result = result.filter(i => i.category === activeTab);
        }
        if (activeRarity !== 'all') {
            result = result.filter(i => i.rarity === activeRarity);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(i =>
                i.name?.toLowerCase().includes(q) ||
                i.title?.toLowerCase().includes(q) ||
                i.description?.toLowerCase().includes(q)
            );
        }

        return result;
    }, [ownedItems, ownedCollectibles, activeTab, activeRarity, searchQuery]);

    const stats = useMemo(() => {
        return {
            total: ownedItems.length + ownedCollectibles.length,
            equipped: ownedItems.filter(i => i.is_equipped).length,
            collectiblesOwned: ownedCollectibles.length,
            collectiblesTotal: totalCollectibles || 100 // Fallback if 0
        };
    }, [ownedItems, ownedCollectibles, totalCollectibles]);

    const handleEquipAction = async (item) => {
        if (item.kind === 'collectible') return; // Collectibles are just displayed

        try {
            if (item.is_equipped) {
                await storeService.unequipItem(user.id, item.id);
                showFlash(`${item.title} desequipado`, true);
            } else {
                await storeService.equipItem(user.id, item.id);
                showFlash(`${item.title} equipado`, true);
            }
            fetchInventory();
            // Notify other components (like chat) to update
            window.dispatchEvent(new CustomEvent('dan:item-equipped', { detail: item }));
        } catch (err) {
            showFlash(err.message || 'Error al actualizar equipamiento', false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen pt-40 px-6 flex flex-col items-center justify-center text-center">
                <h2 className="text-4xl font-black uppercase mb-4 text-white/20">Acceso Restringido</h2>
                <p className="text-white/40 mb-8">Debes iniciar sesión para ver tu inventario personal.</p>
                <button onClick={() => navigate('/tienda')} className="px-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs">Volver a la Tienda</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050510] text-white pt-24 pb-40 px-4 md:px-8">
            {/* Header UI */}
            <div className="max-w-7xl mx-auto mb-12">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
                    <div className="flex flex-col gap-4">
                        <button
                            onClick={() => navigate('/tienda')}
                            className="group flex items-center gap-2 text-white/30 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.3em] w-fit"
                        >
                            <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                            Volver a la Tienda
                        </button>
                        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight leading-none">
                            MI_INVENTARIO<span className="text-cyan-400">.OS</span>
                        </h1>
                        <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest text-white/30">
                            <span className="flex items-center gap-1.5"><Box size={14} /> Total: {stats.total} artefactos</span>
                            <span className="flex items-center gap-1.5"><Shield size={14} /> Equipados: {stats.equipped}</span>
                            <span className="flex items-center gap-1.5 text-cyan-400/80"><Star size={14} /> Colección: {stats.collectiblesOwned}/{stats.collectiblesTotal}</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 text-right">
                        <span className="text-[10px] font-black text-white/25 uppercase tracking-widest leading-none">Saldo Estelar Actual</span>
                        <div className="text-4xl font-black font-mono text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                            ◈ {balance.toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Filters & Tabs */}
                <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between bg-white/[0.02] border border-white/10 p-4 rounded-[2rem] backdrop-blur-xl mb-12">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto scrollbar-hide no-scrollbar">
                        <FilterTab active={activeTab === 'all'} label="Todo" icon={<Package size={14} />} onClick={() => setActiveTab('all')} />
                        {Object.entries(CAT_LABELS).map(([id, label]) => (
                            <FilterTab
                                key={id}
                                active={activeTab === id}
                                label={label}
                                icon={CAT_ICONS[id]}
                                onClick={() => setActiveTab(id)}
                            />
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Buscar en archivos..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 transition-colors"
                            />
                        </div>

                        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-2xl border border-white/5">
                            {['all', 'common', 'rare', 'epic', 'legendary', 'mythic'].map(rarity => (
                                <button
                                    key={rarity}
                                    onClick={() => setActiveRarity(rarity)}
                                    className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeRarity === rarity ? 'bg-white text-black' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
                                >
                                    {rarity === 'all' ? '✦' : rarity.charAt(0)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Inventory Grid */}
                <AnimatePresence mode="popLayout">
                    {loading ? (
                        <div key="loading" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {[...Array(10)].map((_, i) => <InventorySkeleton key={i} />)}
                        </div>
                    ) : currentItems.length > 0 ? (
                        <motion.div
                            key="grid"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
                        >
                            {currentItems.map((item, idx) => (
                                <InventoryCard
                                    key={item.id + idx}
                                    item={item}
                                    onAction={() => handleEquipAction(item)}
                                />
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center py-40 text-center opacity-20"
                        >
                            <Package size={80} className="mb-6" strokeWidth={1} />
                            <h3 className="text-xl font-black uppercase tracking-widest">Sin resultados</h3>
                            <p className="text-sm">Tu inventario está vacío para este filtro.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Flash Messages */}
            <AnimatePresence>
                {flash && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[999]"
                    >
                        <div className={`px-8 py-4 rounded-2xl backdrop-blur-2xl border shadow-2xl flex items-center gap-3 ${flash.ok ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                            {flash.ok ? <CheckCircle2 className="text-cyan-400" size={20} /> : <Box className="text-rose-400" size={20} />}
                            <span className="text-xs font-black uppercase tracking-widest">{flash.msg}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function FilterTab({ active, label, icon, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`shrink-0 flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${active ? 'bg-white text-black border-transparent shadow-[0_5px_15px_-5px_rgba(255,255,255,0.4)]' : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20'}`}
        >
            {icon}
            {label}
        </button>
    );
}

function InventoryCard({ item, onAction }) {
    const rarityClass = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
    const borderClass = RARITY_BORDERS[item.rarity] || RARITY_BORDERS.common;
    const kind = item.kind || 'standard';

    return (
        <motion.div
            layout
            className={`group relative h-full flex flex-col bg-white/[0.02] border rounded-[2.5rem] p-6 transition-all duration-300 ${borderClass} hover:bg-white/[0.04] overflow-hidden`}
        >
            {/* Background rarity glow */}
            <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[100px] opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none bg-current ${rarityClass.split(' ')[0]}`} />

            {/* Card Header: Kind & Rarity */}
            <div className="flex items-center justify-between mb-6 relative z-10">
                <span className="text-[8px] font-black uppercase tracking-[.3em] text-white/20">{item.category}</span>
                <span className={`text-[8px] font-black uppercase tracking-[.2em] px-2 py-1 rounded bg-black/40 border border-white/5 ${rarityClass}`}>
                    {item.rarity}
                </span>
            </div>

            {/* Item Visual */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10 min-h-[160px]">
                {item.category === 'frame' ? (
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                        <div className="absolute inset-0" style={getFrameStyle(item.id)} />
                        <div className="absolute inset-2 overflow-hidden rounded-full">
                            <img src="/default_user_blank.png" className="w-full h-full object-cover opacity-50 contrast-125" alt="Preview" />
                        </div>
                    </div>
                ) : item.category === 'character' ? (
                    <div className="relative w-full h-32 flex items-center justify-center overflow-hidden rounded-2xl bg-black/40 border border-white/5">
                        <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.name} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <span className="absolute bottom-2 left-3 text-[9px] font-bold text-white/50">{item.series}</span>
                    </div>
                ) : item.category === 'chat_effect' ? (
                    <div className="w-full p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-cyan-500/20" />
                            <div className="h-2 w-16 bg-white/10 rounded-full" />
                        </div>
                        <p className="text-[10px] bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent font-medium italic">
                            Este es un mensaje con efecto...
                        </p>
                    </div>
                ) : (
                    <div className="text-4xl filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover:scale-125 transition-transform duration-500">
                        {item.icon || '🪐'}
                    </div>
                )}
            </div>

            {/* Item Info */}
            <div className="mt-4 mb-6 space-y-1 relative z-10">
                <h3 className="text-sm font-black uppercase tracking-tight truncate group-hover:text-cyan-400 transition-colors">
                    {item.title || item.name}
                </h3>
                <p className="text-[10px] text-white/30 font-medium leading-relaxed line-clamp-2">
                    {item.description}
                </p>
            </div>

            {/* Actions */}
            <div className="mt-auto relative z-10">
                {kind === 'collectible' ? (
                    <div className="w-full py-3 text-center text-[10px] font-black uppercase tracking-[.3em] text-white/20 border border-white/5 rounded-2xl">
                        COLECCIONADO
                    </div>
                ) : (
                    <button
                        onClick={onAction}
                        className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${item.is_equipped ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400' : 'bg-white text-black hover:bg-cyan-400'}`}
                    >
                        {item.is_equipped ? 'Desequipar' : 'Equipar'}
                    </button>
                )}
            </div>

            {item.is_equipped && (
                <div className="absolute top-4 left-4">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-cyan-400 text-black text-[8px] font-black uppercase tracking-widest">
                        <CheckCircle2 size={10} /> ACTIVO
                    </div>
                </div>
            )}
        </motion.div>
    );
}

function InventorySkeleton() {
    return (
        <div className="h-[380px] rounded-[2.5rem] bg-white/[0.02] border border-white/5 animate-pulse overflow-hidden">
            <div className="p-6 space-y-4">
                <div className="flex justify-between">
                    <div className="h-3 w-20 bg-white/5 rounded-full" />
                    <div className="h-3 w-12 bg-white/5 rounded-full" />
                </div>
                <div className="flex-1 flex items-center justify-center pt-8">
                    <div className="w-24 h-24 rounded-full bg-white/5" />
                </div>
                <div className="space-y-2 pt-8">
                    <div className="h-4 w-3/4 bg-white/5 rounded-full" />
                    <div className="h-3 w-full bg-white/5 rounded-full" />
                    <div className="h-3 w-2/3 bg-white/5 rounded-full" />
                </div>
                <div className="pt-4 mt-auto">
                    <div className="h-12 w-full bg-white/5 rounded-2xl" />
                </div>
            </div>
        </div>
    );
}
