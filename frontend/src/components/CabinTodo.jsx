import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTasks, addTask, toggleTask, deleteTask } from '../services/productivity';

export default function CabinTodo({ userId }) {
    const [tasks, setTasks] = useState([]);
    const [input, setInput] = useState('');
    const [activeTab, setActiveTab] = useState('today'); // 'today' | 'upcoming'

    useEffect(() => {
        if (userId) refreshTasks();
    }, [userId]);

    const refreshTasks = async () => {
        try {
            const data = await getTasks(userId);
            setTasks(data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        try {
            const newTask = await addTask(userId, input, activeTab === 'today');
            setTasks([newTask, ...tasks]);
            setInput('');
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggle = async (id, currentStatus) => {
        try {
            const updated = await toggleTask(id, !currentStatus);
            setTasks(tasks.map(t => t.id === id ? updated : t));
        } catch (err) {
            console.error(err);
        }
    };

    const filteredTasks = tasks
        .filter(t => (activeTab === 'today' ? t.is_today : !t.is_today))
        .slice(0, 5); // Max 5 visible to keep it clean

    return (
        <div className="w-full max-w-md">
            <div className="flex gap-4 mb-6 border-b border-white/10 pb-2">
                <button
                    onClick={() => setActiveTab('today')}
                    className={`text-xs uppercase tracking-widest transition-opacity ${activeTab === 'today' ? 'opacity-100 font-bold border-b border-accent pb-2 -mb-[10px]' : 'opacity-40'}`}
                >
                    Hoy
                </button>
                <button
                    onClick={() => setActiveTab('upcoming')}
                    className={`text-xs uppercase tracking-widest transition-opacity ${activeTab === 'upcoming' ? 'opacity-100 font-bold border-b border-accent pb-2 -mb-[10px]' : 'opacity-40'}`}
                >
                    Próximas
                </button>
            </div>

            <form onSubmit={handleAdd} className="mb-6 relative">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Añadir nueva tarea a la órbita..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-sm focus:outline-none focus:border-accent/50 transition-all placeholder:opacity-30"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30 hover:opacity-100 transition-opacity">
                    ✦
                </button>
            </form>

            <div className="space-y-3 min-h-[200px]">
                <AnimatePresence mode="popLayout">
                    {filteredTasks.map((task) => (
                        <motion.div
                            key={task.id}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`group flex items-center p-4 rounded-xl border transition-all ${task.is_completed
                                    ? 'bg-accent/5 border-accent/20 opacity-50'
                                    : 'bg-white/5 border-white/10 hover:border-white/20'
                                }`}
                        >
                            <button
                                onClick={() => handleToggle(task.id, task.is_completed)}
                                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all mr-4 ${task.is_completed ? 'bg-accent border-accent' : 'border-white/30 group-hover:border-accent/50'
                                    }`}
                            >
                                {task.is_completed && <span className="text-[10px] text-black font-black">✓</span>}
                            </button>

                            <span className={`text-sm flex-1 ${task.is_completed ? 'line-through' : ''}`}>
                                {task.title}
                            </span>

                            <button
                                onClick={() => deleteTask(task.id).then(refreshTasks)}
                                className="opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity text-xs"
                            >
                                ✕
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {filteredTasks.length === 0 && (
                    <div className="h-40 flex items-center justify-center border border-dashed border-white/5 rounded-xl opacity-20 text-xs italic">
                        El vacío absoluto...
                    </div>
                )}
            </div>

            <div className="mt-4 text-[10px] opacity-30 text-center uppercase tracking-tighter">
                {tasks.filter(t => t.is_completed).length} completadas · {tasks.filter(t => !t.is_completed).length} pendientes
            </div>
        </div>
    );
}
