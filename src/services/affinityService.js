import { supabase } from '../supabaseClient';

/**
 * Servicio para el sistema de afinidad de Spacely.
 */
export const affinityService = {
    /**
     * Obtiene las preguntas del sistema de afinidad.
     */
    async getQuestions() {
        const { data, error } = await supabase
            .from('affinity_questions')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data;
    },

    /**
     * Envía las respuestas del test de afinidad y marca el perfil como completado.
     * @param {Array} answers Array de objetos { question_id, answer_value }
     */
    async submitTest(answers) {
        const { data, error } = await supabase.rpc('submit_affinity_test', {
            p_answers: answers
        });

        if (error) throw error;
        return data;
    },

    /**
     * Obtiene las respuestas de un usuario específico.
     */
    async getUserAnswers(userId) {
        const { data, error } = await supabase
            .from('user_affinity_answers')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;
        return data;
    },

    /**
     * Obtiene la narrativa basada en el porcentaje.
     */
    getAffinityNarrative(score) {
        if (score >= 86) return 'Alta Resonancia';
        if (score >= 66) return 'Buena Sintonía';
        if (score >= 41) return 'Contraste Interesante';
        return 'Perspectivas Distintas';
    },

    /**
     * Calcula el porcentaje de afinidad con PESOS y DISTANCIA PONDERADA.
     * SUM( weight * (4 - abs(A - B)) ) / SUM( weight * 4 )
     */
    calculateAffinity(answersA, answersB, questions = []) {
        if (!answersA || !answersB || answersA.length === 0 || answersB.length === 0) return 0;

        const weightsMap = new Map(questions.map(q => [q.id, q.weight || 1]));
        const mapB = new Map(answersB.map(a => [a.question_id, a.answer_value]));

        let totalWeightedScore = 0;
        let maxPossibleWeightedScore = 0;

        answersA.forEach(ansA => {
            const valB = mapB.get(ansA.question_id);
            const weight = weightsMap.get(ansA.question_id) || 1;

            if (valB !== undefined) {
                // La diferencia máxima es 4 (1 vs 5)
                // Puntos por pregunta = 4 - abs(A - B)
                const points = 4 - Math.abs(ansA.answer_value - valB);
                totalWeightedScore += (weight * points);
                maxPossibleWeightedScore += (weight * 4);
            }
        });

        if (maxPossibleWeightedScore === 0) return 0;
        return Math.round((totalWeightedScore / maxPossibleWeightedScore) * 100);
    },

    /**
     * Extrae puntos de conexión (communalities) donde ambos puntuaron alto (4 o 5).
     */
    getAffinityCommunalities(answersA, answersB, questions) {
        if (!answersA || !answersB || !questions) return [];

        const mapB = new Map(answersB.map(a => [a.question_id, a.answer_value]));
        const qMap = new Map(questions.map(q => [q.id, q.question_text]));

        const matches = [];
        answersA.forEach(ansA => {
            const valB = mapB.get(ansA.question_id);
            // Si ambos están de acuerdo (4 o 5) 
            if (ansA.answer_value >= 4 && valB >= 4) {
                const text = qMap.get(ansA.question_id);
                if (text) matches.push(text);
            }
        });

        return matches.slice(0, 3);
    }
};
