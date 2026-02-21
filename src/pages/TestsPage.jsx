const TESTS = [
  {
    id: 1,
    testName: 'MBTI',
    result: 'INTJ',
    description: 'El Arquitecto. Estratégico, independiente y con una mente analítica implacable.',
    color: '#c77dff',
  },
  {
    id: 2,
    testName: 'Eneagrama',
    result: '5w6',
    description: 'Analítico, curioso e insaciable de conocimiento.',
    color: '#ff6eb4',
  },
  {
    id: 3,
    testName: 'Tritype',
    result: '8-2-6',
    description: 'Combina la determinación del 8, la empatía del 2 y la lealtad del 6.',
    color: '#00e5ff',
  },
  {
    id: 4,
    testName: 'Variante instintiva',
    result: 'sx/so',
    description: 'Prioriza la intensidad en los vínculos cercanos sobre todo lo demás. Le importa conectar de verdad con las personas, no la cantidad sino la profundidad.',
    color: '#ff6eb4',
  },
  {
    id: 5,
    testName: 'Hogwarts House',
    result: 'Slytherin',
    description: 'Ambición, astucia y determinación. El fin justifica los medios.',
    color: '#39ff14',
  },
  {
    id: 6,
    testName: 'Moral Alignment',
    result: 'True Neutral',
    description: 'Sin lealtad al orden ni al caos. El equilibrio como filosofía de vida.',
    color: '#adb5bd',
  },
  {
    id: 7,
    testName: 'Temperamento',
    result: 'Mel/Col',
    description: 'Melancólico-Colérico. Perfeccionista, intenso y orientado a objetivos.',
    color: '#e63946',
  },
  {
    id: 8,
    testName: 'Zodiaco',
    result: 'Libra',
    description: 'Busca el equilibrio, la justicia y la armonía. Le cuesta decidir pero nunca es indiferente.',
    color: '#f4a261',
  },
  {
    id: 9,
    testName: 'Arcano Mayor',
    result: 'XII',
    description: 'El Colgado. Ver las cosas desde otro ángulo. La pausa como decisión, no como derrota.',
    color: '#c77dff',
  },
  {
    id: 10,
    testName: 'Zodiaco Chino',
    result: 'Caballo',
    description: 'Tipo Agua. Libre e inquieto, pero más tranquilo que la mayoría. Va a su ritmo y no sigue a nadie.',
    color: '#00e5ff',
  },
  {
    id: 11,
    testName: 'Love Language',
    result: 'Tiempo',
    description: 'Tiempo de calidad. Estar presente de verdad vale más que cualquier palabra o regalo.',
    color: '#ff6eb4',
  },
  {
    id: 12,
    testName: 'Filosofía',
    result: 'Absurdismo',
    description: 'La vida no tiene sentido inherente — y aun así hay que vivirla con todas las ganas.',
    color: '#c77dff',
  },
  {
    id: 13,
    testName: 'Estación',
    result: 'Invierno',
    description: 'El frío, el silencio y los cielos grises. La mejor época del año.',
    color: '#00e5ff',
  },
  {
    id: 14,
    testName: 'Cumpleaños',
    result: 'Octubre',
    description: 'Mes de otoño.',
    color: '#f4a261',
  },
  {
    id: 15,
    testName: 'Animal espiritual',
    result: 'Gato negro',
    description: 'Independiente, introvertido.',
    color: '#adb5bd',
  },
  {
    id: 16,
    testName: 'Bebida',
    result: 'Café',
    description: 'Imprescindible. Sin negociación.',
    color: '#8B4513',
  },
];

export default function TestsPage() {
  return (
    <main className="card">
      <div className="pageHeader">
        <h1>tests</h1>
        <p className="tinyText">tests, arquetipos y datos sobre mi 🧪</p>
      </div>

      <div className="testsGrid">
        {TESTS.map(t => (
          <div
            key={t.id}
            className="testCard"
            style={{ borderColor: `${t.color}55` }}
          >
            <p className="testName">{t.testName}</p>
            <span
              className="testResult"
              style={{
                background: `linear-gradient(135deg, ${t.color}, #ffffff88)`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
              }}
            >
              {t.result}
            </span>
            <p className="testDesc">{t.description}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
