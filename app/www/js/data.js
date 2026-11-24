export const EXERCISES = ['Press banca', 'Press inclinado con mancuernas', 'Press inclinado con barra', 'Aperturas en polea', 'Aperturas con mancuernas', 'Contractora de pecho', 'Fondos', 'Flexiones', 'Press militar', 'Press de hombro con mancuernas', 'Elevaciones laterales', 'Pájaros', 'Face pull', 'Dominadas', 'Jalón al pecho', 'Remo con barra', 'Remo en polea', 'Remo con mancuerna', 'Remo en máquina', 'Pull over en polea', 'Encogimientos', 'Curl con barra', 'Curl con mancuernas', 'Curl martillo', 'Curl predicador', 'Curl en polea', 'Extensión de tríceps en polea', 'Press francés', 'Extensión de tríceps tras nuca', 'Press banca agarre cerrado', 'Sentadilla', 'Sentadilla hack', 'Sentadilla frontal', 'Sentadilla búlgara', 'Sentadilla goblet', 'Prensa', 'Extensión de cuádriceps', 'Curl femoral tumbado', 'Curl femoral sentado', 'Peso muerto', 'Peso muerto rumano', 'Peso muerto sumo', 'Hip thrust', 'Patada de glúteo en polea', 'Abducción de cadera', 'Aducción de cadera', 'Zancadas', 'Step up', 'Puente de glúteo', 'Gemelo de pie', 'Gemelo sentado', 'Plancha', 'Crunch en polea', 'Elevación de piernas', 'Rueda abdominal', 'Hiperextensiones'];

const e = (name, sets, reps) => ({ name, sets, reps, weight: null, note: '' });
const d = (name, weekdays, ...exercises) => ({ name, weekdays, exercises });

export const TEMPLATES = [
  { name: 'Full body 3 días', about: 'Cuerpo entero: lunes, miércoles y viernes', days: [
    d('Full body A', [0], e('Sentadilla', 3, '6-8'), e('Press banca', 3, '6-8'), e('Remo con barra', 3, '8-10'), e('Elevaciones laterales', 3, '12-15'), e('Crunch en polea', 3, '12-15')),
    d('Full body B', [2], e('Peso muerto rumano', 3, '8-10'), e('Press militar', 3, '6-8'), e('Jalón al pecho', 3, '8-10'), e('Zancadas', 3, '10-12'), e('Curl con mancuernas', 3, '10-12')),
    d('Full body C', [4], e('Prensa', 3, '10-12'), e('Press inclinado con mancuernas', 3, '8-10'), e('Remo en polea', 3, '8-10'), e('Hip thrust', 3, '8-10'), e('Extensión de tríceps en polea', 3, '10-12')),
  ] },
  { name: 'Torso / Pierna 4 días', about: 'Lunes, martes, jueves y viernes', days: [
    d('Torso A', [0], e('Press banca', 4, '6-8'), e('Remo con barra', 4, '6-8'), e('Press militar', 3, '8-10'), e('Jalón al pecho', 3, '8-10'), e('Curl con barra', 3, '10-12'), e('Press francés', 3, '10-12')),
    d('Pierna A', [1], e('Sentadilla', 4, '6-8'), e('Peso muerto rumano', 3, '8-10'), e('Prensa', 3, '10-12'), e('Curl femoral tumbado', 3, '10-12'), e('Gemelo de pie', 4, '10-15')),
    d('Torso B', [3], e('Press inclinado con mancuernas', 4, '8-10'), e('Dominadas', 4, '6-10'), e('Elevaciones laterales', 4, '12-15'), e('Remo en polea', 3, '10-12'), e('Curl martillo', 3, '10-12'), e('Extensión de tríceps en polea', 3, '10-12')),
    d('Pierna B', [4], e('Peso muerto', 3, '5'), e('Sentadilla búlgara', 3, '8-10'), e('Extensión de cuádriceps', 3, '12-15'), e('Curl femoral sentado', 3, '10-12'), e('Gemelo sentado', 4, '12-15')),
  ] },
  { name: 'Empuje / Tirón / Pierna', about: 'Lunes, miércoles y viernes', days: [
    d('Empuje', [0], e('Press banca', 4, '6-8'), e('Press de hombro con mancuernas', 3, '8-10'), e('Aperturas en polea', 3, '12-15'), e('Elevaciones laterales', 4, '12-15'), e('Extensión de tríceps en polea', 3, '10-12')),
    d('Tirón', [2], e('Dominadas', 4, '6-10'), e('Remo con barra', 4, '8-10'), e('Face pull', 3, '12-15'), e('Curl con barra', 3, '8-10'), e('Curl martillo', 3, '10-12')),
    d('Pierna', [4], e('Sentadilla', 4, '6-8'), e('Peso muerto rumano', 3, '8-10'), e('Prensa', 3, '10-12'), e('Curl femoral tumbado', 3, '10-12'), e('Gemelo de pie', 4, '12-15')),
  ] },
  { name: 'Glúteo y pierna 4 días', about: 'Lunes, martes, jueves y viernes', days: [
    d('Glúteo', [0], e('Hip thrust', 4, '8-10'), e('Sentadilla búlgara', 3, '8-10'), e('Peso muerto rumano', 3, '8-10'), e('Abducción de cadera', 3, '15-20')),
    d('Torso', [1], e('Jalón al pecho', 3, '8-10'), e('Press de hombro con mancuernas', 3, '8-10'), e('Remo en polea', 3, '10-12'), e('Press inclinado con mancuernas', 3, '8-10'), e('Elevaciones laterales', 3, '12-15')),
    d('Pierna', [3], e('Sentadilla', 4, '6-8'), e('Prensa', 3, '10-12'), e('Extensión de cuádriceps', 3, '12-15'), e('Curl femoral sentado', 3, '10-12'), e('Gemelo de pie', 3, '12-15')),
    d('Glúteo y brazo', [4], e('Hip thrust', 4, '8-10'), e('Patada de glúteo en polea', 3, '12-15'), e('Zancadas', 3, '10-12'), e('Curl con mancuernas', 3, '10-12'), e('Extensión de tríceps en polea', 3, '10-12')),
  ] },
];
