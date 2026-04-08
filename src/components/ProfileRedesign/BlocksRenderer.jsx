import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import LastfmPanel from '../LastfmPanel';
import { MusicOdysseyBlock } from './MusicOdysseyBlock';
import { RandomFactsBlock } from './RandomFactsBlock';
import { TimeCapsuleBlock } from './TimeCapsuleBlock';

export const BlocksRenderer = ({ blocks, userId, isOwn, onEdit, profileData }) => {
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.15 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    const MarkdownContent = ({ content }) => (
        <div className="prose prose-invert prose-cyan max-w-none text-white/70 
            prose-p:leading-relaxed prose-p:my-2 
            prose-img:rounded-2xl prose-img:shadow-2xl prose-img:mx-auto prose-img:max-h-80
            prose-headings:text-white prose-headings:italic prose-headings:tracking-tighter
            prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
            >
                {content}
            </ReactMarkdown>
        </div>
    );

    const renderBlock = (block) => {
        switch (block.block_type) {
            case 'spotify':
            case 'lastfm':
                return <LastfmPanel userId={userId} isOwn={isOwn} />;
            case 'thought':
                return (
                    <div className="p-6 md:p-12 rounded-3xl md:rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-4 group">
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest italic group-hover:text-cyan-400 transition-colors">Pensamiento Galáctico</span>
                        <div className="text-xl md:text-3xl font-black text-white italic tracking-tighter leading-snug drop-shadow-2xl">
                            <MarkdownContent content={block.config?.text || 'La realidad es solo una construcción...'} />
                        </div>
                    </div>
                );
            case 'stats':
                const level = profileData?.level || 1;
                const balance = profileData?.balance || 0;
                const streak = profileData?.streak || 0;
                return (
                    <div className="p-6 md:p-12 rounded-3xl md:rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-6">
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest italic">Métricas Vitales</span>
                        <div className={`grid gap-6 md:gap-8 ${profileData?.prestige_level > 0 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3'}`}>
                            <div className="space-y-1">
                                <div className="text-[9px] uppercase font-black text-white/30">Nivel</div>
                                <div className="text-xl md:text-3xl font-black text-white italic truncate">LVL {level}</div>
                            </div>
                            {profileData?.prestige_level > 0 && (
                                <div className="space-y-1">
                                    <div className="text-[9px] uppercase font-black text-cyan-400">Renacer</div>
                                    <div className="text-xl md:text-3xl font-black text-white italic truncate">×{profileData.prestige_level}</div>
                                </div>
                            )}
                            <div className="space-y-1">
                                <div className="text-[9px] uppercase font-black text-white/30">Starlys</div>
                                <div className="text-xl md:text-3xl font-black text-cyan-400 italic truncate">◈ {balance.toLocaleString()}</div>
                            </div>
                            <div className="space-y-1 col-span-2 lg:col-span-1">
                                <div className="text-[9px] uppercase font-black text-white/30">Racha</div>
                                <div className="text-xl md:text-3xl font-black text-violet-500 italic">{streak}D</div>
                            </div>
                        </div>
                    </div>
                );
            case 'about':
                return (
                    <div className="p-8 md:p-14 rounded-3xl md:rounded-[3rem] bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 space-y-6 relative overflow-hidden group">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-colors" />
                        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest italic flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
                            Archivo de Identidad
                        </span>
                        <MarkdownContent content={block.config?.text || 'El sensor de identidad no ha detectado registros biográficos todavía...'} />
                    </div>
                );
            case 'interests':
                return (
                    <div className="p-8 md:p-14 rounded-3xl md:rounded-[3rem] bg-white/[0.01] border border-white/5 space-y-8">
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest italic">Frecuencias y Gustos</span>
                            <div className="h-px flex-1 bg-gradient-to-r from-pink-500/20 to-transparent" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Lo que me gusta</h4>
                                <div className="bg-white/[0.02] p-5 md:p-8 rounded-3xl border border-white/5">
                                    <MarkdownContent content={block.config?.likes || 'Explorando nuevas sensaciones...'} />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Lo que NO me gusta</h4>
                                <div className="bg-white/[0.02] p-5 md:p-8 rounded-3xl border border-white/5">
                                    <MarkdownContent content={block.config?.dislikes || 'Manteniendo la órbita limpia...'} />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'favorites':
                return (
                    <div className="p-8 md:p-14 rounded-3xl md:rounded-[3rem] bg-gradient-to-tr from-[#0a0a0f] to-[#111] border border-white/5 space-y-8 relative group">
                        <div className="absolute top-0 right-0 p-8 text-4xl opacity-10 group-hover:opacity-30 transition-opacity">✨</div>
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest italic">Mis Favoritos (Libros, Series, Museos...)</span>
                        <MarkdownContent content={block.config?.text || 'La biblioteca galáctica está vacía por ahora.'} />
                    </div>
                );
            case 'music_odyssey':
                return <MusicOdysseyBlock config={block.config} />;
            case 'random_facts':
                return <RandomFactsBlock config={block.config} />;
            case 'time_capsule':
                return <TimeCapsuleBlock config={block.config} />;
            case 'gallery':
                const images = block.config?.images || [];
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-4">
                            <span className="text-[10px] font-black text-violet-400 uppercase tracking-[0.3em] italic">Mi Galería Estelar</span>
                            <span className="text-[10px] text-white/20 font-bold uppercase">{images.length} Archivos Visuales</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {images.length > 0 ? images.map((img, i) => (
                                <motion.div
                                    key={i}
                                    whileHover={{ scale: 1.05, rotate: i % 2 === 0 ? 2 : -2 }}
                                    className="aspect-square rounded-[2rem] overflow-hidden border border-white/10 bg-black/40 shadow-xl group/img relative"
                                >
                                    <img src={img.url} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" alt="Gallery item" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity" />
                                </motion.div>
                            )) : (
                                <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem] text-white/10 uppercase text-[10px] font-black tracking-widest">
                                    Galería sin contenido visual
                                </div>
                            )}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-16"
        >
            {blocks.filter(b => b.is_active).map((block) => (
                <motion.div key={block.id || block.block_type} variants={item}>
                    {renderBlock(block)}
                </motion.div>
            ))}

            {isOwn && (
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={onEdit}
                    className="w-full py-6 md:py-8 border-2 border-dashed border-white/5 rounded-[2rem] md:rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-white/20 hover:text-white/60 hover:border-white/20 hover:bg-white/[0.01] transition-all group"
                >
                    <span className="text-3xl md:text-4xl group-hover:rotate-180 transition-transform duration-700">+</span>
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-center px-4">Expandir Arquitectura del Perfil</span>
                </motion.button>
            )}
        </motion.div>
    );
};
