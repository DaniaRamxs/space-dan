import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { parseSpaceEnergies } from '../../utils/markdownUtils';

const sanitizeSchema = {
    ...defaultSchema,
    tagNames: [...new Set([...defaultSchema.tagNames, 'div', 'span'])],
    attributes: {
        ...defaultSchema.attributes,
        div: [...(defaultSchema.attributes.div || []), 'className', 'class'],
        span: [...(defaultSchema.attributes.span || []), 'className', 'class'],
        '*': [...(defaultSchema.attributes['*'] || []), 'className', 'class']
    }
};

const GUIDE_CONTENT = [
    "# 🚀 Guía de Energía Estelar y Markdown",
    "",
    "Bienvenido al sistema de comunicación de **Spacely**. Aquí puedes usar Markdown estándar potenciado con nuestras exclusivas **Energías Espaciales**.",
    "",
    "---",
    "",
    "## 💎 1. Energías Espaciales (Bloques)",
    "Para crear un bloque de energía, escribe `::tipo` seguido de tu contenido y cierra con `::`.",
    "",
    "### ✨ Legendarias y Especiales",
    "| Estilo | Código a escribir |",
    "| :--- | :--- |",
    "| **Aurora** | `::aurora Tu texto aquí ::` |",
    "| **Neon** | `::neon Tu texto aquí ::` |",
    "| **Star** | `::star Tu texto aquí ::` |",
    "| **Diamond** | `::diamond Tu texto aquí ::` |",
    "| **RGB** | `::rgb Tu texto aquí ::` |",
    "| **Soft** | `::soft Tu texto aquí ::` |",
    "",
    "### 🛠️ Funcionales y Atmósfera",
    "| Estilo | Código a escribir |",
    "| :--- | :--- |",
    "| **Memory** | `::memory Tu texto aquí ::` |",
    "| **Warning** | `::warning Tu texto aquí ::` |",
    "| **Glitch** | `::glitch Tu texto aquí ::` |",
    "| **Hacker** | `::hacker Tu texto aquí ::` |",
    "| **Void** | `::void Tu texto aquí ::` |",
    "| **Fire** | `::fire Tu texto aquí ::` |",
    "| **Toxic** | `::toxic Tu texto aquí ::` |",
    "| **Ocean** | `::ocean Tu texto aquí ::` |",
    "| **Cyber** | `::cyber Tu texto aquí ::` |",
    "",
    "---",
    "",
    "## 🎨 2. Colores Básicos",
    "Puedes usar colores simples para organizar tus pensamientos:",
    "`::rojo`, `::azul`, `::verde`, `::rosa`, `::naranja`, `::morado`, `::cian`.",
    "",
    "*Ejemplo:* `::verde Todo en orden ::` ",
    "",
    "---",
    "",
    "## 🧬 3. Energías Inline (En la misma línea)",
    "Si quieres resaltar solo unas palabras, usa `((tipo))texto((/tipo))`.",
    "",
    "*Ejemplo:* Mira esta ((aurora))energía mágica((/aurora)) dentro de mi frase.",
    "",
    "---",
    "",
    "## 📝 4. Markdown Estándar",
    "También soportamos todas las funciones clásicas:",
    "",
    "| Elemento | Sintaxis |",
    "| :--- | :--- |",
    "| **Negrita** | `**texto**` |",
    "| *Itálica* | `_texto_` |",
    "| # Título | `# Título` |",
    "| [Link](url) | `[Nombre](https://...)` |",
    "| Código | \\`código\\` |",
    "| > Cita | `> Bloque de cita` |",
    "| Lista | `- Elemento` |",
    "",
    "---",
    "",
    "## 🖼️ Ejemplos Visuales",
    "",
    "::aurora",
    "### Bloque Aurora",
    "Este es un ejemplo de cómo se ve el estilo Aurora.",
    "::",
    "",
    "::glitch",
    "ALERTA DE SISTEMA: Glitch detectado.",
    "::",
    "",
    "::star",
    "Momento estelar inolvidable.",
    "::",
    "",
    "Esto es un texto normal con un toque ((rgb))arcoíris((/rgb)) y un estilo ((hacker))terminal((/hacker))."
].join('\n');

export default function MarkdownGuide({ onClose }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-[#070710] border border-white/10 w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Manual de Energía Estelar</h2>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Aprende a dominar el Markdown de Spacely</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all outline-none"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                    <div className="prose prose-invert prose-sm max-w-none 
                        prose-p:text-white/60 prose-p:leading-relaxed
                        prose-headings:text-white prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter
                        prose-strong:text-white prose-code:text-cyan-400 prose-code:bg-cyan-500/5 prose-code:px-1.5 prose-code:rounded
                        prose-table:border prose-table:border-white/5 prose-th:bg-white/5 prose-th:p-2 prose-td:p-2
                        prose-hr:border-white/5"
                    >
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
                        >
                            {parseSpaceEnergies(GUIDE_CONTENT)}
                        </ReactMarkdown>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-white/[0.02] border-t border-white/5 text-center shrink-0">
                    <button
                        onClick={onClose}
                        className="px-8 py-2.5 bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-cyan-400 transition-all transform hover:scale-105 active:scale-95"
                    >
                        Entendido, a brillar
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
