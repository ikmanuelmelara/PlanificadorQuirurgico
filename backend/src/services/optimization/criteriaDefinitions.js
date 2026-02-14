/**
 * Optimization criteria definitions for the prescriptive module.
 * Each criterion can be selected as hard or soft, with an adjustable weight.
 */

const CRITERIA = [
  {
    code: 'ZERO_OUT_OF_GUARANTEE',
    name: 'Cero fuera de garantía',
    description: 'Ningún paciente debe superar el plazo máximo de garantía CatSalut a la fecha de corte. Asigna sesiones suficientes para operar a los pacientes en riesgo.',
    defaultWeight: 10,
    canBeHard: true,
    category: 'priority',
  },
  {
    code: 'MIN_CHANGE',
    name: 'Mínimo cambio',
    description: 'Minimizar los cambios respecto al reparto actual de sesiones. Favorece estabilidad en la planificación.',
    defaultWeight: 5,
    canBeHard: false,
    category: 'stability',
  },
  {
    code: 'MAX_UTILIZATION',
    name: 'Máxima utilización',
    description: 'Maximizar el porcentaje de uso de los quirófanos disponibles. Evitar dejar quirófanos vacíos.',
    defaultWeight: 7,
    canBeHard: false,
    category: 'efficiency',
  },
  {
    code: 'BALANCE_LOAD',
    name: 'Equilibrar carga',
    description: 'Distribuir la carga quirúrgica equitativamente entre los servicios, proporcional a su lista de espera.',
    defaultWeight: 6,
    canBeHard: false,
    category: 'fairness',
  },
  {
    code: 'PRIORITIZE_ONCOLOGIC',
    name: 'Priorizar oncológicos',
    description: 'Los pacientes oncológicos (prioritario y estándar) deben tener sesiones asignadas antes que otras prioridades.',
    defaultWeight: 9,
    canBeHard: true,
    category: 'priority',
  },
  {
    code: 'MIN_REFERRALS',
    name: 'Minimizar derivaciones',
    description: 'Asignar suficientes sesiones para evitar derivar pacientes a centros concertados externos.',
    defaultWeight: 6,
    canBeHard: false,
    category: 'efficiency',
  },
  {
    code: 'RESERVE_EMERGENCY',
    name: 'Reservar para urgencias',
    description: 'Reservar capacidad (sesiones/huecos) para las urgencias previstas por el módulo predictivo.',
    defaultWeight: 5,
    canBeHard: false,
    category: 'safety',
  },
  {
    code: 'CONSIDER_DROPOUTS',
    name: 'Considerar bajas previstas',
    description: 'Ajustar la planificación considerando las bajas previstas de la LEQ (fallecimientos, renuncias, etc.).',
    defaultWeight: 4,
    canBeHard: false,
    category: 'accuracy',
  },
];

function getCriteria() {
  return CRITERIA;
}

function getCriterionByCode(code) {
  return CRITERIA.find((c) => c.code === code) || null;
}

module.exports = { getCriteria, getCriterionByCode, CRITERIA };
